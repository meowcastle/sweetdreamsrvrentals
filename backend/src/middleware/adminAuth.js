const { SESSION_COOKIE, verifySession } = require('../auth');

function requireAdminAuth(req, res, next) {
  const token = req.cookies && req.cookies[SESSION_COOKIE];
  const session = verifySession(token);
  if (!session) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  req.adminUserId = session.adminUserId;
  next();
}

module.exports = requireAdminAuth;
