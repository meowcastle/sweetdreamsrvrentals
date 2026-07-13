#!/usr/bin/env node
// Real-Stripe volume simulation against STAGING (not localhost). Adapted from
// stripe-sim.js: same real checkouts, real card numbers, real webhook flow -
// but verified via the PUBLIC /api/bookings/availability endpoint instead of
// the admin-authenticated /api/bookings + direct-DB invariant checks, since
// the NAS's Postgres isn't reachable from this machine. Also skips
// testBalanceChargeDeclineAndRetry(), which requires writing directly to the
// bookings table to corrupt a saved payment method - no substitute for that
// without DB access, so it's simply not exercised here.
//
// Usage: node tests/stripe-sim-staging.js

const { chromium } = require('@playwright/test');
const { DEFAULTS, computeExpected } = require('../backend/src/pricing');
const { validateStore } = require('./fixtures/invariants');

const SITE_ORIGIN = 'https://staging.sweetdreamsrvrentals.com';
const API_ORIGIN = 'https://staging.sweetdreamsrvrentals.com';

const TRAILER_IDS = ['charlie', 'ella', 'virginia', 'marylou', 'jerry', 'patricia', 'nola', 'billybob'];
const CARDS = {
  success: '4242424242424242',
  declineAtCheckout: '4000000000000002',
};

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

async function fetchAvailability() {
  const res = await fetch(`${API_ORIGIN}/api/bookings/availability`);
  if (!res.ok) throw new Error(`GET /api/bookings/availability failed: ${res.status}`);
  return res.json();
}

async function createCheckoutSession({ trailerId, arrival, nights, plan, guest, email }) {
  // No DB access from this machine to staging's Postgres - use the hardcoded
  // DEFAULTS directly rather than getEffectiveConfig() (which queries
  // pricing_config). Verified earlier tonight that staging's pricing_config
  // row is unset (null), so DEFAULTS is exactly what the live site is using.
  const cfg = DEFAULTS;
  const expected = await computeExpected(cfg, { trailerId, arrival, nights, deliverySite: '', addons: [], requestedPlan: plan });
  const grandTotalCents = Math.round(expected.grandTotal * 100);
  const res = await fetch(`${API_ORIGIN}/api/create-checkout-session`, {
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

async function driveCheckout(browser, checkoutUrl, cardNumber) {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(checkoutUrl);
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

    const saveInfo = page.getByRole('checkbox', { name: /save my information/i });
    if (await saveInfo.isChecked().catch(() => false)) await saveInfo.uncheck();

    await page.getByTestId('hosted-payment-submit-button').click();

    const result = await Promise.race([
      page.waitForURL(`${SITE_ORIGIN}/**`, { timeout: 20000 }).then(() => 'success'),
      page.waitForSelector('text=/declined|failed|incorrect/i', { timeout: 20000 }).then(() => 'declined'),
    ]).catch(() => 'timeout');

    return result;
  } finally {
    await context.close();
  }
}

// No booking id available from the public endpoint, so confirm by matching
// trailer+arrival+nights against a before/after snapshot instead.
async function pollForBookingPublic(trailerId, arrival, nights, beforeSnapshot, { attempts = 15, delayMs = 1000 } = {}) {
  const match = (b) => b.trailer === trailerId && b.arrival === arrival && Number(b.nights) === nights;
  for (let i = 0; i < attempts; i++) {
    const current = await fetchAvailability();
    const wasThereBefore = beforeSnapshot.some(match);
    const isThereNow = current.some(match);
    if (isThereNow && !wasThereBefore) return true;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return false;
}

async function main() {
  const health = await fetch(`${API_ORIGIN}/api/health`).catch(() => null);
  if (!health || !health.ok) throw new Error(`Staging not reachable at ${API_ORIGIN}/api/health`);

  const browser = await chromium.launch();
  const log = [];
  let counter = 0;

  async function runOne({ label, trailerId, arrival, nights, plan, card }) {
    counter += 1;
    const guest = `SIM Guest ${Date.now()}-${counter}`;
    const email = `sim-${Date.now()}-${counter}@stripesim.test`;
    console.log(`[${counter}] ${label}: ${trailerId} ${arrival} x${nights}n plan=${plan} card=${card.slice(-4)}`);
    try {
      const beforeSnapshot = await fetchAvailability();
      const { url } = await createCheckoutSession({ trailerId, arrival, nights, plan, guest, email });
      const result = await driveCheckout(browser, url, card);

      if (card === CARDS.declineAtCheckout) {
        if (result !== 'declined') throw new Error(`expected decline at checkout, got "${result}"`);
        console.log(`    ok: correctly declined at checkout, no booking created`);
        log.push({ label, ok: true, note: 'declined as expected' });
        return;
      }

      if (result !== 'success') throw new Error(`expected success, got "${result}"`);
      const found = await pollForBookingPublic(trailerId, arrival, nights, beforeSnapshot);
      if (!found) throw new Error(`booking for ${trailerId} ${arrival} x${nights}n never appeared in availability after checkout completed`);
      console.log(`    ok: webhook wrote booking (confirmed via public availability)`);
      log.push({ label, ok: true });
    } catch (e) {
      console.error(`    FAIL: ${e.message}`);
      log.push({ label, ok: false, error: e.message });
    }
  }

  try {
    for (let i = 0; i < SUCCESS_ITERATIONS; i++) {
      const trailerId = TRAILER_IDS[i % TRAILER_IDS.length];
      const wantFirstNight = i % 3 === 0;
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

    console.log('\n[balance-charge-decline-and-retry] SKIPPED - requires direct DB write access to corrupt a payment method, not available without a working DB tunnel to the NAS.');
  } finally {
    await browser.close();
  }

  console.log('\n--- Invariant check against everything currently in staging (via public availability endpoint) ---');
  const allBookings = await fetchAvailability();
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

  console.log(`\nTagged data uses guest names "SIM Guest ..." and emails "@stripesim.test" - clean up via psql on the NAS:`);
  console.log(`  DELETE FROM bookings WHERE guest LIKE 'SIM Guest %' OR email LIKE '%@stripesim.test';`);

  process.exit(failed.length || problems.length ? 1 : 0);
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
