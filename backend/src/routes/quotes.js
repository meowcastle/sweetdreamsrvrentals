const express = require('express');
const requireAdminAuth = require('../middleware/adminAuth');
const { queueMessages } = require('./emailQueue');
const { quoteHtml } = require('../emailTemplates');
const { TRAILER_NAMES, money } = require('../guestEmails');

const router = express.Router();

// Matches the admin quote-builder's own hardcoded prep fee (Sweet Dreams
// Admin.dc.html's cqTotalLabel: `rate * nights + 95 + ...`).
const PREP_FEE = 95;

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function fmtDate(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
// Local-date math (not toISOString, which converts through UTC and can land
// on the wrong day depending on the server's timezone) - same approach as
// guestEmails.js's isoLocal()/plus().
function plusDays(iso, days) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Admin's "Email quote" action. Never trusts the client's total - rebuilds
// it from the individual line items so the email always matches what the
// admin actually built. The reserve link deliberately carries only
// trailer/dates/contact info, never price: a guest's real total is always
// computed live by the public pricing engine and re-verified server-side in
// create-checkout-session, so a manually-quoted rate override here can
// never be replayed as a forged discount through the link.
router.post('/email', requireAdminAuth, async (req, res) => {
  const {
    siteOrigin, trailerId, arrival, nights, name, email, phone, site,
    rate, delivery, adjustment, addonsTotal, depositAmount,
  } = req.body || {};

  if (!email || typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: 'invalid_email' });
  }
  if (!trailerId || !TRAILER_NAMES[trailerId] || !arrival || !nights) {
    return res.status(400).json({ error: 'invalid_quote' });
  }
  if (!siteOrigin || typeof siteOrigin !== 'string' || !/^https?:\/\//.test(siteOrigin)) {
    return res.status(400).json({ error: 'invalid_site_origin' });
  }

  const trailerName = TRAILER_NAMES[trailerId];
  const first = (name || '').trim().split(' ')[0] || 'there';
  const n = Number(nights) || 0;
  const r = Number(rate) || 0;
  const del = Number(delivery) || 0;
  const adj = Number(adjustment) || 0;
  const add = Number(addonsTotal) || 0;
  const deposit = Number(depositAmount) || 1000;
  const tripTotal = r * n + PREP_FEE + del + add + adj;
  const grandTotal = tripTotal + deposit;

  const datesLabel = `${fmtDate(arrival)} – ${fmtDate(plusDays(arrival, n))}`;

  const rows = [
    { label: `${n} nights × ${money(r)}`, value: money(r * n) },
    { label: 'Cleaning, prep & stocking', value: money(PREP_FEE) },
    { label: 'Delivery', value: money(del) },
  ];
  if (add) rows.push({ label: 'Add-ons', value: money(add) });
  if (adj) rows.push({ label: 'Adjustment', value: (adj < 0 ? '−' : '+') + money(Math.abs(adj)) });

  const link = `${siteOrigin.replace(/\/$/, '')}/Sweet%20Dreams%20RV.dc.html?${new URLSearchParams({
    trailer: trailerId, arrival, nights: String(n),
    name: name || '', email, phone: phone || '', site: site || '',
  })}`;

  const html = quoteHtml({
    first, trailerName, datesLabel, site: site || 'your campsite',
    rows, tripTotal, depositAmount: deposit, grandTotal, reserveHref: link, money,
  });
  const body = [
    `Hi ${first},`, '',
    `Here's your quote for ${trailerName}, ${datesLabel}:`, '',
    ...rows.map((r2) => `  ${r2.label}: ${r2.value}`),
    `  Trip total: ${money(tripTotal)}`,
    `  Refundable security deposit: ${money(deposit)}`,
    `  Total: ${money(grandTotal)}`, '',
    `Your ${money(deposit)} security deposit is fully refunded after the trailer is returned in good shape.`, '',
    `Reserve online anytime: ${link}`, '',
    'Questions? Just reply to this email or call (541) 630-4795.', '',
    'Sweet Dreams RV Rentals',
  ].join('\n');

  await queueMessages({
    bookingId: null, guest: name || null, email,
    trailer: trailerName, dates: datesLabel,
    messages: [{ to: email, sendAt: todayIso(), kind: 'quote', subject: `Your ${trailerName} quote: ${money(grandTotal)}`, body, html }],
  });

  res.status(201).json({ ok: true });
});

module.exports = router;
