const express = require('express');
const requireAdminAuth = require('../middleware/adminAuth');
const pool = require('../db');
const { sendMail } = require('../mail');

const router = express.Router();

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Shared by this route's own POST handler, the checkout.session.completed
// webhook (which builds a real booking's guest email schedule server-side -
// see guestEmails.js), and POST /api/send-guest-email. One insert path so
// there's exactly one place a row ever gets written.
async function queueMessages({ bookingId, guest, email, trailer, dates, messages }) {
  if (!Array.isArray(messages) || !messages.length) return;
  const client = await pool.connect();
  const queued = [];
  try {
    await client.query('BEGIN');
    for (const m of messages) {
      if (!m || !m.to || !m.subject || !m.body) continue;
      const { rows } = await client.query(
        `INSERT INTO email_queue (booking_id, guest, recipient, trailer, dates_label, kind, subject, body, html, send_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
        [bookingId || null, guest || null, m.to, trailer || null, dates || null,
          m.kind || null, m.subject, m.body, m.html || null, m.sendAt || null],
      );
      queued.push({ id: rows[0].id, ...m });
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }

  // Best-effort immediate send for anything due today - a guest who just
  // paid, or the team getting a new-booking alert, shouldn't have to wait
  // for the next 5-minute cron.js sweep. Anything scheduled for a future
  // date (balance reminders, delivery reminders, deposit refunds) is left
  // for the sweep to pick up on its actual date. A failed attempt here just
  // leaves the row unsent with attempts incremented, so the sweep retries it
  // exactly as it would any other failure - no separate retry path to keep
  // in sync with cron.js's.
  const today = todayIso();
  for (const m of queued) {
    if (!m.sendAt || m.sendAt > today) continue;
    try {
      await sendMail({ to: m.to, subject: m.subject, body: m.body, html: m.html });
      await pool.query('UPDATE email_queue SET sent = true, sent_at = now(), last_error = NULL WHERE id = $1', [m.id]);
    } catch (e) {
      console.error(`[email-queue] immediate send failed for "${m.subject}" to ${m.to}:`, e.message || e);
      await pool.query('UPDATE email_queue SET attempts = attempts + 1, last_error = $2 WHERE id = $1', [m.id, String(e.message || e)]);
    }
  }
}

// Public: wires up the client-side queue write in queueGuestEmails()
// (`Sweet Dreams RV.dc.html`, the demo/preview completeBooking() path -
// see guestEmails.js for why real web bookings queue their schedule
// elsewhere). Accepts the same { bookingId, guest, email, trailer, dates,
// messages } shape and flattens messages into one row each.
router.post('/', async (req, res) => {
  const { bookingId, guest, email, trailer, dates, messages } = req.body || {};
  if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ error: 'invalid_messages' });
  await queueMessages({ bookingId, guest, email, trailer, dates, messages });
  res.status(201).json({ ok: true });
});

// Admin: not consumed by any UI yet, but the data should be readable —
// there was otherwise no way to ever see what's queued.
router.get('/', requireAdminAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM email_queue ORDER BY queued_at DESC');
  res.json(rows);
});

module.exports = router;
module.exports.queueMessages = queueMessages;
