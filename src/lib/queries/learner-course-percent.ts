import { prisma } from "@/lib/db";
import { lessonLevelStats } from "@/lib/progress/compute";
import type { LessonMetric } from "@/lib/progress/compute";

/** Lesson-weighted completion percent for one learner on one course (0–100). */
export async function getLearnerCourseProgressPercent(courseId: string, userId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      modules: {
        where: { archivedAt: null },
        include: {
          lessons: {
            where: { archivedAt: null },
            include: {
              progress: { where: { userId } },
            },
          },
        },
      },
    },
  });
  if (!course) return 0;
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
  return lessonLevelStats(lessons).percent;
}
