const { sendText } = require('../bot/client');
const t = require('../bot/messages/templates');
const logger = require('../lib/logger');

function toJid(phone) {
  const normalized = phone.replace(/\D/g, '');
  return `${normalized}@s.whatsapp.net`;
}

async function notifyCustomerBookingConfirmed(phone, bookingNumber, slotLabel) {
  try {
    await sendText(toJid(phone), t.bookingConfirmed(bookingNumber, slotLabel));
  } catch (err) {
    logger.error({ err, phone }, 'Failed to send booking confirmation');
  }
}

async function notifyCustomerStatusUpdate(phone, status, petName, address) {
  try {
    const msg = t.groomerStatusUpdate(status, petName, address);
    if (msg) await sendText(toJid(phone), msg);
  } catch (err) {
    logger.error({ err, phone }, 'Failed to send status update');
  }
}

async function notifyCustomerPaymentFailed(phone) {
  try {
    await sendText(toJid(phone), t.paymentFailed());
  } catch (err) {
    logger.error({ err, phone }, 'Failed to send payment failed notification');
  }
}

async function sendReminderMessage(phone, petName, groomingDays) {
  try {
    await sendText(toJid(phone), t.reminderMessage(petName, groomingDays));
  } catch (err) {
    logger.error({ err, phone }, 'Failed to send reminder');
  }
}

module.exports = {
  notifyCustomerBookingConfirmed,
  notifyCustomerStatusUpdate,
  notifyCustomerPaymentFailed,
  sendReminderMessage,
};
