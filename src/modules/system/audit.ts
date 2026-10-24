import type { Prisma } from "@prisma/client";

export async function writeAudit(
  tx: Prisma.TransactionClient,
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
  summary: string,
) {
  await tx.auditLog.create({ data: { actorId, action, entityType, entityId, summary } });
}
