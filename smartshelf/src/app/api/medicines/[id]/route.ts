import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function getPharmacyId(request: Request): string | null {
  return request.headers.get('x-user-pharmacy-id') || null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const pharmacyId = getPharmacyId(request);
  const where: Record<string, unknown> = { id };
  if (pharmacyId) where.pharmacyId = pharmacyId;

  const medicine = await prisma.medicine.findFirst({ where });

  if (!medicine) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(medicine);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const pharmacyId = getPharmacyId(request);
  const body = await request.json();

  const where: Record<string, unknown> = { id };
  if (pharmacyId) where.pharmacyId = pharmacyId;

  const existing = await prisma.medicine.findFirst({ where });
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const medicine = await prisma.medicine.update({
    where: { id },
    data: {
      name: body.name,
      unit: body.unit,
      currentStock: body.currentStock,
      reorderThreshold: body.reorderThreshold,
      reorderQuantity: body.reorderQuantity,
      expiryDate: body.expiryDate,
      costPerUnit: body.costPerUnit,
      isBig5: body.isBig5,
    },
  });

  return NextResponse.json(medicine);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const pharmacyId = getPharmacyId(request);

  const where: Record<string, unknown> = { id };
  if (pharmacyId) where.pharmacyId = pharmacyId;

  const existing = await prisma.medicine.findFirst({ where });
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.medicine.delete({ where: { id } });

  return NextResponse.json({ message: 'Deleted' });
}
