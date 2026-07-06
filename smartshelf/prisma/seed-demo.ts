import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/password';

const prisma = new PrismaClient();

const SUPER_ADMIN_PHONE = '23231569311';
const PHARMACY_1_ADMIN = '23278077127';
const PHARMACY_1_PHARMACIST = '23276567069';

async function seedDemo() {
  console.log('Seeding demo — clearing old data, creating 1 pharmacy with 3 users...');

  const demoPasswordHash = await hashPassword('Demo1234');

  // Delete old demo users so they can be re-created with the correct pharmacy
  const oldPhones = ['7000', '7001', '7002', '7003', '7004',
    SUPER_ADMIN_PHONE, PHARMACY_1_ADMIN, PHARMACY_1_PHARMACIST,
    '23299064007', '23288538947', '23232966674'];
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
      passwordHash: demoPasswordHash,
      mustChangePassword: false,
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
      passwordHash: demoPasswordHash,
      mustChangePassword: false,
    },
  });
  console.log(`  Created Pharmacy 1 admin ${PHARMACY_1_ADMIN}`);

  await prisma.user.create({
    data: {
      phone: PHARMACY_1_PHARMACIST,
      name: 'Pharmacy 1 Pharmacist',
      role: 'pharmacist',
      verified: true,
      pharmacyId: ph1.id,
      passwordHash: demoPasswordHash,
      mustChangePassword: false,
    },
  });
  console.log(`  Created Pharmacy 1 pharmacist ${PHARMACY_1_PHARMACIST}`);

  console.log('');
  console.log('Demo ready!');
  console.log(`  Super Admin:  +23231569311`);
  console.log(`  Pharmacy Admin: +23278077127`);
  console.log(`  Pharmacist:   +23276567069`);
  console.log('');
  console.log('All numbers log in with password: Demo1234');
}

seedDemo()
  .catch((e) => {
    console.error('Demo seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
