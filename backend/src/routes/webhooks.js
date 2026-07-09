const express = require('express');
const rateLimit = require('express-rate-limit');
const stripe = require('../stripe');
const { insertBooking } = require('./bookings');
const { queueMessages } = require('./emailQueue');
const { buildGuestEmails } = require('../guestEmails');

const router = express.Router();

// Generous relative to Stripe's own traffic (real events plus its retry
// schedule for failed deliveries), tight enough to bound abuse now that
// this URL is reachable from the open internet. Signature verification
// rejects anything not genuinely from Stripe regardless, but a flood of
// requests still shouldn't get free CPU time on that check.
const webhookLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too_many_requests' },
});

// The browser reaching successUrl proves nothing about whether payment
// actually went through - this is the only place a web booking gets
// written. Uses the Checkout Session id as the booking's primary key, so a
// retried delivery of the same event (Stripe's webhooks are at-least-once)
// hits a duplicate-key conflict instead of creating a second booking.
async function handleCheckoutCompleted(session) {
  const m = session.metadata || {};
  if (!m.trailerId || !m.arrival) {
    console.error(`[webhook] checkout.session.completed ${session.id} missing booking metadata, skipping`);
    return;
  }

  let paymentMethodId = null;
  if (session.payment_intent) {
    const pi = await stripe.paymentIntents.retrieve(session.payment_intent);
    paymentMethodId = pi.payment_method || null;
  }

  let addons = [];
  try { addons = JSON.parse(m.addons || '[]'); } catch (e) { addons = []; }

  let result;
  try {
    result = await insertBooking({
      id: session.id,
      trailer: m.trailerId, arrival: m.arrival, nights: Number(m.nights),
      guest: m.guest, phone: m.phone, email: m.email, site: m.site, addons,
      total: Math.round(Number(m.tripTotalCents) / 100),
      type: 'confirmed', source: 'web',
      payStatus: m.plan === 'firstnight' ? 'First night paid' : 'Paid in full',
      payMethod: 'Card online',
      plan: m.plan,
      deposit: Math.round(Number(m.depositCents) / 100),
      paidToday: Math.round(Number(m.dueTodayCents) / 100),
      grandTotal: Math.round(Number(m.grandTotalCents) / 100),
      dueToday: Math.round(Number(m.dueTodayCents) / 100),
      balanceLater: Math.round(Number(m.balanceLaterCents) / 100),
      balanceChargeDate: m.balanceChargeDate || null,
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: session.payment_intent || null,
      stripeCustomerId: session.customer || null,
      stripePaymentMethodId: paymentMethodId,
    });
  } catch (e) {
    if (e.code === '23505') {
      // Already processed this exact session on an earlier delivery attempt.
      return;
    }
    throw e;
  }

  if (result.conflict) {
    // A real race: something else took the trailer/dates between the
    // pre-check in create-checkout-session and this webhook firing, after
    // the customer already paid. Refund automatically rather than silently
    // keeping money for a booking that doesn't exist - there's no
    // NOTIFY_ENDPOINT wired up yet (step 14), so this is loud in the logs
    // until then.
    console.error(
      `[webhook] Booking conflict after payment: session ${session.id}, ` +
      `trailer ${m.trailerId}, ${m.arrival} x${m.nights} nights. Refunding payment_intent ${session.payment_intent}.`
    );
    if (session.payment_intent) {
      try {
        await stripe.refunds.create({ payment_intent: session.payment_intent });
      } catch (refundErr) {
        console.error('[webhook] Auto-refund after conflict failed:', refundErr);
      }
    }
    return;
  }

  // Queue the guest's confirmation/reminder/refund email schedule now that
  // the booking is real. Best-effort: a failure here shouldn't turn a
  // successful booking into a 500 (which would just make Stripe retry the
  // whole event - and insertBooking's own idempotency check above means a
  // retry never reaches this point again anyway, since it short-circuits on
  // the duplicate key before getting here).
  try {
    const { trailerName, datesLabel, messages } = buildGuestEmails({
      trailerId: m.trailerId, arrival: m.arrival, nights: Number(m.nights),
      guest: m.guest, email: m.email, site: m.site, plan: m.plan,
      dueToday: Math.round(Number(m.dueTodayCents) / 100),
      balanceLater: Math.round(Number(m.balanceLaterCents) / 100),
      deposit: Math.round(Number(m.depositCents) / 100),
      balanceChargeDate: m.balanceChargeDate || null,
    });
    await queueMessages({
      bookingId: session.id, guest: m.guest, email: m.email,
      trailer: trailerName, dates: datesLabel, messages,
    });
  } catch (e) {
    console.error(`[webhook] Failed to queue guest emails for booking ${session.id}:`, e);
  }
}

// Handles checkout.session.completed, payment_intent.succeeded,
// payment_intent.payment_failed, charge.refunded, charge.dispute.created.
// Mounted on the raw body parser in app.js so stripe.webhooks.constructEvent
// can verify the signature below.
router.post('/stripe', webhookLimiter, async (req, res) => {
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).json({ error: 'invalid_signature' });
  }

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object);
      break;
    case 'payment_intent.succeeded':
    case 'payment_intent.payment_failed':
      // Meaningful once the balance auto-charge cron (step 12) creates
      // off-session PaymentIntents to track - the initial checkout charge
      // is already handled above via checkout.session.completed. Nothing
      // to correlate against yet, so just acknowledge for now.
      break;
    case 'charge.refunded':
    case 'charge.dispute.created':
      // Refund confirmation / dispute handling lands with the real refund
      // endpoint in step 11. Acknowledge for now.
      break;
    default:
      break;
  }

  res.json({ received: true });
});

module.exports = router;
