const express = require('express');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Generous relative to Stripe's own traffic (real events plus its retry
// schedule for failed deliveries), tight enough to bound abuse now that
// this URL is reachable from the open internet. Signature verification
// (step 10) rejects anything not genuinely from Stripe regardless, but a
// flood of requests still shouldn't get to spend CPU on that check for free.
const webhookLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too_many_requests' },
});

// Handles checkout.session.completed, payment_intent.succeeded,
// payment_intent.payment_failed, charge.refunded, charge.dispute.created.
// Build order step 10. Mounted on the raw body parser in app.js so
// stripe.webhooks.constructEvent can verify the signature.
router.post('/stripe', webhookLimiter, (req, res) => {
  res.status(501).json({ error: 'not_implemented', route: 'POST /api/webhooks/stripe' });
});

module.exports = router;
