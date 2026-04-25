const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { prisma } = require('../../lib/prisma');

router.get('/', async (req, res, next) => {
  try {
    const areas = await prisma.area.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
    res.json(areas);
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { name, city } = req.body;
    if (!name || !city) return res.status(400).json({ error: 'name and city required' });
    const area = await prisma.area.create({ data: { name, city } });
    res.status(201).json(area);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { name, city, active } = req.body;
    const area = await prisma.area.update({
      where: { id: req.params.id },
      data: { ...(name && { name }), ...(city && { city }), ...(active !== undefined && { active }) },
    });
    res.json(area);
  } catch (err) {
    next(err);
  }
});

// Get slots available for an area on a date (public)
router.get('/:id/slots', async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'date query param required' });
    const { getAvailableSlots } = require('../../services/availability.service');
    const slots = await getAvailableSlots(req.params.id, new Date(date));
    res.json(slots);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
