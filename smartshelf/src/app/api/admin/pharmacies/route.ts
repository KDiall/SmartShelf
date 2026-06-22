import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendAccountCreatedMessage } from '@/lib/whatsapp';
import { normalizePhone } from '@/lib/phone';
import crypto from 'crypto';

const DEMO_PHONES = new Set(['7000', '7001', '7002', '7003']);

function isDemoPhone(phone: string): boolean {
  return DEMO_PHONES.has(phone);
}

function fixedOtp(): string {
  return process.env.FIXED_OTP || '123456';
}

function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export async function GET(request: Request) {
  const role = request.headers.get('x-user-role');
  if (role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const pharmacies = await prisma.pharmacy.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { users: true, medicines: true, sales: true } },
    },
  });

  return NextResponse.json(pharmacies);
}

export async function POST(request: Request) {
  const role = request.headers.get('x-user-role');
  if (role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { name, phone: rawPhone, adminName } = await request.json();
  const currentUserId = request.headers.get('x-user-id');

  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'Pharmacy name is required' }, { status: 400 });
  }

  if (!rawPhone || typeof rawPhone !== 'string') {
    return NextResponse.json({ error: 'Admin phone number is required' }, { status: 400 });
  }

  const phone = normalizePhone(rawPhone);
  if (!phone) {
    return NextResponse.json({ error: 'A valid admin phone number is required' }, { status: 400 });
  }

  // The admin logs in with this number, so it must be unique across all users.
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    return NextResponse.json({ error: 'A user with this phone number already exists' }, { status: 409 });
  }

  // Create the pharmacy and its admin together so the branch is usable immediately.
  const pharmacy = await prisma.pharmacy.create({
    data: { name, address: null, phone },
  });

  const admin = await prisma.user.create({
    data: {
      phone,
      name: adminName || null,
      role: 'admin',
      verified: false,
      createdBy: currentUserId,
      pharmacyId: pharmacy.id,
    },
  });

  // Send the admin their first login OTP.
  const otp = isDemoPhone(phone) ? fixedOtp() : generateOtp();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  await prisma.otp.create({ data: { phone, code: otp, expiresAt } });

  let otpSent = false;
  if (isDemoPhone(phone)) {
    console.log(`[DEMO OTP] For pharmacy admin ${phone}: ${otp}`);
    otpSent = true;
  } else {
    const result = await sendAccountCreatedMessage(phone, admin.name, otp);
    if (!result.sent) {
      console.error(`[WHATSAPP FAIL] Pharmacy admin OTP for ${phone}: ${otp} | Error: ${result.error}`);
    } else {
      console.log(`[OTP] For pharmacy admin ${phone}: ${otp}`);
      otpSent = true;
    }
  }

  return NextResponse.json(
    { ...pharmacy, adminPhone: phone, otpSent, whatsappError: otpSent ? null : 'WhatsApp unavailable' },
    { status: 201 }
  );
}

export async function PUT(request: Request) {
  const role = request.headers.get('x-user-role');
  if (role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id, name, address, phone } = await request.json();

  if (!id) {
    return NextResponse.json({ error: 'Pharmacy ID is required' }, { status: 400 });
  }

  const pharmacy = await prisma.pharmacy.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(address !== undefined && { address }),
      ...(phone !== undefined && { phone }),
    },
  });

  return NextResponse.json(pharmacy);
}

export async function DELETE(request: Request) {
  const role = request.headers.get('x-user-role');
  if (role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await request.json();
  if (!id) {
    return NextResponse.json({ error: 'Pharmacy ID is required' }, { status: 400 });
  }

  const pharmacy = await prisma.pharmacy.findUnique({ where: { id } });
  if (!pharmacy) {
    return NextResponse.json({ error: 'Pharmacy not found' }, { status: 404 });
  }

  await prisma.pharmacy.delete({ where: { id } });

  return NextResponse.json({ message: 'Pharmacy deleted' });
}
