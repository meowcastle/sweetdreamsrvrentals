const crypto = require('crypto');

const SESSION_COOKIE = 'sd_admin_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

// In-memory: fine for a single-instance NAS deployment. A restart clears
// sessions and forces re-login, which is an acceptable tradeoff for an
// internal owner dashboard, not a security issue.
const sessions = new Map();

function createSession() {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { expiresAt: Date.now() + SESSION_TTL_MS });
  return token;
}

function verifySession(token) {
  if (!token) return false;
  const session = sessions.get(token);
  if (!session) return false;
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function destroySession(token) {
  if (token) sessions.delete(token);
}

module.exports = { SESSION_COOKIE, SESSION_TTL_MS, createSession, verifySession, destroySession };
