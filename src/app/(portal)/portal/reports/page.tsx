import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CourseBreakdownChart,
  ProviderBreakdownChart,
  WeeklyActivityChart,
} from "@/components/portal/learner-report-charts-dynamic";
import { PortalHeader } from "@/components/portal/portal-header";
import { ProgressRing } from "@/components/portal/progress-ring";
import { auth } from "@/auth";
import { getLearnerDashboard } from "@/lib/queries/learner-dashboard";
import { getLearnerReportingBundle } from "@/lib/queries/learner-reports";

export default async function LearnerReportsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const [dash, report] = await Promise.all([
    getLearnerDashboard(session.user.id),
    getLearnerReportingBundle(session.user.id),
  ]);

  return (
    <>
      <PortalHeader title="Reports" />
      <div className="flex-1 space-y-8 overflow-auto p-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="glass-panel flex flex-col items-center rounded-2xl p-8 lg:col-span-1">
            <ProgressRing percent={dash.overallPercent} size={160} stroke={10} label="Overall" />
            <p className="mt-4 text-center text-sm text-[var(--muted-foreground)]">
              {dash.completedLessons} of {dash.totalLessons} lessons · {report.hoursLogged}h logged
            </p>
          </div>
          <div className="glass-panel rounded-2xl p-6 lg:col-span-2">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
              Weekly activity
            </h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              Lesson touches and completions aggregated by week (UTC).
            </p>
            <div className="mt-4">
              <WeeklyActivityChart data={report.weekly} />
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="glass-panel rounded-2xl p-6">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
              Course completion
            </h2>
            {report.courses.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--muted-foreground)]">No enrollments yet.</p>
            ) : (
              <div className="mt-4">
                <CourseBreakdownChart courses={report.courses} />
                <ul className="mt-4 space-y-2 text-sm">
                  {report.courses.map((c) => (
                    <li key={c.slug} className="flex justify-between gap-4">
                      <Link href={`/portal/courses/${c.slug}`} className="text-[var(--accent)] hover:underline">
                        {c.title}
                      </Link>
                      <span className="tabular-nums text-[var(--muted-foreground)]">
                        {c.completed}/{c.total} · {Math.round(c.percent * 10) / 10}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="glass-panel rounded-2xl p-6">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
              By provider track
            </h2>
            {report.providers.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--muted-foreground)]">No lesson data yet.</p>
            ) : (
              <div className="mt-4">
                <ProviderBreakdownChart providers={report.providers} />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
