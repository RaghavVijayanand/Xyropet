const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { prisma } = require('../../lib/prisma');

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

// Admin login
router.post('/admin/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken({ sub: admin.id, role: 'admin', name: admin.name });
    res.json({ token, name: admin.name, role: 'admin' });
  } catch (err) {
    next(err);
  }
});

// Groomer login
router.post('/groomer/login', async (req, res, next) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) return res.status(400).json({ error: 'Phone and password required' });

    const groomer = await prisma.groomer.findUnique({ where: { phone } });
    if (!groomer) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, groomer.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken({ sub: groomer.id, role: 'groomer', name: groomer.name });
    res.json({ token, name: groomer.name, role: 'groomer' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
