const router = require('express').Router();
const bcrypt = require('bcrypt');

const { pool } = require('../db');
const { signToken, requireAuth, requireRole } = require('../middleware/auth');

function publicUser(u) {
  return { id: u.id, username: u.username, name: u.name, role: u.role };
}

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE LOWER(username) = LOWER($1)', [username],
    );
    const user = rows[0];
    // Constant-ish response regardless of which side failed.
    const ok = user ? await bcrypt.compare(password, user.password_hash) : false;
    if (!ok) return res.status(401).json({ error: 'Invalid username or password' });

    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (e) { next(e); }
});

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

router.post('/change-password', requireAuth, async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body || {};
    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ error: 'new_password must be at least 6 characters' });
    }
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    const ok = await bcrypt.compare(current_password || '', user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });
    const hash = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, user.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Admin-only: user management
router.get('/users', requireAuth, requireRole('admin'), async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, username, name, role, created_at, last_login FROM users ORDER BY id',
    );
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/users', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { username, password, name, role = 'staff' } = req.body || {};
    if (!username || !password || !name) {
      return res.status(400).json({ error: 'username, password and name are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'password must be at least 6 characters' });
    }
    if (!['admin', 'staff'].includes(role)) {
      return res.status(400).json({ error: "role must be 'admin' or 'staff'" });
    }
    const hash = await bcrypt.hash(password, 10);
    try {
      const { rows } = await pool.query(
        `INSERT INTO users (username, password_hash, name, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, username, name, role, created_at, last_login`,
        [username, hash, name, role],
      );
      res.status(201).json(rows[0]);
    } catch (e) {
      if (e.code === '23505') return res.status(409).json({ error: 'Username already exists' });
      throw e;
    }
  } catch (e) { next(e); }
});

router.delete('/users/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    if (+req.params.id === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }
    const { rowCount } = await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'User not found' });
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;
