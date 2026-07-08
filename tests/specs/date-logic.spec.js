const { test, expect } = require('@playwright/test');
const { App } = require('../fixtures/app');
const { iso, DAY } = require('../fixtures/invariants');

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
    // Charlie booked the 10th–13th (3 nights) of the target month.
    await app.seed([
      { id: 'seed1', trailer: 'charlie', arrival: isoFor(year, monthIndex, 10), nights: 3 },
    ]);
    await app.openReserve('Charlie');
    await app.openCalendar();
    await app.gotoMonth(monthName, year);

    const cells = await app.dayCells();
    // The booked nights are the 10, 11, 12 (checkout on the 13th is free again).
    for (const day of [10, 11, 12]) {
      const cell = cells.find((c) => c.day === day);
      if (cell) expect(cell.selectable, `day ${day} should be blocked`).toBe(false);
    }
  });

  test('arrival without 3 free nights ahead is not selectable', async () => {
    const { year, monthIndex, monthName } = targetMonth();
    // Book the 12th–15th. The 10th only has 2 free nights (10,11) before the block,
    // so the 10th must NOT be a valid arrival.
    await app.seed([
      { id: 'seed2', trailer: 'charlie', arrival: isoFor(year, monthIndex, 12), nights: 3 },
    ]);
    await app.openReserve('Charlie');
    await app.openCalendar();
    await app.gotoMonth(monthName, year);

    const cells = await app.dayCells();
    const tenth = cells.find((c) => c.day === 10);
    if (tenth) expect(tenth.selectable, 'the 10th lacks 3 free nights ahead').toBe(false);
    const ninth = cells.find((c) => c.day === 9);
    if (ninth) expect(ninth.selectable, 'the 9th also lacks 3 free nights ahead').toBe(false);
  });

  test('same-day turnaround is allowed (checkout day is bookable as an arrival)', async () => {
    const { year, monthIndex, monthName } = targetMonth();
    // Booked 5th–8th → checkout on the 8th. The 8th should be a valid arrival.
    await app.seed([
      { id: 'seed3', trailer: 'charlie', arrival: isoFor(year, monthIndex, 5), nights: 3 },
    ]);
    await app.openReserve('Charlie');
    await app.openCalendar();
    await app.gotoMonth(monthName, year);

    const cells = await app.dayCells();
    const eighth = cells.find((c) => c.day === 8);
    if (eighth) expect(eighth.selectable, 'the 8th is a turnaround day and should be selectable').toBe(true);
  });

  test('cannot double-book: once booked, those nights become unselectable', async () => {
    const { year, monthIndex, monthName } = targetMonth();
    // Pre-book Charlie 10th–13th, then try to book Charlie again in the same month.
    await app.seed([
      { id: 'seedD', trailer: 'charlie', arrival: isoFor(year, monthIndex, 10), nights: 3 },
    ]);
    await app.openReserve('Charlie');
    await app.openCalendar();
    await app.gotoMonth(monthName, year);

    const cells = await app.dayCells();
    // Every already-booked night must be unavailable to the next guest.
    for (const day of [10, 11, 12]) {
      const cell = cells.find((c) => c.day === day);
      if (cell) expect(cell.selectable, `booked night ${day} must not be re-bookable`).toBe(false);
    }
    app.assertNoPageErrors();
  });
});
