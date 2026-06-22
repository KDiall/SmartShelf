import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedDemo() {
  console.log('Seeding demo — clearing old data, creating super admin 7000...');

  // Delete demo users so they're free for the super admin to assign via UI
  for (const phone of ['7001', '7002', '7003', '7004']) {
    await prisma.user.deleteMany({ where: { phone } });
  }
  console.log('  Cleared demo users 7001-7004');

  // Delete the sample pharmacy created by seed.ts so it doesn't clutter the list
  const mainBranch = await prisma.pharmacy.findFirst({ where: { name: 'Main Branch' } });
  if (mainBranch) {
    await prisma.pharmacy.delete({ where: { id: mainBranch.id } });
    console.log('  Deleted Main Branch pharmacy (and its medicines/sales)');
  }

  // Create or update the super admin
  const existing = await prisma.user.findUnique({ where: { phone: '7000' } });
  if (existing) {
    await prisma.user.update({
      where: { phone: '7000' },
      data: { name: 'Super Admin', role: 'super_admin', pharmacyId: null, verified: true },
    });
    console.log('  Updated super admin 7000');
  } else {
    await prisma.user.create({
      data: { phone: '7000', name: 'Super Admin', role: 'super_admin', verified: true, pharmacyId: null },
    });
    console.log('  Created super admin 7000');
  }

  console.log('');
  console.log('Demo ready:');
  console.log('  7000 (Super Admin) — login with OTP 123456');
  console.log('  Then create Pharmacy A with admin 7001, Pharmacy B with admin 7003');
  console.log('  7001 adds 7002 as pharmacist, 7003 adds 7004 as pharmacist');
  console.log('');
  console.log('All demo phones (7000-7004) use OTP 123456');
}

seedDemo()
  .catch((e) => {
    console.error('Demo seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
