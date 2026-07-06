import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateTemporaryPassword, hashPassword } from '@/lib/password';
import { logAudit } from '@/lib/audit';

export async function POST(request: Request) {
  const currentRole = request.headers.get('x-user-role');
  const currentUserId = request.headers.get('x-user-id');
  const currentPharmacyId = request.headers.get('x-user-pharmacy-id');

  if (currentRole !== 'super_admin' && currentRole !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { userId } = await request.json();
  if (!userId || typeof userId !== 'string') {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (currentUserId === target.id) {
    return NextResponse.json({ error: 'Use change-password to reset your own password' }, { status: 400 });
  }

  if (currentRole === 'admin' && target.pharmacyId !== currentPharmacyId) {
    return NextResponse.json({ error: 'Cannot reset passwords for users outside your pharmacy' }, { status: 403 });
  }

  if (target.role === 'super_admin') {
    return NextResponse.json({ error: 'Cannot reset super admin password' }, { status: 403 });
  }

  if (currentRole === 'admin' && target.role === 'admin') {
    return NextResponse.json({ error: 'Cannot reset another admin password' }, { status: 403 });
  }

  const tempPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(tempPassword);

  await prisma.user.update({
    where: { id: target.id },
    data: {
      passwordHash,
      mustChangePassword: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });

  await logAudit('password_reset', {
    userId: currentUserId,
    targetUserId: target.id,
    pharmacyId: target.pharmacyId,
  });

  return NextResponse.json({
    message: 'Password reset successfully',
    temporaryPassword: tempPassword,
  });
}
