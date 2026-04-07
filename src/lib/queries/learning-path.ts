import { prisma } from "@/lib/db";
import { lessonLevelStats } from "@/lib/progress/compute";
import type { LessonMetric } from "@/lib/progress/compute";
import { providerLabel } from "@/lib/labels";
import type { PathProgressionVm } from "@/lib/path-progression";
import type { ContentProvider } from "@/generated/prisma";

export async function getLearningPathForUser(userId: string, slug: string) {
  const path = await prisma.learningPath.findUnique({
    where: { slug },
    include: {
      courses: {
        orderBy: { sortOrder: "asc" },
        include: {
          course: {
            include: {
              modules: {
                where: { archivedAt: null },
                orderBy: { sortOrder: "asc" },
                include: {
                  lessons: {
                    where: { archivedAt: null },
                    orderBy: { sortOrder: "asc" },
                    include: {
                      progress: { where: { userId } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!path) return null;

  type WeekRow = {
    weekNumber: number;
    moduleTitle: string;
    moduleSlug: string;
    courseSlug: string;
    firstLessonSlug: string;
    provider: ContentProvider;
    providerLabel: string;
    stats: ReturnType<typeof lessonLevelStats>;
    lessonsDone: number;
    lessonsTotal: number;
  };

  const weeks: WeekRow[] = [];

  for (const pc of path.courses) {
    const c = pc.course;
    for (const mod of c.modules) {
      const lessons: LessonMetric[] = [];
      for (const lesson of mod.lessons) {
        const p = lesson.progress[0];
        lessons.push({
          lessonId: lesson.id,
          estimatedMinutes: lesson.estimatedMinutes,
          completedAt: p?.completedAt ?? null,
          timeSpentSeconds: p?.timeSpentSeconds ?? 0,
        });
      }
      const stats = lessonLevelStats(lessons);
      const wn = mod.weekNumber ?? pc.weekNumber ?? mod.sortOrder + 1;
      const track = mod.trackProvider ?? c.provider;
      const firstLessonSlug = mod.lessons[0]?.slug ?? "overview";
      weeks.push({
        weekNumber: wn,
        moduleTitle: mod.title,
        moduleSlug: mod.slug,
        courseSlug: c.slug,
        firstLessonSlug,
        provider: track,
        providerLabel: providerLabel(track),
        stats,
        lessonsDone: stats.completedLessons,
        lessonsTotal: stats.totalLessons,
      });
    }
  }

  weeks.sort((a, b) => a.weekNumber - b.weekNumber);

  const orderedLinks = [...path.courses].sort((a, b) => a.sortOrder - b.sortOrder);

  let totalPathLessons = 0;
  for (const pc of orderedLinks) {
    for (const mod of pc.course.modules) {
      totalPathLessons += mod.lessons.length;
    }
  }

  let firstIncomplete: { href: string; label: string; courseIndex: number } | null = null;
  outer: for (let ci = 0; ci < orderedLinks.length; ci++) {
    const c = orderedLinks[ci]!.course;
    for (const mod of c.modules) {
      for (const les of mod.lessons) {
        const pr = les.progress[0];
        if (!pr?.completedAt) {
          firstIncomplete = {
            href: `/portal/courses/${c.slug}/modules/${mod.slug}/lessons/${les.slug}`,
            label: les.title,
            courseIndex: ci,
          };
          break outer;
        }
      }
    }
  }

  const firstPc = orderedLinks[0];
  const startCourse = firstPc?.course;
  const startMod = startCourse?.modules[0];
  const startLes = startMod?.lessons[0];
  const startHref =
    startCourse && startMod && startLes
      ? `/portal/courses/${startCourse.slug}/modules/${startMod.slug}/lessons/${startLes.slug}`
      : `/portal/tracks`;
  const startTitle =
    startCourse && startLes ? `${startCourse.title}: ${startLes.title}` : "Start this path";

  const pathComplete = totalPathLessons > 0 && firstIncomplete === null;

  let nextCourseTitle: string | null = null;
  let nextCourseHref: string | null = null;
  if (firstIncomplete !== null) {
    const next = orderedLinks[firstIncomplete.courseIndex + 1];
    if (next) {
      nextCourseTitle = next.course.title;
      nextCourseHref = `/portal/courses/${next.course.slug}`;
    }
  }

  const inLastIncompleteCourse =
    !pathComplete &&
    firstIncomplete !== null &&
    orderedLinks.length > 0 &&
    firstIncomplete.courseIndex === orderedLinks.length - 1;

  const progression: PathProgressionVm = {
    startHref,
    startTitle,
    resumeHref: firstIncomplete?.href ?? null,
    resumeLabel: firstIncomplete?.label ?? null,
    nextCourseTitle,
    nextCourseHref,
    pathComplete,
    inLastIncompleteCourse,
    moreTracksHref: pathComplete ? "/portal/tracks" : null,
  };

  const pathStats = lessonLevelStats(
    path.courses.flatMap((pc) =>
      pc.course.modules.flatMap((mod) =>
        mod.lessons.map((lesson) => {
          const p = lesson.progress[0];
          return {
            lessonId: lesson.id,
            estimatedMinutes: lesson.estimatedMinutes,
            completedAt: p?.completedAt ?? null,
            timeSpentSeconds: p?.timeSpentSeconds ?? 0,
          };
        }),
      ),
    ),
  );

  return {
    path,
    weeks,
    pathPercent: pathStats.percent,
    minutesRemaining: pathStats.minutesRemaining,
    progression,
  };
}
