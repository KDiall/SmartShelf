import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendOtpMessage } from '@/lib/whatsapp';
import { normalizePhone } from '@/lib/phone';
import crypto from 'crypto';

// Minimum time between OTP sends to the same number. Throttling outbound
// messages reduces the burst pattern that triggers WhatsApp restrictions.
const RESEND_COOLDOWN_SECONDS = 45;

function randomOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export async function POST(request: Request) {
  let { phone } = await request.json();

  if (!phone || typeof phone !== 'string') {
    return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
  }

  phone = normalizePhone(phone);

  // The user must already exist (created by a super admin / pharmacy admin).
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    return NextResponse.json({ error: 'User not found. Contact your pharmacy admin to create your account.' }, { status: 404 });
  }

  // Rate limit: block rapid repeat sends to the same number.
  const lastOtp = await prisma.otp.findFirst({
    where: { phone },
    orderBy: { createdAt: 'desc' },
  });
  if (lastOtp) {
    const elapsed = (Date.now() - lastOtp.createdAt.getTime()) / 1000;
    if (elapsed < RESEND_COOLDOWN_SECONDS) {
      const wait = Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed);
      return NextResponse.json(
        { error: `Please wait ${wait}s before requesting another code.` },
        { status: 429 }
      );
    }
  }

  const otp = randomOtp();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await prisma.otp.create({
    data: { phone, code: otp, expiresAt },
  });

  const result = await sendOtpMessage(phone, otp);

  if (!result.sent) {
    console.error(`[WHATSAPP FAIL] OTP for ${phone}: ${otp} | Error: ${result.error}`);
    return NextResponse.json(
      { error: 'WhatsApp unavailable. Please try again or contact your admin.' },
      { status: 503 }
    );
  }

  console.log(`[OTP] For ${phone}: ${otp}`);
  return NextResponse.json({ message: 'OTP sent via WhatsApp' });
}
