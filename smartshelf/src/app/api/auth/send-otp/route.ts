import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendOtpMessage } from '@/lib/whapi';

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: Request) {
  const { phone } = await request.json();

  if (!phone || typeof phone !== 'string') {
    return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    return NextResponse.json(
      { error: 'Account not found. Contact your admin to create an account.' },
      { status: 404 }
    );
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
    _dev: { otp },
  });
}
