const { getRedis } = require('../lib/redis');

const SESSION_TTL_SECONDS = 1800; // 30 minutes
const KEY_PREFIX = 'wa:session:';

function sessionKey(phone) {
  return `${KEY_PREFIX}${phone}`;
}

async function getSession(phone) {
  const redis = getRedis();
  const raw = await redis.get(sessionKey(phone));
  if (!raw) return defaultSession();
  return JSON.parse(raw);
}

async function setSession(phone, session) {
  const redis = getRedis();
  await redis.setex(sessionKey(phone), SESSION_TTL_SECONDS, JSON.stringify(session));
}

async function patchSession(phone, patch) {
  const session = await getSession(phone);
  const updated = {
    ...session,
    ...patch,
    context: { ...session.context, ...(patch.context || {}) },
    updatedAt: new Date().toISOString(),
  };
  await setSession(phone, updated);
  return updated;
}

async function clearSession(phone) {
  const redis = getRedis();
  await redis.del(sessionKey(phone));
}

function defaultSession() {
  return {
    step: 'IDLE',
    context: {},
    updatedAt: new Date().toISOString(),
  };
}

module.exports = { getSession, setSession, patchSession, clearSession, defaultSession };
