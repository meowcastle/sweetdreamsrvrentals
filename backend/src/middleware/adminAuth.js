const { SESSION_COOKIE, verifySession } = require('../auth');

function requireAdminAuth(req, res, next) {
  const token = req.cookies && req.cookies[SESSION_COOKIE];
  if (!verifySession(token)) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

module.exports = requireAdminAuth;
