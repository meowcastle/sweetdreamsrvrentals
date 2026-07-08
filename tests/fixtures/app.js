// Page object for the Sweet Dreams RV booking UI. Encapsulates every selector
// and multi-step flow so the specs read like user stories and a markup change
// only needs fixing in one place.

const { expect } = require('@playwright/test');
const { DAY, iso } = require('./invariants');

// Single-segment path; encodeURIComponent handles the spaces in the filename.
const APP_PATH = '/' + encodeURIComponent('Sweet Dreams RV.dc.html');

const STORE_KEYS = ['sd_web_bookings', 'sd_occupancy', 'sd_admin_overrides', 'sd_guest'];

class App {
  constructor(page) {
    this.page = page;
    this.errors = [];
    // Fail loudly on anything the app throws during a session.
    page.on('pageerror', (err) => this.errors.push('pageerror: ' + err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') this.errors.push('console.error: ' + msg.text());
    });
  }

  // ---- lifecycle -------------------------------------------------------

  async goto() {
    await this.page.goto(APP_PATH, { waitUntil: 'domcontentloaded' });
    await this.waitReady();
  }

  // The DC streams in; wait until the hero reserve CTA has actually rendered.
  async waitReady() {
    await expect(this.reserveOpener()).toBeVisible({ timeout: 20_000 });
  }

  // Seed the shared booking store, then reload so the app reads it at mount.
  // `key` defaults to sd_occupancy (the baseline the app treats as pre-existing).
  async seed(bookings, key = 'sd_occupancy') {
    await this.page.evaluate(
      ([k, b]) => localStorage.setItem(k, JSON.stringify(b)),
      [key, bookings]
    );
    await this.page.reload({ waitUntil: 'domcontentloaded' });
    await this.waitReady();
  }

  async clearStore() {
    await this.page.evaluate((keys) => keys.forEach((k) => localStorage.removeItem(k)), STORE_KEYS);
  }

  // ---- store readers ---------------------------------------------------

  async webBookings() {
    return this.page.evaluate(() => JSON.parse(localStorage.getItem('sd_web_bookings') || '[]'));
  }

  async allBookings() {
    return this.page.evaluate(() => {
      const web = JSON.parse(localStorage.getItem('sd_web_bookings') || '[]');
      const occ = JSON.parse(localStorage.getItem('sd_occupancy') || '[]');
      return [].concat(Array.isArray(web) ? web : [], Array.isArray(occ) ? occ : []);
    });
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
    return this.page.getByRole('button', { name: /add your dates|pick departure|→/i }).first();
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
    await this.backdrop().click({ position: { x: 5, y: 5 }, force: true }).catch(() => {});
  }

  async pickTrailer(name) {
    // Fleet chips carry the whole card as their accessible name
    // ("Charlie Mid-size SUV tow · … from $149"), so match on the leading name.
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await this.page.getByRole('button', { name: new RegExp('^\\s*' + escaped) }).first().click();
  }

  async openCalendar() {
    await this.tripDatesButton().click();
    await this.page.waitForTimeout(250);
  }

  // Tag every visible day-circle with data-test-day and return their metadata.
  // A circle with cursor:pointer is selectable in the current calendar mode.
  async dayCells() {
    return this.page.evaluate(() => {
      const circles = [...document.querySelectorAll('div')].filter(
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
    });
  }

  async clickDay(idx) {
    await this.page.locator(`[data-test-day="${idx}"]`).click();
  }

  // Advance the calendar until the first visible month matches monthName+year.
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
    await expect(this.page.getByText(/reservation confirmed|is reserved for/i)).toBeVisible({ timeout: 8000 });
    return (await this.webBookings()).length;
  }
}

module.exports = { App, APP_PATH, STORE_KEYS };
