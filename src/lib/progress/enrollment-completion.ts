import { ensureCertificateForCompletedCourse } from "@/lib/certificates";
import { prisma } from "@/lib/db";
import { lessonLevelStats } from "@/lib/progress/compute";
import { getCourseLessonMetricsForUser } from "@/lib/queries/course-lesson-metrics";

/**
 * Recompute certificate row + enrollment summary from current lesson progress (same order as learner actions).
 */
export async function syncEnrollmentAndCertificateFromLessonProgress(userId: string, courseId: string) {
  const { title, lessons } = await getCourseLessonMetricsForUser(userId, courseId);
  await ensureCertificateForCompletedCourse(userId, courseId, title, lessons);
  await refreshEnrollmentCourseCompletion(userId, courseId);
}

/**
 * Denormalized enrollment fields + courseCompletedAt — call after lesson progress changes.
 */
export async function refreshEnrollmentCourseCompletion(userId: string, courseId: string) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (!enrollment) return;

  const { lessons } = await getCourseLessonMetricsForUser(userId, courseId);
  const stats = lessonLevelStats(lessons);
  const complete = stats.percent >= 100;

  await prisma.enrollment.update({
    where: { userId_courseId: { userId, courseId } },
    data: {
      lessonsCompletedCount: stats.completedLessons,
      minutesCompletedEstimate: Math.round(stats.minutesCompletedEstimate),
      courseCompletedAt: complete ? (enrollment.courseCompletedAt ?? new Date()) : null,
    },
  });
}
