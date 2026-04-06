import { prisma } from "@/lib/db";
import { lessonLevelStats } from "@/lib/progress/compute";
import type { LessonMetric } from "@/lib/progress/compute";

export async function getEnrolledCoursesWithProgress(userId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: { userId },
    orderBy: { lastActivityAt: "desc" },
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
  });

  return enrollments.map((e) => {
    const lessons: LessonMetric[] = [];
    for (const mod of e.course.modules) {
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
    const stats = lessonLevelStats(lessons);
    return {
      enrollment: e,
      course: e.course,
      stats,
    };
  });
}

export async function getCourseDetailForLearner(userId: string, courseSlug: string) {
  const course = await prisma.course.findFirst({
    where: { slug: courseSlug },
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
  });

  if (!course) return null;

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId: course.id } },
  });

  const lessons: LessonMetric[] = [];
  const moduleStats: {
    moduleId: string;
    title: string;
    slug: string;
    weekNumber: number | null;
    stats: ReturnType<typeof lessonLevelStats>;
    lessons: {
      id: string;
      slug: string;
      title: string;
      estimatedMinutes: number;
      completedAt: Date | null;
      lastActivityAt: Date | null;
    }[];
  }[] = [];

  for (const mod of course.modules) {
    const modLessons: LessonMetric[] = [];
    const lessonRows: {
      id: string;
      slug: string;
      title: string;
      estimatedMinutes: number;
      completedAt: Date | null;
      lastActivityAt: Date | null;
    }[] = [];

    for (const lesson of mod.lessons) {
      const p = lesson.progress[0];
      const lm: LessonMetric = {
        lessonId: lesson.id,
        estimatedMinutes: lesson.estimatedMinutes,
        completedAt: p?.completedAt ?? null,
        timeSpentSeconds: p?.timeSpentSeconds ?? 0,
      };
      modLessons.push(lm);
      lessons.push(lm);
      lessonRows.push({
        id: lesson.id,
        slug: lesson.slug,
        title: lesson.title,
        estimatedMinutes: lesson.estimatedMinutes,
        completedAt: p?.completedAt ?? null,
        lastActivityAt: p?.lastActivityAt ?? null,
      });
    }

    moduleStats.push({
      moduleId: mod.id,
      title: mod.title,
      slug: mod.slug,
      weekNumber: mod.weekNumber,
      stats: lessonLevelStats(modLessons),
      lessons: lessonRows,
    });
  }

  const courseStats = lessonLevelStats(lessons);

  let sumLessonMinutes = 0;
  for (const mod of course.modules) {
    for (const lesson of mod.lessons) {
      sumLessonMinutes += lesson.estimatedMinutes;
    }
  }

  const firstIncomplete = (() => {
    for (const mod of course.modules) {
      for (const lesson of mod.lessons) {
        const p = lesson.progress[0];
        if (!p?.completedAt) {
          return {
            href: `/portal/courses/${course.slug}/modules/${mod.slug}/lessons/${lesson.slug}`,
            label: lesson.title,
          };
        }
      }
    }
    return null;
  })();

  const lastActivity = await prisma.lessonProgress.findFirst({
    where: {
      userId,
      lesson: { module: { courseId: course.id } },
    },
    orderBy: { lastActivityAt: "desc" },
    select: { lastActivityAt: true },
  });

  return {
    course,
    enrollment,
    courseStats,
    moduleStats,
    sumLessonMinutes,
    firstIncomplete,
    lastActivityAt: lastActivity?.lastActivityAt ?? enrollment?.lastActivityAt ?? null,
  };
}
