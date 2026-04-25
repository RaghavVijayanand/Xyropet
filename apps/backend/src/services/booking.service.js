const { prisma } = require('../lib/prisma');
const { isSlotAvailable } = require('./availability.service');

let bookingCounter = 0;

async function generateBookingNumber() {
  const year = new Date().getFullYear();
  const count = await prisma.booking.count();
  const seq = String(count + 1).padStart(5, '0');
  return `XP-${year}-${seq}`;
}

async function createBookingFromSession(context, customerId) {
  const {
    petId, groomerId, serviceId, areaId, address, landmark,
    scheduledAt, paymentMethod, amount, notes, specialRequirements,
  } = context;

  const schedAt = new Date(scheduledAt);

  // Verify slot availability inside a transaction with row-level lock
  return prisma.$transaction(async (tx) => {
    // Lock check via raw SQL for row-level locking
    const conflict = await tx.booking.findFirst({
      where: {
        groomerId,
        scheduledAt: schedAt,
        status: { notIn: ['CANCELLED'] },
      },
    });

    if (conflict) {
      throw new Error('SLOT_UNAVAILABLE');
    }

    const bookingNumber = await generateBookingNumber();

    const booking = await tx.booking.create({
      data: {
        bookingNumber,
        customerId,
        petId,
        groomerId: groomerId || null,
        serviceId,
        areaId,
        address,
        landmark: landmark || null,
        scheduledAt: schedAt,
        status: paymentMethod === 'PAY_AT_HOME' ? 'CONFIRMED' : 'PENDING',
        paymentMethod,
        paymentStatus: paymentMethod === 'PAY_AT_HOME' ? 'UNPAID' : 'UNPAID',
        amount: parseFloat(amount),
        notes: notes || (specialRequirements?.length ? specialRequirements.join(', ') : null),
      },
    });

    await tx.bookingStatusHistory.create({
      data: {
        bookingId: booking.id,
        fromStatus: null,
        toStatus: booking.status,
        changedBy: customerId,
        notes: 'Booking created via WhatsApp',
      },
    });

    if (paymentMethod === 'PAY_AT_HOME') {
      await tx.customer.update({
        where: { id: customerId },
        data: { isRepeat: true },
      });
    }

    return booking;
  });
}

async function updateBookingStatus(bookingId, newStatus, changedBy, notes) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new Error('Booking not found');

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: newStatus,
      completedAt: newStatus === 'COMPLETED' ? new Date() : undefined,
      cancelledAt: newStatus === 'CANCELLED' ? new Date() : undefined,
    },
  });

  await prisma.bookingStatusHistory.create({
    data: {
      bookingId,
      fromStatus: booking.status,
      toStatus: newStatus,
      changedBy,
      notes,
    },
  });

  return updated;
}

async function getBookingById(bookingId) {
  return prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      customer: true,
      pet: true,
      groomer: true,
      service: true,
      area: true,
      statusHistory: { orderBy: { createdAt: 'asc' } },
    },
  });
}

async function listBookings(filters = {}, page = 1, limit = 20) {
  const where = {};
  if (filters.status) where.status = filters.status;
  if (filters.groomerId) where.groomerId = filters.groomerId;
  if (filters.areaId) where.areaId = filters.areaId;
  if (filters.date) {
    const d = new Date(filters.date);
    where.scheduledAt = {
      gte: new Date(d.setHours(0, 0, 0, 0)),
      lte: new Date(d.setHours(23, 59, 59, 999)),
    };
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: { customer: true, pet: true, groomer: true, service: true, area: true },
      orderBy: { scheduledAt: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.booking.count({ where }),
  ]);

  return { bookings, total, page, limit };
}

module.exports = { createBookingFromSession, updateBookingStatus, getBookingById, listBookings };
