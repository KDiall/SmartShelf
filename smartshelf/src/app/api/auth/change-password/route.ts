import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/jwt';
import { hashPassword, verifyPassword, validatePasswordStrength } from '@/lib/password';
import { logAudit } from '@/lib/audit';

export async function POST(request: Request) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { currentPassword, newPassword, confirmPassword } = await request.json();

  if (!currentPassword || !newPassword || !confirmPassword) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
  }

  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: 'New passwords do not match' }, { status: 400 });
  }

  const strength = validatePasswordStrength(newPassword);
  if (!strength.valid) {
    return NextResponse.json({ error: strength.error }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const currentValid = await verifyPassword(currentPassword, user.passwordHash);
  if (!currentValid) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
  }

  const newHash = await hashPassword(newPassword);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: newHash,
      mustChangePassword: false,
      passwordChangedAt: new Date(),
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });

  await logAudit('password_changed', { userId: user.id, pharmacyId: user.pharmacyId });

  const newToken = await signToken({
    userId: updated.id,
    phone: updated.phone,
    role: updated.role,
    pharmacyId: updated.pharmacyId,
  });

  return NextResponse.json({
    token: newToken,
    user: {
      id: updated.id,
      phone: updated.phone,
      name: updated.name,
      address: updated.address,
      location: updated.location,
      avatar: updated.avatar,
      role: updated.role,
      verified: updated.verified,
      pharmacyId: updated.pharmacyId,
      mustChangePassword: false,
      createdAt: updated.createdAt.toISOString(),
    },
  });
}
