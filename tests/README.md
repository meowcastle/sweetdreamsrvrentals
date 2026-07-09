# Sweet Dreams RV — Booking UI test suite (Playwright)

Automated UI tests for the customer booking flow in `Sweet Dreams RV.dc.html`,
including a **chaos / fuzz** suite that hammers the UI with randomized actions and
asserts the booking rules can never be violated.

## What it checks

**Invariants (never allowed to break):**
- A trailer never has two overlapping bookings. Occupancy is half-open
  `[arrival, arrival + nights)`, so same-day turnaround (one guest checks out as the
  next checks in) is allowed and is tested explicitly.
- Every stay is 3–14 nights.
- Bookings only reference real trailers, with valid dates.

**Behavior:**
- Reserve modal opens; required fields (name, valid email, phone, campground) gate
  the CTA; "Other" campground requires the site/address field.
- Airbnb-style two-month calendar: 3-night minimum, 14-night maximum, booked nights
  unselectable, arrivals without 3 free nights ahead unselectable.
- Happy path writes a valid record to `localStorage.sd_web_bookings` with the
  combined campground + site value.
- Returning-guest details prefill on the next visit.
- **Chaos:** N random sessions of M actions each. After *every* action the suite
  re-reads the persisted store and fails if it ever contains an overlap, an
  out-of-range stay, or if the page threw. Adversarial field inputs (XSS/SQL/emoji/
  huge strings/null bytes) are part of the fuzz.

## Setup

The real backend (build order step 15) must be running first - the frontend
still gets served statically, but every fetch it makes now goes to Postgres,
not localStorage:

```bash
docker compose up -d   # from the project root
```

```bash
cd tests
npm install
npm run install:browsers   # playwright install chromium
```

A static file server serves the **project root** (one level up) so the Design
Component runtime (`support.js`, `image-slot.js`) and assets resolve exactly as in
the live preview. The default server is Python's stdlib:

```
python3 -m http.server 4321 --bind 127.0.0.1   # started automatically by Playwright
```

No Python? Use Node's `serve` instead:

```bash
SERVE_CMD="npx --yes serve -l 4321 ." npm test
```

> The DC loads React from a CDN in its `<helmet>`, so the test machine needs
> internet access on first load (Playwright caches thereafter).

## Running

```bash
npm test                 # everything, on desktop + mobile (Pixel 7) projects
npm run test:smoke       # render + modal + calendar smoke checks
npm run test:flow        # booking happy path + persistence
npm run test:logic       # date rules + required-field gating
npm run test:chaos       # the fuzz suite
npm run report           # open the HTML report after a run
```

Run just the mobile project (mission-critical for this product):

```bash
npx playwright test --project=mobile-chromium
```

## Chaos knobs

| Env | Default | Meaning |
|-----|---------|---------|
| `CHAOS_RUNS`  | `6`  | independent random sessions |
| `CHAOS_STEPS` | `60` | random actions per session |
| `CHAOS_SEED`  | time | base seed; run *n* uses `<seed>-<n>` |

Every session's seed is printed in its test title. **To reproduce a failure**, copy
the seed from the failing title and pin it:

```bash
CHAOS_SEED=1720000000000 CHAOS_RUNS=1 CHAOS_STEPS=60 npx playwright test specs/chaos.spec.js
```

Crank it up for a soak test:

```bash
CHAOS_RUNS=25 CHAOS_STEPS=200 npm run test:chaos
```

## Layout

```
tests/
  playwright.config.js     # serves project root, desktop + mobile projects
  global-setup.js          # pins CHAOS_SEED once; fails fast if the backend isn't up
  package.json
  fixtures/
    app.js                 # page object: every selector + flow (openReserve, pickValidRange, completeBooking, …)
    api.js                 # direct HTTP to the real backend from Node: seeding, admin login, reading bookings back
    db.js                  # direct Postgres TRUNCATE for clearStore() - not a backend endpoint, test-only
    invariants.js          # pure booking rules: overlaps(), validateStore(), isPlaceable()
    rng.js                 # seedable PRNG so chaos failures reproduce
  specs/
    smoke.spec.js
    booking-flow.spec.js
    date-logic.spec.js
    required-fields.spec.js
    chaos.spec.js
```

## Maintenance

Selectors live in **one place** — `fixtures/app.js`. If the markup changes (button
text, placeholders, calendar cell shape), update the locators there and every spec
follows. The rules in `fixtures/invariants.js` mirror the logic in the DC; if the
booking policy changes (min/max nights, turnaround), update both together.

## Notes / assumptions

- Booking data is the real backend's Postgres now (build order step 15), not
  `localStorage` - `app.seed()`, `webBookings()`/`allBookings()`, and
  `clearStore()` all go through `fixtures/api.js`/`db.js` instead. The only
  `localStorage` key left is `sd_guest` (returning-guest contact prefill),
  which `clearStore()` still resets between tests.
- `create-checkout-session` is intercepted (`fixtures/app.js`,
  `_handleCheckoutMock`) rather than driven through a real Stripe test-mode
  checkout: a real hosted-checkout round trip is too slow/networked for a
  fuzz loop. The intercept turns it into a direct booking write via
  `fixtures/db.js`'s `createBooking()` - the same conflict-checked insert the
  real `checkout.session.completed` webhook uses in production - so the
  actual booking invariants under test are exercised for real; only Stripe's
  own hosted page is skipped. There is no public `POST /api/bookings` route
  anymore (it was an unauthenticated way to write a "confirmed, paid"
  booking from client-claimed totals, removed as a security fix); fixtures
  talk to Postgres directly instead.
- The calendar only blocks a date once **every** trailer is booked that
  night (`fleetBookedNights()` in the DC file) - a single trailer's booking
  leaves the date pickable for a guest willing to take a different trailer.
  Tests that need to see a specific day struck through seed the whole fleet
  for those dates, not just one trailer (see `fleetBooking()` in
  `date-logic.spec.js`).
- The calendar is a 2-up display (this month + next, both always mounted).
  `dayCells()` takes an optional month label to scope the query to one
  month's grid - without it, a day number like "10" can resolve to either
  visible month depending on DOM order.
