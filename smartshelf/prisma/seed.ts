import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const seedMedicines = [
  {
    name: 'Coartem',
    unit: 'packs',
    currentStock: 8,
    reorderThreshold: 10,
    reorderQuantity: 50,
    expiryDate: '2025-12-01',
    costPerUnit: 50.00,
    isBig5: true,
  },
  {
    name: 'Paracetamol 500mg',
    unit: 'strips',
    currentStock: 40,
    reorderThreshold: 30,
    reorderQuantity: 200,
    expiryDate: '2026-03-01',
    costPerUnit: 10.00,
    isBig5: true,
  },
  {
    name: 'Amoxicillin 500mg',
    unit: 'packs',
    currentStock: 15,
    reorderThreshold: 20,
    reorderQuantity: 100,
    expiryDate: '2025-07-15',
    costPerUnit: 30.00,
    isBig5: true,
  },
  {
    name: 'Metronidazole',
    unit: 'packs',
    currentStock: 12,
    reorderThreshold: 15,
    reorderQuantity: 60,
    expiryDate: '2025-09-01',
    costPerUnit: 25.00,
    isBig5: true,
  },
  {
    name: 'ORS Sachets',
    unit: 'sachets',
    currentStock: 25,
    reorderThreshold: 20,
    reorderQuantity: 100,
    expiryDate: '2026-01-01',
    costPerUnit: 5.00,
    isBig5: true,
  },
  {
    name: 'Ibuprofen 400mg',
    unit: 'packs',
    currentStock: 30,
    reorderThreshold: 15,
    reorderQuantity: 50,
    expiryDate: '2026-05-01',
    costPerUnit: 15.00,
    isBig5: false,
  },
];

async function seed() {
  const count = await prisma.medicine.count();
  if (count > 0) {
    console.log('Database already seeded, skipping');
    return;
  }

  await prisma.medicine.createMany({ data: seedMedicines });
  console.log(`Seeded ${seedMedicines.length} medicines`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
