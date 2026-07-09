// Direct Postgres access for test setup/teardown only. Never used by the app
// itself - this resets the real backend's database between test runs, the
// same role localStorage.clear() played before the booking data moved there
// (build order step 15). Deliberately NOT a backend API endpoint: a "wipe all
// bookings" HTTP route would be a real footgun to leave in the deployed app,
// even admin-gated, so this stays a test-only, direct DB connection instead.
const { Pool } = require('pg');

// Host-mapped port from docker-compose.yml's POSTGRES_HOST_PORT (default
// 5433) - NOT the in-container 5432 the app itself connects to. Credentials
// match the project root .env's POSTGRES_USER/PASSWORD/DB (docker-compose
// reads that file automatically); override TEST_DATABASE_URL if yours differ.
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL || 'postgres://sweetdreams:change-me@localhost:5433/sweetdreams';

const pool = new Pool({ connectionString: TEST_DATABASE_URL });

async function resetDb() {
  await pool.query('TRUNCATE bookings, booking_status_overrides, email_queue RESTART IDENTITY CASCADE');
}

// Test-only: createBooking() below never sets stripe_checkout_session_id
// itself - only the real checkout.session.completed webhook does that
// (deliberately: letting an unauthenticated client claim any session id
// would be a real trust boundary to give up). Real webhook bookings always
// have id === stripe_checkout_session_id, so the checkout mock calls this
// afterward to reproduce that same invariant.
async function setCheckoutSessionId(bookingId, sessionId) {
  await pool.query('UPDATE bookings SET stripe_checkout_session_id = $1 WHERE id = $2', [sessionId, bookingId]);
}

// Test-only substitute for the now-removed public POST /api/bookings route
// (see backend/src/routes/bookings.js) - that route used to write a
// "confirmed, paid" booking straight from client-claimed totals with no
// Stripe verification and no auth, which was a real hole (anyone who found
// the URL could curl a fake paid booking into existence). Real web bookings
// are now only ever written by the checkout.session.completed webhook.
// Fixtures still need a fast, non-Stripe way to create a confirmed booking
// (calendar seeding, the checkout mock), so this mirrors that removed
// route's own insertBooking() call - same conflict check, same columns -
// just against Postgres directly instead of over HTTP. No advisory lock:
// playwright.config.js runs a single worker, so there's no real concurrent
// writer to race against here.
async function createBooking(fields) {
  const {
    id, trailer, arrival, nights, guest, phone, email, site, addons, total,
    paymentPlan, deposit, dueToday, grandTotal, balanceLater, balanceChargeDate,
  } = fields;
  const bookingId = id || ('test' + Date.now() + Math.random().toString(36).slice(2));

  const conflict = await pool.query(
    `SELECT 1 FROM bookings b
     LEFT JOIN booking_status_overrides o ON o.booking_id = b.id
     WHERE b.trailer = $1 AND b.id != $4 AND COALESCE(o.cancelled, false) = false
       AND daterange(b.arrival, b.arrival + b.nights) && daterange($2::date, $2::date + $3::int)
     LIMIT 1`,
    [trailer, arrival, nights, bookingId],
  );
  if (conflict.rows.length) return { status: 409, body: { error: 'trailer_unavailable' } };

  try {
    await pool.query(
      `INSERT INTO bookings (
         id, trailer, arrival, nights, guest, phone, email, site, addons, total,
         type, source, plan, deposit, paid_today, grand_total, due_today,
         balance_later, balance_charge_date
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'confirmed','web',$11,$12,$13,$14,$13,$15,$16)`,
      [bookingId, trailer, arrival, nights, guest, phone || null, email || null, site || null,
        addons || [], total || 0, paymentPlan || null, deposit ?? null, dueToday ?? null,
        grandTotal ?? null, balanceLater ?? null, balanceChargeDate || null],
    );
    return { status: 201, body: { id: bookingId } };
  } catch (e) {
    if (e.code === '23505') return { status: 409, body: { error: 'duplicate_id' } };
    throw e;
  }
}

async function closeDb() {
  await pool.end();
}

module.exports = { resetDb, closeDb, setCheckoutSessionId, createBooking };
