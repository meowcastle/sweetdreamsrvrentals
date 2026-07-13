const cron = require('node-cron');
const pool = require('./db');
const { chargeBalance } = require('./routes/bookings');
const { sendMail } = require('./mail');

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
// Anything due today (confirmation, team-notification) is also attempted
// immediately at queue time (see queueMessages() in emailQueue.js), so in
// the common case this sweep finds nothing to do for those - it exists as
// the retry safety net for whatever that immediate attempt missed (a
// transient Resend error, the app restarting mid-request) plus the actual
// delivery mechanism for anything future-dated once its day arrives.
//
// Sends for real via Resend (see mail.js). A failed send is never marked
// sent - it's left for the next sweep to retry, up to 5 attempts, with the
// error recorded so it's visible via GET /api/email-queue rather than only
// in logs.
async function runEmailQueueSweep() {
  const { rows } = await pool.query(
    `SELECT q.*, COALESCE(o.cancelled, false) AS cancelled FROM email_queue q
     LEFT JOIN booking_status_overrides o ON o.booking_id = q.booking_id
     WHERE NOT q.sent AND q.send_at <= CURRENT_DATE AND q.attempts < 5
     ORDER BY q.send_at`,
  );
  for (const row of rows) {
    if (row.cancelled) {
      console.log(`[email-queue-sweep] booking ${row.booking_id} cancelled, suppressing "${row.kind}" to ${row.recipient}`);
      await pool.query('UPDATE email_queue SET sent = true, sent_at = now() WHERE id = $1', [row.id]);
      continue;
    }
    try {
      await sendMail({ to: row.recipient, subject: row.subject, body: row.body, html: row.html });
      await pool.query('UPDATE email_queue SET sent = true, sent_at = now(), last_error = NULL WHERE id = $1', [row.id]);
      console.log(`[email-queue-sweep] sent "${row.subject}" to ${row.recipient} (kind=${row.kind}, booking=${row.booking_id})`);
    } catch (e) {
      console.error(`[email-queue-sweep] failed to send "${row.subject}" to ${row.recipient} (attempt ${row.attempts + 1}):`, e.message || e);
      await pool.query('UPDATE email_queue SET attempts = attempts + 1, last_error = $2 WHERE id = $1', [row.id, String(e.message || e)]);
    }
  }
}

// 9am Pacific: matches the business's own day boundary (pstToday() in
// pricing.js) and lands during business hours so a decline shows up on the
// admin dashboard the same day someone's likely to see it.
//
// Email sweep still runs every 5 minutes even though same-day mail is
// usually already sent immediately at queue time - this is what actually
// delivers future-dated mail once its day arrives, and retries anything the
// immediate attempt failed at.
function start() {
  cron.schedule('0 9 * * *', runBalanceChargeSweep, { timezone: 'America/Los_Angeles' });
  cron.schedule('*/5 * * * *', runEmailQueueSweep);
}

module.exports = { start, runBalanceChargeSweep, runEmailQueueSweep };
