import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Medicine } from '@/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const role = request.headers.get('x-user-role');
  const headerPharmacyId = request.headers.get('x-user-pharmacy-id') || null;
  const headerUserId = request.headers.get('x-user-id');

  const where: Record<string, unknown> = {};

  if (role === 'super_admin') {
    // Platform owner: may optionally scope to a specific pharmacy via query.
    const scoped = searchParams.get('pharmacyId');
    if (scoped) where.pharmacyId = scoped;
  } else if (headerPharmacyId) {
    // Tenant users are always locked to their own pharmacy (never trust the query).
    where.pharmacyId = headerPharmacyId;
  } else {
    // Legacy fallback: pre-multi-tenancy data scoped by owning user.
    where.userId = headerUserId;
  }

  const medicines = await prisma.medicine.findMany({ where });

  return NextResponse.json(medicines);
}

export async function POST(request: Request) {
  const body = await request.json();
  const medicines: Medicine[] = body.medicines;

  if (!Array.isArray(medicines)) {
    return NextResponse.json({ error: 'medicines array required' }, { status: 400 });
  }

  const role = request.headers.get('x-user-role');
  const headerPharmacyId = request.headers.get('x-user-pharmacy-id') || null;
  const headerUserId = request.headers.get('x-user-id');

  for (const med of medicines) {
    // Tenant users always write into their own pharmacy; only the platform owner
    // (super_admin) may set an explicit pharmacy/owner from the payload.
    const pharmacyId = role === 'super_admin' ? (med.pharmacyId ?? null) : headerPharmacyId;
    const userId = role === 'super_admin' ? (med.userId ?? headerUserId) : headerUserId;

    // Guard cross-tenant writes: if a record exists under another pharmacy, skip it.
    if (med.id && role !== 'super_admin' && headerPharmacyId) {
      const existing = await prisma.medicine.findUnique({ where: { id: med.id } });
      if (existing && existing.pharmacyId && existing.pharmacyId !== headerPharmacyId) {
        continue;
      }
    }

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
        userId,
        pharmacyId,
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
        userId,
        pharmacyId,
      },
    });
  }

  return NextResponse.json({ message: `${medicines.length} medicines synced` });
}
