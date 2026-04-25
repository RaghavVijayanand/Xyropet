const Redis = require('ioredis');
const logger = require('./logger');

let client;

async function initRedis() {
  client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
    retryStrategy: (times) => Math.min(times * 100, 3000),
  });

  await new Promise((resolve, reject) => {
    client.once('ready', resolve);
    client.once('error', reject);
  });

  client.on('error', (err) => logger.error({ err }, 'Redis error'));
  return client;
}

function getRedis() {
  if (!client) throw new Error('Redis not initialized');
  return client;
}

module.exports = { initRedis, getRedis };
