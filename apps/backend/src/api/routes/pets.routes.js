const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { prisma } = require('../../lib/prisma');

// Admin: list all pets
router.get('/', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { customerId, areaId, page = 1, limit = 20 } = req.query;
    const where = { active: true };
    if (customerId) where.customerId = customerId;
    if (areaId) where.areaId = areaId;

    const [pets, total] = await Promise.all([
      prisma.pet.findMany({
        where,
        include: { customer: true, area: true },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.pet.count({ where }),
    ]);

    res.json({ pets, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
});

// Admin: get pet details
router.get('/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const pet = await prisma.pet.findUnique({
      where: { id: req.params.id },
      include: { customer: true, area: true, bookings: { take: 5, orderBy: { createdAt: 'desc' } } },
    });
    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    res.json(pet);
  } catch (err) {
    next(err);
  }
});

// Admin: update grooming frequency
router.patch('/:id/frequency', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { groomingFrequency } = req.body;
    if (![15, 30, 60].includes(Number(groomingFrequency))) {
      return res.status(400).json({ error: 'Frequency must be 15, 30, or 60 days' });
    }
    const pet = await prisma.pet.update({
      where: { id: req.params.id },
      data: { groomingFrequency: Number(groomingFrequency) },
    });
    res.json(pet);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
