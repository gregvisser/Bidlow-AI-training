import type { ContentProvider } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { lessonLevelStats, overallWeightedPercent } from "@/lib/progress/compute";
import type { LessonMetric } from "@/lib/progress/compute";

export async function getLearnerDashboard(userId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: { userId },
    orderBy: { lastActivityAt: "desc" },
    include: {
      course: {
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
      },
    },
  });

  const courseLessonLists: LessonMetric[][] = [];
  let totalLessons = 0;
  let completedLessons = 0;
  let completedModules = 0;
  let totalModules = 0;

  for (const e of enrollments) {
    const list: LessonMetric[] = [];
    for (const mod of e.course.modules) {
      totalModules += 1;
      const modLessons: LessonMetric[] = [];
      for (const lesson of mod.lessons) {
        const p = lesson.progress[0];
        const m: LessonMetric = {
          lessonId: lesson.id,
          estimatedMinutes: lesson.estimatedMinutes,
          completedAt: p?.completedAt ?? null,
          timeSpentSeconds: p?.timeSpentSeconds ?? 0,
        };
        list.push(m);
        modLessons.push(m);
      }
      const ms = lessonLevelStats(modLessons);
      if (ms.percent >= 100) completedModules += 1;
    }
    totalLessons += list.length;
    completedLessons += list.filter((l) => l.completedAt).length;
    courseLessonLists.push(list);
  }

  const flat: LessonMetric[] = courseLessonLists.flat();
  const hoursLogged = flat.reduce((s, l) => s + l.timeSpentSeconds, 0) / 3600;
  const overallPercent = overallWeightedPercent(courseLessonLists);

  const [certCount, certificatesIssuedCount] = await Promise.all([
    prisma.certificate.count({
      where: { userId, unlockedAt: { not: null } },
    }),
    prisma.certificate.count({
      where: { userId, issuedAt: { not: null } },
    }),
  ]);

  let completedCoursesCount = 0;
  let inProgressCoursesCount = 0;
  let notStartedCoursesCount = 0;
  let totalEstimatedMinutesCompleted = 0;
  for (const e of enrollments) {
    totalEstimatedMinutesCompleted += e.minutesCompletedEstimate ?? 0;
    if (e.courseCompletedAt) {
      completedCoursesCount += 1;
    } else if ((e.lessonsCompletedCount ?? 0) > 0) {
      inProgressCoursesCount += 1;
    } else {
      notStartedCoursesCount += 1;
    }
  }

  const recent = await prisma.lessonProgress.findMany({
    where: { userId },
    orderBy: { lastActivityAt: "desc" },
    take: 8,
    include: {
      lesson: {
        include: {
          module: {
            include: {
              course: { select: { title: true, slug: true } },
            },
          },
        },
      },
    },
  });

  function metricsForCourse(course: (typeof enrollments)[0]["course"]) {
    const list: LessonMetric[] = [];
    for (const mod of course.modules) {
      for (const lesson of mod.lessons) {
        const p = lesson.progress[0];
        list.push({
          lessonId: lesson.id,
          estimatedMinutes: lesson.estimatedMinutes,
          completedAt: p?.completedAt ?? null,
          timeSpentSeconds: p?.timeSpentSeconds ?? 0,
        });
      }
    }
    return list;
  }

  let currentCourse: { title: string; slug: string; percent: number } | null = null;
  for (const e of enrollments) {
    const list = metricsForCourse(e.course);
    const pct = lessonLevelStats(list).percent;
    if (pct < 100) {
      currentCourse = { title: e.course.title, slug: e.course.slug, percent: pct };
      break;
    }
  }
  if (!currentCourse && enrollments[0]) {
    const e = enrollments[0]!;
    const list = metricsForCourse(e.course);
    currentCourse = {
      title: e.course.title,
      slug: e.course.slug,
      percent: lessonLevelStats(list).percent,
    };
  }

  return {
    enrolledCourses: enrollments.length,
    completedCoursesCount,
    inProgressCoursesCount,
    notStartedCoursesCount,
    totalEstimatedMinutesCompleted,
    completedLessons,
    totalLessons,
    completedModules,
    totalModules,
    hoursLogged: Math.round(hoursLogged * 10) / 10,
    overallPercent,
    certCount,
    certificatesIssuedCount,
    recent,
    currentCourse,
  };
}

/** Lightweight enrollment + certificate counts for course list / headers (no full lesson tree). */
export async function getLearnerCompletionRollup(userId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: { userId },
    select: {
      courseCompletedAt: true,
      lessonsCompletedCount: true,
      minutesCompletedEstimate: true,
    },
  });

  let completedCourses = 0;
  let inProgressCourses = 0;
  let notStartedCourses = 0;
  let totalEstimatedMinutes = 0;
  for (const e of enrollments) {
    totalEstimatedMinutes += e.minutesCompletedEstimate ?? 0;
    if (e.courseCompletedAt) completedCourses += 1;
    else if ((e.lessonsCompletedCount ?? 0) > 0) inProgressCourses += 1;
    else notStartedCourses += 1;
  }

  const [certificatesUnlocked, certificatesIssued] = await Promise.all([
    prisma.certificate.count({ where: { userId, unlockedAt: { not: null } } }),
    prisma.certificate.count({ where: { userId, issuedAt: { not: null } } }),
  ]);

  return {
    enrolledCourses: enrollments.length,
    completedCourses,
    inProgressCourses,
    notStartedCourses,
    totalEstimatedMinutes,
    certificatesUnlocked,
    certificatesIssued,
  };
}

export type ProviderBreakdown = { provider: ContentProvider; completed: number; total: number };

export async function getLearnerProviderBreakdown(userId: string): Promise<ProviderBreakdown[]> {
  const lessons = await prisma.lesson.findMany({
    where: {
      archivedAt: null,
      module: {
        archivedAt: null,
        course: { enrollments: { some: { userId } } },
      },
    },
    include: {
      module: { include: { course: { select: { provider: true } } } },
      progress: { where: { userId } },
    },
  });

  const totalByProv = new Map<ContentProvider, number>();
  const doneByProv = new Map<ContentProvider, number>();

  for (const les of lessons) {
    const prov = les.module.course.provider;
    totalByProv.set(prov, (totalByProv.get(prov) ?? 0) + 1);
    const p = les.progress[0];
    if (p?.completedAt) {
      doneByProv.set(prov, (doneByProv.get(prov) ?? 0) + 1);
    }
  }

  const keys = new Set([...totalByProv.keys(), ...doneByProv.keys()]);
  return [...keys].map((provider) => ({
    provider,
    completed: doneByProv.get(provider) ?? 0,
    total: totalByProv.get(provider) ?? 0,
  }));
}
