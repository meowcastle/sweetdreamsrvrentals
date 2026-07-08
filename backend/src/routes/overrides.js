const express = require('express');
const requireAdminAuth = require('../middleware/adminAuth');
const pool = require('../db');

const router = express.Router();

// Admin only: overrides never contain anything a customer should see, and
// only admin actions (confirm/deliver/return/cancel/mark-charged/refund)
// ever write them.
router.get('/', requireAdminAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM booking_status_overrides');
  const out = { status: {}, cancelled: {}, charges: {}, refunds: {} };
  for (const r of rows) {
    if (r.status) out.status[r.booking_id] = r.status;
    if (r.cancelled) out.cancelled[r.booking_id] = true;
    if (r.charge_status) out.charges[r.booking_id] = r.charge_status;
    if (r.refund_amount != null) {
      out.refunds[r.booking_id] = {
        amount: r.refund_amount, reason: r.refund_reason,
        emailed: r.refund_emailed, email: r.refund_email,
      };
    }
  }
  res.json(out);
});

// Full-sync upsert: mirrors persistOverrides() in the Admin file, which
// always writes the whole {status, cancelled, charges, refunds} blob rather
// than a single field — a full overwrite, the same as the old
// localStorage.setItem(KEY, JSON.stringify(...)) it replaced. That means an
// id no longer present in ANY of the four incoming maps (e.g. the "confirm"
// action does `delete st[id]` before persisting) must have its row cleared
// here too, not just left alone — otherwise the override can never be undone.
router.put('/', requireAdminAuth, async (req, res) => {
  const { status = {}, cancelled = {}, charges = {}, refunds = {} } = req.body || {};

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: existing } = await client.query('SELECT booking_id FROM booking_status_overrides');
    const ids = new Set([
      ...existing.map((r) => r.booking_id),
      ...Object.keys(status), ...Object.keys(cancelled),
      ...Object.keys(charges), ...Object.keys(refunds),
    ]);
    for (const id of ids) {
      const refund = refunds[id];
      const hasAny = status[id] || cancelled[id] || charges[id] || refund;
      if (!hasAny) {
        await client.query('DELETE FROM booking_status_overrides WHERE booking_id = $1', [id]);
        continue;
      }
      await client.query(
        `INSERT INTO booking_status_overrides
           (booking_id, status, cancelled, charge_status, refund_amount, refund_reason, refund_emailed, refund_email, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8, now())
         ON CONFLICT (booking_id) DO UPDATE SET
           status = $2, cancelled = $3, charge_status = $4,
           refund_amount = $5, refund_reason = $6, refund_emailed = $7, refund_email = $8,
           updated_at = now()`,
        [id, status[id] || null, !!cancelled[id], charges[id] || null,
          refund ? refund.amount : null, refund ? refund.reason : null,
          refund ? refund.emailed : null, refund ? refund.email : null],
      );
    }
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
});

module.exports = router;
