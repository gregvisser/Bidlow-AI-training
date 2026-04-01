import { prisma } from "@/lib/db";
import { lessonLevelStats } from "@/lib/progress/compute";
import type { LessonMetric } from "@/lib/progress/compute";
import { providerLabel } from "@/lib/labels";
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
  };
}
