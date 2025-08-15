const express = require('express');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { pool } = require('./db');
const authRequired = require('./authRequired');

const router = express.Router();

/* ---------- uploads setup ---------- */
const uploadDir = path.join(process.cwd(), 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^\w\-]+/g, '_');
    cb(null, `${base}_${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

/* ---------- create media (metadata) ---------- */
router.post('/', authRequired, async (req, res) => {
  const { title, type, fileUrl } = req.body || {};
  if (!title || !type || !fileUrl) return res.status(400).json({ error: 'title, type, fileUrl required' });
  try {
    const [result] = await pool.execute(
      'INSERT INTO MediaAsset (title, type, file_url) VALUES (?, ?, ?)',
      [title, type, fileUrl]
    );
    const [rows] = await pool.execute('SELECT * FROM MediaAsset WHERE id=?', [result.insertId]);
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'could not create media' });
  }
});

/* ---------- upload a file; returns fileUrl ---------- */
router.post('/upload', authRequired, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file' });
  // normalize to forward slashes so it works on Windows paths
  const rel = path.relative(process.cwd(), req.file.path).replace(/\\/g, '/');
  res.json({ fileUrl: rel, size: req.file.size, originalName: req.file.originalname });
});

/* ---------- list media with pagination ---------- */
router.get('/', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const offset = parseInt(req.query.offset) || 0;
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM MediaAsset ORDER BY id DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed to list media' });
  }
});

/* ---------- secure stream-url (10 min) ---------- */
router.get('/:id/stream-url', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const [rows] = await pool.execute('SELECT * FROM MediaAsset WHERE id=?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'not found' });

    const token = jwt.sign({ mid: id }, process.env.JWT_SECRET, { expiresIn: '10m' });
    const url = `${process.env.BASE_URL}/stream/${id}?token=${encodeURIComponent(token)}`;

    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().slice(0, 45);
    await pool.execute('INSERT INTO MediaViewLog (media_id, ip) VALUES (?, ?)', [id, ip]);

    res.json({ streamUrl: url, expiresInSeconds: 600, type: rows[0].type });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed to create stream url' });
  }
});

/* ---------- get one media by id ---------- */
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const [rows] = await pool.execute('SELECT * FROM MediaAsset WHERE id=?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'not found' });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed to fetch media' });
  }
});

/* ---------- delete media ---------- */
router.delete('/:id', authRequired, async (req, res) => {
  const id = Number(req.params.id);
  try {
    const [rows] = await pool.execute('SELECT file_url FROM MediaAsset WHERE id=?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'not found' });

    // delete the DB record (view logs cascade)
    await pool.execute('DELETE FROM MediaAsset WHERE id=?', [id]);

    // optionally remove local file if it lives under ./uploads
    const fileUrl = rows[0].file_url;
    const abs = path.isAbsolute(fileUrl) ? fileUrl : path.join(process.cwd(), fileUrl);
    if (abs.startsWith(uploadDir) && fs.existsSync(abs)) {
      fs.unlink(abs, () => {});
    }

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed to delete' });
  }
});

/* ---------- /stream handler (exported separately) ---------- */
async function streamHandler(req, res) {
  const id = Number(req.params.id);
  const { token } = req.query;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.mid !== id) return res.status(403).json({ error: 'token does not match media' });

    const [rows] = await pool.execute('SELECT file_url FROM MediaAsset WHERE id=?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'not found' });

    const fileUrl = rows[0].file_url;
    if (/^https?:\/\//i.test(fileUrl)) return res.redirect(fileUrl);

    const resolved = path.isAbsolute(fileUrl) ? fileUrl : path.join(process.cwd(), fileUrl);
    return res.sendFile(resolved, (err) => {
      if (err) res.status(404).json({ error: 'file not found' });
    });
  } catch {
    return res.status(403).json({ error: 'invalid or expired token' });
  }
}

module.exports = { router, streamHandler };
