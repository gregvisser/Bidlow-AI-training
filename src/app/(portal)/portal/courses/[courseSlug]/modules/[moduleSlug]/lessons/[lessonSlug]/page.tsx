import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PortalHeader } from "@/components/portal/portal-header";
import { LessonCompletionControls } from "@/components/portal/lesson-completion-controls";
import { Button } from "@/components/ui/button";
import { auth } from "@/auth";
import { canAccessCourseContent } from "@/lib/access";
import { getAdjacentLessons } from "@/lib/curriculum-navigation";
import { prisma } from "@/lib/db";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

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
    },
  });
  if (!lesson) {
    notFound();
  }

  const progress = lesson.progress[0];
  const completed = !!progress?.completedAt;

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

          {lesson.content && (
            <div className="prose prose-invert mt-6 max-w-none text-sm leading-relaxed text-[var(--muted-foreground)] prose-p:mb-4">
              {lesson.content.split("\n").map((para, i) => (
                <p key={i}>{para}</p>
              ))}
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
                Open resource
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          )}

          {canAccess ? (
            <div className="mt-10 border-t border-white/[0.08] pt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Progress
              </h2>
              <div className="mt-4">
                <LessonCompletionControls
                  courseSlug={courseSlug}
                  moduleSlug={moduleSlug}
                  lessonSlug={lessonSlug}
                  initialCompleted={completed}
                />
              </div>
            </div>
          ) : (
            <p className="mt-8 text-sm text-amber-200/90">
              You need an active entitlement to mark lessons complete for this course.
            </p>
          )}

          <div className="mt-10 flex flex-col gap-4 border-t border-white/[0.08] pt-8 sm:flex-row sm:justify-between">
            {adjacent.prev.href ? (
              <Button asChild variant="secondary">
                <Link href={adjacent.prev.href}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Previous
                </Link>
              </Button>
            ) : (
              <span />
            )}
            {adjacent.next.href ? (
              <Button asChild>
                <Link href={adjacent.next.href}>
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button asChild variant="secondary">
                <Link href={`/portal/courses/${courseSlug}`}>Back to course</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
