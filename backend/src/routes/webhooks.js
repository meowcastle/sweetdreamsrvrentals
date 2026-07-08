const express = require('express');

const router = express.Router();

// Handles checkout.session.completed, payment_intent.succeeded,
// payment_intent.payment_failed, charge.refunded, charge.dispute.created.
// Build order step 10. Mounted on the raw body parser in app.js so
// stripe.webhooks.constructEvent can verify the signature.
router.post('/stripe', (req, res) => {
  res.status(501).json({ error: 'not_implemented', route: 'POST /api/webhooks/stripe' });
});

module.exports = router;
