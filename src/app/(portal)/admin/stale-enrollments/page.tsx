import Link from "next/link";
import { PortalHeader } from "@/components/portal/portal-header";
import { CopyEmailButton } from "@/components/admin/copy-email-button";
import { StaleSeatNudgeButton } from "@/components/admin/stale-seat-nudge-button";
import { StaleSeatNudgeOutcomeForm } from "@/components/admin/stale-seat-nudge-outcome-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { prisma } from "@/lib/db";
import {
  getStaleInProgressEnrollmentCount,
  getStaleInProgressEnrollmentRows,
  STALE_ENROLLMENT_LIST_MAX,
} from "@/lib/queries/admin-stale-enrollments";
import {
  getCoursesForStaleNudgeFilter,
  listStaleSeatNudgesFiltered,
} from "@/lib/queries/admin-stale-seat-nudges";
import { parseUtcDateEnd, parseUtcDateStart } from "@/lib/stale-seat-nudge-query-params";
import type { StaleSeatNudgeAuditStatusFilter, StaleSeatNudgeOutcome } from "@/lib/stale-seat-nudge-types";
import { Download, Search } from "lucide-react";

function parseOutcome(md: unknown): StaleSeatNudgeOutcome | null {
  if (!md || typeof md !== "object") return null;
  const v = (md as Record<string, unknown>)["outcome"];
  if (v === "sent" || v === "not_sent" || v === "bounced") return v;
  return null;
}

function parseOutcomeMeta(md: unknown): {
  outcomeRecordedAt?: string;
  outcomeRecordedBy?: string;
} {
  if (!md || typeof md !== "object") return {};
  const o = md as Record<string, unknown>;
  return {
    outcomeRecordedAt: typeof o.outcomeRecordedAt === "string" ? o.outcomeRecordedAt : undefined,
    outcomeRecordedBy: typeof o.outcomeRecordedBy === "string" ? o.outcomeRecordedBy : undefined,
  };
}

function normalizeStatus(s: string | undefined): StaleSeatNudgeAuditStatusFilter {
  const v = s?.trim() ?? "";
  if (v === "pending" || v === "sent" || v === "not_sent" || v === "bounced") return v;
  return "all";
}

export default async function AdminStaleEnrollmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; courseId?: string; status?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const courseId = sp.courseId?.trim() ?? "";
  const statusFilter = normalizeStatus(sp.status);
  const fromStr = sp.from?.trim() ?? "";
  const toStr = sp.to?.trim() ?? "";
  const fromDate = parseUtcDateStart(fromStr || undefined);
  const toDate = parseUtcDateEnd(toStr || undefined);

  const [staleTotal, rows, recentNudges, courses] = await Promise.all([
    getStaleInProgressEnrollmentCount(),
    getStaleInProgressEnrollmentRows(),
    listStaleSeatNudgesFiltered({
      q,
      courseId,
      status: statusFilter,
      limit: 150,
      from: fromDate,
      to: toDate,
    }),
    getCoursesForStaleNudgeFilter(),
  ]);

  const truncated = staleTotal > rows.length;

  const userIds = new Set<string>();
  for (const n of recentNudges) {
    const ob = parseOutcomeMeta(n.metadata).outcomeRecordedBy;
    if (ob) userIds.add(ob);
  }
  const outcomeUsers =
    userIds.size > 0
      ? await prisma.user.findMany({
          where: { id: { in: [...userIds] } },
          select: { id: true, name: true, email: true },
        })
      : [];
  const outcomeUserMap = new Map(
    outcomeUsers.map((u) => [u.id, u.name?.trim() || u.email || u.id]),
  );

  const auditQuery = new URLSearchParams();
  if (q) auditQuery.set("q", q);
  if (courseId) auditQuery.set("courseId", courseId);
  if (statusFilter !== "all") auditQuery.set("status", statusFilter);
  if (fromStr) auditQuery.set("from", fromStr);
  if (toStr) auditQuery.set("to", toStr);
  const auditQueryStr = auditQuery.toString();
  const auditExportHref = `/api/admin/stale-enrollments/nudge-audit/export${auditQueryStr ? `?${auditQueryStr}` : ""}`;

  return (
    <>
      <PortalHeader title="Stale enrollments" />
      <div className="flex-1 space-y-6 overflow-auto p-6">
        <div className="glass-panel rounded-2xl p-6">
          <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
            In-progress seats with <strong className="text-[var(--foreground)]">no activity for 14+ days</strong>{" "}
            (last touch = last activity or enrollment date). Same definition as Reporting. Use for follow-up
            outside the app — email automation is not included here.
          </p>
          <p className="mt-3 text-sm text-[var(--muted-foreground)]">
            Total stale: <span className="tabular-nums text-[var(--foreground)]">{staleTotal}</span>
            {truncated ? (
              <>
                {" "}
                — showing first <span className="tabular-nums">{rows.length}</span> (max{" "}
                {STALE_ENROLLMENT_LIST_MAX} for performance).
              </>
            ) : null}
          </p>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Prepare nudge cooldown: at most <strong className="text-[var(--foreground)]">one prepared nudge per
            enrollment every 7 days</strong> (operator-confirmed outcomes are recorded on the same audit row).
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/api/admin/stale-enrollments/export"
              className="text-sm font-medium text-[var(--accent)] hover:underline"
              data-testid="admin-stale-enrollments-export-csv"
            >
              Export CSV
            </Link>
            <Link href="/admin/reports" className="text-sm text-[var(--muted-foreground)] hover:underline">
              ← Back to reports
            </Link>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6" data-testid="admin-stale-enrollments-table">
          {rows.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">No stale in-progress enrollments.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08] text-[var(--muted-foreground)]">
                    <th className="pb-3 font-medium">Learner</th>
                    <th className="pb-3 font-medium">Course</th>
                    <th className="pb-3 font-medium">Enrolled</th>
                    <th className="pb-3 font-medium">Last activity</th>
                    <th className="pb-3 font-medium">Days inactive</th>
                    <th className="pb-3 font-medium">Lessons done</th>
                    <th className="pb-3 font-medium">Progress %</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.enrollmentId} className="border-b border-white/[0.04]">
                      <td className="py-3 pr-4 align-top">
                        <div className="font-medium text-[var(--foreground)]">{r.learnerName}</div>
                        <div className="mt-0.5 text-xs text-[var(--muted-foreground)]">{r.learnerEmail}</div>
                      </td>
                      <td className="py-3 align-top">
                        <div>{r.courseTitle}</div>
                        <Link
                          href={`/admin/courses/${r.courseId}/edit`}
                          className="text-xs text-[var(--accent)] hover:underline"
                        >
                          Edit course
                        </Link>
                      </td>
                      <td className="py-3 tabular-nums align-top text-[var(--muted-foreground)]">
                        {r.enrolledAt.toLocaleDateString()}
                      </td>
                      <td className="py-3 tabular-nums align-top text-[var(--muted-foreground)]">
                        {r.lastActivityAt ? r.lastActivityAt.toLocaleDateString() : "—"}
                      </td>
                      <td className="py-3 tabular-nums align-top">{r.daysSinceLastActivity}d</td>
                      <td className="py-3 tabular-nums align-top">{r.lessonsCompletedCount}</td>
                      <td className="py-3 tabular-nums align-top">{r.progressPercent}%</td>
                      <td className="py-3 align-top">
                        <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center">
                          <CopyEmailButton email={r.learnerEmail} />
                          <StaleSeatNudgeButton
                            enrollmentId={r.enrollmentId}
                            cooldownUntilIso={r.nudgeCooldownUntil?.toISOString() ?? null}
                          />
                          <Link
                            href={`/portal/courses/${r.courseSlug}`}
                            className="text-xs text-[var(--accent)] hover:underline"
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open as learner
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="glass-panel rounded-2xl p-6" data-testid="admin-stale-seat-nudge-audit">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
                Stale-seat nudge audit
              </h2>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Newest first. Record delivery outcomes on the same audit row — no provider webhooks. Filters apply to
                the table and CSV export.
              </p>
            </div>
            <a
              href={auditExportHref}
              className="inline-flex items-center gap-2 text-sm font-medium text-[var(--accent)] hover:underline"
              data-testid="admin-stale-seat-nudge-audit-export-csv"
            >
              <Download className="h-4 w-4" aria-hidden />
              Export audit CSV
            </a>
          </div>

          <form method="get" className="mt-4 flex flex-wrap items-end gap-3">
            <div className="min-w-[200px] flex-1">
              <label htmlFor="audit-q" className="mb-1 block text-xs text-[var(--muted-foreground)]">
                Search learner
              </label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]"
                  aria-hidden
                />
                <Input
                  id="audit-q"
                  name="q"
                  type="search"
                  defaultValue={q}
                  placeholder="Email or name"
                  className="pl-9"
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="min-w-[180px]">
              <label htmlFor="audit-course" className="mb-1 block text-xs text-[var(--muted-foreground)]">
                Course
              </label>
              <select
                id="audit-course"
                name="courseId"
                defaultValue={courseId}
                className="h-10 w-full rounded-md border border-white/[0.12] bg-white/[0.04] px-3 text-sm text-[var(--foreground)]"
              >
                <option value="">All courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[160px]">
              <label htmlFor="audit-status" className="mb-1 block text-xs text-[var(--muted-foreground)]">
                Outcome status
              </label>
              <select
                id="audit-status"
                name="status"
                defaultValue={statusFilter}
                className="h-10 w-full rounded-md border border-white/[0.12] bg-white/[0.04] px-3 text-sm text-[var(--foreground)]"
              >
                <option value="all">All</option>
                <option value="pending">Pending outcome</option>
                <option value="sent">Sent</option>
                <option value="not_sent">Not sent</option>
                <option value="bounced">Bounced</option>
              </select>
            </div>
            <div className="min-w-[150px]">
              <label htmlFor="audit-from" className="mb-1 block text-xs text-[var(--muted-foreground)]">
                Intent from (UTC date)
              </label>
              <Input
                id="audit-from"
                name="from"
                type="date"
                defaultValue={fromStr}
                className="h-10"
              />
            </div>
            <div className="min-w-[150px]">
              <label htmlFor="audit-to" className="mb-1 block text-xs text-[var(--muted-foreground)]">
                Intent to (UTC date)
              </label>
              <Input id="audit-to" name="to" type="date" defaultValue={toStr} className="h-10" />
            </div>
            <Button type="submit" variant="secondary">
              Apply
            </Button>
            {auditQueryStr ? (
              <Button type="button" variant="ghost" asChild>
                <Link href="/admin/stale-enrollments">Clear</Link>
              </Button>
            ) : null}
          </form>

          {recentNudges.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--muted-foreground)]">No matching nudge records.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08] text-[var(--muted-foreground)]">
                    <th className="pb-3 font-medium">When</th>
                    <th className="pb-3 font-medium">Enrollment</th>
                    <th className="pb-3 font-medium">Learner</th>
                    <th className="pb-3 font-medium">Course</th>
                    <th className="pb-3 font-medium">Template</th>
                    <th className="pb-3 font-medium">Outcome</th>
                    <th className="pb-3 font-medium">Recorded</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentNudges.map((n) => {
                    const md =
                      n.metadata && typeof n.metadata === "object"
                        ? (n.metadata as Record<string, unknown>)
                        : {};
                    const learner = (md["learner"] ?? {}) as Record<string, unknown>;
                    const course = (md["course"] ?? {}) as Record<string, unknown>;
                    const learnerEmail = typeof learner["email"] === "string" ? learner["email"] : "";
                    const courseTitle = typeof course["title"] === "string" ? course["title"] : "";
                    const tmpl =
                      typeof md["templateVersion"] === "string" ? (md["templateVersion"] as string) : "";
                    const existingOutcome = parseOutcome(n.metadata);
                    const om = parseOutcomeMeta(n.metadata);
                    const recorder =
                      om.outcomeRecordedBy != null
                        ? (outcomeUserMap.get(om.outcomeRecordedBy) ?? om.outcomeRecordedBy.slice(0, 8))
                        : null;
                    const recordedAtLabel =
                      om.outcomeRecordedAt != null
                        ? new Date(om.outcomeRecordedAt).toLocaleString()
                        : "—";

                    return (
                      <tr key={n.id} className="border-b border-white/[0.04]">
                        <td className="py-3 tabular-nums text-[var(--muted-foreground)]">
                          {n.createdAt.toLocaleString()}
                        </td>
                        <td className="py-3 tabular-nums">{n.entityId?.slice(0, 10) ?? "—"}</td>
                        <td className="py-3 text-[var(--muted-foreground)]">{learnerEmail || "—"}</td>
                        <td className="py-3">{courseTitle || "—"}</td>
                        <td className="py-3 tabular-nums text-[var(--muted-foreground)]">{tmpl || "—"}</td>
                        <td className="py-3 text-[var(--muted-foreground)]">
                          {existingOutcome ? (
                            <span data-testid="admin-stale-seat-nudge-outcome-cell">
                              {existingOutcome === "sent"
                                ? "Sent"
                                : existingOutcome === "not_sent"
                                  ? "Not sent"
                                  : "Bounced"}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-3 text-xs text-[var(--muted-foreground)]">
                          {recorder ? (
                            <>
                              <div>{recordedAtLabel}</div>
                              <div className="mt-0.5">by {recorder}</div>
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-3 align-top">
                          {!existingOutcome ? (
                            <StaleSeatNudgeOutcomeForm auditLogId={n.id} />
                          ) : (
                            <span className="text-xs text-[var(--muted-foreground)]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
