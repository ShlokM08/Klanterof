const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('./db');

const router = express.Router();
const sign = (uid) => jwt.sign({ uid }, process.env.JWT_SECRET, { expiresIn: '1h' });

router.post('/signup', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email & password required' });
  try {
    const hashed = await bcrypt.hash(password, 10);
    await pool.execute('INSERT INTO AdminUser (email, hashed_password) VALUES (?, ?)', [email, hashed]);
    const [rows] = await pool.execute('SELECT id FROM AdminUser WHERE email=?', [email]);
    res.json({ token: sign(rows[0].id) });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'email already exists' });
    console.error(e);
    res.status(500).json({ error: 'signup failed' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email & password required' });
  try {
    const [rows] = await pool.execute('SELECT id, hashed_password FROM AdminUser WHERE email=?', [email]);
    if (!rows.length) return res.status(401).json({ error: 'invalid credentials' });
    const ok = await bcrypt.compare(password, rows[0].hashed_password);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });
    res.json({ token: sign(rows[0].id) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'login failed' });
  }
});

module.exports = router;   // 👈 important: export the router function
