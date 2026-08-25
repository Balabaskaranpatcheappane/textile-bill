const jwt = require('jsonwebtoken');

const secret = () => {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET is not set — refuse to sign/verify tokens');
  return s;
};

function signToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, name: user.name, role: user.role },
    secret(),
    { expiresIn: process.env.JWT_TTL || '12h' },
  );
}

function requireAuth(req, res, next) {
  const h = req.headers.authorization || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (!m) return res.status(401).json({ error: 'Missing bearer token' });
  try {
    const payload = jwt.verify(m[1], secret());
    req.user = {
      id: payload.sub,
      username: payload.username,
      name: payload.name,
      role: payload.role,
    };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

module.exports = { signToken, requireAuth, requireRole };
