import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Medicine } from '@/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  const where = userId ? { userId } : {};
  const medicines = await prisma.medicine.findMany({ where });

  return NextResponse.json(medicines);
}

export async function POST(request: Request) {
  const body = await request.json();
  const medicines: Medicine[] = body.medicines;

  if (!Array.isArray(medicines)) {
    return NextResponse.json({ error: 'medicines array required' }, { status: 400 });
  }

  for (const med of medicines) {
    await prisma.medicine.upsert({
      where: { id: med.id },
      update: {
        name: med.name,
        unit: med.unit,
        currentStock: med.currentStock,
        reorderThreshold: med.reorderThreshold,
        reorderQuantity: med.reorderQuantity,
        expiryDate: med.expiryDate,
        costPerUnit: med.costPerUnit,
        isBig5: med.isBig5,
        userId: med.userId,
      },
      create: {
        id: med.id,
        name: med.name,
        unit: med.unit,
        currentStock: med.currentStock,
        reorderThreshold: med.reorderThreshold,
        reorderQuantity: med.reorderQuantity,
        expiryDate: med.expiryDate,
        costPerUnit: med.costPerUnit,
        isBig5: med.isBig5,
        userId: med.userId,
      },
    });
  }

  return NextResponse.json({ message: `${medicines.length} medicines synced` });
}
