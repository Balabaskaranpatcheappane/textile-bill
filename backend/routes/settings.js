const router = require('express').Router();
const multer = require('multer');

const { pool } = require('../db');
const { requireRole } = require('../middleware/auth');

// Logo capped at ~2 MB; kept in memory (single row) and stored as BYTEA.
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 2 * 1024 * 1024 },
});

// Everything text-y about the shop, without the (potentially large) logo bytes.
const PUBLIC_COLUMNS = `
  shop_name, address, phone, gstin, email,
  default_paper_size, footer_text, invoice_prefix,
  updated_at,
  (logo IS NOT NULL) AS has_logo,
  logo_mime
`;

router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(`SELECT ${PUBLIC_COLUMNS} FROM settings WHERE id = 1`);
    res.json(rows[0] || null);
  } catch (e) { next(e); }
});

router.put('/', requireRole('admin'), async (req, res, next) => {
  try {
    const {
      shop_name, address, phone, gstin, email,
      default_paper_size, footer_text, invoice_prefix,
    } = req.body || {};

    if (default_paper_size &&
        !['58mm', '80mm', 'a4'].includes(default_paper_size)) {
      return res.status(400).json({ error: 'default_paper_size must be 58mm, 80mm or a4' });
    }

    const { rows } = await pool.query(
      `UPDATE settings SET
         shop_name          = COALESCE($1, shop_name),
         address            = COALESCE($2, address),
         phone              = COALESCE($3, phone),
         gstin              = COALESCE($4, gstin),
         email              = COALESCE($5, email),
         default_paper_size = COALESCE($6, default_paper_size),
         footer_text        = COALESCE($7, footer_text),
         invoice_prefix     = COALESCE($8, invoice_prefix),
         updated_at         = NOW()
       WHERE id = 1
       RETURNING ${PUBLIC_COLUMNS}`,
      [shop_name, address, phone, gstin, email,
       default_paper_size, footer_text, invoice_prefix],
    );
    res.json(rows[0]);
  } catch (e) { next(e); }
});

router.post('/logo', requireRole('admin'), upload.single('logo'),
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      if (!/^image\//.test(req.file.mimetype)) {
        return res.status(400).json({ error: 'File must be an image' });
      }
      await pool.query(
        `UPDATE settings SET logo = $1, logo_mime = $2, updated_at = NOW() WHERE id = 1`,
        [req.file.buffer, req.file.mimetype],
      );
      res.json({ ok: true, mime: req.file.mimetype, size: req.file.size });
    } catch (e) { next(e); }
  });

router.delete('/logo', requireRole('admin'), async (_req, res, next) => {
  try {
    await pool.query(
      `UPDATE settings SET logo = NULL, logo_mime = NULL, updated_at = NOW() WHERE id = 1`,
    );
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;
