import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/jwt';
import { normalizePhone } from '@/lib/phone';

export async function POST(request: Request) {
  let { phone, code } = await request.json();

  if (!phone || !code) {
    return NextResponse.json({ error: 'Phone and code are required' }, { status: 400 });
  }

  phone = normalizePhone(phone);

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

  const user = await prisma.user.findUnique({ where: { phone } });

  if (!user) {
    return NextResponse.json({ error: 'User not found. Contact your pharmacy admin.' }, { status: 404 });
  }

  if (!user.pharmacyId && user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Account not assigned to a pharmacy. Contact your admin.' }, { status: 403 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { verified: true },
  });

  const token = await signToken({ userId: user.id, phone: user.phone, role: user.role, pharmacyId: user.pharmacyId });

  return NextResponse.json({
    token,
    user: {
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
    },
  });
}
