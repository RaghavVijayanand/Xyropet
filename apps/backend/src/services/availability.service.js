const { prisma } = require('../lib/prisma');
const { addHours, format, startOfDay, endOfDay, setHours, setMinutes } = require('date-fns');

const SLOT_START_HOUR = 9;
const SLOT_END_HOUR = 18;
const SLOT_DURATION_HOURS = 1;

async function getAvailableSlots(areaId, date) {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  const groomerAreas = await prisma.groomerArea.findMany({
    where: { areaId, groomer: { active: true } },
    include: { groomer: true },
  });

  if (groomerAreas.length === 0) return [];

  const groomerIds = groomerAreas.map(ga => ga.groomerId);

  // Fetch all leaves for this date
  const leaves = await prisma.groomerLeave.findMany({
    where: {
      groomerId: { in: groomerIds },
      date: dayStart,
    },
  });

  const fullyLeavedGroomers = new Set(leaves.filter(l => l.fullDay).map(l => l.groomerId));
  const availableGroomers = groomerAreas.filter(ga => !fullyLeavedGroomers.has(ga.groomerId));

  if (availableGroomers.length === 0) return [];

  const availableGroomerIds = availableGroomers.map(ga => ga.groomerId);

  // Fetch existing bookings in this date range
  const existingBookings = await prisma.booking.findMany({
    where: {
      groomerId: { in: availableGroomerIds },
      scheduledAt: { gte: dayStart, lte: dayEnd },
      status: { notIn: ['CANCELLED'] },
    },
    select: { groomerId: true, scheduledAt: true },
  });

  // Fetch blocked slots
  const blockedSlots = await prisma.blockedSlot.findMany({
    where: {
      groomerId: { in: availableGroomerIds },
      startsAt: { gte: dayStart },
      endsAt: { lte: dayEnd },
    },
  });

  const slots = [];

  for (const ga of availableGroomers) {
    const groomerId = ga.groomerId;
    const groomerName = ga.groomer.name;

    const bookedTimes = new Set(
      existingBookings
        .filter(b => b.groomerId === groomerId)
        .map(b => b.scheduledAt.toISOString())
    );

    for (let hour = SLOT_START_HOUR; hour < SLOT_END_HOUR; hour += SLOT_DURATION_HOURS) {
      const slotTime = setMinutes(setHours(new Date(date), hour), 0);
      slotTime.setSeconds(0, 0);

      if (bookedTimes.has(slotTime.toISOString())) continue;

      const isBlocked = blockedSlots.some(
        bs => bs.groomerId === groomerId && bs.startsAt <= slotTime && bs.endsAt > slotTime
      );
      if (isBlocked) continue;

      slots.push({
        id: `${groomerId}_${slotTime.toISOString()}`,
        groomerId,
        groomerName,
        scheduledAt: slotTime,
        time: format(slotTime, 'hh:mm a'),
        label: `${format(slotTime, 'hh:mm a')} — ${groomerName}`,
      });
    }
  }

  return slots.sort((a, b) => a.scheduledAt - b.scheduledAt);
}

async function isSlotAvailable(groomerId, scheduledAt) {
  const conflicting = await prisma.booking.findFirst({
    where: {
      groomerId,
      scheduledAt,
      status: { notIn: ['CANCELLED'] },
    },
  });

  if (conflicting) return false;

  const blocked = await prisma.blockedSlot.findFirst({
    where: {
      groomerId,
      startsAt: { lte: scheduledAt },
      endsAt: { gt: scheduledAt },
    },
  });

  if (blocked) return false;

  const leave = await prisma.groomerLeave.findFirst({
    where: {
      groomerId,
      date: startOfDay(scheduledAt),
      fullDay: true,
    },
  });

  return !leave;
}

module.exports = { getAvailableSlots, isSlotAvailable };
