import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Medicine } from '@/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') || request.headers.get('x-user-id');
  const pharmacyId = searchParams.get('pharmacyId') || request.headers.get('x-user-pharmacy-id');

  const where: Record<string, unknown> = {};
  if (pharmacyId) where.pharmacyId = pharmacyId;
  else if (userId) where.userId = userId;
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
        image: med.image ?? null,
        unit: med.unit,
        currentStock: med.currentStock,
        reorderThreshold: med.reorderThreshold,
        reorderQuantity: med.reorderQuantity,
        expiryDate: med.expiryDate,
        costPerUnit: med.costPerUnit,
        isBig5: med.isBig5,
        userId: med.userId,
        pharmacyId: med.pharmacyId,
      },
      create: {
        id: med.id,
        name: med.name,
        image: med.image ?? null,
        unit: med.unit,
        currentStock: med.currentStock,
        reorderThreshold: med.reorderThreshold,
        reorderQuantity: med.reorderQuantity,
        expiryDate: med.expiryDate,
        costPerUnit: med.costPerUnit,
        isBig5: med.isBig5,
        userId: med.userId,
        pharmacyId: med.pharmacyId,
      },
    });
  }

  return NextResponse.json({ message: `${medicines.length} medicines synced` });
}
