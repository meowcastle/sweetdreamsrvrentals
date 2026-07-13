const express = require('express');
const rateLimit = require('express-rate-limit');
const { getEffectiveConfig, deliveryFee } = require('../pricing');
const { drivingMilesFromMerlin } = require('../googleDistance');

const router = express.Router();

// Generous for a guest typing/correcting an address (each keystroke isn't a
// request thanks to the client's debounce, but retries/edits still add up),
// tight enough to bound abuse of a public endpoint that calls a paid
// third-party API on our behalf.
const distanceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too_many_requests' },
});

// Public: live preview of the driving distance/delivery fee for an
// unlisted ("Other") address, so a guest sees the real number before they
// commit to anything - same real driving-distance lookup
// create-checkout-session re-runs authoritatively at charge time (see
// computeExpected in ../pricing.js), just surfaced earlier for UX. Read-only,
// no booking or pricing data is touched here.
router.post('/delivery-distance', distanceLimiter, async (req, res) => {
  const address = String((req.body && req.body.address) || '').trim();
  if (address.length < 4) return res.status(400).json({ error: 'invalid_address' });

  let miles;
  try {
    miles = await drivingMilesFromMerlin(address);
  } catch (e) {
    console.error('[delivery-distance] lookup failed:', e.message || e);
    return res.status(502).json({ error: 'lookup_failed' });
  }
  if (miles == null) return res.status(404).json({ error: 'address_not_found' });

  const cfg = await getEffectiveConfig();
  const fee = deliveryFee(miles, cfg);
  res.json({ miles: Math.round(miles), fee });
});

module.exports = router;
