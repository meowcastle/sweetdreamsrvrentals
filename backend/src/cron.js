const cron = require('node-cron');
const pool = require('./db');
const { chargeBalance } = require('./routes/bookings');

// Daily balance auto-charge sweep (build order step 12). Only picks up
// bookings that haven't been attempted yet (balance_charge_failed = false) -
// once a charge fails, it stays failed until a human uses the admin's
// retry-charge button, rather than the cron silently re-attempting the same
// declined card every day.
async function runBalanceChargeSweep() {
  const { rows } = await pool.query(
    `SELECT b.id FROM bookings b
     LEFT JOIN booking_status_overrides o ON o.booking_id = b.id
     WHERE b.plan = 'firstnight' AND b.balance_charge_date <= CURRENT_DATE
       AND b.balance_charge_failed = false AND b.paid_today < b.grand_total
       AND COALESCE(o.cancelled, false) = false`,
  );
  for (const row of rows) {
    try {
      const result = await chargeBalance(row.id);
      if (result.error && result.error !== 'already_charged') {
        console.error(`[balance-charge-sweep] booking ${row.id}: ${result.error}`);
      }
    } catch (e) {
      console.error(`[balance-charge-sweep] booking ${row.id} threw:`, e);
    }
  }
}

// 9am Pacific: matches the business's own day boundary (pstToday() in
// pricing.js) and lands during business hours so a decline shows up on the
// admin dashboard the same day someone's likely to see it.
function start() {
  cron.schedule('0 9 * * *', runBalanceChargeSweep, { timezone: 'America/Los_Angeles' });
}

module.exports = { start, runBalanceChargeSweep };
