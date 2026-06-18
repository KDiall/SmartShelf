import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: user.id,
    phone: user.phone,
    name: user.name,
    address: user.address,
    location: user.location,
    avatar: user.avatar,
    role: user.role,
    verified: user.verified,
    pharmacyId: user.pharmacyId,
    createdAt: user.createdAt.toISOString(),
  });
}

export async function PATCH(request: Request) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { name, address, location, avatar } = body;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(name !== undefined && { name }),
      ...(address !== undefined && { address }),
      ...(location !== undefined && { location }),
      ...(avatar !== undefined && { avatar }),
    },
  });

  return NextResponse.json({
    id: updated.id,
    phone: updated.phone,
    name: updated.name,
    address: updated.address,
    location: updated.location,
    avatar: updated.avatar,
    role: updated.role,
    verified: updated.verified,
    pharmacyId: updated.pharmacyId,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
}
