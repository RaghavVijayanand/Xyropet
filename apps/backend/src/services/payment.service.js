const Razorpay = require('razorpay');
const crypto = require('crypto');
const { prisma } = require('../lib/prisma');
const logger = require('../lib/logger');

let razorpay;

function getRazorpay() {
  if (!razorpay) {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpay;
}

async function createRazorpayOrder({ amount, currency = 'INR', receipt }) {
  const rp = getRazorpay();
  const order = await rp.orders.create({ amount, currency, receipt });
  return order;
}

function verifyWebhookSignature(rawBody, signature) {
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  return expectedSignature === signature;
}

async function handlePaymentCaptured(payload) {
  const { order_id, id: paymentId } = payload.payment.entity;

  const booking = await prisma.booking.findFirst({
    where: { razorpayOrderId: order_id },
    include: { customer: true },
  });

  if (!booking) {
    logger.warn({ order_id }, 'Booking not found for Razorpay order');
    return null;
  }

  // Idempotency: skip if already captured
  if (booking.paymentStatus === 'PAID') {
    logger.info({ order_id }, 'Payment already captured, skipping');
    return booking;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const b = await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
        razorpayPayId: paymentId,
      },
    });

    await tx.bookingStatusHistory.create({
      data: {
        bookingId: booking.id,
        fromStatus: booking.status,
        toStatus: 'CONFIRMED',
        notes: `Payment captured: ${paymentId}`,
      },
    });

    await tx.customer.update({
      where: { id: booking.customerId },
      data: { isRepeat: true },
    });

    return b;
  });

  logger.info({ bookingId: booking.id, paymentId }, 'Payment captured, booking confirmed');
  return updated;
}

async function handlePaymentFailed(payload) {
  const { order_id } = payload.payment.entity;

  const booking = await prisma.booking.findFirst({
    where: { razorpayOrderId: order_id },
  });

  if (!booking) return null;

  await prisma.booking.update({
    where: { id: booking.id },
    data: { status: 'CANCELLED', cancelledAt: new Date() },
  });

  logger.info({ bookingId: booking.id }, 'Payment failed, booking cancelled');
  return booking;
}

async function refundPayment(bookingId, amount) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking?.razorpayPayId) throw new Error('No payment to refund');

  const rp = getRazorpay();
  const refund = await rp.payments.refund(booking.razorpayPayId, { amount });

  await prisma.booking.update({
    where: { id: bookingId },
    data: { paymentStatus: 'REFUNDED' },
  });

  return refund;
}

module.exports = {
  createRazorpayOrder,
  verifyWebhookSignature,
  handlePaymentCaptured,
  handlePaymentFailed,
  refundPayment,
};
