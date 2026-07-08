const express = require('express');

const router = express.Router();

// Wires up NOTIFY_ENDPOINT in `Sweet Dreams RV.dc.html`. Build order step 14.
router.post('/notify', (req, res) => {
  res.status(501).json({ error: 'not_implemented', route: 'POST /api/notify' });
});

module.exports = router;
