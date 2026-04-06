import { prisma } from "@/lib/db";
import { lessonLevelStats } from "@/lib/progress/compute";
import type { LessonMetric } from "@/lib/progress/compute";

async function learnerCoursePercent(courseId: string, userId: string) {
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

export async function getAdminReportStats() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [totalLearners, enrollmentsCount, courses, activeUserIds] = await Promise.all([
    prisma.user.count({ where: { role: "LEARNER" } }),
    prisma.enrollment.count(),
    prisma.course.findMany({
      where: { status: { in: ["PUBLISHED", "DRAFT"] } },
      select: { id: true, title: true, slug: true },
    }),
    prisma.lessonProgress.findMany({
      where: { lastActivityAt: { gte: thirtyDaysAgo } },
      distinct: ["userId"],
      select: { userId: true },
    }),
  ]);

  const activeLearners = activeUserIds.length;

  const courseStats = [];
  for (const c of courses) {
    const enrollments = await prisma.enrollment.findMany({
      where: { courseId: c.id },
      select: { userId: true },
    });
    let sum = 0;
    for (const e of enrollments) {
      sum += await learnerCoursePercent(c.id, e.userId);
    }
    const avgCompletion =
      enrollments.length > 0 ? Math.round((sum / enrollments.length) * 10) / 10 : 0;

    const lessonCount = await prisma.lesson.count({
      where: {
        archivedAt: null,
        module: { courseId: c.id, archivedAt: null },
      },
    });

    const lessonCompletions = await prisma.lessonProgress.count({
      where: {
        completedAt: { not: null },
        lesson: {
          module: { courseId: c.id },
        },
      },
    });

    courseStats.push({
      courseId: c.id,
      title: c.title,
      slug: c.slug,
      enrollmentCount: enrollments.length,
      avgCompletion,
      lessonCompletions,
      lessonCount,
    });
  }

  const lessonCompletionTotal = await prisma.lessonProgress.count({
    where: { completedAt: { not: null } },
  });

  const hoursAgg = await prisma.lessonProgress.aggregate({
    _sum: { timeSpentSeconds: true },
  });
  const totalHoursConsumed = (hoursAgg._sum.timeSpentSeconds ?? 0) / 3600;

  const userSeconds = await prisma.lessonProgress.groupBy({
    by: ["userId"],
    _sum: { timeSpentSeconds: true },
  });

  const topLearners = await Promise.all(
    [...userSeconds]
      .sort((a, b) => (b._sum.timeSpentSeconds ?? 0) - (a._sum.timeSpentSeconds ?? 0))
      .slice(0, 8)
      .map(async (row) => {
        const u = await prisma.user.findUnique({
          where: { id: row.userId },
          select: { name: true, email: true },
        });
        return {
          userId: row.userId,
          name: u?.name ?? u?.email ?? row.userId,
          hours: Math.round(((row._sum.timeSpentSeconds ?? 0) / 3600) * 10) / 10,
        };
      }),
  );

  const [completedEnrollments, inProgressEnrollments, certificateEligibleCompleted] = await Promise.all([
    prisma.enrollment.count({ where: { courseCompletedAt: { not: null } } }),
    prisma.enrollment.count({
      where: {
        courseCompletedAt: null,
        OR: [{ lessonsCompletedCount: { gt: 0 } }, { lastActivityAt: { not: null } }],
      },
    }),
    prisma.enrollment.count({
      where: {
        courseCompletedAt: { not: null },
        course: { certificateEligible: true },
      },
    }),
  ]);

  return {
    totalLearners,
    activeLearners,
    enrollments: enrollmentsCount,
    courseStats,
    lessonCompletionTotal,
    totalHoursConsumed: Math.round(totalHoursConsumed * 10) / 10,
    topLearners,
    completedEnrollments,
    inProgressEnrollments,
    certificateEligibleCompleted,
  };
}
