const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { prisma } = require('../../lib/prisma');

// Dashboard stats
router.get('/stats', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      totalBookings,
      todayBookings,
      monthBookings,
      pendingBookings,
      totalCustomers,
      totalGroomers,
    ] = await Promise.all([
      prisma.booking.count(),
      prisma.booking.count({ where: { scheduledAt: { gte: today, lt: tomorrow } } }),
      prisma.booking.count({ where: { scheduledAt: { gte: monthStart } } }),
      prisma.booking.count({ where: { status: { in: ['PENDING', 'CONFIRMED'] } } }),
      prisma.customer.count(),
      prisma.groomer.count({ where: { active: true } }),
    ]);

    const monthRevenue = await prisma.booking.aggregate({
      where: { scheduledAt: { gte: monthStart }, paymentStatus: 'PAID' },
      _sum: { amount: true },
    });

    res.json({
      totalBookings,
      todayBookings,
      monthBookings,
      pendingBookings,
      totalCustomers,
      totalGroomers,
      monthRevenue: monthRevenue._sum.amount || 0,
    });
  } catch (err) {
    next(err);
  }
});

// List all customers
router.get('/customers', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        include: { pets: { where: { active: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.customer.count(),
    ]);
    res.json({ customers, total });
  } catch (err) {
    next(err);
  }
});

// List all services
router.get('/services', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const services = await prisma.service.findMany({ orderBy: { name: 'asc' } });
    res.json(services);
  } catch (err) {
    next(err);
  }
});

// Create / update service
router.post('/services', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { name, description, basePrice, durationMin } = req.body;
    if (!name || !basePrice || !durationMin) {
      return res.status(400).json({ error: 'name, basePrice, durationMin required' });
    }
    const service = await prisma.service.create({
      data: { name, description, basePrice: parseFloat(basePrice), durationMin: parseInt(durationMin) },
    });
    res.status(201).json(service);
  } catch (err) {
    next(err);
  }
});

router.patch('/services/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { name, description, basePrice, durationMin, active } = req.body;
    const service = await prisma.service.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(basePrice !== undefined && { basePrice: parseFloat(basePrice) }),
        ...(durationMin !== undefined && { durationMin: parseInt(durationMin) }),
        ...(active !== undefined && { active }),
      },
    });
    res.json(service);
  } catch (err) {
    next(err);
  }
});

// List reminders
router.get('/reminders', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const reminders = await prisma.reminder.findMany({
      where: { sent: false },
      include: { pet: { include: { customer: true } }, booking: true },
      orderBy: { sendAt: 'asc' },
    });
    res.json(reminders);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
