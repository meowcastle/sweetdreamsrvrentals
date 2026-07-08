const express = require('express');

const router = express.Router();

// Wires up the admin's refund modal (doRefund, Admin file line 1096). Build order step 11.
router.post('/:id/refund-deposit', (req, res) => {
  res.status(501).json({ error: 'not_implemented', route: 'POST /api/bookings/:id/refund-deposit' });
});

// Wires up retryCharge (Admin file, line 1666). Build order step 12.
router.post('/:id/retry-charge', (req, res) => {
  res.status(501).json({ error: 'not_implemented', route: 'POST /api/bookings/:id/retry-charge' });
});

module.exports = router;
