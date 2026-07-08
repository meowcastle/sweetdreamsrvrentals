require('express-async-errors');
const express = require('express');
const cookieParser = require('cookie-parser');

const checkoutRoutes = require('./routes/checkout');
const webhookRoutes = require('./routes/webhooks');
const bookingRoutes = require('./routes/bookings');
const mailerRoutes = require('./routes/mailer');
const notifyRoutes = require('./routes/notify');
const adminRoutes = require('./routes/admin');
const pricingRoutes = require('./routes/pricing');
const overridesRoutes = require('./routes/overrides');
const emailQueueRoutes = require('./routes/emailQueue');

const app = express();

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Stripe signature verification needs the raw request body, so this route is
// mounted ahead of express.json() and given its own raw parser.
app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

app.use(express.json());
app.use(cookieParser());

app.use('/api', checkoutRoutes);
app.use('/api', mailerRoutes);
app.use('/api', notifyRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/overrides', overridesRoutes);
app.use('/api/email-queue', emailQueueRoutes);

// express-async-errors forwards thrown/rejected errors from async handlers
// here instead of hanging the request or crashing the process.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'internal_error' });
});

module.exports = app;
