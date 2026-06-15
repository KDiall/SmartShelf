import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  const where = userId ? { userId } : {};
  const sales = await prisma.sale.findMany({
    where,
    orderBy: { soldAt: 'desc' },
    take: 100,
  });

  return NextResponse.json(sales);
}
