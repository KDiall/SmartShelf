import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const role = request.headers.get('x-user-role');
  const headerPharmacyId = request.headers.get('x-user-pharmacy-id') || null;
  const headerUserId = request.headers.get('x-user-id');

  const where: Record<string, unknown> = {};

  if (role === 'super_admin') {
    const scoped = searchParams.get('pharmacyId');
    if (scoped) where.pharmacyId = scoped;
  } else if (headerPharmacyId) {
    where.pharmacyId = headerPharmacyId;
  } else {
    where.userId = headerUserId;
  }

  const sales = await prisma.sale.findMany({
    where,
    orderBy: { soldAt: 'desc' },
    take: 100,
  });

  return NextResponse.json(sales);
}
