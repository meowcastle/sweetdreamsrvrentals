// Page object for the Sweet Dreams RV booking UI. Encapsulates every selector
// and multi-step flow so the specs read like user stories and a markup change
// only needs fixing in one place.

const { expect } = require('@playwright/test');
const { DAY, iso } = require('./invariants');
const api = require('./api');
const { resetDb, setCheckoutSessionId, createBooking } = require('./db');

// Single-segment path; encodeURIComponent handles the spaces in the filename.
const APP_PATH = '/' + encodeURIComponent('Sweet Dreams RV.dc.html');

// sd_guest (returning-guest contact prefill) is the only real remaining
// localStorage usage - booking data itself moved to Postgres in build order
// step 5, so there's no sd_web_bookings/sd_occupancy to clear anymore.
const STORE_KEYS = ['sd_guest'];

// The DC template runtime's "hint placeholder" rows (sc-for
// hint-placeholder-count) render before real list data streams in, and at
// least one image-slot's src briefly resolves to its own literal
// "{{ p.photo }}" template token during that placeholder pass - a one-time,
// self-healing 404 once real data arrives, not a real app error, and
// pre-existing in the DC runtime/markup, unrelated to backend wiring.
// Chrome's console message for this is the generic, URL-less "Failed to
// load resource... 404", indistinguishable by text from a real broken
// image, so it's correlated here via the 'response' event (which does have
// the URL) instead: each known-placeholder 404 response arms exactly one
// suppression, consumed by the next matching console message. Anything
// that isn't accounted for this way - a real broken image, any other
// resource failure - still fails the test.
function isKnownPlaceholderRequest(url) {
  return /%7B%7B.*%7D%7D/i.test(url) || /\{\{.*\}\}/.test(url);
}

class App {
  constructor(page) {
    this.page = page;
    this.errors = [];
    let pendingPlaceholder404s = 0;
    // Fail loudly on anything the app throws during a session.
    page.on('pageerror', (err) => this.errors.push('pageerror: ' + err.message));
    page.on('response', (res) => {
      if (res.status() >= 400 && isKnownPlaceholderRequest(res.url())) pendingPlaceholder404s++;
    });
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      if (/failed to load resource/i.test(msg.text()) && pendingPlaceholder404s > 0) {
        pendingPlaceholder404s--;
        return;
      }
      this.errors.push('console.error: ' + msg.text());
    });
  }

  // ---- lifecycle -------------------------------------------------------

  async goto() {
    // Idempotent: goto() can be called more than once in the same session
    // (e.g. navigating to a clean URL after a checkout redirect), and
    // page.route() handlers would otherwise stack.
    if (!this._routingInstalled) {
      await this._installBackendRouting();
      this._routingInstalled = true;
    }
    await this.page.goto(APP_PATH, { waitUntil: 'domcontentloaded' });
    await this.waitReady();
  }

  // The static file server (playwright.config.js) serves the frontend on its
  // own origin, separate from the real backend, so relative fetch('/api/...')
  // calls need forwarding. Also short-circuits create-checkout-session: a
  // real Stripe test-mode checkout is too slow/networked for a chaos loop, so
  // the intercepted request is instead turned into a direct booking write via
  // fixtures/db.js's createBooking() - the same conflict-checked insert the
  // real checkout.session.completed webhook does in production - and the
  // response is faked as a Stripe {url} pointing straight at successUrl.
  async _installBackendRouting() {
    await this.page.route('**/api/**', async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      if (url.pathname.endsWith('/api/create-checkout-session')) {
        return this._handleCheckoutMock(route, req);
      }
      const target = api.BASE_URL + url.pathname + url.search;
      // sd-bookings.js polls this every 10s for the whole page lifetime, so
      // there's always a real chance one of these is in-flight when a test
      // ends. Bounding it means an unresponsive backend can't hang page
      // teardown waiting on this route handler to settle.
      let response;
      try {
        response = await route.fetch({ url: target, timeout: 8000 });
      } catch (e) {
        await route.abort('timedout').catch(() => {});
        return;
      }
      await route.fulfill({ response });
    });
  }

  async _handleCheckoutMock(route, req) {
    let b;
    try { b = req.postDataJSON(); } catch (e) { b = {}; }
    const toDollars = (cents) => (Number(cents) || 0) / 100;
    // Real webhook-created bookings always have id === stripe_checkout_session_id
    // (see backend/src/routes/webhooks.js) - using a fake session id as this
    // mock booking's own id reproduces that, and the confirmation page's
    // fetchConfirmedBooking() needs it to resolve GET /api/bookings/by-session/:id.
    const sessionId = 'pw_test_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    const { status, body } = await createBooking({
      id: sessionId,
      trailer: b.trailerId, arrival: b.arrival, nights: Number(b.nights),
      guest: b.guest, email: b.email, phone: b.phone, site: b.deliverySite,
      addons: b.addons, total: toDollars(b.tripTotalCents),
      paymentPlan: b.paymentPlan, deposit: toDollars(b.depositAmountCents),
      dueToday: toDollars(b.dueTodayCents), grandTotal: toDollars(b.grandTotalCents),
      balanceLater: toDollars(b.balanceAmountCents), balanceChargeDate: b.balanceChargeDate,
    });
    if (status >= 400) {
      await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
      return;
    }
    await setCheckoutSessionId(sessionId, sessionId);
    // Mirrors Stripe's own {CHECKOUT_SESSION_ID} substitution on redirect.
    const url = (b.successUrl || '').replace('{CHECKOUT_SESSION_ID}', sessionId);
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ url }) });
  }

  // The DC streams in; wait until the hero reserve CTA has actually rendered.
  async waitReady() {
    await expect(this.reserveOpener()).toBeVisible({ timeout: 20_000 });
  }

  // Seed pre-existing bookings as real, confirmed Postgres rows (mirrors what
  // used to be a localStorage.sd_occupancy write), then reload so the app's
  // availability fetch picks them up.
  async seed(bookings) {
    for (const b of bookings) {
      const { status, body } = await createBooking({
        guest: 'Seed Guest', ...b,
      });
      if (status >= 400) throw new Error(`seed booking failed: ${status} ${JSON.stringify(body)}`);
    }
    await this.page.reload({ waitUntil: 'domcontentloaded' });
    await this.waitReady();
  }

  async clearStore() {
    await resetDb();
    await this.page.evaluate((keys) => keys.forEach((k) => localStorage.removeItem(k)), STORE_KEYS);
  }

  // ---- store readers ---------------------------------------------------

  // Full detail (guest/email/source/site/...), same shape for every caller -
  // there's no more "web bookings" vs "occupancy" distinction now that both
  // used to be separate localStorage keys and are now just rows in the same
  // bookings table.
  async webBookings() {
    return api.getAllBookings();
  }

  async allBookings() {
    return this.webBookings();
  }

  assertNoPageErrors() {
    expect(this.errors, 'page/console errors during session:\n' + this.errors.join('\n')).toEqual([]);
  }

  // ---- top-level locators ---------------------------------------------

  reserveOpener() {
    return this.page.getByRole('button', { name: /check availability & reserve/i }).first();
  }
  modal() {
    // The reserve dialog contains the required-field inputs.
    return this.page.locator('div', { has: this.page.getByPlaceholder('Full name') }).first();
  }
  tripDatesButton() {
    // Accessible name comes from the associated "Trip dates *" label, not
    // the button's own visible text ("Add your dates"/"Jul 9 → Jul 12").
    return this.page.getByRole('button', { name: /trip dates|add your dates|pick departure|→/i }).first();
  }
  primaryCta() {
    return this.page.getByRole('button', {
      name: /^\s*(check availability|fill in your details|pick your dates first)\s*$/i,
    });
  }
  continueButton() {
    return this.page.getByRole('button', { name: /continue to reserve/i });
  }
  payButton() {
    return this.page.getByRole('button', { name: /pay \$|deposit/i }).first();
  }
  backdrop() {
    return this.page.locator('div[style*="oklch(0.05 0.02 264 / 0.72)"]').first();
  }
  nextMonthButton() {
    return this.page.locator('button:has(svg path[d="M9 6l6 6-6 6"])').first();
  }
  prevMonthButton() {
    return this.page.locator('button:has(svg path[d="M15 6l-6 6 6 6"])').first();
  }

  // ---- flows -----------------------------------------------------------

  async openReserve(trailer) {
    // Trailer selection lives in the on-page quote builder, BEHIND the modal —
    // it must be chosen before the dialog opens.
    if (trailer) await this.pickTrailer(trailer);
    await this.reserveOpener().click();
    await expect(this.page.getByPlaceholder('Full name')).toBeVisible();
  }

  async closeReserve() {
    // Backdrop click dismisses the dialog. Force past pointer-interception.
    // Short timeout: this gets called speculatively (e.g. the chaos loop's
    // 'close' action fires regardless of whether anything is actually open),
    // and without a bound, waiting on a backdrop that doesn't exist hangs
    // indefinitely instead of just failing fast into the catch below.
    await this.backdrop().click({ position: { x: 5, y: 5 }, force: true, timeout: 1000 }).catch(() => {});
  }

  async pickTrailer(name) {
    // Fleet chips carry the whole card as their accessible name
    // ("Charlie Mid-size SUV tow · … from $149"), so match on the leading name.
    // Short timeout matches the fuzz loop's own action pattern: if a modal
    // backdrop is unexpectedly blocking this (e.g. still on the checkout
    // confirmation view), fail fast rather than eating Playwright's default
    // 30s click timeout.
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await this.page.getByRole('button', { name: new RegExp('^\\s*' + escaped) }).first().click({ timeout: 1000 });
  }

  async openCalendar() {
    await this.tripDatesButton().click();
    await this.page.waitForTimeout(250);
  }

  // Tag every visible day-circle with data-test-day and return their metadata.
  // A circle with cursor:pointer is selectable in the current calendar mode.
  // The calendar is a 2-up display (this month + next), both always mounted
  // at once - pass monthLabel (e.g. "September 2026") to scope the query to
  // just that month's grid; otherwise every day-number circle across BOTH
  // visible months is returned, and e.g. day 10 could resolve to either
  // month's own "10" depending on DOM order.
  async dayCells(monthLabel) {
    return this.page.evaluate((label) => {
      let root = document;
      if (label) {
        // The label's own text sits in a nested <span class="sc-interp">, so
        // match on trimmed textContent equality rather than requiring a leaf
        // element. querySelectorAll returns document order (ancestors before
        // descendants); an ancestor's textContent would include the whole
        // month's day numbers too, so the LAST exact match is the most
        // specific (deepest) one - the label div itself.
        const matches = [...document.querySelectorAll('div')].filter((d) => d.textContent.trim() === label);
        const labelEl = matches[matches.length - 1];
        if (labelEl) root = labelEl.parentElement;
      }
      const circles = [...root.querySelectorAll('div')].filter(
        (d) =>
          /^\d{1,2}$/.test(d.textContent.trim()) &&
          d.offsetParent &&
          getComputedStyle(d).borderRadius.includes('9999')
      );
      return circles.map((c, i) => {
        c.setAttribute('data-test-day', String(i));
        const st = getComputedStyle(c);
        return {
          idx: i,
          day: Number(c.textContent.trim()),
          selectable: st.cursor === 'pointer',
          strikethrough: st.textDecorationLine.includes('line-through'),
        };
      });
    }, monthLabel);
  }

  async clickDay(idx) {
    await this.page.locator(`[data-test-day="${idx}"]`).click();
  }

  // Advance the calendar until monthName+year is one of the two visible
  // months (the 2-up display always shows this month + next).
  async gotoMonth(monthName, year) {
    for (let i = 0; i < 24; i++) {
      const label = `${monthName} ${year}`;
      if (await this.page.getByText(label, { exact: true }).count()) return true;
      await this.nextMonthButton().click();
      await this.page.waitForTimeout(120);
    }
    return false;
  }

  // Pick a valid arrival then a valid departure (arrival + `nights`, default 3).
  // Returns {arrivalDay, departureDay} or null if nothing selectable is visible.
  async pickValidRange(nights = 3) {
    let cells = await this.dayCells();
    const arrival = cells.find((c) => c.selectable);
    if (!arrival) return null;
    await this.clickDay(arrival.idx);
    await this.page.waitForTimeout(150);
    // Now in departure mode — re-read; valid departures are the selectable set.
    cells = await this.dayCells();
    const wanted = cells.find((c) => c.selectable && c.day === arrival.day + nights);
    const departure = wanted || cells.find((c) => c.selectable);
    if (!departure) return null;
    await this.clickDay(departure.idx);
    await this.page.waitForTimeout(150);
    return { arrivalDay: arrival.day, departureDay: departure.day };
  }

  async fillGuest({ name = 'Test Guest', email = 'test@example.com', phone = '5415550100', campground = 'Indian Mary', site = '' } = {}) {
    await this.page.getByPlaceholder('Full name').fill(name);
    await this.page.getByPlaceholder('you@email.com').fill(email);
    await this.page.getByPlaceholder('(541) 000-0000').fill(phone);
    if (campground) {
      await this.page.locator('select').selectOption({ label: campground }).catch(async () => {
        await this.page.locator('select').selectOption(campground);
      });
    }
    if (site) await this.page.getByPlaceholder('Site number or address').fill(site);
  }

  async checkAvailability() {
    await this.primaryCta().click();
  }

  async isAvailable() {
    return (await this.page.getByText(/is available for your dates/i).count()) > 0;
  }
  async isConflict() {
    return (await this.page.getByText(/is booked/i).count()) > 0;
  }

  // Full happy path: open → pick trailer → pick dates → fill → check → pay.
  // Returns the number of web bookings after completion.
  async completeBooking({ trailer, nights = 3, guest } = {}) {
    await this.openReserve(trailer);
    await this.openCalendar();
    const range = await this.pickValidRange(nights);
    expect(range, 'expected a selectable date range in the calendar').not.toBeNull();
    await this.fillGuest(guest || {});
    await this.checkAvailability();
    await expect(this.continueButton()).toBeVisible({ timeout: 8000 });
    await this.continueButton().click();
    await expect(this.payButton()).toBeVisible({ timeout: 8000 });
    await this.payButton().click();
    // Two elements can match this text (one hidden, e.g. a different
    // confirmation variant elsewhere in the DOM) - filter to the visible one.
    await expect(this.page.getByText(/reservation confirmed|is reserved for/i).filter({ visible: true }).first()).toBeVisible({ timeout: 8000 });
    return (await this.webBookings()).length;
  }
}

module.exports = { App, APP_PATH, STORE_KEYS };
