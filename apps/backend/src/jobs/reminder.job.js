const { prisma } = require('../lib/prisma');
const { sendReminderMessage } = require('../services/notification.service');
const logger = require('../lib/logger');

async function processReminder(job) {
  const { reminderId, petId, customerId, groomingFrequency } = job.data;

  logger.info({ reminderId, petId }, 'Processing reminder job');

  const [pet, customer, reminder] = await Promise.all([
    prisma.pet.findUnique({ where: { id: petId } }),
    prisma.customer.findUnique({ where: { id: customerId } }),
    prisma.reminder.findUnique({ where: { id: reminderId } }),
  ]);

  if (!pet || !customer || !reminder) {
    logger.warn({ reminderId }, 'Reminder data not found, skipping');
    return;
  }

  if (reminder.sent) {
    logger.info({ reminderId }, 'Reminder already sent, skipping');
    return;
  }

  await sendReminderMessage(customer.phone, pet.name, groomingFrequency);

  await prisma.reminder.update({
    where: { id: reminderId },
    data: { sent: true, sentAt: new Date() },
  });

  logger.info({ reminderId, phone: customer.phone }, 'Reminder sent successfully');
}

module.exports = processReminder;
