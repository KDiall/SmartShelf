import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function seedDemo() {
  console.log('Seeding demo users...');

  const pharmacy = await prisma.pharmacy.findFirst({ where: { name: 'Main Branch' } });
  if (!pharmacy) {
    console.error('No pharmacy found. Run prisma/seed.ts first.');
    process.exit(1);
  }

  const demoPhones = ['7000', '7001', '7002', '7003'];
  const demoUsers = [
    { phone: '7000', name: 'Demo Admin' },
    { phone: '7001', name: 'Demo Pharmacist 1' },
    { phone: '7002', name: 'Demo Pharmacist 2' },
    { phone: '7003', name: 'Demo Pharmacist 3' },
  ];

  for (const u of demoUsers) {
    const existing = await prisma.user.findUnique({ where: { phone: u.phone } });
    if (!existing) {
      await prisma.user.create({
        data: {
          phone: u.phone,
          name: u.name,
          role: u.phone === '7000' ? 'admin' : 'pharmacist',
          verified: true,
          pharmacyId: pharmacy.id,
        },
      });
      console.log(`  Created demo user: ${u.phone} (${u.name})`);
    } else {
      console.log(`  Demo user already exists: ${u.phone}`);
    }
  }

  console.log('Demo seeding complete.');
  console.log('Login: enter phone (7000-7003) and OTP 123456');
}

seedDemo()
  .catch((e) => {
    console.error('Demo seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
