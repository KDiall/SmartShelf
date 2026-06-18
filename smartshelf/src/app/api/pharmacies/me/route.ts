import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const userId = request.headers.get('x-user-id');
  const pharmacyId = request.headers.get('x-user-pharmacy-id');

  if (!pharmacyId) {
    return NextResponse.json({ error: 'No pharmacy assigned' }, { status: 404 });
  }

  const pharmacy = await prisma.pharmacy.findUnique({
    where: { id: pharmacyId },
    include: {
      _count: { select: { users: true, medicines: true, sales: true } },
    },
  });

  if (!pharmacy) {
    return NextResponse.json({ error: 'Pharmacy not found' }, { status: 404 });
  }

  return NextResponse.json(pharmacy);
}
