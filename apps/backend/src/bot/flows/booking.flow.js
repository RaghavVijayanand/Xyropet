const { prisma } = require('../../lib/prisma');
const { patchSession, clearSession } = require('../session');
const { sendText, sendList, sendButtons } = require('../client');
const { getAvailableSlots } = require('../../services/availability.service');
const { createBookingFromSession } = require('../../services/booking.service');
const { createRazorpayOrder } = require('../../services/payment.service');
const t = require('../messages/templates');
const { addDays, format } = require('date-fns');

async function bookingFlow(sock, jid, phone, body, session, msg) {
  const { step, context } = session;

  switch (step) {
    case 'SELECT_PET':
      return handleSelectPet(jid, phone, body, context);
    case 'CONFIRM_ADDRESS':
      return handleConfirmAddress(jid, phone, body, context);
    case 'ENTER_NEW_ADDRESS':
      return handleEnterAddress(jid, phone, body, context);
    case 'SELECT_SERVICE':
      return handleSelectService(jid, phone, body, context);
    case 'SELECT_SLOT':
      return handleSelectSlot(jid, phone, body, context);
    case 'SELECT_PAYMENT':
      return handleSelectPayment(jid, phone, body, context);
    case 'AWAITING_PAYMENT':
      await sendText(jid, '⏳ Waiting for your payment. Please complete it using the link sent above.');
      return;
    case 'CONFIRM_BOOKING':
      return handleConfirmBooking(jid, phone, body, context);
    default:
      await clearSession(phone);
      await sendText(jid, '⚠️ Session expired. Type *Hi* to start again.');
  }
}

async function handleSelectPet(jid, phone, body, context) {
  if (body === 'new_pet') {
    await patchSession(phone, {
      step: 'CREATE_PET_NAME',
      context: { ...context, addingPetForBooking: true },
    });
    await sendText(jid, t.askPetName());
    return;
  }

  const pet = await prisma.pet.findFirst({
    where: { id: body, customerId: context.customerId, active: true },
    include: { area: true },
  });

  if (!pet) {
    await sendText(jid, '⚠️ Invalid selection. Please choose from the list.');
    return;
  }

  await patchSession(phone, {
    step: 'CONFIRM_ADDRESS',
    context: {
      ...context,
      petId: pet.id,
      petName: pet.name,
      petBreed: pet.breed,
      areaId: pet.areaId,
      areaName: pet.area?.name,
      address: pet.address,
      landmark: pet.landmark,
      specialRequirements: pet.specialRequirements,
    },
  });

  await sendText(
    jid,
    `🐾 Selected: *${pet.name}*\n\n📍 Address on file:\n${pet.address}${pet.landmark ? `\nLandmark: ${pet.landmark}` : ''}`
  );
  await sendButtons(jid, 'Confirm address?', [
    { id: 'confirm_address', title: '✅ Use this address' },
    { id: 'change_address', title: '✏️ Change address' },
  ]);
}

async function handleConfirmAddress(jid, phone, body, context) {
  if (body === 'change_address') {
    await patchSession(phone, { step: 'ENTER_NEW_ADDRESS' });
    await sendText(jid, t.askPetAddress());
    return;
  }

  if (body !== 'confirm_address') {
    await sendButtons(jid, 'Please confirm your address:', [
      { id: 'confirm_address', title: '✅ Use this address' },
      { id: 'change_address', title: '✏️ Change address' },
    ]);
    return;
  }

  await patchSession(phone, { step: 'SELECT_SERVICE' });
  await showServices(jid);
}

async function handleEnterAddress(jid, phone, body, context) {
  if (!body || body.length < 10) {
    await sendText(jid, '⚠️ Please enter a complete address (at least 10 characters).');
    return;
  }
  await patchSession(phone, {
    step: 'SELECT_SERVICE',
    context: { ...context, address: body, landmark: null },
  });
  await showServices(jid);
}

async function showServices(jid) {
  const services = await prisma.service.findMany({ where: { active: true } });
  if (services.length === 0) {
    await sendText(jid, '⚠️ No services available right now. Please try again later.');
    return;
  }
  const listArgs = t.askService(services);
  await sendList(jid, listArgs.title, listArgs.body, listArgs.buttonText, listArgs.sections);
}

async function handleSelectService(jid, phone, body, context) {
  const service = await prisma.service.findFirst({ where: { id: body, active: true } });
  if (!service) {
    await sendText(jid, '⚠️ Invalid selection. Please choose a service from the list.');
    return;
  }

  await patchSession(phone, {
    step: 'SELECT_SLOT',
    context: {
      ...context,
      serviceId: service.id,
      serviceName: service.name,
      amount: service.basePrice.toString(),
    },
  });

  await showSlots(jid, context.areaId);
}

async function showSlots(jid, areaId) {
  const today = new Date();
  const slots = [];

  for (let i = 0; i < 3; i++) {
    const date = addDays(today, i + 1);
    const daySlots = await getAvailableSlots(areaId, date);
    slots.push(...daySlots.map(s => ({
      ...s,
      label: `${format(date, 'EEE dd MMM')} • ${s.time}`,
    })));
  }

  if (slots.length === 0) {
    await sendText(jid, '⚠️ No slots available in the next 3 days. Please try again later or contact support.');
    return;
  }

  const listArgs = t.askSlot(slots);
  await sendList(jid, listArgs.title, listArgs.body, listArgs.buttonText, listArgs.sections);
}

async function handleSelectSlot(jid, phone, body, context) {
  const slotData = await parseSlotId(body);
  if (!slotData) {
    await sendText(jid, '⚠️ Invalid slot. Please choose from the list.');
    return;
  }

  await patchSession(phone, {
    step: 'SELECT_PAYMENT',
    context: {
      ...context,
      groomerId: slotData.groomerId,
      scheduledAt: slotData.scheduledAt,
      slotLabel: slotData.label,
    },
  });

  const customer = await prisma.customer.findUnique({ where: { phone } });
  const payArgs = t.askPaymentMethod(customer?.isRepeat || false);
  await sendButtons(jid, payArgs.text, payArgs.buttons);
}

async function handleSelectPayment(jid, phone, body, context) {
  if (body !== 'ONLINE' && body !== 'PAY_AT_HOME') {
    await sendText(jid, '⚠️ Please select a payment method from the options.');
    return;
  }

  if (body === 'PAY_AT_HOME') {
    const customer = await prisma.customer.findUnique({ where: { phone } });
    if (!customer?.isRepeat) {
      await sendText(jid, '⚠️ Pay at Home is only available for repeat customers. Please choose *Pay Online*.');
      return;
    }
  }

  await patchSession(phone, {
    step: 'CONFIRM_BOOKING',
    context: { ...context, paymentMethod: body },
  });

  const summaryArgs = {
    petName: context.petName,
    breed: context.petBreed,
    serviceName: context.serviceName,
    amount: context.amount,
    areaName: context.areaName,
    address: context.address,
    slotLabel: context.slotLabel,
    paymentMethod: body,
  };
  await sendText(jid, t.confirmBookingSummary(summaryArgs));
  await sendButtons(jid, 'Ready to confirm?', [
    { id: 'confirm_yes', title: '✅ Confirm Booking' },
    { id: 'confirm_no', title: '❌ Cancel' },
  ]);
}

async function handleConfirmBooking(jid, phone, body, context) {
  if (body === 'confirm_no' || body === 'cancel') {
    await clearSession(phone);
    await sendText(jid, '❌ Booking cancelled. Type *Hi* to start again.');
    return;
  }

  if (body !== 'confirm_yes') {
    await sendButtons(jid, 'Please confirm your booking:', [
      { id: 'confirm_yes', title: '✅ Confirm Booking' },
      { id: 'confirm_no', title: '❌ Cancel' },
    ]);
    return;
  }

  const customer = await prisma.customer.findUnique({ where: { phone } });

  try {
    const booking = await createBookingFromSession(context, customer.id);

    if (context.paymentMethod === 'ONLINE') {
      const order = await createRazorpayOrder({
        amount: Math.round(parseFloat(context.amount) * 100),
        currency: 'INR',
        receipt: booking.bookingNumber,
      });

      await patchSession(phone, {
        step: 'AWAITING_PAYMENT',
        context: { ...context, razorpayOrderId: order.id, bookingId: booking.id },
      });

      await prisma.booking.update({
        where: { id: booking.id },
        data: { razorpayOrderId: order.id },
      });

      await sendText(jid, t.paymentLink(order.short_url || `Pay via Razorpay (Order: ${order.id})`, context.amount));
    } else {
      await clearSession(phone);
      await sendText(jid, t.bookingConfirmed(booking.bookingNumber, context.slotLabel));
    }
  } catch (err) {
    if (err.message === 'SLOT_UNAVAILABLE') {
      await patchSession(phone, { step: 'SELECT_SLOT' });
      await sendText(jid, t.slotUnavailable());
      await showSlots(jid, context.areaId);
    } else {
      throw err;
    }
  }
}

async function parseSlotId(slotId) {
  // slotId format: {groomerId}_{isoDateTime}
  if (!slotId || !slotId.includes('_')) return null;
  const underscoreIdx = slotId.indexOf('_');
  const groomerId = slotId.substring(0, underscoreIdx);
  const scheduledAt = slotId.substring(underscoreIdx + 1);

  const groomer = await prisma.groomer.findUnique({ where: { id: groomerId } });
  if (!groomer) return null;

  const date = new Date(scheduledAt);
  if (isNaN(date.getTime())) return null;

  return {
    groomerId,
    scheduledAt: date,
    groomerName: groomer.name,
    label: format(date, 'EEE dd MMM • hh:mm a'),
  };
}

module.exports = bookingFlow;
