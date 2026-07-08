const express = require('express');

const router = express.Router();

// Wires up MAILER_ENDPOINT in `Sweet Dreams RV.dc.html` (buildGuestEmails queue). Build order step 13.
router.post('/send-guest-email', (req, res) => {
  res.status(501).json({ error: 'not_implemented', route: 'POST /api/send-guest-email' });
});

module.exports = router;
