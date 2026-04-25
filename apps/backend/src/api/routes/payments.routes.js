const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const {
  verifyWebhookSignature,
  handlePaymentCaptured,
  handlePaymentFailed,
  refundPayment,
} = require('../../services/payment.service');
const { notifyCustomerBookingConfirmed, notifyCustomerPaymentFailed } = require('../../services/notification.service');
const { patchSession, clearSession } = require('../../bot/session');
const { prisma } = require('../../lib/prisma');
const { format } = require('date-fns');
const logger = require('../../lib/logger');

// Razorpay webhook (raw body preserved)
router.post('/webhook', async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];

  if (!verifyWebhookSignature(req.body, signature)) {
    logger.warn('Invalid Razorpay webhook signature');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  let payload;
  try {
    payload = JSON.parse(req.body.toString());
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const event = payload.event;
  logger.info({ event }, 'Razorpay webhook received');

  try {
    if (event === 'payment.captured') {
      const booking = await handlePaymentCaptured(payload);
      if (booking) {
        const full = await prisma.booking.findUnique({
          where: { id: booking.id },
          include: { customer: true },
        });
        const slotLabel = format(new Date(booking.scheduledAt), 'EEE dd MMM • hh:mm a');

        await notifyCustomerBookingConfirmed(full.customer.phone, booking.bookingNumber, slotLabel);

        // Clear WhatsApp session for this customer
        await clearSession(full.customer.phone);
      }
    } else if (event === 'payment.failed') {
      const booking = await handlePaymentFailed(payload);
      if (booking) {
        const full = await prisma.booking.findUnique({
          where: { id: booking.id },
          include: { customer: true },
        });
        await notifyCustomerPaymentFailed(full.customer.phone);

        // Reset session to SELECT_PAYMENT so customer can retry
        await patchSession(full.customer.phone, { step: 'SELECT_PAYMENT' });
      }
    }
  } catch (err) {
    logger.error({ err }, 'Error processing Razorpay webhook');
  }

  res.json({ received: true });
});

// Admin: refund a booking payment
router.post('/:bookingId/refund', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { amount } = req.body;
    const refund = await refundPayment(req.params.bookingId, amount);
    res.json(refund);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
