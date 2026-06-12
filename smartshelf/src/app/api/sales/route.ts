import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const sales = await prisma.sale.findMany({
    orderBy: { soldAt: 'desc' },
    take: 100,
  });

  return NextResponse.json(sales);
}
