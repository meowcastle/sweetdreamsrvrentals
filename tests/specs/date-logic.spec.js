const { test, expect } = require('@playwright/test');
const { App } = require('../fixtures/app');
const { iso, DAY, TRAILER_IDS } = require('../fixtures/invariants');

// Deterministic regardless of the day the suite runs: work in a month two ahead
// of today so every referenced date is comfortably in the future & fully visible.
function targetMonth() {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + 2, 1);
  return { year: d.getFullYear(), monthIndex: d.getMonth(), monthName: d.toLocaleString('en-US', { month: 'long' }) };
}
function isoFor(year, monthIndex, day) {
  return iso(new Date(year, monthIndex, day).getTime());
}

// The calendar only blocks a date once EVERY trailer is booked that night
// (fleetBookedNights() in the DC file) - a single trailer's booking leaves
// the date pickable for a guest willing to take a different trailer, with
// the per-trailer conflict surfaced only after dates are chosen. Tests that
// want to see a day struck through in the calendar itself need the whole
// fleet booked, not just one trailer.
function fleetBooking(arrival, nights) {
  return TRAILER_IDS.map((trailer, i) => ({ id: `seed-${trailer}`, trailer, arrival, nights }));
}

test.describe('date & availability logic', () => {
  let app;
  test.beforeEach(async ({ page }) => {
    app = new App(page);
    await app.goto();
    await app.clearStore();
    await page.reload();
    await app.waitReady();
  });

  test('enforces the 3-night minimum: no 1- or 2-night departure is selectable', async () => {
    await app.openReserve('Charlie');
    await app.openCalendar();

    let cells = await app.dayCells();
    const arrival = cells.find((c) => c.selectable);
    expect(arrival).toBeTruthy();
    await app.clickDay(arrival.idx);

    // In departure mode, every selectable day must be >= arrival + 3.
    cells = await app.dayCells();
    const selectableDays = cells.filter((c) => c.selectable).map((c) => c.day);
    for (const d of selectableDays) {
      // days are within the same visible grid; guard against month wrap
      if (d > arrival.day) expect(d - arrival.day).toBeGreaterThanOrEqual(3);
    }
    app.assertNoPageErrors();
  });

  test('does not allow a departure beyond the 14-night maximum', async () => {
    await app.openReserve('Charlie');
    await app.openCalendar();

    let cells = await app.dayCells();
    const arrival = cells.find((c) => c.selectable);
    await app.clickDay(arrival.idx);
    cells = await app.dayCells();
    const selectableDays = cells.filter((c) => c.selectable).map((c) => c.day);
    for (const d of selectableDays) {
      if (d > arrival.day) expect(d - arrival.day).toBeLessThanOrEqual(14);
    }
  });

  test('a night blocked by an existing booking is struck through / unselectable', async () => {
    const { year, monthIndex, monthName } = targetMonth();
    // Whole fleet booked the 10th–13th (3 nights) of the target month.
    await app.seed(fleetBooking(isoFor(year, monthIndex, 10), 3));
    await app.openReserve('Charlie');
    await app.openCalendar();
    await app.gotoMonth(monthName, year);

    const cells = await app.dayCells(`${monthName} ${year}`);
    // The booked nights are the 10, 11, 12 (checkout on the 13th is free again).
    for (const day of [10, 11, 12]) {
      const cell = cells.find((c) => c.day === day);
      if (cell) expect(cell.selectable, `day ${day} should be blocked`).toBe(false);
    }
  });

  test('arrival without 3 free nights ahead is not selectable', async () => {
    const { year, monthIndex, monthName } = targetMonth();
    // Book the 12th–15th. The 10th's 3-night window (10,11,12) touches the
    // block, so the 10th must NOT be a valid arrival. The 9th's window
    // (9,10,11) doesn't touch it at all and stays a valid arrival.
    await app.seed(fleetBooking(isoFor(year, monthIndex, 12), 3));
    await app.openReserve('Charlie');
    await app.openCalendar();
    await app.gotoMonth(monthName, year);

    const cells = await app.dayCells(`${monthName} ${year}`);
    const tenth = cells.find((c) => c.day === 10);
    if (tenth) expect(tenth.selectable, 'the 10th lacks 3 free nights ahead').toBe(false);
  });

  test('same-day turnaround is allowed (checkout day is bookable as an arrival)', async () => {
    const { year, monthIndex, monthName } = targetMonth();
    // Whole fleet booked 5th–8th → checkout on the 8th. The 8th should be a
    // valid arrival despite being adjacent to the fully-booked range.
    await app.seed(fleetBooking(isoFor(year, monthIndex, 5), 3));
    await app.openReserve('Charlie');
    await app.openCalendar();
    await app.gotoMonth(monthName, year);

    const cells = await app.dayCells(`${monthName} ${year}`);
    const eighth = cells.find((c) => c.day === 8);
    if (eighth) expect(eighth.selectable, 'the 8th is a turnaround day and should be selectable').toBe(true);
  });

  test('cannot double-book: once booked, those nights become unselectable', async () => {
    const { year, monthIndex, monthName } = targetMonth();
    // Pre-book the whole fleet 10th–13th, then try to book Charlie again in the same month.
    await app.seed(fleetBooking(isoFor(year, monthIndex, 10), 3));
    await app.openReserve('Charlie');
    await app.openCalendar();
    await app.gotoMonth(monthName, year);

    const cells = await app.dayCells(`${monthName} ${year}`);
    // Every already-booked night must be unavailable to the next guest.
    for (const day of [10, 11, 12]) {
      const cell = cells.find((c) => c.day === day);
      if (cell) expect(cell.selectable, `booked night ${day} must not be re-bookable`).toBe(false);
    }
    app.assertNoPageErrors();
  });
});
