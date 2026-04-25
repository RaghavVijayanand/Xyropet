const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10);
  await prisma.admin.upsert({
    where: { email: 'admin@xyropet.com' },
    update: {},
    create: { email: 'admin@xyropet.com', passwordHash: adminPassword, name: 'Admin' },
  });

  const areas = ['Koramangala', 'HSR Layout', 'Indiranagar', 'Whitefield', 'BTM Layout'];
  for (const name of areas) {
    await prisma.area.upsert({
      where: { name },
      update: {},
      create: { name, city: 'Bangalore' },
    });
  }

  const services = [
    { name: 'Bath & Dry', description: 'Shampoo, blow dry, and brush', basePrice: 499, durationMin: 60 },
    { name: 'Full Grooming', description: 'Bath, dry, haircut, nail trim, ear cleaning', basePrice: 799, durationMin: 90 },
    { name: 'Tick Treatment', description: 'Anti-tick shampoo and treatment', basePrice: 649, durationMin: 75 },
    { name: 'Medicated Bath', description: 'Medicated shampoo for skin conditions', basePrice: 699, durationMin: 75 },
    { name: 'Nail Trim', description: 'Nail trimming only', basePrice: 199, durationMin: 20 },
  ];
  for (const svc of services) {
    await prisma.service.upsert({
      where: { name: svc.name },
      update: {},
      create: svc,
    });
  }

  console.log('Seed complete');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
