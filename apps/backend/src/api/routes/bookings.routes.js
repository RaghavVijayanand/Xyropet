const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { listBookings, getBookingById, updateBookingStatus } = require('../../services/booking.service');
const { notifyCustomerStatusUpdate } = require('../../services/notification.service');
const { scheduleReminder, cancelRemindersForPet } = require('../../services/reminder.service');
const { prisma } = require('../../lib/prisma');

// Admin: list all bookings
router.get('/', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { status, groomerId, areaId, date, page = 1, limit = 20 } = req.query;
    const result = await listBookings({ status, groomerId, areaId, date }, Number(page), Number(limit));
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Admin / Groomer: get booking details
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const booking = await getBookingById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    if (req.user.role === 'groomer' && booking.groomerId !== req.user.sub) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json(booking);
  } catch (err) {
    next(err);
  }
});

// Admin: assign groomer to booking
router.patch('/:id/assign', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { groomerId } = req.body;
    if (!groomerId) return res.status(400).json({ error: 'groomerId required' });

    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data: { groomerId, status: 'CONFIRMED' },
      include: { customer: true, pet: true },
    });
    res.json(booking);
  } catch (err) {
    next(err);
  }
});

// Groomer: update job status
router.patch('/:id/status', authenticate, requireRole('groomer', 'admin'), async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const allowed = ['ON_THE_WAY', 'STARTED', 'COMPLETED', 'CANCELLED'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${allowed.join(', ')}` });
    }

    const booking = await updateBookingStatus(req.params.id, status, req.user.sub, notes);

    // Notify customer
    const full = await getBookingById(booking.id);
    await notifyCustomerStatusUpdate(
      full.customer.phone,
      status,
      full.pet.name,
      full.address
    );

    // Schedule frequency reminder after completion
    if (status === 'COMPLETED') {
      await cancelRemindersForPet(full.petId);
      if (full.pet.groomingFrequency) {
        await scheduleReminder(booking, full.pet, full.customer);
      }

      await prisma.pet.update({
        where: { id: full.petId },
        data: { lastGroomedAt: new Date() },
      });
    }

    res.json(booking);
  } catch (err) {
    next(err);
  }
});

// Admin: cancel booking with optional refund
router.delete('/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { reason } = req.body;
    const booking = await updateBookingStatus(req.params.id, 'CANCELLED', req.user.sub, reason);
    res.json(booking);
  } catch (err) {
    next(err);
  }
});

// Groomer: get today's jobs
router.get('/groomer/my-jobs', authenticate, requireRole('groomer'), async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const bookings = await prisma.booking.findMany({
      where: {
        groomerId: req.user.sub,
        scheduledAt: { gte: today, lt: tomorrow },
        status: { notIn: ['CANCELLED'] },
      },
      include: { customer: true, pet: true, service: true, area: true },
      orderBy: { scheduledAt: 'asc' },
    });
    res.json(bookings);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
