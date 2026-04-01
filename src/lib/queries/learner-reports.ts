import { prisma } from "@/lib/db";
import { lessonLevelStats } from "@/lib/progress/compute";
import type { LessonMetric } from "@/lib/progress/compute";
import { getLearnerProviderBreakdown } from "@/lib/queries/learner-dashboard";

function mondayKey(d: Date): string {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
}

export async function getWeeklyActivitySeries(userId: string, weeksBack = 12) {
  const since = new Date();
  since.setDate(since.getDate() - weeksBack * 7);

  const rows = await prisma.lessonProgress.findMany({
    where: { userId, lastActivityAt: { gte: since } },
    select: { lastActivityAt: true },
  });

  const counts = new Map<string, number>();
  for (const r of rows) {
    const k = mondayKey(r.lastActivityAt);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }

  const points: { week: string; label: string; events: number }[] = [];
  for (let i = weeksBack - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    const k = mondayKey(d);
    points.push({
      week: k,
      label: k.slice(5),
      events: counts.get(k) ?? 0,
    });
  }

  return points;
}

export async function getCourseCompletionBreakdown(userId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: { userId },
    include: {
      course: {
        include: {
          modules: {
            where: { archivedAt: null },
            include: {
              lessons: {
                where: { archivedAt: null },
                include: { progress: { where: { userId } } },
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
    const s = lessonLevelStats(lessons);
    return {
      title: e.course.title,
      slug: e.course.slug,
      percent: s.percent,
      completed: s.completedLessons,
      total: s.totalLessons,
    };
  });
}

export async function getLearnerReportingBundle(userId: string) {
  const [weekly, courses, providers] = await Promise.all([
    getWeeklyActivitySeries(userId),
    getCourseCompletionBreakdown(userId),
    getLearnerProviderBreakdown(userId),
  ]);

  const hours = await prisma.lessonProgress.findMany({
    where: { userId },
    select: { timeSpentSeconds: true },
  });
  const hoursLogged = hours.reduce((s, r) => s + r.timeSpentSeconds, 0) / 3600;

  return {
    weekly,
    courses,
    providers,
    hoursLogged: Math.round(hoursLogged * 10) / 10,
  };
}
