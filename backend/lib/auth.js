const crypto = require('crypto');

// Set AUTH_SECRET in production so tokens survive restarts.
const SECRET = process.env.AUTH_SECRET || crypto.randomBytes(32).toString('hex');
const sign = (p) => crypto.createHmac('sha256', SECRET).update(p).digest('base64url');
const sha = (s) => crypto.createHash('sha256').update(s).digest();

function issue(user) {
  const p = Buffer.from(JSON.stringify({ u: user, exp: Date.now() + 12 * 3600 * 1000 })).toString('base64url');
  return p + '.' + sign(p);
}
function verify(token) {
  if (!token) return null;
  const [p, s] = token.split('.');
  if (!p || !s) return null;
  const e = sign(p);
  if (s.length !== e.length || !crypto.timingSafeEqual(Buffer.from(s), Buffer.from(e))) return null;
  try {
    const d = JSON.parse(Buffer.from(p, 'base64url').toString());
    return d.exp > Date.now() ? d : null;
  } catch (_) { return null; }
}

function requireAdmin(req, res, next) {
  const d = verify((req.headers.authorization || '').replace(/^Bearer /, ''));
  if (!d) return res.status(401).json({ error: 'Admin login required' });
  req.user = d.u;
  next();
}

function login(req, res) {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return res.status(500).json({ error: 'ADMIN_PASSWORD is not set on the server' });
  const ok = crypto.timingSafeEqual(sha(String(req.body?.password || '')), sha(pw));
  if (!ok) return res.status(401).json({ error: 'Wrong password' });
  res.json({ token: issue('admin') });
}

module.exports = { requireAdmin, login };
