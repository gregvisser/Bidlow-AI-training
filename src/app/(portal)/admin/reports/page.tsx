import Link from "next/link";
import { PortalHeader } from "@/components/portal/portal-header";
import { AdminCourseCompletionChart } from "@/components/admin/admin-course-completion-chart";
import { getAdminReportStats } from "@/lib/queries/admin-reports";

export default async function AdminReportsPage() {
  const stats = await getAdminReportStats();

  const courseChart = stats.courseStats.map((c) => ({
    name: c.title.length > 18 ? `${c.title.slice(0, 18)}…` : c.title,
    full: c.title,
    enroll: c.enrollmentCount,
    avg: c.avgCompletion,
  }));

  const exportHref = "/api/admin/reports/export";

  return (
    <>
      <PortalHeader title="Reporting" />
      <div className="flex-1 space-y-8 overflow-auto p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[
            { label: "Total learners", value: stats.totalLearners },
            { label: "Active (30d)", value: stats.activeLearners },
            { label: "Enrollments", value: stats.enrollments },
            { label: "Lesson completions", value: stats.lessonCompletionTotal },
            { label: "Courses completed", value: stats.completedEnrollments },
            { label: "In progress", value: stats.inProgressEnrollments },
            { label: "Cert-eligible completed", value: stats.certificateEligibleCompleted },
            { label: "Certificates unlocked", value: stats.certificatesUnlocked },
            { label: "Certificates issued", value: stats.certificatesIssued },
          ].map((c) => (
            <div key={c.label} className="glass-panel rounded-2xl p-6">
              <p className="text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
                {c.label}
              </p>
              <p
                className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold tabular-nums"
                data-testid={
                  c.label === "Certificates unlocked"
                    ? "admin-certificates-unlocked"
                    : c.label === "Certificates issued"
                      ? "admin-certificates-issued"
                      : undefined
                }
              >
                {c.value}
              </p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="glass-panel rounded-2xl p-6">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
              Hours consumed (all learners)
            </h2>
            <p className="mt-1 text-3xl font-bold tabular-nums text-[var(--foreground)]">
              {stats.totalHoursConsumed}h
            </p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              Sum of `timeSpentSeconds` on lesson progress rows.
            </p>
          </div>
          <div className="glass-panel rounded-2xl p-6">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
              Enrollment finish rate
            </h2>
            <p
              className="mt-1 text-3xl font-bold tabular-nums text-[var(--foreground)]"
              data-testid="admin-overall-enrollment-finish-rate"
            >
              {stats.overallEnrollmentCompletionRate}%
            </p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              Share of enrollments with <code className="text-xs">courseCompletedAt</code> set (all
              courses).
            </p>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6" data-testid="admin-funnel-overview">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Enrollment funnel
          </h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            All-time counts from <code className="text-xs">Enrollment</code> — not started means no
            lessons touched yet.
          </p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
              <dt className="text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
                Enrolled
              </dt>
              <dd className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums">
                {stats.funnelEnrolled}
              </dd>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
              <dt className="text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
                Started
              </dt>
              <dd className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums">
                {stats.funnelStarted}
              </dd>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
              <dt className="text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
                In progress
              </dt>
              <dd className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums">
                {stats.funnelInProgress}
              </dd>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
              <dt className="text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
                Completed
              </dt>
              <dd className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums">
                {stats.funnelCompleted}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-[var(--muted-foreground)]">
            Not started (no activity):{" "}
            <span className="tabular-nums text-[var(--foreground)]">{stats.funnelNotStarted}</span>
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="glass-panel rounded-2xl p-6" data-testid="admin-cert-pipeline">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
              Certificate pipeline
            </h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Cert-eligible course completions vs issued certificates (operational gap check).
            </p>
            <p className="mt-4 text-2xl font-bold tabular-nums text-[var(--foreground)]">
              <span className="tabular-nums">{stats.certificateEligibleCompleted}</span>
              <span className="text-base font-normal text-[var(--muted-foreground)]"> eligible done</span>
              <span className="mx-2 text-[var(--muted-foreground)]">·</span>
              <span className="tabular-nums">{stats.certificatesIssued}</span>
              <span className="text-base font-normal text-[var(--muted-foreground)]"> issued</span>
            </p>
            {stats.certificateIssuanceRatePct != null ? (
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                Issuance rate:{" "}
                <span className="tabular-nums font-medium text-[var(--foreground)]">
                  {stats.certificateIssuanceRatePct}%
                </span>{" "}
                of cert-eligible completions
              </p>
            ) : (
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">No cert-eligible completions yet.</p>
            )}
          </div>
          <div className="glass-panel rounded-2xl p-6" data-testid="admin-cohort-30d">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
              Recent cohort (30 days)
            </h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Enrollments created in the last 30 days and how many already completed.
            </p>
            <p className="mt-4 text-2xl font-bold tabular-nums">
              <span className="tabular-nums">{stats.cohort30dCompleted}</span>
              <span className="text-base font-normal text-[var(--muted-foreground)]"> / </span>
              <span className="tabular-nums">{stats.cohort30dEnrolled}</span>
              <span className="text-base font-normal text-[var(--muted-foreground)]"> completed / enrolled</span>
            </p>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              Finish rate:{" "}
              <span className="tabular-nums font-medium text-[var(--foreground)]">
                {stats.cohort30dFinishRate}%
              </span>
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="glass-panel rounded-2xl p-6">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
              Time to complete (all learners)
            </h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Mean calendar days from <code className="text-xs">enrolledAt</code> to{" "}
              <code className="text-xs">courseCompletedAt</code>.
            </p>
            <p className="mt-4 text-3xl font-bold tabular-nums text-[var(--foreground)]">
              {stats.avgDaysToCompleteAll != null ? `${stats.avgDaysToCompleteAll}d` : "—"}
            </p>
          </div>
          <div className="glass-panel rounded-2xl p-6" data-testid="admin-stale-in-progress">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
              Stale in-progress seats
            </h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              In-progress enrollments with no activity for 14+ days (uses last activity or enrollment
              date).
            </p>
            <p className="mt-4 text-3xl font-bold tabular-nums text-[var(--foreground)]">
              {stats.staleInProgressEnrollmentCount}
            </p>
            <p className="mt-3 text-sm">
              <Link
                href="/admin/stale-enrollments"
                className="font-medium text-[var(--accent)] hover:underline"
                data-testid="admin-reports-link-stale-seats"
              >
                Open stale list & export →
              </Link>
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="glass-panel rounded-2xl p-6">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
              Slowest courses by avg. days to complete
            </h2>
            {stats.courseAvgDaysToComplete.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--muted-foreground)]">No completions yet.</p>
            ) : (
              <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm">
                {stats.courseAvgDaysToComplete.map((c) => (
                  <li key={c.courseId} className="pl-1">
                    <span className="text-[var(--foreground)]">{c.title}</span>
                    <span className="text-[var(--muted-foreground)]"> — </span>
                    <span className="tabular-nums">{c.avgDays}d</span>
                    <span className="text-[var(--muted-foreground)]"> (n={c.sampleSize})</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
          <div className="glass-panel rounded-2xl p-6">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
              Top courses by stale in-progress
            </h2>
            {stats.topCoursesByStaleEnrollments.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--muted-foreground)]">No stale in-progress seats.</p>
            ) : (
              <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm" data-testid="admin-top-stale-courses">
                {stats.topCoursesByStaleEnrollments.map((c) => (
                  <li key={c.courseId} className="pl-1">
                    <span className="text-[var(--foreground)]">{c.title}</span>
                    <span className="text-[var(--muted-foreground)]"> — </span>
                    <span className="tabular-nums">{c.staleCount}</span> stale
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Top courses by course completions
          </h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Enrollments where <code className="text-xs">courseCompletedAt</code> is set (100% lesson completion).
          </p>
          {stats.topCoursesByCompletions.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--muted-foreground)]">No completions yet.</p>
          ) : (
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm" data-testid="admin-top-courses-completions">
              {stats.topCoursesByCompletions.map((c) => (
                <li key={c.courseId} className="pl-1">
                  <span className="text-[var(--foreground)]">{c.title}</span>
                  <span className="text-[var(--muted-foreground)]"> — </span>
                  <span className="tabular-nums">{c.completedEnrollmentCount}</span> completions ·{" "}
                  <span className="tabular-nums">{c.enrollmentCount}</span> enrolled
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="glass-panel rounded-2xl p-6">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
              Avg completion by course
            </h2>
            <div className="mt-4 h-72">
              <AdminCourseCompletionChart data={courseChart} />
            </div>
          </div>
          <div className="glass-panel rounded-2xl p-6">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
              Top learners by hours
            </h2>
            {stats.topLearners.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--muted-foreground)]">No activity yet.</p>
            ) : (
              <ul className="mt-4 divide-y divide-white/[0.06]">
                {stats.topLearners.map((u) => (
                  <li key={u.userId} className="flex justify-between gap-4 py-3 text-sm">
                    <span>{u.name}</span>
                    <span className="tabular-nums text-[var(--muted-foreground)]">{u.hours}h</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">Course detail</h2>
            <Link
              href={exportHref}
              className="text-sm font-medium text-[var(--accent)] hover:underline"
              data-testid="admin-reports-export-csv"
            >
              Export CSV
            </Link>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[1040px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.08] text-[var(--muted-foreground)]">
                  <th className="pb-3 font-medium">Course</th>
                  <th className="pb-3 font-medium">Enrollments</th>
                  <th className="pb-3 font-medium">Completions</th>
                  <th className="pb-3 font-medium">Finish rate</th>
                  <th className="pb-3 font-medium">Avg days (done)</th>
                  <th className="pb-3 font-medium">Stale</th>
                  <th className="pb-3 font-medium">Avg %</th>
                  <th className="pb-3 font-medium">Lessons done</th>
                  <th className="pb-3 font-medium">Lesson count</th>
                </tr>
              </thead>
              <tbody>
                {stats.courseStats.map((c) => (
                  <tr key={c.courseId} className="border-b border-white/[0.04]">
                    <td className="py-3 pr-4">{c.title}</td>
                    <td className="py-3 tabular-nums">{c.enrollmentCount}</td>
                    <td className="py-3 tabular-nums">{c.completedEnrollmentCount}</td>
                    <td className="py-3 tabular-nums">{c.completionRatePct}%</td>
                    <td className="py-3 tabular-nums">{c.avgDaysToComplete != null ? `${c.avgDaysToComplete}d` : "—"}</td>
                    <td className="py-3 tabular-nums">{c.staleInProgressOnCourse}</td>
                    <td className="py-3 tabular-nums">{c.avgCompletion}%</td>
                    <td className="py-3 tabular-nums">{c.lessonCompletions}</td>
                    <td className="py-3 tabular-nums">{c.lessonCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
