const express = require('express');

const router = express.Router();

// Replaces the client-side `sd_admin_session` flag (Admin file, line 1564) with a
// real server-side password check plus session token. Build order step 4.
router.post('/login', (req, res) => {
  res.status(501).json({ error: 'not_implemented', route: 'POST /api/admin/login' });
});

router.post('/logout', (req, res) => {
  res.status(501).json({ error: 'not_implemented', route: 'POST /api/admin/logout' });
});

router.get('/session', (req, res) => {
  res.status(501).json({ error: 'not_implemented', route: 'GET /api/admin/session' });
});

module.exports = router;
