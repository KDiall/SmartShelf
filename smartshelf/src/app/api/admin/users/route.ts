import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendAccountCreatedMessage } from '@/lib/whapi';
import crypto from 'crypto';

function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role');

  const where = role ? { role } : {};
  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      phone: true,
      name: true,
      role: true,
      verified: true,
      createdAt: true,
      createdBy: true,
    },
  });

  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const { name, phone, role } = await request.json();

  if (!phone || typeof phone !== 'string') {
    return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    return NextResponse.json({ error: 'User with this phone already exists' }, { status: 409 });
  }

  const userRole = role === 'admin' ? 'admin' : 'pharmacist';

  const userId = request.headers.get('x-user-id');

  const user = await prisma.user.create({
    data: {
      phone,
      name: name || null,
      role: userRole,
      verified: false,
      createdBy: userId,
    },
  });

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await prisma.otp.create({
    data: { phone, code: otp, expiresAt },
  });

  const result = await sendAccountCreatedMessage(phone, name || null, otp);

  if (!result.sent) {
    console.error(`[WHAPI FAIL] Account creation OTP for ${phone}: ${otp} | Error: ${result.error}`);
  } else {
    console.log(`[OTP] For new user ${phone}: ${otp}`);
  }

  return NextResponse.json({
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      verified: user.verified,
      createdAt: user.createdAt.toISOString(),
    },
    otpSent: result.sent,
    whapiError: result.error || null,
  }, { status: 201 });
}

export async function DELETE(request: Request) {
  const { id } = await request.json();

  if (!id) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  const userRole = request.headers.get('x-user-role');
  const currentUserId = request.headers.get('x-user-id');

  if (currentUserId === id) {
    return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (target.role === 'admin' && userRole !== 'admin') {
    return NextResponse.json({ error: 'Cannot delete admin users' }, { status: 403 });
  }

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ message: 'User deleted' });
}
