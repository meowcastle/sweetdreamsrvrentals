const express = require('express');
const rateLimit = require('express-rate-limit');
const pool = require('../db');
const stripe = require('../stripe');
const { getEffectiveConfig, computeExpected } = require('../pricing');

const router = express.Router();

const TRAILER_IDS = ['charlie', 'ella', 'virginia', 'marylou', 'jerry', 'patricia', 'nola', 'billybob'];

// Generous enough for a real customer building/rebuilding a quote and
// retrying (different dates, add-ons, plan), tight enough to bound
// automated abuse now that this is reachable from the open internet.
const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too_many_attempts' },
});

function isValidDateString(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s + 'T00:00:00'));
}

function isoLocal(d) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// Wires up CHECKOUT_ENDPOINT in `Sweet Dreams RV.dc.html`. Build order step 8.
// Public endpoint - the amount to charge is never trusted from the client,
// it's independently recomputed from the same pricing config the customer's
// browser used (see ../pricing.js) and the request is rejected if the two
// don't match. The actual booking row is NOT written here: per the punch
// list, that only happens when the checkout.session.completed webhook fires
// (step 10), since the browser reaching successUrl proves nothing about
// whether payment actually went through.
router.post('/create-checkout-session', checkoutLimiter, async (req, res) => {
  const b = req.body || {};

  if (!TRAILER_IDS.includes(b.trailerId)) return res.status(400).json({ error: 'invalid_trailer' });
  if (!isValidDateString(b.arrival)) return res.status(400).json({ error: 'invalid_arrival' });
  const nights = Number(b.nights);
  if (!Number.isInteger(nights) || nights <= 0) return res.status(400).json({ error: 'invalid_nights' });
  if (!b.guest || typeof b.guest !== 'string') return res.status(400).json({ error: 'invalid_guest' });
  if (!b.email || typeof b.email !== 'string' || !/.+@.+\..+/.test(b.email)) return res.status(400).json({ error: 'invalid_email' });
  if (!b.successUrl || !b.cancelUrl) return res.status(400).json({ error: 'invalid_urls' });

  const cfg = await getEffectiveConfig();
  let expected;
  try {
    expected = await computeExpected(cfg, {
      trailerId: b.trailerId, arrival: b.arrival, nights,
      deliverySite: b.deliverySite, addons: b.addons, hasPet: !!b.hasPet, requestedPlan: b.paymentPlan,
    });
  } catch (e) {
    return res.status(400).json({ error: 'invalid_trailer' });
  }

  const expectedGrandTotalCents = Math.round(expected.grandTotal * 100);
  const clientGrandTotalCents = Number(b.grandTotalCents);
  // Small tolerance for float rounding, not for actual price disagreement.
  if (!Number.isFinite(clientGrandTotalCents) || Math.abs(clientGrandTotalCents - expectedGrandTotalCents) > 1) {
    return res.status(400).json({ error: 'price_mismatch' });
  }

  // Soft availability check so a customer isn't sent to Stripe for a trailer
  // that's already spoken for. The authoritative check (under an advisory
  // lock) happens when the webhook actually writes the booking - a real
  // race here just means the webhook rejects it after payment, which step
  // 10 needs to handle as a refund case, not something this step can fully
  // prevent from a pre-check alone.
  const conflict = await pool.query(
    `SELECT 1 FROM bookings b
     LEFT JOIN booking_status_overrides o ON o.booking_id = b.id
     WHERE b.trailer = $1 AND COALESCE(o.cancelled, false) = false
       AND daterange(b.arrival, b.arrival + b.nights) && daterange($2::date, $2::date + $3::int)
     LIMIT 1`,
    [b.trailerId, b.arrival, nights],
  );
  if (conflict.rows.length) return res.status(409).json({ error: 'trailer_unavailable' });

  const dueTodayCents = Math.round(expected.dueToday * 100);
  const trailerName = b.trailer || b.trailerId;
  const datesLabel = b.dates || `${b.arrival} · ${nights} nights`;

  const metadata = {
    trailerId: b.trailerId, trailerName: String(trailerName),
    arrival: b.arrival, nights: String(nights),
    guest: b.guest, email: b.email, phone: b.phone || '',
    site: b.deliverySite || '',
    addons: JSON.stringify(Array.isArray(b.addons) ? b.addons : []),
    hasPet: b.hasPet ? 'true' : 'false',
    plan: expected.plan,
    tripTotalCents: String(Math.round(expected.tripTotal * 100)),
    depositCents: String(Math.round(expected.deposit * 100)),
    grandTotalCents: String(expectedGrandTotalCents),
    dueTodayCents: String(dueTodayCents),
    balanceLaterCents: String(Math.round(expected.balanceLater * 100)),
    balanceChargeDate: isoLocal(expected.balanceChargeDate),
  };

  const sessionParams = {
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: `${trailerName} — ${datesLabel}` },
        unit_amount: dueTodayCents,
      },
      quantity: 1,
    }],
    customer_email: b.email,
    metadata,
    success_url: b.successUrl,
    cancel_url: b.cancelUrl,
  };

  if (expected.plan === 'firstnight') {
    // Saves the card so the balance can be auto-charged off-session on
    // balanceChargeDate (build order step 12). Requires a Customer, which
    // Stripe would create automatically for this anyway, but asking for it
    // explicitly means we're not relying on that implicit behavior.
    sessionParams.payment_intent_data = { setup_future_usage: 'off_session', metadata };
    sessionParams.customer_creation = 'always';
  }

  const session = await stripe.checkout.sessions.create(sessionParams);
  res.json({ url: session.url });
});

module.exports = router;
