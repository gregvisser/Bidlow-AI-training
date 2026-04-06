import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PortalHeader } from "@/components/portal/portal-header";
import { ProgressRing } from "@/components/portal/progress-ring";
import { auth } from "@/auth";
import { getLearningPathForUser } from "@/lib/queries/learning-path";
import { ArrowRight } from "lucide-react";

export default async function LearningPathPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const data = await getLearningPathForUser(session.user.id, slug);
  if (!data) {
    notFound();
  }

  const { path, weeks, pathPercent, minutesRemaining } = data;

  return (
    <>
      <PortalHeader title={path.title} />
      <div className="flex-1 overflow-auto p-6">
        <div className="glass-panel rounded-2xl p-8 md:p-10">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl space-y-4">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--accent)]">
                Learning path · {path.durationWeeks} weeks
              </p>
              <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold md:text-4xl">
                {path.title}
              </h1>
              {path.description && (
                <p className="text-[var(--muted-foreground)] leading-relaxed">{path.description}</p>
              )}
            </div>
            <div className="flex flex-col items-center gap-3">
              <ProgressRing percent={pathPercent} size={132} stroke={8} label="Path" />
              <p className="text-center text-xs text-[var(--muted-foreground)]">
                {Math.round(minutesRemaining)}m est. remaining
                <br />
                across all path lessons
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 space-y-4">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
            Curriculum · {weeks.length} module{weeks.length === 1 ? "" : "s"}
          </h2>
          <div className="grid gap-4">
            {weeks.map((w) => (
              <div
                key={`${w.courseSlug}-${w.moduleSlug}`}
                className="glass-panel flex flex-col gap-4 rounded-2xl p-6 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-[var(--accent)]">
                    Week {w.weekNumber} · {w.providerLabel}
                  </p>
                  <h3 className="mt-1 font-[family-name:var(--font-display)] text-lg font-semibold">
                    {w.moduleTitle}
                  </h3>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                    {w.lessonsDone}/{w.lessonsTotal} lessons · {Math.round(w.stats.percent * 10) / 10}%
                    complete
                  </p>
                  <div className="mt-3 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-white/[0.06] md:max-w-lg">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#a78bfa] via-[#7c6cff] to-[#38bdf8]"
                      style={{ width: `${w.stats.percent}%` }}
                    />
                  </div>
                </div>
                <Link
                  href={`/portal/courses/${w.courseSlug}/modules/${w.moduleSlug}/lessons/${w.firstLessonSlug}`}
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition hover:border-[var(--accent)]/40"
                >
                  Open week
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
