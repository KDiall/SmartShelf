import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendOtpMessage } from '@/lib/whatsapp';
import { normalizePhone } from '@/lib/phone';
import crypto from 'crypto';

function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export async function POST(request: Request) {
  let { phone } = await request.json();

  if (!phone || typeof phone !== 'string') {
    return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
  }

  phone = normalizePhone(phone);

  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    return NextResponse.json({ error: 'User not found. Contact your pharmacy admin to create your account.' }, { status: 404 });
  }

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await prisma.otp.create({
    data: { phone, code: otp, expiresAt },
  });

  const result = await sendOtpMessage(phone, otp);

  if (!result.sent) {
    console.error(`[WHATSAPP FAIL] OTP for ${phone}: ${otp} | Error: ${result.error}`);
  } else {
    console.log(`[OTP] For ${phone}: ${otp}`);
  }

  return NextResponse.json({
    message: result.sent
      ? 'OTP sent via WhatsApp'
      : `WhatsApp unavailable: ${result.error || 'unknown error'}`,
    whatsappSent: result.sent,
    whatsappError: result.error || null,
    otpFallback: result.sent ? null : otp,
  });
}
