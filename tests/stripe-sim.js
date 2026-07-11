#!/usr/bin/env node
// Real-Stripe volume simulation (real-stripe-simulation.md, Part 2). Exercises
// the paths the mocked chaos suite never touches: create-checkout-session's
// price-tampering rejection (indirectly, by always sending a correct total),
// a real Stripe Checkout page, the real webhook's signature verification and
// checkout.session.completed handling, real card declines, and the balance
// auto-charge/retry path.
//
// Requires, running locally:
//   - docker compose up -d (backend + Postgres)
//   - stripe listen --api-key <sk_test_...> --forward-to http://localhost:3000/api/webhooks/stripe
//     (its printed webhook signing secret must match backend/.env's STRIPE_WEBHOOK_SECRET)
//   - node scripts/dev-server.js (or the "web" compose service) on port 4321,
//     since Checkout's successUrl/cancelUrl redirect the browser there
//
// Usage: node tests/stripe-sim.js
//
// Never touches STRIPE_SECRET_KEY itself - Stripe calls happen inside our
// own backend (via HTTP) or the real Checkout page (via the browser), so
// only the DB connection needs pointing at the host-mapped Postgres port.
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL || 'postgres://sweetdreams:change-me@localhost:5433/sweetdreams';

const { chromium } = require('@playwright/test');
const { Pool } = require('pg');
const { getEffectiveConfig, computeExpected } = require('../backend/src/pricing');
const api = require('./fixtures/api');
const { validateStore } = require('./fixtures/invariants');

const dbPool = new Pool({ connectionString: process.env.DATABASE_URL });

const SITE_ORIGIN = process.env.SIM_SITE_ORIGIN || 'http://localhost:4321';
const TRAILER_IDS = ['charlie', 'ella', 'virginia', 'marylou', 'jerry', 'patricia', 'nola', 'billybob'];
const CARDS = {
  success: '4242424242424242',
  declineAtCheckout: '4000000000000002',
};
// real-stripe-simulation.md's spec expected 4000000000000341 to succeed at
// checkout and only decline on the later off-session balance charge.
// Verified empirically (manual checkout attempt, see session notes) that it
// actually declines immediately at the INITIAL charge whenever
// setup_future_usage is requested during Checkout - Stripe's own message:
// "Your credit card was declined. Try paying with a debit card instead."
// That makes it indistinguishable from CARDS.declineAtCheckout in this
// integration and never reaches a real booking to retry against. The
// balance-charge-decline/retry path is exercised instead via
// testBalanceChargeDeclineAndRetry() below: a real successful firstnight
// booking, then its saved payment method is corrupted directly in Postgres
// so the real chargeBalance()/retry-charge code path genuinely fails.

// Total capped by create-checkout-session's own rate limiter (20 requests /
// 15 min) - this script makes exactly one such request per iteration
// (the balance-decline test adds one more), so it has to fit inside that
// budget in a single run.
const SUCCESS_ITERATIONS = 15;
const DECLINE_AT_CHECKOUT_ITERATIONS = 3;

function isoLocal(d) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
function randomInt(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }
function randomArrival(minDaysOut, maxDaysOut) {
  const days = randomInt(minDaysOut, maxDaysOut);
  return isoLocal(new Date(Date.now() + days * 86400000));
}

async function createCheckoutSession({ trailerId, arrival, nights, plan, guest, email }) {
  const cfg = await getEffectiveConfig();
  const expected = computeExpected(cfg, { trailerId, arrival, nights, deliverySite: '', addons: [], requestedPlan: plan });
  const grandTotalCents = Math.round(expected.grandTotal * 100);
  const res = await fetch(`${api.BASE_URL}/api/create-checkout-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      trailerId, arrival, nights, guest, email, deliverySite: '', addons: [],
      paymentPlan: plan, grandTotalCents,
      successUrl: `${SITE_ORIGIN}/Sweet%20Dreams%20RV.dc.html?booking=success&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${SITE_ORIGIN}/Sweet%20Dreams%20RV.dc.html`,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`create-checkout-session failed: ${res.status} ${JSON.stringify(body)}`);
  return body; // { url }
}

// Drives the real Stripe-hosted Checkout page. Returns 'success' if it
// redirected back to our successUrl, or 'declined' if Stripe rejected the
// card and kept us on checkout.stripe.com.
async function driveCheckout(browser, checkoutUrl, cardNumber) {
  // The session id is already embedded in the checkout URL's own path
  // (/c/pay/cs_test_...) - read it from there rather than the post-redirect
  // URL's session_id query param, which the site's own JS can strip via
  // history.replaceState (the stale-confirmation fix from earlier this
  // session) before we get a chance to read it back.
  const sessionIdMatch = checkoutUrl.match(/\/pay\/(cs_test_[a-zA-Z0-9]+)/);
  const sessionId = sessionIdMatch ? sessionIdMatch[1] : null;

  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(checkoutUrl);
    // Whether the "Card" accordion item starts open or closed varies across
    // page loads, so check rather than assume: only click to expand it if
    // the card number field isn't already visible. The radio itself is a
    // real, correctly-sized element, but a same-position zero-size overlay
    // button still wins Playwright's hit test and blocks a plain click -
    // force it through instead of fighting the overlay.
    const cardNumberField = page.locator('#cardNumber');
    if (!(await cardNumberField.isVisible().catch(() => false))) {
      await page.locator('input[value="card"]').click({ force: true, timeout: 5000 }).catch(() => {});
    }
    await cardNumberField.waitFor({ state: 'visible', timeout: 15000 });

    await cardNumberField.fill(cardNumber);
    await page.locator('#cardExpiry').fill('12/34');
    await page.locator('#cardCvc').fill('123');
    await page.locator('#billingName').fill('Sim Test');
    const zip = page.locator('#billingPostalCode');
    if (await zip.isVisible().catch(() => false)) await zip.fill('97526');

    // Uncheck "Save my information" - Link's OTP verification for a
    // returning-card flow is real friction that has nothing to do with what
    // this script is testing, and would stall/break unattended runs.
    const saveInfo = page.getByRole('checkbox', { name: /save my information/i });
    if (await saveInfo.isChecked().catch(() => false)) await saveInfo.uncheck();

    // Not getByRole({name:'Pay'}) - that's a substring match against every
    // accordion toggle's own "Pay with X" aria-label too, not just the real
    // submit button.
    await page.getByTestId('hosted-payment-submit-button').click();

    const result = await Promise.race([
      page.waitForURL(`${SITE_ORIGIN}/**`, { timeout: 20000 }).then(() => 'success'),
      page.waitForSelector('text=/declined|failed|incorrect/i', { timeout: 20000 }).then(() => 'declined'),
    ]).catch(() => 'timeout');

    return { result, sessionId: result === 'success' ? sessionId : null };
  } finally {
    await context.close();
  }
}

async function pollForBooking(sessionId, { attempts = 15, delayMs = 1000 } = {}) {
  for (let i = 0; i < attempts; i++) {
    const bookings = await api.getAllBookings();
    const found = bookings.find((b) => b.id === sessionId);
    if (found) return found;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return null;
}

async function retryCharge(bookingId, cookie) {
  const res = await fetch(`${api.BASE_URL}/api/bookings/${encodeURIComponent(bookingId)}/retry-charge`, {
    method: 'POST',
    headers: { Cookie: cookie },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function main() {
  const up = await api.checkBackendUp();
  if (!up) throw new Error(`Backend not reachable at ${api.BASE_URL}/api/health - start it first.`);

  const cookie = await api.adminLogin();
  const browser = await chromium.launch();
  const log = [];
  let counter = 0;

  async function runOne({ label, trailerId, arrival, nights, plan, card }) {
    counter += 1;
    const tag = `sim-${Date.now()}-${counter}`;
    const guest = `SIM Guest ${counter}`;
    const email = `${tag}@stripesim.test`;
    console.log(`[${counter}] ${label}: ${trailerId} ${arrival} x${nights}n plan=${plan} card=${card.slice(-4)}`);
    try {
      const { url } = await createCheckoutSession({ trailerId, arrival, nights, plan, guest, email });
      const { result, sessionId } = await driveCheckout(browser, url, card);

      if (card === CARDS.declineAtCheckout) {
        if (result !== 'declined') throw new Error(`expected decline at checkout, got "${result}"`);
        console.log(`    ok: correctly declined at checkout, no booking created`);
        log.push({ label, ok: true, note: 'declined as expected' });
        return;
      }

      if (result !== 'success') throw new Error(`expected success, got "${result}"`);
      const booking = await pollForBooking(sessionId);
      if (!booking) throw new Error(`booking ${sessionId} never appeared via GET /api/bookings after checkout completed`);
      console.log(`    ok: webhook wrote booking ${sessionId}`);

      log.push({ label, ok: true, sessionId });
      return sessionId;
    } catch (e) {
      console.error(`    FAIL: ${e.message}`);
      log.push({ label, ok: false, error: e.message });
      return null;
    }
  }

  // Exercises chargeBalance()'s decline-handling and the admin's retry-charge
  // endpoint against a REAL booking with a REAL saved payment method - see
  // the comment near CARDS above for why the "declines on off-session reuse"
  // test card can't be used to get a booking into this state in the first
  // place. Corrupting the saved payment method id directly is the more
  // reliable way to force chargeBalance() into a real, reproducible decline.
  async function testBalanceChargeDeclineAndRetry() {
    const label = 'balance-charge-decline-and-retry';
    console.log(`[balance-decline-test] creating a real firstnight booking to corrupt`);
    const sessionId = await runOne({
      label, trailerId: TRAILER_IDS[randomInt(0, TRAILER_IDS.length - 1)],
      arrival: randomArrival(15, 60), nights: randomInt(3, 14),
      plan: 'firstnight', card: CARDS.success,
    });
    if (!sessionId) return; // already logged as failed by runOne

    try {
      await dbPool.query(
        `UPDATE bookings SET stripe_payment_method_id = 'pm_test_intentionally_invalid' WHERE id = $1`,
        [sessionId],
      );
      const first = await retryCharge(sessionId, cookie);
      if (first.status === 200) throw new Error(`expected the corrupted payment method to fail the charge, got 200: ${JSON.stringify(first.body)}`);
      console.log(`    ok: balance charge correctly failed against a bad payment method (${first.body.error})`);
      const second = await retryCharge(sessionId, cookie);
      if (second.status === 200) throw new Error(`expected retry to still fail (still-bad payment method), got 200: ${JSON.stringify(second.body)}`);
      console.log(`    ok: retry-charge still correctly fails, no double-charge (${second.body.error})`);
      log.push({ label: `${label}-retry`, ok: true });
    } catch (e) {
      console.error(`    FAIL: ${e.message}`);
      log.push({ label: `${label}-retry`, ok: false, error: e.message });
    }
  }

  try {
    for (let i = 0; i < SUCCESS_ITERATIONS; i++) {
      const trailerId = TRAILER_IDS[i % TRAILER_IDS.length];
      const wantFirstNight = i % 3 === 0;
      // firstnight only actually applies >=14 days out (see pricing.js);
      // requesting it closer in is harmless - the backend just silently
      // charges in full instead, same as the real site would.
      const arrival = wantFirstNight ? randomArrival(15, 60) : randomArrival(1, 60);
      const nights = randomInt(3, 14);
      await runOne({
        label: 'success', trailerId, arrival, nights,
        plan: wantFirstNight ? 'firstnight' : 'full', card: CARDS.success,
      });
    }

    for (let i = 0; i < DECLINE_AT_CHECKOUT_ITERATIONS; i++) {
      const trailerId = TRAILER_IDS[randomInt(0, TRAILER_IDS.length - 1)];
      await runOne({
        label: 'decline-at-checkout', trailerId,
        arrival: randomArrival(1, 60), nights: randomInt(3, 14),
        plan: 'full', card: CARDS.declineAtCheckout,
      });
    }

    await testBalanceChargeDeclineAndRetry();
  } finally {
    await browser.close();
    await dbPool.end();
  }

  console.log('\n--- Invariant check against everything currently in the database ---');
  const allBookings = await api.getAllBookings();
  const problems = validateStore(allBookings);
  if (problems.length) {
    console.error(`${problems.length} invariant violation(s):`);
    problems.forEach((p) => console.error(`  - ${p}`));
  } else {
    console.log(`Clean: ${allBookings.length} total bookings, no overlaps, all stays 3-14 nights.`);
  }

  const failed = log.filter((l) => !l.ok);
  console.log(`\n--- Summary: ${log.length - failed.length}/${log.length} iterations passed ---`);
  if (failed.length) {
    failed.forEach((f) => console.error(`  FAILED [${f.label}]: ${f.error}`));
  }

  console.log(`\nTagged data uses guest names "SIM Guest N" and emails "@stripesim.test" - clean up with:`);
  console.log(`  DELETE FROM bookings WHERE guest LIKE 'SIM Guest %' OR email LIKE '%@stripesim.test';`);

  process.exit(failed.length || problems.length ? 1 : 0);
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
