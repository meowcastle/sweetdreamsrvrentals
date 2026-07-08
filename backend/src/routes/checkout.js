const express = require('express');

const router = express.Router();

// Wires up CHECKOUT_ENDPOINT in `Sweet Dreams RV.dc.html`. Build order step 8.
router.post('/create-checkout-session', (req, res) => {
  res.status(501).json({ error: 'not_implemented', route: 'POST /api/create-checkout-session' });
});

module.exports = router;
