const express = require('express');
const rateLimit = require('express-rate-limit');
const requireAdminAuth = require('../middleware/adminAuth');
const { queueMessages } = require('./emailQueue');
const { quoteHtml } = require('../emailTemplates');
const { TRAILER_NAMES, money } = require('../guestEmails');
const { getEffectiveConfig, computeExpected } = require('../pricing');

const router = express.Router();

const TRAILER_IDS = ['charlie', 'ella', 'virginia', 'marylou', 'jerry', 'patricia', 'nola', 'billybob'];

// Matches the admin quote-builder's own hardcoded prep fee (Sweet Dreams
// Admin.dc.html's cqTotalLabel: `rate * nights + 95 + ...`).
const PREP_FEE = 95;

// Generous relative to a customer actually poking at "Email me this quote"
// a few times while comparing trailers/add-ons, tight enough to bound abuse
// now that this is reachable from the open internet (unlike POST /email
// above, which is behind admin auth).
const publicQuoteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too_many_requests' },
});

function isValidDateString(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s + 'T00:00:00'));
}

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

// Shared by both routes below: builds the quote email (HTML + plain text,
// with a reserve link prefilled from the guest's contact info) and queues
// it to send. `rows` is caller-built since the admin route's line items
// (typed rates, manual adjustment) and the public route's (computed by the
// pricing engine) don't share a shape beyond { label, value }.
function queueQuoteEmail({ siteOrigin, trailerId, arrival, nights, name, email, phone, site, addonsMap, hasPet, paymentPlan, datesLabel, rows, tripTotal, depositAmount, grandTotal }) {
  const trailerName = TRAILER_NAMES[trailerId];
  const first = (name || '').trim().split(' ')[0] || 'there';

  // addons/pet/plan are only ever set by the public quote route below (the
  // admin route has no equivalent raw selections to pass through, just
  // pre-totaled numbers) - omitted from the link entirely when absent so an
  // admin-built quote's reserve link looks exactly like it did before this.
  const linkParams = {
    trailer: trailerId, arrival: arrival || '', nights: String(nights),
    name: name || '', email, phone: phone || '', site: site || '',
  };
  if (addonsMap && Object.keys(addonsMap).length) linkParams.addons = JSON.stringify(addonsMap);
  if (hasPet) linkParams.pet = '1';
  if (paymentPlan) linkParams.plan = paymentPlan;

  const link = `${siteOrigin.replace(/\/$/, '')}/Sweet%20Dreams%20RV.dc.html?${new URLSearchParams(linkParams)}`;

  const html = quoteHtml({
    first, trailerName, datesLabel, site: site || 'your campsite',
    rows, tripTotal, depositAmount, grandTotal, reserveHref: link, money,
  });
  const body = [
    `Hi ${first},`, '',
    `Here's your quote for ${trailerName}, ${datesLabel}:`, '',
    ...rows.map((r) => `  ${r.label}: ${r.value}`),
    `  Trip total: ${money(tripTotal)}`,
    `  Refundable security deposit: ${money(depositAmount)}`,
    `  Total: ${money(grandTotal)}`, '',
    `Your ${money(depositAmount)} security deposit is fully refunded after the trailer is returned in good shape.`, '',
    `Reserve online anytime: ${link}`, '',
    'Questions? Just reply to this email or call (541) 630-4795.', '',
    'Sweet Dreams RV Rentals',
  ].join('\n');

  return queueMessages({
    bookingId: null, guest: name || null, email,
    trailer: trailerName, dates: datesLabel,
    messages: [{ to: email, sendAt: todayIso(), kind: 'quote', subject: `Your ${trailerName} quote: ${money(grandTotal)}`, body, html }],
  });
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

  await queueQuoteEmail({
    siteOrigin, trailerId, arrival, nights: n, name, email, phone, site,
    datesLabel, rows, tripTotal, depositAmount: deposit, grandTotal,
  });

  res.status(201).json({ ok: true });
});

// Public: the homepage's "Email me this quote" button (no admin auth,
// unlike POST /email above, which is the admin dashboard's own quote-builder
// tool). Never trusts a client-supplied total - recomputes it the same
// authoritative way create-checkout-session does (getEffectiveConfig +
// computeExpected), so this can't be used to email a guest a price they
// made up. `arrival` is optional here (unlike checkout): a guest can ask for
// a quote before picking specific dates, same as the live on-page estimate -
// computeExpected() degrades gracefully without one (skips the summer
// surcharge, matching stayRental()'s own null-date fallback in sd-pricing.js).
router.post('/send', publicQuoteLimiter, async (req, res) => {
  const b = req.body || {};

  if (!b.email || typeof b.email !== 'string' || !/^\S+@\S+\.\S+$/.test(b.email)) {
    return res.status(400).json({ error: 'invalid_email' });
  }
  if (!TRAILER_IDS.includes(b.trailerId)) return res.status(400).json({ error: 'invalid_trailer' });
  const nights = Number(b.nights);
  if (!Number.isInteger(nights) || nights <= 0) return res.status(400).json({ error: 'invalid_nights' });
  if (b.arrival != null && b.arrival !== '' && !isValidDateString(b.arrival)) {
    return res.status(400).json({ error: 'invalid_arrival' });
  }
  if (!b.siteOrigin || typeof b.siteOrigin !== 'string' || !/^https?:\/\//.test(b.siteOrigin)) {
    return res.status(400).json({ error: 'invalid_site_origin' });
  }

  const cfg = await getEffectiveConfig();
  let expected;
  try {
    expected = await computeExpected(cfg, {
      trailerId: b.trailerId, arrival: b.arrival || null, nights,
      deliverySite: b.deliverySite, addons: b.addons, hasPet: !!b.hasPet, requestedPlan: b.paymentPlan,
    });
  } catch (e) {
    return res.status(400).json({ error: 'invalid_trailer' });
  }

  const datesLabel = b.arrival
    ? `${fmtDate(b.arrival)} – ${fmtDate(plusDays(b.arrival, nights))}`
    : `${nights} night${nights === 1 ? '' : 's'} (dates to be confirmed)`;

  const rows = [
    { label: `${nights} night${nights === 1 ? '' : 's'} rental`, value: money(expected.rental) },
    { label: 'Cleaning, prep & stocking', value: money(expected.prep) },
    { label: 'Delivery', value: money(expected.delivery) },
  ];
  if (expected.pet) rows.push({ label: 'Pet fee', value: money(expected.pet) });
  if (expected.addonsTotal) rows.push({ label: 'Add-ons', value: money(expected.addonsTotal) });

  // Sanitize the guest's raw addon selections (id -> qty) against the real
  // config before they go anywhere near a URL - only known addon ids,
  // clamped to a sane integer quantity, same bounds the admin dashboard's
  // own qty steppers enforce.
  const addonsMap = {};
  if (b.addonsMap && typeof b.addonsMap === 'object') {
    for (const a of (cfg.addons || [])) {
      const qty = Math.floor(Number(b.addonsMap[a.id]));
      if (Number.isFinite(qty) && qty > 0) addonsMap[a.id] = Math.min(qty, a.maxQty || 1);
    }
  }

  await queueQuoteEmail({
    siteOrigin: b.siteOrigin, trailerId: b.trailerId, arrival: b.arrival || null, nights,
    name: b.name, email: b.email, phone: b.phone, site: b.deliverySite,
    addonsMap, hasPet: !!b.hasPet, paymentPlan: expected.plan,
    datesLabel, rows, tripTotal: expected.tripTotal, depositAmount: expected.deposit, grandTotal: expected.grandTotal,
  });

  res.status(201).json({ ok: true });
});

module.exports = router;
