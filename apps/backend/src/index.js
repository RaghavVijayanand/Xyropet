require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const logger = require('./lib/logger');
const { prisma } = require('./lib/prisma');
const { initRedis } = require('./lib/redis');
const { initWhatsApp } = require('./bot/client');
const { initQueues } = require('./jobs/queue');

const authRoutes = require('./api/routes/auth.routes');
const bookingRoutes = require('./api/routes/bookings.routes');
const petRoutes = require('./api/routes/pets.routes');
const groomerRoutes = require('./api/routes/groomers.routes');
const areaRoutes = require('./api/routes/areas.routes');
const paymentRoutes = require('./api/routes/payments.routes');
const adminRoutes = require('./api/routes/admin.routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Raw body needed for Razorpay webhook signature verification
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'XYROPet API' });
});

app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/pets', petRoutes);
app.use('/api/groomers', groomerRoutes);
app.use('/api/areas', areaRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);

app.use((err, req, res, next) => {
  logger.error({ err }, 'Unhandled error');
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

async function bootstrap() {
  try {
    await prisma.$connect();
    logger.info('Database connected');

    await initRedis();
    logger.info('Redis connected');

    await initQueues();
    logger.info('Job queues initialized');

    const server = createServer(app);
    server.listen(PORT, () => {
      logger.info(`XYROPet API running on port ${PORT}`);
    });

    if (process.env.WA_ENABLED !== 'false') {
      initWhatsApp().catch(err => logger.error({ err }, 'WhatsApp init failed'));
    }
  } catch (err) {
    logger.error({ err }, 'Bootstrap failed');
    process.exit(1);
  }
}

bootstrap();
