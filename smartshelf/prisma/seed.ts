import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  // 1. Seed Admin User
  const adminPhone = '+23276000000';
  let admin = await prisma.user.findUnique({ where: { phone: adminPhone } });
  
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        phone: adminPhone,
        name: 'Super Admin',
        role: 'admin',
        verified: true,
      },
    });
    console.log('Seeded admin user');
  }

  // 2. Seed Medicines with Images
  const medCount = await prisma.medicine.count();
  if (medCount > 0) {
    console.log('Medicines already seeded, skipping medicine seed');
  } else {
    const seedMedicines = [
      {
        name: 'Coartem (Artemether/Lumefantrine)',
        unit: 'packs',
        currentStock: 8,
        reorderThreshold: 15,
        reorderQuantity: 100,
        expiryDate: '2025-12-15',
        costPerUnit: 45000,
        isBig5: true,
        image: 'https://utfs.io/f/3f7e5b6a-8c1d-4d7a-8f8a-9a9b9c9d9e9f-coartem.jpg', // Placeholder
        userId: admin.id,
      },
      {
        name: 'Amoxicillin 500mg Capsules',
        unit: 'tins (1000s)',
        currentStock: 12,
        reorderThreshold: 20,
        reorderQuantity: 50,
        expiryDate: '2026-06-10',
        costPerUnit: 125000,
        isBig5: true,
        image: 'https://utfs.io/f/amox.jpg',
        userId: admin.id,
      },
      {
        name: 'Paracetamol 500mg Tablets',
        unit: 'packs (100s)',
        currentStock: 150,
        reorderThreshold: 50,
        reorderQuantity: 300,
        expiryDate: '2027-01-20',
        costPerUnit: 15000,
        isBig5: true,
        image: 'https://utfs.io/f/para.jpg',
        userId: admin.id,
      },
      {
        name: 'Metronidazole 400mg',
        unit: 'packs',
        currentStock: 18,
        reorderThreshold: 25,
        reorderQuantity: 80,
        expiryDate: '2025-09-05',
        costPerUnit: 35000,
        isBig5: true,
        image: 'https://utfs.io/f/metro.jpg',
        userId: admin.id,
      },
      {
        name: 'ORS + Zinc (Sachets)',
        unit: 'boxes',
        currentStock: 30,
        reorderThreshold: 20,
        reorderQuantity: 150,
        expiryDate: '2026-03-12',
        costPerUnit: 8000,
        isBig5: true,
        image: 'https://utfs.io/f/ors.jpg',
        userId: admin.id,
      },
      {
        name: 'Ciprofloxacin 500mg',
        unit: 'strips',
        currentStock: 45,
        reorderThreshold: 30,
        reorderQuantity: 200,
        expiryDate: '2026-11-30',
        costPerUnit: 22000,
        isBig5: false,
        image: 'https://utfs.io/f/cipro.jpg',
        userId: admin.id,
      },
    ];

    for (const med of seedMedicines) {
      await prisma.medicine.create({ data: med });
    }
    console.log(`Seeded ${seedMedicines.length} medicines with images`);
  }

  // 3. Seed Sample Sales (to see data on dashboard)
  const saleCount = await prisma.sale.count();
  if (saleCount === 0) {
    const allMeds = await prisma.medicine.findMany();
    const sampleSales = [
      {
        id: crypto.randomUUID(),
        medicineId: allMeds[0].id,
        quantity: 2,
        soldAt: new Date().toISOString(),
        synced: true,
        userId: admin.id,
      },
      {
        id: crypto.randomUUID(),
        medicineId: allMeds[1].id,
        quantity: 1,
        soldAt: new Date().toISOString(),
        synced: true,
        userId: admin.id,
      },
      {
        id: crypto.randomUUID(),
        medicineId: allMeds[2].id,
        quantity: 5,
        soldAt: new Date().toISOString(),
        synced: true,
        userId: admin.id,
      }
    ];

    for (const sale of sampleSales) {
      await prisma.sale.create({ data: sale });
    }
    console.log('Seeded sample sales for dashboard visualization');
  }
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
