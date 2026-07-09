// Direct HTTP access to the real backend from the TEST RUNNER's Node
// process (not through the browser page) - used for seeding pre-existing
// bookings, reading back persisted state for invariant checks, and admin
// login, all of which used to be plain localStorage reads/writes before
// build order step 5 moved booking data to Postgres.
const BASE_URL = process.env.TEST_API_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'owner@sweetdreamsrvrentals.com';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'craterlake';

async function checkBackendUp() {
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    return res.ok;
  } catch (e) {
    return false;
  }
}

// The admin session cookie is only needed to read back full booking detail
// (GET /api/bookings/availability is public but only returns
// trailer/arrival/nights - enough for invariant checks, not enough for
// assertions on guest/email/source/site). Cached for the process lifetime:
// sessions last 12h server-side, and re-logging in on every read burns
// through the login route's own rate limiter (10 attempts/15min) almost
// immediately across a full test run.
let cachedCookie = null;
async function adminLogin() {
  if (cachedCookie) return cachedCookie;
  const res = await fetch(`${BASE_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (!res.ok) throw new Error(`admin login failed: ${res.status}`);
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) throw new Error('admin login did not return a session cookie');
  cachedCookie = setCookie.split(';')[0];
  return cachedCookie;
}

async function getAllBookings() {
  const cookie = await adminLogin();
  const res = await fetch(`${BASE_URL}/api/bookings`, { headers: { Cookie: cookie } });
  if (!res.ok) throw new Error(`GET /api/bookings failed: ${res.status}`);
  return res.json();
}

module.exports = { BASE_URL, checkBackendUp, adminLogin, getAllBookings };
