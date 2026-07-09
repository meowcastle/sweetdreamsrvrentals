const express = require('express');
const { queueMessages } = require('./emailQueue');

const router = express.Router();

// Wires up MAILER_ENDPOINT in `Sweet Dreams RV.dc.html`. Not actually turned
// on there (MAILER_ENDPOINT is left '') since that call site only ever runs
// from the demo/preview completeBooking() path, which already queues the
// exact same messages via POST /api/email-queue moments earlier in the same
// function - wiring both would just double-queue for no benefit. Kept real
// and working here (same queueMessages() as /api/email-queue) for any other
// caller, e.g. a future admin "resend" action.
router.post('/send-guest-email', async (req, res) => {
  const { bookingId, messages } = req.body || {};
  if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ error: 'invalid_messages' });
  await queueMessages({ bookingId, messages });
  res.status(201).json({ ok: true });
});

module.exports = router;
