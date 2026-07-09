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

// Email queue sweep (build order step 13). The whole schedule for a booking
// (confirmation, balance reminder, delivery reminder, deposit refund) is
// queued up front at booking time, so a trip cancelled afterward still has
// rows sitting in email_queue for events that will never happen - those are
// suppressed here rather than sent.
//
// No real mail provider is wired in yet (no SMTP/SendGrid/etc. credentials
// anywhere in this project), so "sending" is a loud log line for now. Swap
// this for a real provider call when one exists; the queue/sweep mechanics
// around it don't need to change.
async function runEmailQueueSweep() {
  const { rows } = await pool.query(
    `SELECT q.*, COALESCE(o.cancelled, false) AS cancelled FROM email_queue q
     LEFT JOIN booking_status_overrides o ON o.booking_id = q.booking_id
     WHERE NOT q.sent AND q.send_at <= CURRENT_DATE
     ORDER BY q.send_at`,
  );
  for (const row of rows) {
    if (row.cancelled) {
      console.log(`[email-queue-sweep] booking ${row.booking_id} cancelled, suppressing "${row.kind}" to ${row.recipient}`);
    } else {
      console.log(`[email-queue-sweep] SEND "${row.subject}" to ${row.recipient} (kind=${row.kind}, booking=${row.booking_id})`);
    }
    await pool.query('UPDATE email_queue SET sent = true, sent_at = now() WHERE id = $1', [row.id]);
  }
}

// 9am Pacific: matches the business's own day boundary (pstToday() in
// pricing.js) and lands during business hours so a decline shows up on the
// admin dashboard the same day someone's likely to see it.
//
// Email sweep runs every 5 minutes - a guest expects a confirmation email
// soon after booking, not up to a day later.
function start() {
  cron.schedule('0 9 * * *', runBalanceChargeSweep, { timezone: 'America/Los_Angeles' });
  cron.schedule('*/5 * * * *', runEmailQueueSweep);
}

module.exports = { start, runBalanceChargeSweep, runEmailQueueSweep };
