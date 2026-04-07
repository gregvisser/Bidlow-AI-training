import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { getLearnerCourseProgressPercent } from "@/lib/queries/learner-course-percent";
import { enrollmentLastTouchAt, isStaleInProgressEnrollment } from "@/lib/stale-enrollment";

export const STALE_ENROLLMENT_LIST_MAX = 500;

/** Matches Phase 1K “in progress” enrollments (started, not completed). */
export const inProgressEnrollmentWhere: Prisma.EnrollmentWhereInput = {
  courseCompletedAt: null,
  OR: [{ lessonsCompletedCount: { gt: 0 } }, { lastActivityAt: { not: null } }],
};

export async function getStaleInProgressEnrollmentCount(): Promise<number> {
  const nowMs = Date.now();
  const candidates = await prisma.enrollment.findMany({
    where: inProgressEnrollmentWhere,
    select: { lastActivityAt: true, enrolledAt: true },
  });
  return candidates.filter((e) =>
    isStaleInProgressEnrollment(nowMs, {
      lastActivityAt: e.lastActivityAt,
      enrolledAt: e.enrolledAt,
    }),
  ).length;
}

export type StaleEnrollmentRow = {
  enrollmentId: string;
  userId: string;
  learnerEmail: string;
  learnerName: string;
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  enrolledAt: Date;
  lastActivityAt: Date | null;
  lastTouchAt: Date;
  lessonsCompletedCount: number;
  progressPercent: number;
  daysSinceLastActivity: number;
};

export async function getStaleInProgressEnrollmentRows(): Promise<StaleEnrollmentRow[]> {
  const nowMs = Date.now();

  const candidates = await prisma.enrollment.findMany({
    where: inProgressEnrollmentWhere,
    include: {
      user: { select: { id: true, email: true, name: true } },
      course: { select: { id: true, title: true, slug: true } },
    },
    orderBy: [{ lastActivityAt: "asc" }, { enrolledAt: "asc" }],
  });

  const stale = candidates.filter((e) =>
    isStaleInProgressEnrollment(nowMs, {
      lastActivityAt: e.lastActivityAt,
      enrolledAt: e.enrolledAt,
    }),
  );

  stale.sort((a, b) => {
    const tb = enrollmentLastTouchAt(b).getTime();
    const ta = enrollmentLastTouchAt(a).getTime();
    return ta - tb;
  });

  const limited = stale.slice(0, STALE_ENROLLMENT_LIST_MAX);

  const rows: StaleEnrollmentRow[] = [];
  for (const e of limited) {
    const lastTouchAt = enrollmentLastTouchAt(e);
    const daysSince =
      Math.round(((nowMs - lastTouchAt.getTime()) / 86_400_000) * 10) / 10;
    const progressPercent = Math.round(
      (await getLearnerCourseProgressPercent(e.courseId, e.userId)) * 10,
    ) / 10;

    rows.push({
      enrollmentId: e.id,
      userId: e.userId,
      learnerEmail: e.user.email ?? "",
      learnerName: e.user.name?.trim() || e.user.email || e.userId,
      courseId: e.course.id,
      courseTitle: e.course.title,
      courseSlug: e.course.slug,
      enrolledAt: e.enrolledAt,
      lastActivityAt: e.lastActivityAt,
      lastTouchAt,
      lessonsCompletedCount: e.lessonsCompletedCount,
      progressPercent,
      daysSinceLastActivity: daysSince,
    });
  }

  return rows;
}
