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

async function closeDb() {
  await pool.end();
}

module.exports = { resetDb, closeDb };
