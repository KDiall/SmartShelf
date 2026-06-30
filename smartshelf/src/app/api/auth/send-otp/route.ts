import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendOtpMessage } from '@/lib/whatsapp';
import { normalizePhone } from '@/lib/phone';
import crypto from 'crypto';

const DEMO_MODE = true; // process.env.DEMO_MODE === 'true';
const FIXED_OTP = process.env.FIXED_OTP || '123456';

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

  const otp = DEMO_MODE ? FIXED_OTP : crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await prisma.otp.create({
    data: { phone, code: otp, expiresAt },
  });

  if (!DEMO_MODE) {
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

  console.log(`[OTP][DEMO] For ${phone}: ${otp}`);
  return NextResponse.json({ message: 'OTP sent via WhatsApp' });
}
