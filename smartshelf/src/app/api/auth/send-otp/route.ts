import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendOtpMessage } from '@/lib/whatsapp';
import { normalizePhone } from '@/lib/phone';
import crypto from 'crypto';

function isDemoMode(): boolean {
  return process.env.DEMO_MODE === 'true';
}

function fixedOtp(): string {
  return process.env.FIXED_OTP || '123456';
}

function randomOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export async function POST(request: Request) {
  let { phone } = await request.json();

  if (!phone || typeof phone !== 'string') {
    return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
  }

  phone = normalizePhone(phone);

  // DEMO MODE: auto-create user if not found, use fixed OTP, skip WhatsApp
  if (isDemoMode()) {
    let user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      const pharmacy = await prisma.pharmacy.findFirst();
      if (!pharmacy) {
        return NextResponse.json({ error: 'No pharmacy configured. Run seed first.' }, { status: 500 });
      }
      user = await prisma.user.create({
        data: { phone, name: `User ${phone}`, role: 'pharmacist', verified: false, pharmacyId: pharmacy.id },
      });
      console.log(`[DEMO] Auto-created user ${phone}`);
    }

    const otp = fixedOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.otp.create({
      data: { phone, code: otp, expiresAt },
    });

    console.log(`[DEMO OTP] For ${phone}: ${otp}`);
    return NextResponse.json({ message: 'OTP sent (demo mode)', otp });
  }

  // NORMAL MODE: look up user, send via WhatsApp
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    return NextResponse.json({ error: 'User not found. Contact your pharmacy admin to create your account.' }, { status: 404 });
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
      { error: 'WhatsApp unavailable. Please try again or contact your admin.', otp },
      { status: 503 }
    );
  }

  console.log(`[OTP] For ${phone}: ${otp}`);
  return NextResponse.json({ message: 'OTP sent via WhatsApp', otp });
}
