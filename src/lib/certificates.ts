import { prisma } from "@/lib/db";
import { lessonLevelStats } from "@/lib/progress/compute";
import type { LessonMetric } from "@/lib/progress/compute";

/**
 * When course completion hits 100%, persist certificate with real timestamps (idempotent).
 */
export async function ensureCertificateForCompletedCourse(
  userId: string,
  courseId: string,
  courseTitle: string,
  lessons: LessonMetric[],
) {
  const { percent } = lessonLevelStats(lessons);
  if (percent < 100) return null;

  const now = new Date();
  const existing = await prisma.certificate.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });

  if (existing?.unlockedAt) {
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
