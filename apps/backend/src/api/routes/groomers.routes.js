const router = require('express').Router();
const bcrypt = require('bcrypt');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { prisma } = require('../../lib/prisma');

// Admin: list groomers
router.get('/', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const groomers = await prisma.groomer.findMany({
      include: { areas: { include: { area: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(groomers);
  } catch (err) {
    next(err);
  }
});

// Admin: create groomer
router.post('/', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { name, phone, password, areaIds = [] } = req.body;
    if (!name || !phone || !password) {
      return res.status(400).json({ error: 'name, phone, and password required' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const groomer = await prisma.groomer.create({
      data: {
        name,
        phone,
        passwordHash,
        areas: {
          create: areaIds.map(areaId => ({ areaId })),
        },
      },
      include: { areas: { include: { area: true } } },
    });
    res.status(201).json(groomer);
  } catch (err) {
    next(err);
  }
});

// Admin: update groomer
router.patch('/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { name, active, areaIds } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (active !== undefined) data.active = active;

    const groomer = await prisma.$transaction(async (tx) => {
      if (areaIds !== undefined) {
        await tx.groomerArea.deleteMany({ where: { groomerId: req.params.id } });
        await tx.groomerArea.createMany({
          data: areaIds.map(areaId => ({ groomerId: req.params.id, areaId })),
        });
      }
      return tx.groomer.update({
        where: { id: req.params.id },
        data,
        include: { areas: { include: { area: true } } },
      });
    });
    res.json(groomer);
  } catch (err) {
    next(err);
  }
});

// Groomer: get own profile
router.get('/me', authenticate, requireRole('groomer'), async (req, res, next) => {
  try {
    const groomer = await prisma.groomer.findUnique({
      where: { id: req.user.sub },
      include: { areas: { include: { area: true } } },
    });
    res.json(groomer);
  } catch (err) {
    next(err);
  }
});

// Groomer / Admin: get availability for a groomer
router.get('/:id/availability', authenticate, async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const startDate = new Date(Number(year), Number(month) - 1, 1);
    const endDate = new Date(Number(year), Number(month), 0);

    const [leaves, blockedSlots] = await Promise.all([
      prisma.groomerLeave.findMany({
        where: { groomerId: req.params.id, date: { gte: startDate, lte: endDate } },
      }),
      prisma.blockedSlot.findMany({
        where: {
          groomerId: req.params.id,
          startsAt: { gte: startDate },
          endsAt: { lte: new Date(endDate.getTime() + 86400000) },
        },
      }),
    ]);

    res.json({ leaves, blockedSlots });
  } catch (err) {
    next(err);
  }
});

// Groomer: mark full-day leave
router.post('/:id/leaves', authenticate, requireRole('groomer', 'admin'), async (req, res, next) => {
  try {
    const groomerId = req.user.role === 'groomer' ? req.user.sub : req.params.id;
    const { date } = req.body;
    if (!date) return res.status(400).json({ error: 'date required (ISO format)' });

    const leave = await prisma.groomerLeave.upsert({
      where: { groomerId_date: { groomerId, date: new Date(date) } },
      update: { fullDay: true },
      create: { groomerId, date: new Date(date), fullDay: true },
    });
    res.status(201).json(leave);
  } catch (err) {
    next(err);
  }
});

// Groomer: remove leave
router.delete('/:id/leaves/:leaveId', authenticate, requireRole('groomer', 'admin'), async (req, res, next) => {
  try {
    await prisma.groomerLeave.delete({ where: { id: req.params.leaveId } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// Groomer: block a time slot
router.post('/:id/blocked-slots', authenticate, requireRole('groomer', 'admin'), async (req, res, next) => {
  try {
    const groomerId = req.user.role === 'groomer' ? req.user.sub : req.params.id;
    const { startsAt, endsAt } = req.body;
    if (!startsAt || !endsAt) return res.status(400).json({ error: 'startsAt and endsAt required' });

    const slot = await prisma.blockedSlot.create({
      data: { groomerId, startsAt: new Date(startsAt), endsAt: new Date(endsAt) },
    });
    res.status(201).json(slot);
  } catch (err) {
    next(err);
  }
});

// Groomer: delete blocked slot
router.delete('/:id/blocked-slots/:slotId', authenticate, requireRole('groomer', 'admin'), async (req, res, next) => {
  try {
    await prisma.blockedSlot.delete({ where: { id: req.params.slotId } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
