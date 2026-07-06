import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/jwt';
import { normalizePhone } from '@/lib/phone';
import { verifyPassword } from '@/lib/password';
import { logAudit } from '@/lib/audit';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

const GENERIC_ERROR = 'Invalid phone number or password';
const LOCKED_ERROR = 'Account locked due to too many failed attempts. Try again in 15 minutes.';

export async function POST(request: Request) {
  let { phone, password } = await request.json();

  if (!phone || !password || typeof phone !== 'string' || typeof password !== 'string') {
    return NextResponse.json({ error: 'Phone number and password are required' }, { status: 400 });
  }

  phone = normalizePhone(phone);

  const user = await prisma.user.findUnique({ where: { phone } });

  // Never reveal whether the phone number exists.
  if (!user) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  // Check account lock.
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const remaining = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    return NextResponse.json(
      { error: `Account locked. Try again in ${remaining} minute${remaining === 1 ? '' : 's'}.` },
      { status: 403 }
    );
  }

  const valid = await verifyPassword(password, user.passwordHash);

  if (!valid) {
    const attempts = user.failedLoginAttempts + 1;
    const shouldLock = attempts >= MAX_FAILED_ATTEMPTS;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: attempts,
        ...(shouldLock && {
          lockedUntil: new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000),
        }),
      },
    });

    await logAudit('user_login_failed', { userId: user.id, pharmacyId: user.pharmacyId });

    if (shouldLock) {
      await logAudit('user_locked', { userId: user.id, pharmacyId: user.pharmacyId });
      return NextResponse.json({ error: LOCKED_ERROR }, { status: 403 });
    }

    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  // Successful login.
  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      verified: true,
    },
  });

  await logAudit('user_login', { userId: user.id, pharmacyId: user.pharmacyId });

  if (!user.pharmacyId && user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Account not assigned to a pharmacy. Contact your admin.' }, { status: 403 });
  }

  const token = await signToken({
    userId: user.id,
    phone: user.phone,
    role: user.role,
    pharmacyId: user.pharmacyId,
  });

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
      mustChangePassword: user.mustChangePassword,
      createdAt: user.createdAt.toISOString(),
    },
  });
}
