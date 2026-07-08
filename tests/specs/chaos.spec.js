const { test, expect } = require('@playwright/test');
const { App } = require('../fixtures/app');
const { makeRng } = require('../fixtures/rng');
const { validateStore, iso } = require('../fixtures/invariants');

// ── Configuration (override via env) ─────────────────────────────────────────
//   CHAOS_RUNS   how many independent random sessions          (default 6)
//   CHAOS_STEPS  random actions per session                    (default 60)
//   CHAOS_SEED   base seed; run N uses seed "<base>-<N>"        (default time-based)
// A failing run prints its exact seed so you can reproduce with CHAOS_SEED=... CHAOS_RUNS=1.
const RUNS = Number(process.env.CHAOS_RUNS || 6);
const STEPS = Number(process.env.CHAOS_STEPS || 60);
const BASE_SEED = process.env.CHAOS_SEED || String(Date.now());

const TRAILERS = ['Charlie', 'Ella', 'Virginia', 'Mary Lou', 'Jerry', 'Patricia', 'Nola', 'Billy Bob'];
const CAMPGROUNDS = ['Indian Mary', 'Emigrant Lake', 'Willow Lake', 'Rogue Elk'];
// Adversarial inputs the form should survive without crashing or persisting bad data.
const NASTY_STRINGS = [
  '', '   ', 'a'.repeat(500), '<script>alert(1)</script>', '"; DROP TABLE bookings;--',
  '😀🚐🔥', '\u0000\u0007', 'null', '{{ 7*7 }}', 'test@', 'plainbad', 'ok@example.com',
];

// One weighted random action against the current UI state. Every branch is wrapped
// so a missing element (wrong step) is a skipped no-op, not a test failure — the
// point is that the app never crashes and never persists an invalid store.
async function step(app, page, rng) {
  const action = rng.weighted([
    ['open', 3],
    ['close', 1],
    ['trailer', 4],
    ['nights', 3],
    ['calendar', 4],
    ['pickDates', 5],
    ['fill', 4],
    ['selectCampground', 2],
    ['primary', 5],
    ['continue', 3],
    ['pay', 3],
    ['back', 1],
  ]);

  try {
    switch (action) {
      case 'open':
        if (await app.reserveOpener().isVisible().catch(() => false)) await app.openReserve();
        break;
      case 'close':
        await app.closeReserve();
        break;
      case 'trailer': {
        // Trailer chips live behind the modal; only click them when it's closed,
        // otherwise the click hangs on pointer interception.
        const modalOpen = await page.getByPlaceholder('Full name').isVisible().catch(() => false);
        if (!modalOpen) await app.pickTrailer(rng.pick(TRAILERS));
        break;
      }
      case 'nights': {
        const label = rng.bool() ? /\+/ : /−|-/;
        const btn = page.getByRole('button', { name: label }).first();
        if (await btn.isVisible().catch(() => false)) await btn.click({ timeout: 1000 });
        break;
      }
      case 'calendar':
        if (await app.tripDatesButton().isVisible().catch(() => false)) {
          await app.tripDatesButton().click({ timeout: 1000 });
          if (rng.bool(0.4)) await app.nextMonthButton().click({ timeout: 1000 }).catch(() => {});
        }
        break;
      case 'pickDates': {
        const cells = await app.dayCells().catch(() => []);
        const selectable = cells.filter((c) => c.selectable);
        if (selectable.length) {
          const pick = rng.pick(selectable);
          await app.clickDay(pick.idx).catch(() => {});
          // sometimes chase a departure too
          if (rng.bool(0.6)) {
            const after = (await app.dayCells().catch(() => [])).filter((c) => c.selectable);
            if (after.length) await app.clickDay(rng.pick(after).idx).catch(() => {});
          }
        }
        break;
      }
      case 'fill': {
        const set = async (ph, val) => {
          const loc = page.getByPlaceholder(ph);
          if (await loc.isVisible().catch(() => false)) await loc.fill(val, { timeout: 1000 });
        };
        await set('Full name', rng.pick(NASTY_STRINGS));
        await set('you@email.com', rng.pick(NASTY_STRINGS));
        await set('(541) 000-0000', rng.pick(NASTY_STRINGS));
        break;
      }
      case 'selectCampground': {
        const sel = page.locator('select');
        if (await sel.isVisible().catch(() => false)) {
          const values = await sel.locator('option').evaluateAll((os) => os.map((o) => o.value));
          if (values.length) await sel.selectOption(rng.pick(values)).catch(() => {});
        }
        break;
      }
      case 'primary': {
        const cta = app.primaryCta();
        if (await cta.isVisible().catch(() => false)) await cta.click({ timeout: 1000 });
        break;
      }
      case 'continue': {
        const c = app.continueButton();
        if (await c.isVisible().catch(() => false)) await c.click({ timeout: 1000 });
        break;
      }
      case 'pay': {
        const p = app.payButton();
        if (await p.isVisible().catch(() => false)) await p.click({ timeout: 1000 });
        break;
      }
      case 'back': {
        const b = page.getByRole('button', { name: /back|edit details/i }).first();
        if (await b.isVisible().catch(() => false)) await b.click({ timeout: 1000 });
        break;
      }
    }
  } catch (_) {
    /* element churn between check and act — expected under fuzzing */
  }
}

test.describe('chaos / fuzz', () => {
  for (let run = 0; run < RUNS; run++) {
    const seed = `${BASE_SEED}-${run}`;

    test(`random session #${run + 1} keeps every invariant (seed=${seed})`, async ({ page }) => {
      test.setTimeout(120_000);
      const app = new App(page);
      const rng = makeRng(seed);
      await app.goto();
      await app.clearStore();
      await page.reload();
      await app.waitReady();

      for (let i = 0; i < STEPS; i++) {
        await step(app, page, rng);

        // After EVERY action the persisted store must remain valid...
        const bookings = await app.allBookings();
        const problems = validateStore(bookings);
        expect(
          problems,
          `seed=${seed} step=${i} action produced an invalid booking store:\n${problems.join('\n')}`
        ).toEqual([]);

        // ...and the app must never have thrown.
        expect(app.errors, `seed=${seed} step=${i} page errors:\n${app.errors.join('\n')}`).toEqual([]);
      }
    });
  }

  test('repeated attempts on the same trailer+dates never double-book', async ({ page }) => {
    test.setTimeout(120_000);
    const app = new App(page);
    await app.goto();
    await app.clearStore();
    await page.reload();
    await app.waitReady();

    // First booking succeeds.
    const afterFirst = await app.completeBooking({ trailer: 'Virginia', nights: 4 });
    expect(afterFirst).toBe(1);
    const first = (await app.webBookings())[0];

    // Try five more times to grab overlapping dates on the same trailer. The
    // calendar should block those nights, so no second overlapping record appears.
    for (let i = 0; i < 5; i++) {
      await app.openReserve('Virginia');
      await app.openCalendar();
      // Navigate to the month of the existing booking and try to pick its nights.
      const d = new Date(first.arrival + 'T00:00:00');
      await app.gotoMonth(d.toLocaleString('en-US', { month: 'long' }), d.getFullYear());
      const cells = await app.dayCells();
      const bookedDay = cells.find((c) => c.day === d.getDate());
      if (bookedDay && bookedDay.selectable) {
        // If somehow selectable, drive the full flow — the store guard must still reject overlap.
        await app.clickDay(bookedDay.idx);
        const after = (await app.dayCells()).filter((c) => c.selectable);
        if (after.length) await app.clickDay(after[0].idx);
        await app.fillGuest({ campground: 'Indian Mary' });
        await app.checkAvailability();
        if (await app.continueButton().isVisible().catch(() => false)) {
          await app.continueButton().click();
          await app.payButton().click().catch(() => {});
        }
      }
      await app.closeReserve();

      const all = await app.allBookings();
      expect(validateStore(all), `overlap after attempt ${i + 1}`).toEqual([]);
    }

    app.assertNoPageErrors();
  });
});
