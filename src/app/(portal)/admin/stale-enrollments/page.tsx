import Link from "next/link";
import { PortalHeader } from "@/components/portal/portal-header";
import { CopyEmailButton } from "@/components/admin/copy-email-button";
import {
  getStaleInProgressEnrollmentCount,
  getStaleInProgressEnrollmentRows,
  STALE_ENROLLMENT_LIST_MAX,
} from "@/lib/queries/admin-stale-enrollments";

export default async function AdminStaleEnrollmentsPage() {
  const [staleTotal, rows] = await Promise.all([
    getStaleInProgressEnrollmentCount(),
    getStaleInProgressEnrollmentRows(),
  ]);

  const truncated = staleTotal > rows.length;

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
      </div>
    </>
  );
}
