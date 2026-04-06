import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PortalHeader } from "@/components/portal/portal-header";
import { LessonAssessmentPanel } from "@/components/portal/lesson-assessment-panel";
import { Button } from "@/components/ui/button";
import { auth } from "@/auth";
import { canAccessCourseContent } from "@/lib/access";
import { getAdjacentLessons } from "@/lib/curriculum-navigation";
import { prisma } from "@/lib/db";
import { providerLabel } from "@/lib/labels";
import { canMarkLessonComplete } from "@/lib/progress/compute";
import { ChevronLeft, ChevronRight, ExternalLink, ListChecks, Target } from "lucide-react";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ courseSlug: string; moduleSlug: string; lessonSlug: string }>;
}) {
  const { courseSlug, moduleSlug, lessonSlug } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const course = await prisma.course.findUnique({
    where: { slug: courseSlug },
  });
  if (!course) {
    notFound();
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: session.user.id, courseId: course.id } },
  });
  if (!enrollment) {
    notFound();
  }

  const canAccess = await canAccessCourseContent(session.user.id, course);

  const courseModule = await prisma.module.findFirst({
    where: { courseId: course.id, slug: moduleSlug, archivedAt: null },
  });
  if (!courseModule) {
    notFound();
  }

  const lesson = await prisma.lesson.findFirst({
    where: { moduleId: courseModule.id, slug: lessonSlug, archivedAt: null },
    include: {
      progress: { where: { userId: session.user.id } },
      resourceLinks: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!lesson) {
    notFound();
  }

  const progress = lesson.progress[0];
  const completed = !!progress?.completedAt;
  const canMarkComplete = canMarkLessonComplete(
    lesson,
    progress
      ? {
          exerciseAcknowledgedAt: progress.exerciseAcknowledgedAt ?? null,
          checkpointAcknowledgedAt: progress.checkpointAcknowledgedAt ?? null,
        }
      : null,
  );

  const moduleLessonsOrdered = await prisma.lesson.findMany({
    where: { moduleId: courseModule.id, archivedAt: null },
    orderBy: { sortOrder: "asc" },
    select: {
      slug: true,
      title: true,
      progress: { where: { userId: session.user.id }, take: 1 },
    },
  });
  const lessonOrd = moduleLessonsOrdered.findIndex((l) => l.slug === lessonSlug);
  const lessonNum = lessonOrd >= 0 ? lessonOrd + 1 : null;
  const moduleLessonTotal = moduleLessonsOrdered.length;
  const completedInModule = moduleLessonsOrdered.filter((l) => l.progress[0]?.completedAt).length;
  const modulePercent = moduleLessonTotal
    ? Math.round((completedInModule / moduleLessonTotal) * 100)
    : 0;

  const adjacent = await getAdjacentLessons(courseSlug, moduleSlug, lessonSlug);

  return (
    <>
      <PortalHeader title={lesson.title} />
      <div className="flex-1 overflow-auto p-6">
        <nav className="mb-6 text-sm text-[var(--muted-foreground)]">
          <Link href="/portal/courses" className="hover:text-[var(--foreground)]">
            Courses
          </Link>
          <span className="mx-2">/</span>
          <Link href={`/portal/courses/${courseSlug}`} className="hover:text-[var(--foreground)]">
            {course.title}
          </Link>
          <span className="mx-2">/</span>
          <Link
            href={`/portal/courses/${courseSlug}#module-${courseModule.slug}`}
            className="hover:text-[var(--foreground)]"
          >
            {courseModule.title}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-[var(--foreground)]">{lesson.title}</span>
        </nav>

        <div className="glass-panel rounded-2xl p-8 md:p-10">
          <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--muted-foreground)]">
            <span>{lesson.estimatedMinutes} min estimated</span>
            {progress?.completedAt && (
              <span>
                Completed{" "}
                {progress.completedAt.toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            )}
            {progress?.lastActivityAt && (
              <span>
                Last activity{" "}
                {progress.lastActivityAt.toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            )}
          </div>

          <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight">
            {lesson.title}
          </h1>

          {lessonNum != null && moduleLessonTotal > 0 && (
            <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-[var(--muted-foreground)]">
                  <span className="font-medium text-[var(--foreground)]">{courseModule.title}</span>
                  <span className="mx-1.5 text-white/35">·</span>
                  Lesson {lessonNum} of {moduleLessonTotal}
                </span>
                <span className="tabular-nums text-xs text-[var(--muted-foreground)]">
                  {modulePercent}% of module lessons done
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#a78bfa] via-[#7c6cff] to-[#38bdf8] transition-all"
                  style={{ width: `${modulePercent}%` }}
                />
              </div>
            </div>
          )}

          {lesson.summary && (
            <p className="mt-4 text-lg leading-relaxed text-[var(--muted-foreground)]">{lesson.summary}</p>
          )}

          {lesson.learningObjectives && (
            <div className="mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                <Target className="h-4 w-4" aria-hidden />
                Learning objectives
              </p>
              <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-[var(--muted-foreground)]">
                {lesson.learningObjectives
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
              </ul>
            </div>
          )}

          {lesson.content && (
            <div className="prose prose-invert mt-8 max-w-none text-sm leading-relaxed text-[var(--muted-foreground)] prose-p:mb-4">
              {lesson.content.split("\n").map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          )}

          {lesson.exerciseTask && (
            <div className="mt-8 rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent)]/[0.06] p-6">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                <ListChecks className="h-4 w-4" aria-hidden />
                Exercise
              </p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[var(--foreground)]">
                {lesson.exerciseTask}
              </p>
            </div>
          )}

          {lesson.resourceLinks.length > 0 && (
            <div className="mt-10">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Official references
              </h2>
              <ul className="mt-4 space-y-2">
                {lesson.resourceLinks.map((rl) => (
                  <li key={rl.id}>
                    <a
                      href={rl.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-medium text-[var(--accent)] hover:underline"
                    >
                      {rl.label}
                      {rl.sourceProvider ? (
                        <span className="text-xs text-[var(--muted-foreground)]">
                          · {providerLabel(rl.sourceProvider)}
                        </span>
                      ) : null}
                      <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {lesson.resourceUrl && (
            <div className="mt-8">
              <a
                href={lesson.resourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-4 py-2.5 text-sm font-medium text-[var(--accent)] transition hover:bg-[var(--accent)]/20"
              >
                Open primary resource
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          )}

          {canAccess ? (
            <div className="mt-10 border-t border-white/[0.08] pt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Progress
              </h2>
              <p className="mt-2 max-w-xl text-sm text-[var(--muted-foreground)]">
                Mark the lesson complete when you have finished the material and any exercise. If this lesson has
                a checklist, confirm each item first—your completion is stored on your account.
              </p>
              <div className="mt-6">
                <LessonAssessmentPanel
                  courseSlug={courseSlug}
                  moduleSlug={moduleSlug}
                  lessonSlug={lessonSlug}
                  exerciseRequired={lesson.exerciseRequiredForCompletion}
                  checkpointRequired={lesson.checkpointRequiredForCompletion}
                  exerciseTaskPresent={!!lesson.exerciseTask?.trim()}
                  checkpointPrompt={lesson.checkpointPrompt}
                  initialExerciseAck={!!progress?.exerciseAcknowledgedAt}
                  initialCheckpointAck={!!progress?.checkpointAcknowledgedAt}
                  initialCompleted={completed}
                  canMarkComplete={canMarkComplete}
                />
              </div>
            </div>
          ) : (
            <p className="mt-8 text-sm text-amber-200/90">
              You need an active entitlement to mark lessons complete for this course.
            </p>
          )}

          <div className="mt-10 flex flex-col gap-4 border-t border-white/[0.08] pt-8 sm:flex-row sm:items-stretch sm:justify-between sm:gap-6">
            {adjacent.prev.href ? (
              <Button asChild variant="secondary" className="h-auto min-h-[3.25rem] flex-1 justify-start py-3 sm:max-w-[min(100%,24rem)]">
                <Link href={adjacent.prev.href} className="flex w-full items-start gap-2">
                  <ChevronLeft className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span className="flex min-w-0 flex-col items-start text-left">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                      Previous lesson
                    </span>
                    <span className="line-clamp-2 text-sm font-medium leading-snug">{adjacent.prev.label}</span>
                  </span>
                </Link>
              </Button>
            ) : (
              <span className="hidden flex-1 sm:block" />
            )}
            {adjacent.next.href ? (
              <Button asChild className="h-auto min-h-[3.25rem] flex-1 justify-end py-3 sm:max-w-[min(100%,24rem)]">
                <Link href={adjacent.next.href} className="flex w-full items-start gap-2 justify-end text-right">
                  <span className="flex min-w-0 flex-col items-end">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                      Next lesson
                    </span>
                    <span className="line-clamp-2 text-sm font-medium leading-snug">{adjacent.next.label}</span>
                  </span>
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                </Link>
              </Button>
            ) : (
              <Button asChild variant="secondary" className="h-auto min-h-[3.25rem] sm:ml-auto">
                <Link href={`/portal/courses/${courseSlug}`}>Back to course</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
