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

  return (
    <>
      <PortalHeader title="Reporting" />
      <div className="flex-1 space-y-8 overflow-auto p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total learners", value: stats.totalLearners },
            { label: "Active (30d)", value: stats.activeLearners },
            { label: "Enrollments", value: stats.enrollments },
            { label: "Lesson completions", value: stats.lessonCompletionTotal },
          ].map((c) => (
            <div key={c.label} className="glass-panel rounded-2xl p-6">
              <p className="text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
                {c.label}
              </p>
              <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold tabular-nums">
                {c.value}
              </p>
            </div>
          ))}
        </div>

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
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Course detail
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.08] text-[var(--muted-foreground)]">
                  <th className="pb-3 font-medium">Course</th>
                  <th className="pb-3 font-medium">Enrollments</th>
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
