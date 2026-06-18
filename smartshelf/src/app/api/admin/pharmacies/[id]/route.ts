import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const role = request.headers.get('x-user-role');
  if (role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  const pharmacy = await prisma.pharmacy.findUnique({
    where: { id },
    include: {
      users: {
        select: {
          id: true,
          phone: true,
          name: true,
          role: true,
          verified: true,
          createdAt: true,
        },
      },
    },
  });

  if (!pharmacy) {
    return NextResponse.json({ error: 'Pharmacy not found' }, { status: 404 });
  }

  return NextResponse.json(pharmacy);
}
