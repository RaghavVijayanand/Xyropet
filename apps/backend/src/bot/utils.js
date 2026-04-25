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

module.exports = { extractBody, hasMedia };
