const { prisma } = require('../../lib/prisma');
const { patchSession } = require('../session');
const { sendText, sendList, sendButtons } = require('../client');
const t = require('../messages/templates');

const GREET_TRIGGERS = ['hi', 'hello', 'hey', 'book', 'start', 'hii', 'helo'];

async function idleHandler(sock, jid, phone, body, session, msg) {
  const text = (body || '').toLowerCase().trim();

  // Handle one-tap rebooking from reminder
  if (text.startsWith('rebook_')) {
    const petId = text.replace('rebook_', '');
    return handleRebook(jid, phone, petId);
  }

  if (!GREET_TRIGGERS.includes(text)) {
    await sendText(jid, '👋 Type *Hi* to book a grooming session for your pet!');
    return;
  }

  let customer = await prisma.customer.findUnique({ where: { phone } });

  if (!customer) {
    await patchSession(phone, { step: 'REGISTER_NAME', context: {} });
    await sendText(jid, t.greetNew());
    return;
  }

  if (text.startsWith('register_name')) return;

  const pets = await prisma.pet.findMany({
    where: { customerId: customer.id, active: true },
    include: { area: true },
  });

  if (pets.length === 0) {
    await patchSession(phone, {
      step: 'CREATE_PET_NAME',
      context: { customerId: customer.id },
    });
    await sendText(jid, t.greetNew());
    await sendText(jid, t.askPetName());
    return;
  }

  await patchSession(phone, {
    step: 'SELECT_PET',
    context: { customerId: customer.id },
  });

  await sendList(jid, ...Object.values(buildPetList(pets, customer.name)));
}

async function handleRebook(jid, phone, petId) {
  const pet = await prisma.pet.findFirst({
    where: { id: petId, active: true },
    include: { customer: true, area: true },
  });

  if (!pet) {
    await sendText(jid, '⚠️ Pet not found. Type *Hi* to start a new booking.');
    return;
  }

  await patchSession(phone, {
    step: 'CONFIRM_ADDRESS',
    context: {
      customerId: pet.customerId,
      petId: pet.id,
      petName: pet.name,
      areaId: pet.areaId,
      areaName: pet.area?.name,
      address: pet.address,
      landmark: pet.landmark,
    },
  });

  await sendText(
    jid,
    `🐾 Let's rebook for *${pet.name}*!\n\n📍 Address on file:\n${pet.address}${pet.landmark ? `\nLandmark: ${pet.landmark}` : ''}`
  );
  await sendButtons(jid, 'Confirm address?', [
    { id: 'confirm_address', title: '✅ Use this address' },
    { id: 'change_address', title: '✏️ Change address' },
  ]);
}

function buildPetList(pets, customerName) {
  return {
    title: `👋 Welcome back *${customerName}*! Choose a pet:`,
    body: 'Select your pet or add a new one',
    buttonText: 'Choose Pet',
    sections: [
      {
        title: 'Your Pets',
        rows: [
          ...pets.map(p => ({
            id: p.id,
            title: `${p.name}`,
            description: `${p.breed} • ${p.area?.name || 'No area'}`,
          })),
          { id: 'new_pet', title: '➕ Add New Pet', description: 'Register a new pet profile' },
        ],
      },
    ],
  };
}

module.exports = idleHandler;
