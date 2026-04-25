const { prisma } = require('../../lib/prisma');
const { patchSession } = require('../session');
const { sendText, sendList, sendButtons } = require('../client');
const { uploadPetPhoto } = require('../../services/cloudinary.service');
const t = require('../messages/templates');
const { extractBody, hasMedia } = require('../utils');

async function petFlow(sock, jid, phone, body, session, msg) {
  const { step, context } = session;

  switch (step) {
    case 'REGISTER_NAME':
      return handleRegisterName(jid, phone, body, context);
    case 'CREATE_PET_NAME':
      return handlePetName(jid, phone, body, context);
    case 'CREATE_PET_BREED':
      return handlePetBreed(jid, phone, body, context);
    case 'CREATE_PET_DOB':
      return handlePetDob(jid, phone, body, context);
    case 'CREATE_PET_PHOTO':
      return handlePetPhoto(sock, jid, phone, body, session, msg);
    case 'CREATE_PET_AREA':
      return handlePetArea(jid, phone, body, context);
    case 'CREATE_PET_ADDRESS':
      return handlePetAddress(jid, phone, body, context);
    case 'CREATE_PET_LANDMARK':
      return handlePetLandmark(jid, phone, body, context);
    case 'CREATE_PET_REQUIREMENTS':
      return handlePetRequirements(jid, phone, body, context);
    case 'CREATE_PET_REMARKS':
      return handlePetRemarks(jid, phone, body, context);
    default:
      await sendText(jid, '⚠️ Unknown step. Type *Hi* to restart.');
  }
}

async function handleRegisterName(jid, phone, body, context) {
  if (!body || body.trim().length < 2) {
    await sendText(jid, 'Please enter your name (at least 2 characters).');
    return;
  }

  const customer = await prisma.customer.upsert({
    where: { phone },
    update: { name: body.trim() },
    create: { phone, name: body.trim() },
  });

  await patchSession(phone, {
    step: 'CREATE_PET_NAME',
    context: { customerId: customer.id },
  });
  await sendText(jid, `Nice to meet you, *${customer.name}*! 🎉\n\nLet's add your pet's profile.`);
  await sendText(jid, t.askPetName());
}

async function handlePetName(jid, phone, body, context) {
  if (!body || body.trim().length < 2) {
    await sendText(jid, "Please enter your pet's name.");
    return;
  }
  await patchSession(phone, {
    step: 'CREATE_PET_BREED',
    context: { ...context, petName: body.trim() },
  });
  await sendText(jid, t.askPetBreed(body.trim()));
}

async function handlePetBreed(jid, phone, body, context) {
  if (!body || body.trim().length < 2) {
    await sendText(jid, "Please enter your pet's breed.");
    return;
  }
  await patchSession(phone, {
    step: 'CREATE_PET_DOB',
    context: { ...context, petBreed: body.trim() },
  });
  await sendText(jid, t.askPetDob());
}

async function handlePetDob(jid, phone, body, context) {
  let dob = null;
  if (body && body.toLowerCase() !== 'skip') {
    const parts = body.trim().split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts.map(Number);
      const parsed = new Date(year, month - 1, day);
      if (!isNaN(parsed.getTime()) && parsed < new Date()) {
        dob = parsed.toISOString();
      } else {
        await sendText(jid, '⚠️ Invalid date. Please use DD/MM/YYYY or type *skip*.');
        return;
      }
    } else {
      await sendText(jid, '⚠️ Invalid format. Please use DD/MM/YYYY or type *skip*.');
      return;
    }
  }

  await patchSession(phone, {
    step: 'CREATE_PET_PHOTO',
    context: { ...context, petDob: dob },
  });
  await sendText(jid, t.askPetPhoto());
}

async function handlePetPhoto(sock, jid, phone, body, session, msg) {
  const { context } = session;
  let photoUrl = null;

  if (hasMedia(msg)) {
    try {
      const mediaMsg = msg.message?.imageMessage;
      if (mediaMsg) {
        const buffer = await sock.downloadMediaMessage(msg);
        photoUrl = await uploadPetPhoto(buffer, context.petName);
      }
    } catch (err) {
      // Non-fatal: continue without photo
    }
  } else if (body?.toLowerCase() === 'skip') {
    // proceed without photo
  } else {
    await sendText(jid, 'Please send a photo of your pet, or type *skip* to continue.');
    return;
  }

  await patchSession(phone, {
    step: 'CREATE_PET_AREA',
    context: { ...context, photoUrl },
  });

  const areas = await prisma.area.findMany({ where: { active: true } });
  const listArgs = t.askPetArea(areas);
  await sendList(jid, listArgs.title, listArgs.body, listArgs.buttonText, listArgs.sections);
}

async function handlePetArea(jid, phone, body, context) {
  const area = await prisma.area.findFirst({ where: { id: body, active: true } });
  if (!area) {
    await sendText(jid, '⚠️ Invalid area. Please choose from the list.');
    return;
  }

  await patchSession(phone, {
    step: 'CREATE_PET_ADDRESS',
    context: { ...context, areaId: area.id, areaName: area.name },
  });
  await sendText(jid, t.askPetAddress());
}

async function handlePetAddress(jid, phone, body, context) {
  if (!body || body.trim().length < 10) {
    await sendText(jid, '⚠️ Please enter a complete address (at least 10 characters).');
    return;
  }
  await patchSession(phone, {
    step: 'CREATE_PET_LANDMARK',
    context: { ...context, address: body.trim() },
  });
  await sendText(jid, t.askPetLandmark());
}

async function handlePetLandmark(jid, phone, body, context) {
  const landmark = body?.toLowerCase() === 'skip' ? null : body?.trim() || null;
  await patchSession(phone, {
    step: 'CREATE_PET_REQUIREMENTS',
    context: { ...context, landmark },
  });

  const listArgs = t.askSpecialRequirements();
  await sendList(jid, listArgs.title, listArgs.body, listArgs.buttonText, listArgs.sections);
}

async function handlePetRequirements(jid, phone, body, context) {
  const requirements = body === 'none' ? [] : [body].filter(Boolean);
  await patchSession(phone, {
    step: 'CREATE_PET_REMARKS',
    context: { ...context, specialRequirements: requirements },
  });
  await sendText(jid, t.askRemarks());
}

async function handlePetRemarks(jid, phone, body, context) {
  const remarks = body?.toLowerCase() === 'skip' ? null : body?.trim() || null;

  const pet = await prisma.pet.create({
    data: {
      customerId: context.customerId,
      name: context.petName,
      breed: context.petBreed,
      dob: context.petDob ? new Date(context.petDob) : null,
      photoUrl: context.photoUrl || null,
      areaId: context.areaId,
      address: context.address,
      landmark: context.landmark || null,
      specialRequirements: context.specialRequirements || [],
      remarks: remarks,
    },
  });

  await sendText(jid, `✅ *${pet.name}* has been added successfully! 🐾`);

  if (context.addingPetForBooking) {
    const pets = await prisma.pet.findMany({
      where: { customerId: context.customerId, active: true },
      include: { area: true },
    });

    await patchSession(phone, {
      step: 'SELECT_PET',
      context: { customerId: context.customerId },
    });

    const rows = [
      ...pets.map(p => ({ id: p.id, title: p.name, description: `${p.breed} • ${p.area?.name || ''}` })),
      { id: 'new_pet', title: '➕ Add New Pet', description: 'Register another pet' },
    ];
    await sendList(jid, '🐾 Your Pets', 'Select the pet to book for:', 'Choose Pet', [
      { title: 'Pets', rows },
    ]);
  } else {
    await patchSession(phone, { step: 'SELECT_PET', context: { customerId: context.customerId } });
    await sendText(jid, 'Now let\'s book a grooming session! Type *Hi* to start.');
  }
}

module.exports = petFlow;
