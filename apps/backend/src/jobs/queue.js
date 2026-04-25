const { Queue, Worker } = require('bullmq');
const { getRedis } = require('../lib/redis');
const logger = require('../lib/logger');

let reminderQueue;
let reminderWorker;

async function initQueues() {
  const connection = getRedis();

  reminderQueue = new Queue('reminders', { connection });

  reminderWorker = new Worker('reminders', require('./reminder.job'), {
    connection,
    concurrency: 5,
  });

  reminderWorker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Reminder job completed');
  });

  reminderWorker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Reminder job failed');
  });
}

function getReminderQueue() {
  if (!reminderQueue) throw new Error('Queues not initialized');
  return reminderQueue;
}

module.exports = { initQueues, getReminderQueue };
