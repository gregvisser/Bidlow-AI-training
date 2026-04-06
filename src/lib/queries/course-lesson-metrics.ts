import { prisma } from "@/lib/db";
import type { LessonMetric } from "@/lib/progress/compute";

/**
 * All non-archived lessons in a course with the user's progress — used for stats and certificates.
 */
export async function getCourseLessonMetricsForUser(
  userId: string,
  courseId: string,
): Promise<{ title: string; lessons: LessonMetric[] }> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      modules: {
        where: { archivedAt: null },
        orderBy: { sortOrder: "asc" },
        include: {
          lessons: {
            where: { archivedAt: null },
            orderBy: { sortOrder: "asc" },
            include: {
              progress: {
                where: { userId },
              },
            },
          },
        },
      },
    },
  });

  if (!course) {
    throw new Error("Course not found");
  }

  const lessons: LessonMetric[] = [];
  for (const mod of course.modules) {
    for (const lesson of mod.lessons) {
      const p = lesson.progress[0];
      lessons.push({
        lessonId: lesson.id,
        estimatedMinutes: lesson.estimatedMinutes,
        completedAt: p?.completedAt ?? null,
        timeSpentSeconds: p?.timeSpentSeconds ?? 0,
      });
    }
  }

  return { title: course.title, lessons };
}
