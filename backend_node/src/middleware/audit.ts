import { prisma } from '../prisma.js';

export const logActivity = async (params: {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
}) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        details: params.details,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  } catch (err) {
    console.error('Audit log creation failed:', err);
  }
};
