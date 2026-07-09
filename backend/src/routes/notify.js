const express = require('express');
const rateLimit = require('express-rate-limit');
const { queueMessages } = require('./emailQueue');

const router = express.Router();

// Public form submissions (quote request, cancellation request), same
// reasoning as checkout.js's limiter now that this is reachable from the
// open internet.
const notifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too_many_requests' },
});

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatBody(fields) {
  return Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join('\n');
}

// Wires up NOTIFY_ENDPOINT in `Sweet Dreams RV.dc.html` - team-facing
// alerts (new booking, quote request, cancellation request), not anything
// customer-facing. Reuses the email_queue/cron-sweep machinery from step 13
// rather than a separate send path: the recipient always comes from
// NOTIFY_TO_EMAIL (server config), never trusted from the client's `to`
// field - this is a public, unauthenticated endpoint, so treating the
// request body as content only (not as a way to choose who gets emailed)
// keeps it from being usable as an open relay.
async function notifyTeam(subject, fields) {
  const to = process.env.NOTIFY_TO_EMAIL || 'info@sweetdreamsrvrentals.com';
  await queueMessages({
    bookingId: null, guest: null, email: to, trailer: null, dates: null,
    messages: [{ to, sendAt: todayIso(), subject, body: formatBody(fields || {}), kind: 'team-notification' }],
  });
}

router.post('/notify', notifyLimiter, async (req, res) => {
  const { subject, to, ...fields } = req.body || {};
  if (!subject || typeof subject !== 'string') return res.status(400).json({ error: 'invalid_subject' });
  await notifyTeam(subject, fields);
  res.status(201).json({ ok: true });
});

module.exports = router;
module.exports.notifyTeam = notifyTeam;
