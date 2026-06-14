import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/jwt';

export async function POST(request: Request) {
  const { phone, code } = await request.json();

  if (!phone || !code) {
    return NextResponse.json({ error: 'Phone and code are required' }, { status: 400 });
  }

  const otp = await prisma.otp.findFirst({
    where: {
      phone,
      code,
      used: false,
      expiresAt: { gte: new Date() },
    },
  });

  if (!otp) {
    return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 401 });
  }

  await prisma.otp.update({
    where: { id: otp.id },
    data: { used: true },
  });

  let user = await prisma.user.findUnique({ where: { phone } });

  if (!user) {
    user = await prisma.user.create({
      data: { phone, verified: true },
    });
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { verified: true },
    });
  }

  const token = signToken({ userId: user.id, phone: user.phone, role: user.role });

  return NextResponse.json({
    token,
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      verified: user.verified,
      createdAt: user.createdAt.toISOString(),
    },
  });
}
