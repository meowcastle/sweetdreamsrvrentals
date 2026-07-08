const express = require('express');
const cookieParser = require('cookie-parser');

const checkoutRoutes = require('./routes/checkout');
const webhookRoutes = require('./routes/webhooks');
const bookingRoutes = require('./routes/bookings');
const mailerRoutes = require('./routes/mailer');
const notifyRoutes = require('./routes/notify');
const adminRoutes = require('./routes/admin');

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

module.exports = app;
