const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const pool = require('../db');
const requireAdminAuth = require('../middleware/adminAuth');
const { SESSION_COOKIE, SESSION_TTL_MS, createSession, verifySession, destroySession } = require('../auth');

const router = express.Router();

// Compared against when the submitted email doesn't match any admin_users
// row, so a bad email takes the same bcrypt-compare time as a bad password
// instead of returning early - otherwise response timing would leak which
// emails are registered.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too_many_attempts' },
});

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: SESSION_TTL_MS,
  path: '/',
};

// Replaces the client-side `sd_admin_session` flag (Admin file, line 1564) with a
// real server-side password check plus session token. Build order step 4.
// Checks admin_users (build order step 4, part 2) instead of a single
// ADMIN_EMAIL/ADMIN_PASSWORD_HASH pair, so any named admin can log in.
router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'invalid_credentials' });
  }

  const { rows } = await pool.query('SELECT id, password_hash FROM admin_users WHERE email = $1', [email.toLowerCase()]);
  const user = rows[0];
  // Always run bcrypt.compare, even when the email doesn't match any row,
  // so an unknown email doesn't respond faster than a wrong password.
  const passwordOk = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH).catch(() => false);
  if (!user || !passwordOk) {
    return res.status(401).json({ error: 'invalid_credentials' });
  }

  const token = createSession(user.id);
  res.cookie(SESSION_COOKIE, token, cookieOptions);
  res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  destroySession(req.cookies && req.cookies[SESSION_COOKIE]);
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.json({ ok: true });
});

router.get('/session', async (req, res) => {
  const session = verifySession(req.cookies && req.cookies[SESSION_COOKIE]);
  if (!session) return res.json({ authed: false });
  const { rows } = await pool.query('SELECT id, email, name FROM admin_users WHERE id = $1', [session.adminUserId]);
  const user = rows[0];
  if (!user) return res.json({ authed: false });
  res.json({ authed: true, id: user.id, email: user.email, name: user.name });
});

// ---- team management (any logged-in admin can manage the others - flat,
// no roles, matching how this dashboard has always treated a single admin
// as fully trusted) ----

router.get('/users', requireAdminAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT id, email, name, created_at FROM admin_users ORDER BY created_at ASC');
  res.json({ users: rows });
});

router.post('/users', requireAdminAuth, async (req, res) => {
  const { email, name, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'missing_fields' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'password_too_short' });
  }
  const hash = await bcrypt.hash(password, 12);
  try {
    const { rows } = await pool.query(
      'INSERT INTO admin_users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id, email, name, created_at',
      [email.toLowerCase(), name || null, hash],
    );
    res.json({ user: rows[0] });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'email_taken' });
    throw e;
  }
});

router.post('/users/:id/reset-password', requireAdminAuth, async (req, res) => {
  const { password } = req.body || {};
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'password_too_short' });
  }
  const hash = await bcrypt.hash(password, 12);
  const { rowCount } = await pool.query('UPDATE admin_users SET password_hash = $1 WHERE id = $2', [hash, req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'not_found' });
  res.json({ ok: true });
});

router.delete('/users/:id', requireAdminAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM admin_users');
  if (rows[0].count <= 1) {
    return res.status(400).json({ error: 'last_admin' });
  }
  const { rowCount } = await pool.query('DELETE FROM admin_users WHERE id = $1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'not_found' });
  res.json({ ok: true });
});

module.exports = router;
