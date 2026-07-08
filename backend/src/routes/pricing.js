const express = require('express');
const requireAdminAuth = require('../middleware/adminAuth');
const pool = require('../db');

const router = express.Router();

// Public: the customer site needs current prices to quote a stay.
router.get('/', async (req, res) => {
  const { rows } = await pool.query('SELECT config FROM pricing_config WHERE id = 1');
  res.json(rows[0] ? rows[0].config : null);
});

// Admin: the owner's pricing screen is the only thing that writes this.
router.put('/', requireAdminAuth, async (req, res) => {
  const config = req.body;
  if (!config || typeof config !== 'object') return res.status(400).json({ error: 'invalid_config' });
  await pool.query(
    `INSERT INTO pricing_config (id, config, updated_at) VALUES (1, $1, now())
     ON CONFLICT (id) DO UPDATE SET config = $1, updated_at = now()`,
    [config],
  );
  res.json({ ok: true });
});

module.exports = router;
