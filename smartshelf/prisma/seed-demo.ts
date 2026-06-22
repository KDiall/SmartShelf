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

  const demoUsers = [
    { phone: '7000', name: 'Super Admin', role: 'super_admin' as const, pharmacyId: null },
    { phone: '7001', name: 'Pharmacy Admin', role: 'admin' as const, pharmacyId: pharmacy.id },
    { phone: '7002', name: 'Pharmacist 1', role: 'pharmacist' as const, pharmacyId: pharmacy.id },
    { phone: '7003', name: 'Pharmacy Admin 2', role: 'admin' as const, pharmacyId: pharmacy.id },
    { phone: '7004', name: 'Pharmacist 2', role: 'pharmacist' as const, pharmacyId: pharmacy.id },
  ];

  for (const u of demoUsers) {
    const existing = await prisma.user.findUnique({ where: { phone: u.phone } });
    if (existing) {
      await prisma.user.update({
        where: { phone: u.phone },
        data: { role: u.role, name: u.name, pharmacyId: u.pharmacyId, verified: true },
      });
      console.log(`  Updated demo user: ${u.phone} -> ${u.name} (${u.role})`);
    } else {
      await prisma.user.create({
        data: {
          phone: u.phone,
          name: u.name,
          role: u.role,
          verified: true,
          pharmacyId: u.pharmacyId,
        },
      });
      console.log(`  Created demo user: ${u.phone} (${u.name})`);
    }
  }

  console.log('Demo seeding complete.');
  console.log('Login: enter phone (7000-7004) and OTP 123456');
}

seedDemo()
  .catch((e) => {
    console.error('Demo seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
