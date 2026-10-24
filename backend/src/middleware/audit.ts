import { prisma } from '../prisma.js';

/**
 * Audit yozuvi javobni kutdirmaydi: baza bilan qo'shimcha aylanish (round-trip) foydalanuvchi
 * javobini sekinlashtirmasligi uchun yozuv fonda bajariladi, xatolar esa log qilinadi.
 */
export const logActivity = async (params: {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}): Promise<void> => {
  prisma.auditLog
    .create({
      data: {
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        details: params.details,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    })
    .catch((err) => {
      console.error(
        JSON.stringify({
          level: 'error',
          type: 'AUDIT_LOG_FAILURE',
          requestId: params.requestId || 'unknown',
          action: params.action,
          entity: params.entity,
          entityId: params.entityId,
          userId: params.userId,
          error: err instanceof Error ? err.message : String(err),
          timestamp: new Date().toISOString(),
        })
      );
    });
};
