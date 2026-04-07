import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { listStaleSeatNudgesFiltered } from "@/lib/queries/admin-stale-seat-nudges";
import { parseUtcDateEnd, parseUtcDateStart } from "@/lib/stale-seat-nudge-query-params";
import type { StaleSeatNudgeAuditStatusFilter } from "@/lib/stale-seat-nudge-types";
import { NextRequest, NextResponse } from "next/server";

function csvEscape(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function normalizeStatus(v: string | null): StaleSeatNudgeAuditStatusFilter {
  const t = v?.trim() ?? "";
  if (t === "pending" || t === "sent" || t === "not_sent" || t === "bounced") return t;
  return "all";
}

function metadataRecord(m: unknown): Record<string, unknown> | null {
  if (!m || typeof m !== "object" || Array.isArray(m)) return null;
  return m as Record<string, unknown>;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id || (role !== "ADMIN" && role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim() ?? "";
  const courseId = sp.get("courseId")?.trim() ?? "";
  const statusFilter = normalizeStatus(sp.get("status"));
  const from = parseUtcDateStart(sp.get("from") ?? undefined);
  const to = parseUtcDateEnd(sp.get("to") ?? undefined);

  const rows = await listStaleSeatNudgesFiltered({
    q,
    courseId,
    status: statusFilter,
    from,
    to,
    limit: 10_000,
    maxResultCap: 10_000,
  });

  const actorIds = [...new Set(rows.map((r) => r.actorId).filter(Boolean))] as string[];
  const actors =
    actorIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, email: true, name: true },
        })
      : [];
  const actorMap = new Map(
    actors.map((u) => [u.id, { email: u.email ?? "", name: u.name?.trim() ?? "" }]),
  );

  const header = [
    "audit_id",
    "enrollment_id",
    "learner_user_id",
    "learner_email",
    "learner_name",
    "course_id",
    "course_title",
    "course_slug",
    "intent_created_at_utc",
    "actor_id",
    "actor_email",
    "actor_name",
    "status",
    "outcome",
    "outcome_recorded_at_utc",
    "days_since_last_activity",
    "progress_percent",
    "template_version",
    "channel",
  ];

  const lines = [
    "# stale-seat nudge audit — operator intent + outcomes (same filters as /admin/stale-enrollments audit)",
    `# max_rows=10000`,
    header.join(","),
    ...rows.map((r) => {
      const md = metadataRecord(r.metadata) ?? {};
      const learner = (md["learner"] ?? {}) as Record<string, unknown>;
      const course = (md["course"] ?? {}) as Record<string, unknown>;
      const enrollment = (md["enrollment"] ?? {}) as Record<string, unknown>;
      const actor = r.actorId ? actorMap.get(r.actorId) : undefined;

      const learnerUserId = typeof learner["userId"] === "string" ? learner["userId"] : "";
      const learnerEmail = typeof learner["email"] === "string" ? learner["email"] : "";
      const learnerName = typeof learner["name"] === "string" ? learner["name"] : "";
      const courseIdVal = typeof course["courseId"] === "string" ? course["courseId"] : "";
      const courseTitle = typeof course["title"] === "string" ? course["title"] : "";
      const courseSlug = typeof course["slug"] === "string" ? course["slug"] : "";
      const status = typeof md["status"] === "string" ? md["status"] : "";
      const outcome = typeof md["outcome"] === "string" ? md["outcome"] : "";
      const outcomeRecordedAt =
        typeof md["outcomeRecordedAt"] === "string" ? md["outcomeRecordedAt"] : "";
      const daysSince =
        typeof enrollment["daysSinceLastActivity"] === "number"
          ? enrollment["daysSinceLastActivity"]
          : "";
      const progress =
        typeof enrollment["progressPercent"] === "number" ? enrollment["progressPercent"] : "";
      const tmpl = typeof md["templateVersion"] === "string" ? md["templateVersion"] : "";
      const channel = typeof md["channel"] === "string" ? md["channel"] : "";

      return [
        csvEscape(r.id),
        csvEscape(r.entityId),
        csvEscape(learnerUserId),
        csvEscape(learnerEmail),
        csvEscape(learnerName),
        csvEscape(courseIdVal),
        csvEscape(courseTitle),
        csvEscape(courseSlug),
        r.createdAt.toISOString(),
        csvEscape(r.actorId),
        csvEscape(actor?.email ?? ""),
        csvEscape(actor?.name ?? ""),
        csvEscape(status),
        csvEscape(outcome),
        outcomeRecordedAt ? csvEscape(outcomeRecordedAt) : "",
        daysSince === "" ? "" : daysSince,
        progress === "" ? "" : progress,
        csvEscape(tmpl),
        csvEscape(channel),
      ].join(",");
    }),
  ];

  const body = "\uFEFF" + lines.join("\r\n");

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="stale-seat-nudge-audit.csv"',
    },
  });
}
