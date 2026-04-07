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

  const [totalLearners, enrollmentsCount, courses, activeUserIds, certificatesUnlocked, certificatesIssued] =
    await Promise.all([
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
      prisma.certificate.count({ where: { unlockedAt: { not: null } } }),
      prisma.certificate.count({ where: { issuedAt: { not: null } } }),
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

    const completedEnrollmentCount = await prisma.enrollment.count({
      where: { courseId: c.id, courseCompletedAt: { not: null } },
    });

    const completionRatePct =
      enrollments.length > 0
        ? Math.round((completedEnrollmentCount / enrollments.length) * 1000) / 10
        : 0;

    courseStats.push({
      courseId: c.id,
      title: c.title,
      slug: c.slug,
      enrollmentCount: enrollments.length,
      completedEnrollmentCount,
      completionRatePct,
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

  const overallEnrollmentCompletionRate =
    enrollmentsCount > 0
      ? Math.round((completedEnrollments / enrollmentsCount) * 1000) / 10
      : 0;

  const [
    funnelNotStarted,
    completedForPace,
    inProgressRows,
    cohort30dEnrolled,
    cohort30dCompleted,
  ] = await Promise.all([
    prisma.enrollment.count({
      where: {
        courseCompletedAt: null,
        lessonsCompletedCount: 0,
        lastActivityAt: null,
      },
    }),
    prisma.enrollment.findMany({
      where: { courseCompletedAt: { not: null } },
      select: { courseId: true, enrolledAt: true, courseCompletedAt: true },
    }),
    prisma.enrollment.findMany({
      where: {
        courseCompletedAt: null,
        OR: [{ lessonsCompletedCount: { gt: 0 } }, { lastActivityAt: { not: null } }],
      },
      select: { courseId: true, lastActivityAt: true, enrolledAt: true },
    }),
    prisma.enrollment.count({ where: { enrolledAt: { gte: thirtyDaysAgo } } }),
    prisma.enrollment.count({
      where: {
        enrolledAt: { gte: thirtyDaysAgo },
        courseCompletedAt: { not: null },
      },
    }),
  ]);

  const funnelStarted = enrollmentsCount - funnelNotStarted;
  const paceDaysAll: number[] = [];
  const paceByCourse = new Map<string, number[]>();
  for (const row of completedForPace) {
    const cc = row.courseCompletedAt!;
    const d = (cc.getTime() - row.enrolledAt.getTime()) / 86_400_000;
    paceDaysAll.push(d);
    if (!paceByCourse.has(row.courseId)) paceByCourse.set(row.courseId, []);
    paceByCourse.get(row.courseId)!.push(d);
  }
  const avgDaysToCompleteAll =
    paceDaysAll.length > 0
      ? Math.round((paceDaysAll.reduce((a, b) => a + b, 0) / paceDaysAll.length) * 10) / 10
      : null;

  const courseTitleById = new Map(courses.map((c) => [c.id, c.title]));
  const courseAvgDaysToComplete = [...paceByCourse.entries()]
    .map(([courseId, days]) => ({
      courseId,
      title: courseTitleById.get(courseId) ?? courseId,
      avgDays: Math.round((days.reduce((a, b) => a + b, 0) / days.length) * 10) / 10,
      sampleSize: days.length,
    }))
    .sort((a, b) => b.avgDays - a.avgDays)
    .slice(0, 10);

  const nowMs = Date.now();
  const stallMs = 14 * 86_400_000;
  let staleInProgressEnrollmentCount = 0;
  const staleCountByCourse = new Map<string, number>();
  for (const row of inProgressRows) {
    const lastMs = (row.lastActivityAt ?? row.enrolledAt).getTime();
    if (nowMs - lastMs > stallMs) {
      staleInProgressEnrollmentCount += 1;
      staleCountByCourse.set(row.courseId, (staleCountByCourse.get(row.courseId) ?? 0) + 1);
    }
  }
  const topCoursesByStaleEnrollments = [...staleCountByCourse.entries()]
    .map(([courseId, staleCount]) => ({
      courseId,
      title: courseTitleById.get(courseId) ?? courseId,
      staleCount,
    }))
    .sort((a, b) => b.staleCount - a.staleCount)
    .slice(0, 8);

  const cohort30dFinishRate =
    cohort30dEnrolled > 0
      ? Math.round((cohort30dCompleted / cohort30dEnrolled) * 1000) / 10
      : 0;

  const certificateIssuanceRatePct =
    certificateEligibleCompleted > 0
      ? Math.round((certificatesIssued / certificateEligibleCompleted) * 1000) / 10
      : null;

  const courseStatsWithPace = courseStats.map((row) => {
    const days = paceByCourse.get(row.courseId);
    const avgDaysToComplete =
      days && days.length > 0
        ? Math.round((days.reduce((a, b) => a + b, 0) / days.length) * 10) / 10
        : null;
    return {
      ...row,
      avgDaysToComplete,
      staleInProgressOnCourse: staleCountByCourse.get(row.courseId) ?? 0,
    };
  });

  const topCoursesByCompletionsSorted = [...courseStatsWithPace]
    .sort((a, b) => b.completedEnrollmentCount - a.completedEnrollmentCount)
    .slice(0, 8);

  return {
    totalLearners,
    activeLearners,
    enrollments: enrollmentsCount,
    courseStats: courseStatsWithPace,
    topCoursesByCompletions: topCoursesByCompletionsSorted,
    lessonCompletionTotal,
    totalHoursConsumed: Math.round(totalHoursConsumed * 10) / 10,
    topLearners,
    completedEnrollments,
    inProgressEnrollments,
    certificateEligibleCompleted,
    certificatesUnlocked,
    certificatesIssued,
    overallEnrollmentCompletionRate,
    funnelEnrolled: enrollmentsCount,
    funnelNotStarted,
    funnelStarted,
    funnelInProgress: inProgressEnrollments,
    funnelCompleted: completedEnrollments,
    avgDaysToCompleteAll,
    courseAvgDaysToComplete,
    cohort30dEnrolled,
    cohort30dCompleted,
    cohort30dFinishRate,
    staleInProgressEnrollmentCount,
    topCoursesByStaleEnrollments,
    certificateIssuanceRatePct,
  };
}
