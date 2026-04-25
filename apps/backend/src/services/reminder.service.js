const { getReminderQueue } = require('../jobs/queue');
const { prisma } = require('../lib/prisma');
const { addDays } = require('date-fns');
const logger = require('../lib/logger');

async function scheduleReminder(booking, pet, customer) {
  if (!pet.groomingFrequency) return;

  const sendAt = addDays(new Date(), pet.groomingFrequency);
  const delayMs = sendAt.getTime() - Date.now();

  if (delayMs <= 0) return;

  const reminder = await prisma.reminder.create({
    data: {
      bookingId: booking.id,
      petId: pet.id,
      sendAt,
      type: `FREQUENCY_${pet.groomingFrequency}`,
    },
  });

  const queue = getReminderQueue();
  const job = await queue.add(
    'send-reminder',
    {
      reminderId: reminder.id,
      petId: pet.id,
      customerId: customer.id,
      groomingFrequency: pet.groomingFrequency,
    },
    {
      delay: delayMs,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      jobId: `reminder_${reminder.id}`,
    }
  );

  await prisma.reminder.update({
    where: { id: reminder.id },
    data: { bullJobId: job.id },
  });

  logger.info({ reminderId: reminder.id, sendAt, petId: pet.id }, 'Reminder scheduled');
  return reminder;
}

async function cancelRemindersForPet(petId) {
  const pending = await prisma.reminder.findMany({
    where: { petId, sent: false },
  });

  const queue = getReminderQueue();

  for (const reminder of pending) {
    if (reminder.bullJobId) {
      try {
        const job = await queue.getJob(reminder.bullJobId);
        if (job) await job.remove();
      } catch (err) {
        logger.warn({ err, reminderId: reminder.id }, 'Could not remove BullMQ job');
      }
    }
  }

  await prisma.reminder.updateMany({
    where: { petId, sent: false },
    data: { sent: true, sentAt: new Date() },
  });
}

async function scheduleDayBeforeReminder(booking, customer) {
  const sendAt = new Date(booking.scheduledAt);
  sendAt.setDate(sendAt.getDate() - 1);
  sendAt.setHours(10, 0, 0, 0);

  const delayMs = sendAt.getTime() - Date.now();
  if (delayMs <= 0) return;

  const reminder = await prisma.reminder.create({
    data: {
      bookingId: booking.id,
      petId: booking.petId,
      sendAt,
      type: 'DAY_BEFORE',
    },
  });

  const queue = getReminderQueue();
  const job = await queue.add(
    'send-reminder',
    {
      reminderId: reminder.id,
      petId: booking.petId,
      customerId: customer.id,
      groomingFrequency: null,
    },
    {
      delay: delayMs,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      jobId: `day_before_${reminder.id}`,
    }
  );

  await prisma.reminder.update({ where: { id: reminder.id }, data: { bullJobId: job.id } });
}

module.exports = { scheduleReminder, cancelRemindersForPet, scheduleDayBeforeReminder };
