const Stripe = require('stripe');

// Pinned explicitly (matches this SDK version's own default) so an SDK
// upgrade never silently changes which Stripe API version requests target.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

module.exports = stripe;
