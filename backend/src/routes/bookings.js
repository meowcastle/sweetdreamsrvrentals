const express = require('express');
const requireAdminAuth = require('../middleware/adminAuth');
const pool = require('../db');
const stripe = require('../stripe');

const router = express.Router();

// Must match sd-bookings.js's TRAILER_NAMES keys.
const TRAILER_IDS = ['charlie', 'ella', 'virginia', 'marylou', 'jerry', 'patricia', 'nola', 'billybob'];

function rowToBooking(row) {
  const out = {
    id: row.id,
    trailer: row.trailer,
    arrival: row.arrival,
    nights: row.nights,
    guest: row.guest,
    phone: row.phone || undefined,
    email: row.email || undefined,
    site: row.site || undefined,
    addons: row.addons && row.addons.length ? row.addons : undefined,
    total: row.total,
    type: row.type,
    source: row.source,
    balanceChargeFailed: row.balance_charge_failed,
  };
  if (row.pay_status || row.pay_method) out.pay = { status: row.pay_status, method: row.pay_method };
  if (row.plan) out.plan = row.plan;
  if (row.deposit != null) out.deposit = row.deposit;
  if (row.paid_today != null) out.paidToday = row.paid_today;
  if (row.grand_total != null) out.grandTotal = row.grand_total;
  if (row.due_today != null) out.dueToday = row.due_today;
  if (row.balance_later != null) out.balanceLater = row.balance_later;
  if (row.balance_charge_date != null) out.balanceChargeDate = row.balance_charge_date;
  return out;
}

function isValidDateString(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s + 'T00:00:00'));
}

// Public: date ranges only, no guest name/phone/email/payment data. Used by
// the customer site's conflict/availability checks (occupiedNights,
// fleetBookedNights, hasConflict) — it must never leak other guests' PII.
router.get('/availability', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT b.trailer, b.arrival, b.nights FROM bookings b
     LEFT JOIN booking_status_overrides o ON o.booking_id = b.id
     WHERE COALESCE(o.cancelled, false) = false`
  );
  res.json(rows);
});

// Admin: full detail, used by the owner dashboard and the pricing page's
// next-up queues.
router.get('/', requireAdminAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM bookings ORDER BY arrival');
  res.json(rows.map(rowToBooking));
});

async function insertBooking(fields) {
  const {
    id, trailer, arrival, nights, guest, phone, email, site, addons, total,
    type, source, payStatus, payMethod, plan, deposit, paidToday, grandTotal,
    dueToday, balanceLater, balanceChargeDate,
    stripeCheckoutSessionId, stripePaymentIntentId, stripeCustomerId, stripePaymentMethodId,
  } = fields;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Advisory lock keyed by trailer: serializes concurrent booking attempts
    // on the same trailer so two simultaneous requests can't both pass the
    // conflict check and double-book it. Released automatically at COMMIT.
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [trailer]);

    // Excludes b.id = $4 (this row's own id): without that, retrying an
    // already-successful insert with the same id (Stripe's webhooks are
    // at-least-once) matches the row's own prior insert here and gets
    // misreported as a trailer conflict - complete with an unwarranted
    // auto-refund - instead of ever reaching the INSERT below, where it
    // should hit a duplicate-key no-op.
    const conflict = await client.query(
      `SELECT 1 FROM bookings b
       LEFT JOIN booking_status_overrides o ON o.booking_id = b.id
       WHERE b.trailer = $1 AND b.id != $4 AND COALESCE(o.cancelled, false) = false
         AND daterange(b.arrival, b.arrival + b.nights) && daterange($2::date, $2::date + $3::int)
       LIMIT 1`,
      [trailer, arrival, nights, id]
    );
    if (conflict.rows.length) {
      await client.query('ROLLBACK');
      return { conflict: true };
    }

    const { rows } = await client.query(
      `INSERT INTO bookings (
         id, trailer, arrival, nights, guest, phone, email, site, addons, total,
         type, source, pay_status, pay_method, plan, deposit, paid_today,
         grand_total, due_today, balance_later, balance_charge_date,
         stripe_checkout_session_id, stripe_payment_intent_id, stripe_customer_id, stripe_payment_method_id
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
       RETURNING *`,
      [id, trailer, arrival, nights, guest, phone || null, email || null, site || null,
        addons || [], total || 0, type, source, payStatus || null, payMethod || null,
        plan || null, deposit ?? null, paidToday ?? null, grandTotal ?? null,
        dueToday ?? null, balanceLater ?? null, balanceChargeDate || null,
        stripeCheckoutSessionId || null, stripePaymentIntentId || null,
        stripeCustomerId || null, stripePaymentMethodId || null],
    );
    await client.query('COMMIT');
    return { row: rows[0] };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// Public: wires up completeBooking() in `Sweet Dreams RV.dc.html`. source and
// type are never taken from the client — every request here is a web
// booking, full stop, regardless of what's in the body.
router.post('/', async (req, res) => {
  const b = req.body || {};
  if (!TRAILER_IDS.includes(b.trailer)) return res.status(400).json({ error: 'invalid_trailer' });
  if (!isValidDateString(b.arrival)) return res.status(400).json({ error: 'invalid_arrival' });
  const nights = Number(b.nights);
  if (!Number.isInteger(nights) || nights <= 0) return res.status(400).json({ error: 'invalid_nights' });
  if (!b.guest || typeof b.guest !== 'string') return res.status(400).json({ error: 'invalid_guest' });

  try {
    const result = await insertBooking({
      id: b.id || ('web' + Date.now()),
      trailer: b.trailer, arrival: b.arrival, nights, guest: b.guest,
      phone: b.phone, email: b.email, site: b.site, addons: b.addons, total: b.total,
      type: 'confirmed', source: 'web',
      plan: b.paymentPlan, deposit: b.deposit, paidToday: b.dueToday,
      grandTotal: b.grandTotal, dueToday: b.dueToday, balanceLater: b.balanceLater,
      balanceChargeDate: b.balanceChargeDate,
    });
    if (result.conflict) return res.status(409).json({ error: 'trailer_unavailable' });
    res.status(201).json(rowToBooking(result.row));
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'duplicate_id' });
    throw e;
  }
});

// Admin: wires up addBlock (maintenance blocks) and confirmPhoneBooking
// (phone reservations) in `Sweet Dreams Admin.dc.html`. Only reachable with
// a valid admin session, so it's safe to trust type/source/pay from the body.
router.post('/admin', requireAdminAuth, async (req, res) => {
  const b = req.body || {};
  if (!TRAILER_IDS.includes(b.trailer)) return res.status(400).json({ error: 'invalid_trailer' });
  if (!isValidDateString(b.arrival)) return res.status(400).json({ error: 'invalid_arrival' });
  const nights = Number(b.nights);
  if (!Number.isInteger(nights) || nights <= 0) return res.status(400).json({ error: 'invalid_nights' });
  if (!['block', 'confirmed', 'pending'].includes(b.type)) return res.status(400).json({ error: 'invalid_type' });
  if (!['admin', 'phone'].includes(b.source)) return res.status(400).json({ error: 'invalid_source' });

  try {
    const result = await insertBooking({
      id: b.id || ((b.source === 'admin' ? 'ub' : 'pb') + Date.now()),
      trailer: b.trailer, arrival: b.arrival, nights, guest: b.guest || 'Booking',
      phone: b.phone, email: b.email, site: b.site, total: b.total,
      type: b.type, source: b.source,
      payStatus: b.pay && b.pay.status, payMethod: b.pay && b.pay.method,
    });
    if (result.conflict) return res.status(409).json({ error: 'trailer_unavailable' });
    res.status(201).json(rowToBooking(result.row));
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'duplicate_id' });
    throw e;
  }
});

// Wires up the admin's refund modal (doRefund, Admin file line 1096). Build
// order step 11. The deposit is part of the original Checkout charge, not a
// separate authorize/capture hold, so a real refund is the Refunds API
// against that same payment_intent - there's no "release the hold" version
// of this. Amount is never trusted from the client beyond a sanity check:
// it's clamped to the deposit on file, same as the admin UI already does.
router.post('/:id/refund-deposit', requireAdminAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Advisory lock keyed by booking id: without it, two near-simultaneous
    // requests (a double-click, or a retried request after a slow response)
    // can both read refund_amount as still null and both call Stripe,
    // refunding the deposit twice. Released automatically at COMMIT/ROLLBACK.
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [req.params.id]);

    const { rows } = await client.query(
      `SELECT b.*, o.refund_amount FROM bookings b
       LEFT JOIN booking_status_overrides o ON o.booking_id = b.id
       WHERE b.id = $1`,
      [req.params.id],
    );
    const booking = rows[0];
    if (!booking) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'not_found' }); }
    if (!booking.stripe_payment_intent_id) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'no_stripe_payment' }); }
    if (booking.refund_amount != null) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'already_refunded' }); }

    const depositOnFile = booking.deposit != null ? booking.deposit : 1000;
    let amount = Number(req.body && req.body.amount);
    if (!Number.isFinite(amount) || amount <= 0) amount = depositOnFile;
    amount = Math.min(amount, depositOnFile);
    const reason = ((req.body && req.body.reason) || '').trim() || 'No reason given';
    const emailed = !!(req.body && req.body.sendEmail && booking.email);

    await stripe.refunds.create({
      payment_intent: booking.stripe_payment_intent_id,
      amount: Math.round(amount * 100),
      reason: 'requested_by_customer',
      metadata: { admin_reason: reason },
    });

    await client.query(
      `INSERT INTO booking_status_overrides (booking_id, refund_amount, refund_reason, refund_emailed, refund_email, updated_at)
       VALUES ($1,$2,$3,$4,$5, now())
       ON CONFLICT (booking_id) DO UPDATE SET
         refund_amount = $2, refund_reason = $3, refund_emailed = $4, refund_email = $5, updated_at = now()`,
      [req.params.id, amount, reason, emailed, booking.email || null],
    );
    await client.query('COMMIT');
    res.json({ amount, reason, emailed, email: booking.email || null });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
});

// Wires up retryCharge (Admin file, line 1666). Build order step 12.
router.post('/:id/retry-charge', requireAdminAuth, (req, res) => {
  res.status(501).json({ error: 'not_implemented', route: 'POST /api/bookings/:id/retry-charge' });
});

module.exports = router;
// Reused by the webhook handler (step 10) so a real Stripe payment writes a
// booking through the exact same conflict-checked, advisory-locked path a
// direct POST /api/bookings does.
module.exports.insertBooking = insertBooking;
