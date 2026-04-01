import Link from "next/link";
import { redirect } from "next/navigation";
import { PortalHeader } from "@/components/portal/portal-header";
import { ProgressRing } from "@/components/portal/progress-ring";
import { auth } from "@/auth";
import { providerLabel } from "@/lib/labels";
import { getEnrolledCoursesWithProgress } from "@/lib/queries/learner-courses";
import { BookOpen } from "lucide-react";

export default async function CoursesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const rows = await getEnrolledCoursesWithProgress(session.user.id);

  return (
    <>
      <PortalHeader title="Courses" />
      <div className="flex-1 overflow-auto p-6">
        {rows.length === 0 ? (
          <div className="glass-panel rounded-2xl p-12 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-[var(--muted-foreground)]" aria-hidden />
            <p className="mt-4 text-[var(--muted-foreground)]">
              You&apos;re not enrolled in any courses yet. When an administrator enrolls you, your
              programs will appear here.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {rows.map(({ course, stats }) => (
              <Link
                key={course.id}
                href={`/portal/courses/${course.slug}`}
                className="group glass-panel block overflow-hidden rounded-2xl transition hover:border-[var(--accent)]/35"
              >
                <div className="relative h-36 bg-gradient-to-br from-[#1a1a3a] via-[#0f1028] to-[#050514] p-6">
                  <div className="absolute right-4 top-4">
                    <ProgressRing percent={stats.percent} size={88} stroke={6} />
                  </div>
                  <p className="text-xs font-medium uppercase tracking-wider text-[var(--accent)]">
                    {providerLabel(course.provider)}
                  </p>
                  <h2 className="mt-2 font-[family-name:var(--font-display)] text-lg font-semibold leading-snug text-[var(--foreground)] group-hover:text-white">
                    {course.title}
                  </h2>
                  {course.subtitle && (
                    <p className="mt-1 line-clamp-2 text-sm text-[var(--muted-foreground)]">
                      {course.subtitle}
                    </p>
                  )}
                </div>
                <div className="border-t border-white/[0.06] px-6 py-4 text-sm text-[var(--muted-foreground)]">
                  <span className="tabular-nums text-[var(--foreground)]">
                    {stats.completedLessons}/{stats.totalLessons}
                  </span>{" "}
                  lessons ·{" "}
                  <span className="tabular-nums text-[var(--foreground)]">
                    {Math.round(stats.minutesRemaining)}m
                  </span>{" "}
                  est. remaining
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
