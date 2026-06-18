import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Sale } from '@/types';

export async function POST(request: Request) {
  const { sales } = await request.json();

  if (!Array.isArray(sales)) {
    return NextResponse.json({ error: 'sales array required' }, { status: 400 });
  }

  const pharmacyId = request.headers.get('x-user-pharmacy-id') || null;

  for (const sale of sales as Sale[]) {
    await prisma.sale.upsert({
      where: { id: sale.id },
      update: {
        quantity: sale.quantity,
        synced: true,
      },
      create: {
        id: sale.id,
        medicineId: sale.medicineId,
        quantity: sale.quantity,
        soldAt: new Date(sale.soldAt),
        synced: true,
        userId: sale.userId ?? null,
        pharmacyId: sale.pharmacyId ?? pharmacyId,
      },
    });

    await prisma.medicine.update({
      where: { id: sale.medicineId },
      data: {
        currentStock: { decrement: sale.quantity },
      },
    });
  }

  return NextResponse.json({ message: `${sales.length} sales synced` });
}
