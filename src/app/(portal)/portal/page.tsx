import Link from "next/link";
import { redirect } from "next/navigation";
import { PortalHeader } from "@/components/portal/portal-header";
import { ProgressRing } from "@/components/portal/progress-ring";
import { WeeklyActivityChart } from "@/components/portal/learner-report-charts";
import { auth } from "@/auth";
import { getLearnerDashboard } from "@/lib/queries/learner-dashboard";
import { getWeeklyActivitySeries } from "@/lib/queries/learner-reports";
import { ArrowRight, Award, BookOpen, Clock, Flame } from "lucide-react";

export default async function PortalDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const [dash, weekly] = await Promise.all([
    getLearnerDashboard(session.user.id),
    getWeeklyActivitySeries(session.user.id, 12),
  ]);

  return (
    <>
      <PortalHeader title="Dashboard" />
      <div className="flex-1 space-y-8 overflow-auto p-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="glass-panel rounded-2xl p-6">
            <p className="text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
              Overall progress
            </p>
            <div className="mt-4 flex items-center gap-4">
              <ProgressRing percent={dash.overallPercent} size={96} stroke={7} />
              <p className="text-sm text-[var(--muted-foreground)]">
                Across all enrolled courses, weighted by lesson completion.
              </p>
            </div>
          </div>
          <div className="glass-panel rounded-2xl p-6">
            <p className="text-xs uppercase tracking-wider text-[var(--muted-foreground)]">Courses</p>
            <p className="mt-3 font-[family-name:var(--font-display)] text-4xl font-bold tabular-nums">
              {dash.enrolledCourses}
            </p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">enrolled</p>
          </div>
          <div className="glass-panel rounded-2xl p-6">
            <p className="text-xs uppercase tracking-wider text-[var(--muted-foreground)]">Lessons</p>
            <p className="mt-3 font-[family-name:var(--font-display)] text-4xl font-bold tabular-nums">
              {dash.completedLessons}
              <span className="text-xl text-[var(--muted-foreground)]">/{dash.totalLessons}</span>
            </p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">completed</p>
          </div>
          <div className="glass-panel rounded-2xl p-6">
            <p className="text-xs uppercase tracking-wider text-[var(--muted-foreground)]">Certificates</p>
            <p className="mt-3 flex items-center gap-2 font-[family-name:var(--font-display)] text-4xl font-bold tabular-nums">
              <Award className="h-8 w-8 text-[var(--accent)]" aria-hidden />
              {dash.certCount}
            </p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">unlocked</p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="glass-panel min-w-0 rounded-2xl p-6 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
                Activity
              </h2>
              <span className="text-xs text-[var(--muted-foreground)]">Last 12 weeks</span>
            </div>
            <div className="mt-4">
              <WeeklyActivityChart data={weekly} />
            </div>
          </div>
          <div className="space-y-4">
            <div className="glass-panel rounded-2xl p-6">
              <p className="text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
                Time logged
              </p>
              <p className="mt-2 flex items-center gap-2 font-[family-name:var(--font-display)] text-3xl font-bold tabular-nums">
                <Clock className="h-6 w-6 text-[var(--accent)]" aria-hidden />
                {dash.hoursLogged}h
              </p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">From lesson progress records</p>
            </div>
            <div className="glass-panel rounded-2xl p-6">
              <p className="text-xs uppercase tracking-wider text-[var(--muted-foreground)]">Modules</p>
              <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold tabular-nums">
                {dash.completedModules}/{dash.totalModules}
              </p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">modules fully complete</p>
            </div>
            {dash.currentCourse && (
              <div className="glass-panel rounded-2xl p-6">
                <p className="text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
                  In progress
                </p>
                <p className="mt-2 font-medium text-[var(--foreground)]">{dash.currentCourse.title}</p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  {Math.round(dash.currentCourse.percent * 10) / 10}% complete
                </p>
                <Link
                  href={`/portal/courses/${dash.currentCourse.slug}`}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[var(--accent)] hover:underline"
                >
                  Open course
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">Recent activity</h2>
            <Flame className="h-5 w-5 text-orange-400/80" aria-hidden />
          </div>
          {dash.recent.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--muted-foreground)]">
              Complete a lesson to see activity here.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-white/[0.06]">
              {dash.recent.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <span className="text-[var(--foreground)]">{r.lesson.title}</span>
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {r.lesson.module.course.title} ·{" "}
                    {r.lastActivityAt.toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <Link
                    href={`/portal/courses/${r.lesson.module.course.slug}/modules/${r.lesson.module.slug}/lessons/${r.lesson.slug}`}
                    className="text-xs font-medium text-[var(--accent)] hover:underline"
                  >
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap gap-4">
          <Link
            href="/portal/courses"
            className="glass-panel inline-flex items-center gap-2 rounded-2xl px-6 py-4 text-sm font-medium transition hover:border-[var(--accent)]/30"
          >
            <BookOpen className="h-4 w-4 text-[var(--accent)]" />
            Browse courses
          </Link>
          <Link
            href="/portal/paths/ai-agent-mastery"
            className="glass-panel inline-flex items-center gap-2 rounded-2xl px-6 py-4 text-sm font-medium transition hover:border-[var(--accent)]/30"
          >
            Learning path
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </>
  );
}
