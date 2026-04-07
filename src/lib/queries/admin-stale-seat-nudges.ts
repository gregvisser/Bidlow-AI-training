import { prisma } from "@/lib/db";

export const STALE_SEAT_NUDGE_ACTION = "STALE_SEAT_NUDGE_CREATED";
export const STALE_SEAT_NUDGE_ENTITY = "Enrollment";
export const STALE_SEAT_NUDGE_TEMPLATE_VERSION = "1";

export type StaleSeatNudgeAuditRow = {
  id: string;
  createdAt: Date;
  actorId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: unknown;
};

export async function listRecentStaleSeatNudges(limit = 50): Promise<StaleSeatNudgeAuditRow[]> {
  const rows = await prisma.auditLog.findMany({
    where: { action: STALE_SEAT_NUDGE_ACTION, entity: STALE_SEAT_NUDGE_ENTITY },
    orderBy: { createdAt: "desc" },
    take: Math.max(1, Math.min(limit, 200)),
  });
  return rows;
}

export async function countStaleSeatNudgesInWindow(args: {
  actorId: string;
  since: Date;
}): Promise<number> {
  return prisma.auditLog.count({
    where: {
      actorId: args.actorId,
      action: STALE_SEAT_NUDGE_ACTION,
      entity: STALE_SEAT_NUDGE_ENTITY,
      createdAt: { gte: args.since },
    },
  });
}

export async function findRecentNudgeForEnrollment(args: {
  enrollmentId: string;
  since: Date;
}): Promise<StaleSeatNudgeAuditRow | null> {
  return prisma.auditLog.findFirst({
    where: {
      action: STALE_SEAT_NUDGE_ACTION,
      entity: STALE_SEAT_NUDGE_ENTITY,
      entityId: args.enrollmentId,
      createdAt: { gte: args.since },
    },
    orderBy: { createdAt: "desc" },
  });
}

