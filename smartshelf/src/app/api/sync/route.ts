import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Sale } from '@/types';

export async function POST(request: Request) {
  const { sales } = await request.json();

  if (!Array.isArray(sales)) {
    return NextResponse.json({ error: 'sales array required' }, { status: 400 });
  }

  const role = request.headers.get('x-user-role');
  const headerPharmacyId = request.headers.get('x-user-pharmacy-id') || null;
  const headerUserId = request.headers.get('x-user-id');

  for (const sale of sales as Sale[]) {
    // Tenant users always record sales under their own pharmacy/user.
    const pharmacyId = role === 'super_admin' ? (sale.pharmacyId ?? null) : headerPharmacyId;
    const userId = role === 'super_admin' ? (sale.userId ?? headerUserId) : headerUserId;

    // The sale must reference a medicine the caller is allowed to touch.
    const medicine = await prisma.medicine.findUnique({ where: { id: sale.medicineId } });
    if (!medicine) continue;
    if (role !== 'super_admin' && headerPharmacyId && medicine.pharmacyId !== headerPharmacyId) {
      continue;
    }

    // Only decrement stock the first time a sale is persisted, so retried syncs
    // of the same offline sale don't double-count.
    const existing = await prisma.sale.findUnique({ where: { id: sale.id } });

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
        userId,
        pharmacyId,
      },
    });

    if (!existing) {
      await prisma.medicine.update({
        where: { id: sale.medicineId },
        data: {
          currentStock: { decrement: sale.quantity },
        },
      });
    }
  }

  return NextResponse.json({ message: `${sales.length} sales synced` });
}
