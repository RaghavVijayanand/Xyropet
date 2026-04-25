const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  isJidBroadcast,
} = require('@whiskeysockets/baileys');
const path = require('path');
const fs = require('fs');
const qrcode = require('qrcode-terminal');
const logger = require('../lib/logger');
const { handleMessage } = require('./handlers/message.handler');

const SESSION_PATH = path.resolve(process.env.WA_SESSION_PATH || './wa-session');

let sock;

async function initWhatsApp() {
  if (!fs.existsSync(SESSION_PATH)) {
    fs.mkdirSync(SESSION_PATH, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH);
  const { version } = await fetchLatestBaileysVersion();

  logger.info({ version }, 'Starting Baileys WhatsApp client');

  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: logger.child({ module: 'baileys' }),
    getMessage: async () => ({ conversation: '' }),
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      logger.info('Scan QR code to connect WhatsApp:');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      logger.warn({ statusCode, shouldReconnect }, 'WA connection closed');
      if (shouldReconnect) {
        setTimeout(initWhatsApp, 5000);
      }
    }

    if (connection === 'open') {
      logger.info('WhatsApp connected successfully');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (msg.key.fromMe) continue;
      if (isJidBroadcast(msg.key.remoteJid)) continue;
      await handleMessage(sock, msg).catch(err =>
        logger.error({ err, msgId: msg.key.id }, 'Error handling message')
      );
    }
  });

  return sock;
}

function getSocket() {
  return sock;
}

async function sendMessage(jid, content) {
  if (!sock) throw new Error('WhatsApp client not initialized');
  return sock.sendMessage(jid, content);
}

async function sendText(jid, text) {
  return sendMessage(jid, { text });
}

async function sendList(jid, title, body, buttonText, sections) {
  return sendMessage(jid, {
    listMessage: {
      title,
      description: body,
      buttonText,
      listType: 1,
      sections,
    },
  });
}

async function sendButtons(jid, text, buttons) {
  return sendMessage(jid, {
    buttonsMessage: {
      contentText: text,
      buttons: buttons.map((b, i) => ({
        buttonId: b.id || String(i + 1),
        buttonText: { displayText: b.title },
        type: 1,
      })),
      headerType: 1,
    },
  });
}

module.exports = { initWhatsApp, getSocket, sendMessage, sendText, sendList, sendButtons };
