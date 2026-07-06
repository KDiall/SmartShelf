import { prisma } from './prisma';

export type AuditAction =
  | 'user_created'
  | 'password_reset'
  | 'password_changed'
  | 'user_login'
  | 'user_login_failed'
  | 'user_locked';

export async function logAudit(
  action: AuditAction,
  {
    userId,
    targetUserId,
    pharmacyId,
    metadata,
  }: {
    userId?: string | null;
    targetUserId?: string | null;
    pharmacyId?: string | null;
    metadata?: Record<string, unknown>;
  } = {}
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        userId: userId ?? null,
        targetUserId: targetUserId ?? null,
        pharmacyId: pharmacyId ?? null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  } catch (err) {
    console.error('[AUDIT] Failed to write audit log:', err);
  }
}
