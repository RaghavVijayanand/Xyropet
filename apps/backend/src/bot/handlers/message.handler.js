const logger = require('../../lib/logger');
const { getSession, patchSession, clearSession } = require('../session');
const { sendText, sendList, sendButtons } = require('../client');
const idleHandler = require('../flows/idle.flow');
const bookingFlow = require('../flows/booking.flow');
const petFlow = require('../flows/pet.flow');

const BOOKING_STEPS = [
  'SELECT_PET', 'CONFIRM_ADDRESS', 'ENTER_NEW_ADDRESS',
  'SELECT_SERVICE', 'SELECT_SLOT', 'SELECT_PAYMENT', 'AWAITING_PAYMENT', 'CONFIRM_BOOKING',
];

const PET_STEPS = [
  'CREATE_PET_NAME', 'CREATE_PET_BREED', 'CREATE_PET_DOB',
  'CREATE_PET_PHOTO', 'CREATE_PET_AREA', 'CREATE_PET_ADDRESS',
  'CREATE_PET_LANDMARK', 'CREATE_PET_REQUIREMENTS', 'CREATE_PET_REMARKS',
];

async function handleMessage(sock, msg) {
  const jid = msg.key.remoteJid;
  const phone = jid.replace('@s.whatsapp.net', '').replace('@c.us', '');
  const body = extractBody(msg);

  if (!body && !hasMedia(msg)) return;

  logger.debug({ phone, body, step: 'incoming' }, 'WA message received');

  const session = await getSession(phone);

  // Universal cancel command
  if (body?.toLowerCase() === 'cancel' || body === 'cancel') {
    await clearSession(phone);
    await sendText(jid, '❌ Booking cancelled. Type *Hi* to start again.');
    return;
  }

  try {
    if (session.step === 'IDLE') {
      await idleHandler(sock, jid, phone, body, session, msg);
    } else if (PET_STEPS.includes(session.step)) {
      await petFlow(sock, jid, phone, body, session, msg);
    } else if (BOOKING_STEPS.includes(session.step)) {
      await bookingFlow(sock, jid, phone, body, session, msg);
    } else {
      await clearSession(phone);
      await idleHandler(sock, jid, phone, body, { step: 'IDLE', context: {} }, msg);
    }
  } catch (err) {
    logger.error({ err, phone }, 'Flow handler error');
    await sendText(jid, '⚠️ Something went wrong. Please try again or type *Hi* to restart.');
  }
}

function extractBody(msg) {
  const m = msg.message;
  if (!m) return null;
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.listResponseMessage?.singleSelectReply?.selectedRowId ||
    m.buttonsResponseMessage?.selectedButtonId ||
    m.templateButtonReplyMessage?.selectedId ||
    null
  );
}

function hasMedia(msg) {
  const m = msg.message;
  return !!(m?.imageMessage || m?.documentMessage);
}

module.exports = { handleMessage, extractBody, hasMedia };
