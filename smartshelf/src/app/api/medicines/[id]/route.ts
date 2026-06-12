import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const medicine = await prisma.medicine.findUnique({ where: { id } });

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
  const body = await request.json();

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
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.medicine.delete({ where: { id } });

  return NextResponse.json({ message: 'Deleted' });
}
