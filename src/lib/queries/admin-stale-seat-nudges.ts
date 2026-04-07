import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { getStaleSeatNudgeCooldownMs } from "@/lib/stale-seat-nudge-policy";
import type { StaleSeatNudgeAuditStatusFilter } from "@/lib/stale-seat-nudge-types";

export const STALE_SEAT_NUDGE_ACTION = "STALE_SEAT_NUDGE_CREATED";
export const STALE_SEAT_NUDGE_ENTITY = "Enrollment";
export const STALE_SEAT_NUDGE_TEMPLATE_VERSION = "1";

export type { StaleSeatNudgeAuditStatusFilter, StaleSeatNudgeOutcome } from "@/lib/stale-seat-nudge-types";

export type StaleSeatNudgeAuditRow = {
  id: string;
  createdAt: Date;
  actorId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: unknown;
};

export function cooldownEndsAt(createdAt: Date): Date {
  return new Date(createdAt.getTime() + getStaleSeatNudgeCooldownMs());
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

/** Latest nudge within the cooldown window for this enrollment (blocks another prepare). */
export async function findCooldownBlockerForEnrollment(args: {
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

/** Latest nudge within cooldown window per enrollment (for UI hints). */
export async function getNudgeCooldownsForEnrollments(
  enrollmentIds: string[],
): Promise<Map<string, Date>> {
  if (enrollmentIds.length === 0) return new Map();
  const since = new Date(Date.now() - getStaleSeatNudgeCooldownMs());
  const logs = await prisma.auditLog.findMany({
    where: {
      action: STALE_SEAT_NUDGE_ACTION,
      entity: STALE_SEAT_NUDGE_ENTITY,
      entityId: { in: enrollmentIds },
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
    select: { entityId: true, createdAt: true },
  });
  const map = new Map<string, Date>();
  for (const log of logs) {
    if (!log.entityId) continue;
    if (!map.has(log.entityId)) {
      map.set(log.entityId, cooldownEndsAt(log.createdAt));
    }
  }
  return map;
}

/** Default recent window when no date range (newest-first cap before in-memory filters). */
const AUDIT_FILTER_SCAN_CAP = 2000;
/** When a date range is set, allow a larger DB read before in-memory filters. */
const AUDIT_FILTER_SCAN_CAP_WITH_DATE = 10_000;

function metadataRecord(m: unknown): Record<string, unknown> | null {
  if (!m || typeof m !== "object" || Array.isArray(m)) return null;
  return m as Record<string, unknown>;
}

/**
 * Filtered audit list (newest first). Loads a capped window, then filters in memory.
 * Optional `from` / `to` filter on intent time (`AuditLog.createdAt`) in UTC.
 */
export async function listStaleSeatNudgesFiltered(args: {
  q?: string;
  courseId?: string;
  status?: StaleSeatNudgeAuditStatusFilter;
  limit?: number;
  from?: Date | null;
  to?: Date | null;
  /** Upper bound on rows returned after filters (default 500; export uses 10_000). */
  maxResultCap?: number;
}): Promise<StaleSeatNudgeAuditRow[]> {
  const maxCap = args.maxResultCap ?? 500;
  const limit = Math.min(Math.max(args.limit ?? 150, 1), maxCap);
  const status: StaleSeatNudgeAuditStatusFilter = args.status ?? "all";
  const q = args.q?.trim().toLowerCase() ?? "";
  const courseId = args.courseId?.trim() ?? "";
  const hasDate = !!(args.from || args.to);
  const fetchCap = hasDate ? AUDIT_FILTER_SCAN_CAP_WITH_DATE : AUDIT_FILTER_SCAN_CAP;

  const where: Prisma.AuditLogWhereInput = {
    action: STALE_SEAT_NUDGE_ACTION,
    entity: STALE_SEAT_NUDGE_ENTITY,
  };
  if (args.from || args.to) {
    where.createdAt = {};
    if (args.from) where.createdAt.gte = args.from;
    if (args.to) where.createdAt.lte = args.to;
  }

  const recent = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: fetchCap,
  });

  let filtered: StaleSeatNudgeAuditRow[] = recent;

  if (courseId) {
    filtered = filtered.filter((row) => {
      const md = metadataRecord(row.metadata);
      const course = (md?.["course"] ?? {}) as Record<string, unknown>;
      return typeof course["courseId"] === "string" && course["courseId"] === courseId;
    });
  }

  if (q) {
    filtered = filtered.filter((row) => {
      const md = metadataRecord(row.metadata);
      const learner = (md?.["learner"] ?? {}) as Record<string, unknown>;
      const email = String(learner["email"] ?? "").toLowerCase();
      const name = String(learner["name"] ?? "").toLowerCase();
      return email.includes(q) || name.includes(q);
    });
  }

  if (status === "pending") {
    filtered = filtered.filter((row) => {
      const md = metadataRecord(row.metadata);
      const o = md?.["outcome"];
      return o == null || o === "";
    });
  } else if (status !== "all") {
    filtered = filtered.filter((row) => {
      const md = metadataRecord(row.metadata);
      return md?.["outcome"] === status;
    });
  }

  return filtered.slice(0, limit);
}

export async function getCoursesForStaleNudgeFilter(): Promise<{ id: string; title: string }[]> {
  return prisma.course.findMany({
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });
}
