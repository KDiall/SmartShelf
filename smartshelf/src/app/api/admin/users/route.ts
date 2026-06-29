import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizePhone } from '@/lib/phone';

function fixedOtp(): string {
  return process.env.FIXED_OTP || '123456';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role');
  const currentRole = request.headers.get('x-user-role');
  const currentPharmacyId = request.headers.get('x-user-pharmacy-id');

  const where: Record<string, unknown> = {};
  if (role) where.role = role;

  // Pharmacy admins can only see users in their own pharmacy
  if (currentRole === 'admin' && currentPharmacyId) {
    where.pharmacyId = currentPharmacyId;
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      phone: true,
      name: true,
      role: true,
      verified: true,
      createdAt: true,
      createdBy: true,
      pharmacyId: true,
    },
  });

  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const { name, phone: rawPhone, role, pharmacyId: bodyPharmacyId } = await request.json();

  const currentRole = request.headers.get('x-user-role');
  const currentPharmacyId = request.headers.get('x-user-pharmacy-id');
  const currentUserId = request.headers.get('x-user-id');

  if (!rawPhone || typeof rawPhone !== 'string') {
    return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
  }

  const phone = normalizePhone(rawPhone);
  if (!phone) {
    return NextResponse.json({ error: 'A valid phone number is required' }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    return NextResponse.json({ error: 'User with this phone already exists' }, { status: 409 });
  }

  // Pharmacy admins can only create pharmacist users in their own pharmacy
  const userRole = role === 'admin' && currentRole === 'super_admin' ? 'admin' : 'pharmacist';

  // Determine pharmacyId: super_admin provides it in body; admin uses their own
  let pharmacyId: string | null;
  if (currentRole === 'super_admin') {
    pharmacyId = bodyPharmacyId || null;
    // Every staff member (admin or pharmacist) must belong to a pharmacy,
    // otherwise they can never log in (verify-otp blocks pharmacy-less staff).
    if (!pharmacyId) {
      return NextResponse.json({ error: 'A pharmacy must be selected for this user' }, { status: 400 });
    }
  } else {
    pharmacyId = currentPharmacyId || null;
    if (!pharmacyId) {
      return NextResponse.json({ error: 'Your account is not assigned to a pharmacy' }, { status: 400 });
    }
  }

  // Ensure the target pharmacy actually exists before creating the user.
  const pharmacy = await prisma.pharmacy.findUnique({ where: { id: pharmacyId } });
  if (!pharmacy) {
    return NextResponse.json({ error: 'Selected pharmacy does not exist' }, { status: 400 });
  }

  const user = await prisma.user.create({
    data: {
      phone,
      name: name || null,
      role: userRole,
      verified: false,
      createdBy: currentUserId,
      pharmacyId: pharmacyId,
    },
  });

  const otp = fixedOtp();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await prisma.otp.create({
    data: { phone, code: otp, expiresAt },
  });

  console.log(`[NEW USER] Created ${phone} with fixed OTP: ${otp}`);

  return NextResponse.json({
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      verified: user.verified,
      createdAt: user.createdAt.toISOString(),
      pharmacyId: user.pharmacyId,
    },
    otpSent: true,
  }, { status: 201 });
}

export async function DELETE(request: Request) {
  const { id } = await request.json();

  if (!id) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  const userRole = request.headers.get('x-user-role');
  const currentUserId = request.headers.get('x-user-id');
  const currentPharmacyId = request.headers.get('x-user-pharmacy-id');

  if (currentUserId === id) {
    return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Pharmacy admins can only delete users in their own pharmacy
  if (userRole === 'admin' && currentPharmacyId && target.pharmacyId !== currentPharmacyId) {
    return NextResponse.json({ error: 'Cannot delete users from other pharmacies' }, { status: 403 });
  }

  if (target.role === 'admin' && userRole !== 'super_admin') {
    return NextResponse.json({ error: 'Cannot delete admin users' }, { status: 403 });
  }

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ message: 'User deleted' });
}
