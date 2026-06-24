import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SUPER_ADMIN_PHONE = '23231569311';
const PHARMACY_1_ADMIN = '23278077127';
const PHARMACY_1_PHARMACIST = '23299064007';
const PHARMACY_2_ADMIN = '23288538947';
const PHARMACY_2_PHARMACIST = '23232966674';

async function seedDemo() {
  console.log('Seeding demo — clearing old data, creating 2 pharmacies with 5 users...');

  // Delete old demo users so they can be re-created with the correct pharmacy
  const oldPhones = ['7000', '7001', '7002', '7003', '7004',
    SUPER_ADMIN_PHONE, PHARMACY_1_ADMIN, PHARMACY_1_PHARMACIST,
    PHARMACY_2_ADMIN, PHARMACY_2_PHARMACIST];
  for (const phone of oldPhones) {
    await prisma.user.deleteMany({ where: { phone } });
  }
  console.log('  Cleared previous demo users');

  // Delete the sample pharmacy from seed.ts
  const mainBranch = await prisma.pharmacy.findFirst({ where: { name: 'Main Branch' } });
  if (mainBranch) {
    await prisma.pharmacy.delete({ where: { id: mainBranch.id } });
    console.log('  Deleted Main Branch pharmacy');
  }

  // --- Super Admin (no pharmacy) ---
  await prisma.user.create({
    data: {
      phone: SUPER_ADMIN_PHONE,
      name: 'Super Admin',
      role: 'super_admin',
      verified: true,
      pharmacyId: null,
    },
  });
  console.log(`  Created super admin ${SUPER_ADMIN_PHONE}`);

  // --- Pharmacy 1 ---
  const ph1 = await prisma.pharmacy.create({
    data: { name: 'SmartCare Pharmacy 1' },
  });
  console.log(`  Created Pharmacy 1 (${ph1.id})`);

  await prisma.user.create({
    data: {
      phone: PHARMACY_1_ADMIN,
      name: 'Pharmacy 1 Admin',
      role: 'admin',
      verified: true,
      pharmacyId: ph1.id,
    },
  });
  console.log(`  Created Pharmacy 1 admin ${PHARMACY_1_ADMIN}`);

  await prisma.user.create({
    data: {
      phone: PHARMACY_1_PHARMACIST,
      name: 'Pharmacy 1 Sales',
      role: 'pharmacist',
      verified: true,
      pharmacyId: ph1.id,
    },
  });
  console.log(`  Created Pharmacy 1 pharmacist ${PHARMACY_1_PHARMACIST}`);

  // --- Pharmacy 2 ---
  const ph2 = await prisma.pharmacy.create({
    data: { name: 'SmartCare Pharmacy 2' },
  });
  console.log(`  Created Pharmacy 2 (${ph2.id})`);

  await prisma.user.create({
    data: {
      phone: PHARMACY_2_ADMIN,
      name: 'Pharmacy 2 Admin',
      role: 'admin',
      verified: true,
      pharmacyId: ph2.id,
    },
  });
  console.log(`  Created Pharmacy 2 admin ${PHARMACY_2_ADMIN}`);

  await prisma.user.create({
    data: {
      phone: PHARMACY_2_PHARMACIST,
      name: 'Pharmacy 2 Sales',
      role: 'pharmacist',
      verified: true,
      pharmacyId: ph2.id,
    },
  });
  console.log(`  Created Pharmacy 2 pharmacist ${PHARMACY_2_PHARMACIST}`);

  console.log('');
  console.log('Demo ready!');
  console.log(`  Super Admin: ${SUPER_ADMIN_PHONE} — no pharmacy, no bot`);
  console.log(`  Pharmacy 1 admin: ${PHARMACY_1_ADMIN}`);
  console.log(`  Pharmacy 1 pharmacist: ${PHARMACY_1_PHARMACIST}`);
  console.log(`  Pharmacy 2 admin: ${PHARMACY_2_ADMIN}`);
  console.log(`  Pharmacy 2 pharmacist: ${PHARMACY_2_PHARMACIST}`);
  console.log('');
  console.log('All numbers log in with OTP 123456');
}

seedDemo()
  .catch((e) => {
    console.error('Demo seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
