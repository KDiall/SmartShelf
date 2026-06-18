import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const role = request.headers.get('x-user-role');
  if (role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const pharmacies = await prisma.pharmacy.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { users: true, medicines: true, sales: true } },
    },
  });

  return NextResponse.json(pharmacies);
}

export async function POST(request: Request) {
  const role = request.headers.get('x-user-role');
  if (role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { name, address, phone } = await request.json();

  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'Pharmacy name is required' }, { status: 400 });
  }

  const pharmacy = await prisma.pharmacy.create({
    data: { name, address: address || null, phone: phone || null },
  });

  return NextResponse.json(pharmacy, { status: 201 });
}

export async function PUT(request: Request) {
  const role = request.headers.get('x-user-role');
  if (role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id, name, address, phone } = await request.json();

  if (!id) {
    return NextResponse.json({ error: 'Pharmacy ID is required' }, { status: 400 });
  }

  const pharmacy = await prisma.pharmacy.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(address !== undefined && { address }),
      ...(phone !== undefined && { phone }),
    },
  });

  return NextResponse.json(pharmacy);
}

export async function DELETE(request: Request) {
  const role = request.headers.get('x-user-role');
  if (role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await request.json();
  if (!id) {
    return NextResponse.json({ error: 'Pharmacy ID is required' }, { status: 400 });
  }

  const pharmacy = await prisma.pharmacy.findUnique({ where: { id } });
  if (!pharmacy) {
    return NextResponse.json({ error: 'Pharmacy not found' }, { status: 404 });
  }

  await prisma.pharmacy.delete({ where: { id } });

  return NextResponse.json({ message: 'Pharmacy deleted' });
}
