import { prisma } from "@/lib/db";
import { lessonLevelStats } from "@/lib/progress/compute";
import type { LessonMetric } from "@/lib/progress/compute";

/**
 * Keeps certificate rows aligned with completion and admin eligibility (not payment-gated).
 * Revokes timestamps when the learner is no longer at 100% or the course is not certificate-eligible.
 */
export async function ensureCertificateForCompletedCourse(
  userId: string,
  courseId: string,
  courseTitle: string,
  lessons: LessonMetric[],
) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { certificateEligible: true },
  });

  const { percent } = lessonLevelStats(lessons);
  const eligible = !!course?.certificateEligible && percent >= 100;

  if (!eligible) {
    await prisma.certificate.updateMany({
      where: { userId, courseId },
      data: { unlockedAt: null, issuedAt: null },
    });
    return null;
  }

  const now = new Date();
  const existing = await prisma.certificate.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });

  if (existing?.unlockedAt && existing?.issuedAt) {
    return existing;
  }

  if (!existing) {
    return prisma.certificate.create({
      data: {
        userId,
        courseId,
        title: `${courseTitle} — Completion`,
        unlockedAt: now,
        issuedAt: now,
      },
    });
  }

  return prisma.certificate.update({
    where: { id: existing.id },
    data: {
      unlockedAt: now,
      issuedAt: now,
      title: `${courseTitle} — Completion`,
    },
  });
}
