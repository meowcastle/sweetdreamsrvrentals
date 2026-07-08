const express = require('express');
const requireAdminAuth = require('../middleware/adminAuth');
const pool = require('../db');

const router = express.Router();

// Public: wires up the client-side queue write in queueGuestEmails()
// (`Sweet Dreams RV.dc.html`). Accepts the same { bookingId, guest, email,
// trailer, dates, messages } shape and flattens messages into one row each.
router.post('/', async (req, res) => {
  const { bookingId, guest, email, trailer, dates, messages } = req.body || {};
  if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ error: 'invalid_messages' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const m of messages) {
      if (!m || !m.to || !m.subject || !m.body) continue;
      await client.query(
        `INSERT INTO email_queue (booking_id, guest, recipient, trailer, dates_label, kind, subject, body, send_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [bookingId || null, guest || null, m.to, trailer || null, dates || null,
          m.kind || null, m.subject, m.body, m.sendAt || null],
      );
    }
    await client.query('COMMIT');
    res.status(201).json({ ok: true });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
});

// Admin: not consumed by any UI yet, but the data should be readable —
// there was otherwise no way to ever see what's queued.
router.get('/', requireAdminAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM email_queue ORDER BY queued_at DESC');
  res.json(rows);
});

module.exports = router;
