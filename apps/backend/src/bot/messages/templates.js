const CANCEL_BUTTON = { id: 'cancel', title: '❌ Cancel' };

function greetNew(name) {
  return `👋 Welcome to *XYROPet*!\n\nI'm your pet grooming assistant. I'll help you book a grooming session for your furry friend.\n\nLet's start — what's your name?`;
}

function greetReturning(name, pets) {
  const petList = pets.map((p, i) => `${i + 1}. ${p.name} (${p.breed})`).join('\n');
  return `👋 Welcome back *${name}*!\n\nYour pets:\n${petList}\n\nReply with the number to book, or type *new* to add a new pet.`;
}

function askPetName() {
  return `🐾 Let's add your pet!\n\nWhat is your pet's *name*?`;
}

function askPetBreed(petName) {
  return `Great! What is *${petName}*'s breed?`;
}

function askPetDob() {
  return `What is your pet's date of birth? (DD/MM/YYYY)\n\nOr type *skip* to skip.`;
}

function askPetPhoto() {
  return `Please send a *photo* of your pet, or type *skip* to continue without one.`;
}

function askPetArea(areas) {
  return {
    title: '📍 Select Area',
    body: 'Which area should we service?',
    buttonText: 'Choose Area',
    sections: [{ title: 'Available Areas', rows: areas.map(a => ({ id: a.id, title: a.name })) }],
  };
}

function askPetAddress() {
  return `Please share your *full address* (house/flat number, street, etc.)`;
}

function askPetLandmark() {
  return `Any *landmark* nearby? (or type *skip*)`;
}

function askSpecialRequirements() {
  return {
    title: '🧴 Special Requirements',
    body: 'Does your pet need any special treatment?',
    buttonText: 'Select',
    sections: [
      {
        title: 'Requirements',
        rows: [
          { id: 'none', title: 'None', description: 'No special requirements' },
          { id: 'tick_shampoo', title: 'Tick Shampoo', description: 'Anti-tick treatment' },
          { id: 'medicated_shampoo', title: 'Medicated Shampoo', description: 'For skin conditions' },
          { id: 'sensitive_skin', title: 'Sensitive Skin', description: 'Gentle products only' },
        ],
      },
    ],
  };
}

function askRemarks() {
  return `Any additional *remarks* about your pet we should know? (or type *skip*)`;
}

function askService(services) {
  return {
    title: '✂️ Select Service',
    body: 'What service would you like?',
    buttonText: 'Choose Service',
    sections: [
      {
        title: 'Available Services',
        rows: services.map(s => ({
          id: s.id,
          title: s.name,
          description: `₹${s.basePrice} • ~${s.durationMin} min`,
        })),
      },
    ],
  };
}

function askSlot(slots) {
  const rows = slots.slice(0, 10).map(s => ({
    id: s.id,
    title: s.label,
    description: s.groomerName,
  }));
  return {
    title: '🕐 Select Time Slot',
    body: 'Choose a convenient time slot:',
    buttonText: 'Pick Slot',
    sections: [{ title: 'Available Slots', rows }],
  };
}

function askPaymentMethod(isRepeat) {
  const buttons = [{ id: 'ONLINE', title: '💳 Pay Online (Razorpay)' }];
  if (isRepeat) buttons.push({ id: 'PAY_AT_HOME', title: '🏠 Pay at Home' });
  return { text: '💰 How would you like to pay?', buttons };
}

function confirmBookingSummary(data) {
  return (
    `📋 *Booking Summary*\n\n` +
    `🐾 Pet: ${data.petName} (${data.breed})\n` +
    `✂️ Service: ${data.serviceName} — ₹${data.amount}\n` +
    `📍 Area: ${data.areaName}\n` +
    `🏠 Address: ${data.address}\n` +
    `🕐 Slot: ${data.slotLabel}\n` +
    `💰 Payment: ${data.paymentMethod === 'ONLINE' ? 'Online (Razorpay)' : 'Pay at Home'}\n\n` +
    `Confirm your booking?`
  );
}

function bookingConfirmed(bookingNumber, slotLabel) {
  return (
    `✅ *Booking Confirmed!*\n\n` +
    `Your booking *#${bookingNumber}* is confirmed for ${slotLabel}.\n\n` +
    `We'll send you a reminder before your appointment. Type *Hi* anytime to book again! 🐾`
  );
}

function paymentLink(url, amount) {
  return `💳 Complete your payment of ₹${amount}:\n${url}\n\n_Link valid for 15 minutes._`;
}

function paymentFailed() {
  return `❌ Payment failed or timed out. Would you like to try again?\n\nType *1* to retry online payment or *2* to pay at home (if eligible).`;
}

function slotUnavailable() {
  return `⚠️ That slot was just booked by someone else. Please choose another slot.`;
}

function reminderMessage(petName, groomingDays) {
  return (
    `🐾 Hi! It's been ${groomingDays} days since *${petName}*'s last grooming session.\n\n` +
    `Time for a fresh look! Reply *Book* to schedule a grooming appointment. 🛁`
  );
}

function groomerStatusUpdate(status, petName, address) {
  const messages = {
    ON_THE_WAY: `🚗 Your groomer is on the way for *${petName}*'s session!\n📍 ${address}`,
    STARTED: `✂️ Grooming session for *${petName}* has started!`,
    COMPLETED: `✅ Grooming session for *${petName}* is complete! Hope your pet loved it 🐾`,
  };
  return messages[status] || '';
}

module.exports = {
  CANCEL_BUTTON,
  greetNew,
  greetReturning,
  askPetName,
  askPetBreed,
  askPetDob,
  askPetPhoto,
  askPetArea,
  askPetAddress,
  askPetLandmark,
  askSpecialRequirements,
  askRemarks,
  askService,
  askSlot,
  askPaymentMethod,
  confirmBookingSummary,
  bookingConfirmed,
  paymentLink,
  paymentFailed,
  slotUnavailable,
  reminderMessage,
  groomerStatusUpdate,
};
