import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendOtpMessage } from '@/lib/whapi';
import crypto from 'crypto';

function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
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

  if (!result.sent) {
    console.error(`[WHAPI FAIL] OTP for ${phone}: ${otp} | Error: ${result.error}`);
  } else {
    console.log(`[OTP] For ${phone}: ${otp}`);
  }

  return NextResponse.json({
    message: result.sent
      ? 'OTP sent via WhatsApp'
      : `WhatsApp unavailable: ${result.error || 'unknown error'}`,
    whapiSent: result.sent,
    whapiError: result.error || null,
    otpFallback: result.sent ? null : otp,
  });
}
