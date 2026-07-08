const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { SESSION_COOKIE, SESSION_TTL_MS, createSession, verifySession, destroySession } = require('../auth');

const router = express.Router();

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
router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body || {};
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminHash = process.env.ADMIN_PASSWORD_HASH;

  if (!adminEmail || !adminHash) {
    return res.status(500).json({ error: 'admin_not_configured' });
  }
  if (!email || !password) {
    return res.status(400).json({ error: 'invalid_credentials' });
  }

  const emailOk = email.toLowerCase() === adminEmail.toLowerCase();
  // Always run bcrypt.compare, even when the email is already known to be
  // wrong, so a bad email doesn't respond faster than a bad password.
  const passwordOk = await bcrypt.compare(password, adminHash).catch(() => false);
  if (!emailOk || !passwordOk) {
    return res.status(401).json({ error: 'invalid_credentials' });
  }

  const token = createSession();
  res.cookie(SESSION_COOKIE, token, cookieOptions);
  res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  destroySession(req.cookies && req.cookies[SESSION_COOKIE]);
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.json({ ok: true });
});

router.get('/session', (req, res) => {
  res.json({ authed: verifySession(req.cookies && req.cookies[SESSION_COOKIE]) });
});

module.exports = router;
