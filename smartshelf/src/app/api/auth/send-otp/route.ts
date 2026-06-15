import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendOtpMessage } from '@/lib/whapi';

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: Request) {
  let { phone } = await request.json();

  if (!phone || typeof phone !== 'string') {
    return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
  }

  phone = phone.replace(/[^0-9]/g, '');

  let user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    user = await prisma.user.create({
      data: { phone },
    });
    console.log(`[AUTO-REGISTER] Created user for ${phone} (id: ${user.id})`);
  }

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await prisma.otp.create({
    data: { phone, code: otp, expiresAt },
  });

  const result = await sendOtpMessage(phone, otp);

  console.log(`[OTP] For ${phone}: ${otp}`);

  return NextResponse.json({
    message: result.sent ? 'OTP sent successfully' : 'OTP generated (WhatsApp unavailable — check server logs)',
    whapiSent: result.sent,
  });
}
