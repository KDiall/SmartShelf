import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizePhone } from '@/lib/phone';

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

  const { name, phone: rawPhone, adminName } = await request.json();
  const currentUserId = request.headers.get('x-user-id');

  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'Pharmacy name is required' }, { status: 400 });
  }

  if (!rawPhone || typeof rawPhone !== 'string') {
    return NextResponse.json({ error: 'Admin phone number is required' }, { status: 400 });
  }

  const phone = normalizePhone(rawPhone);
  if (!phone) {
    return NextResponse.json({ error: 'A valid admin phone number is required' }, { status: 400 });
  }

  // The admin logs in with this number, so it must be unique across all users.
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    return NextResponse.json({ error: 'A user with this phone number already exists' }, { status: 409 });
  }

  // Create the pharmacy and its admin together so the branch is usable immediately.
  const pharmacy = await prisma.pharmacy.create({
    data: { name, address: null, phone },
  });

  await prisma.user.create({
    data: {
      phone,
      name: adminName || null,
      role: 'admin',
      verified: false,
      createdBy: currentUserId,
      pharmacyId: pharmacy.id,
    },
  });

  // No OTP is sent here. The admin's number is saved now and verified later:
  // when the admin logs in, /api/auth/send-otp delivers a fresh OTP via WhatsApp.
  console.log(`[PHARMACY] Created "${name}" with admin ${phone}`);

  return NextResponse.json(
    { ...pharmacy, adminPhone: phone },
    { status: 201 }
  );
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
