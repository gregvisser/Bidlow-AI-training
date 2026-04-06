"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { assertCourseContentAccess } from "@/lib/access";
import { prisma } from "@/lib/db";
import { syncEnrollmentAndCertificateFromLessonProgress } from "@/lib/progress/enrollment-completion";
import { canMarkLessonComplete, lessonLevelStats } from "@/lib/progress/compute";
import { getCourseLessonMetricsForUser } from "@/lib/queries/course-lesson-metrics";

export async function setLessonAcknowledgements(opts: {
  courseSlug: string;
  moduleSlug: string;
  lessonSlug: string;
  exercise: boolean;
  checkpoint: boolean;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" as const };
  }

  const course = await prisma.course.findUnique({
    where: { slug: opts.courseSlug },
  });
  if (!course) {
    return { error: "Course not found" as const };
  }

  try {
    await assertCourseContentAccess(session.user.id, course);
  } catch {
    return { error: "Access denied" as const };
  }

  const courseModule = await prisma.module.findFirst({
    where: {
      courseId: course.id,
      slug: opts.moduleSlug,
      archivedAt: null,
    },
  });
  if (!courseModule) {
    return { error: "Module not found" as const };
  }

  const lesson = await prisma.lesson.findFirst({
    where: {
      moduleId: courseModule.id,
      slug: opts.lessonSlug,
      archivedAt: null,
    },
  });
  if (!lesson) {
    return { error: "Lesson not found" as const };
  }

  const now = new Date();

  await prisma.lessonProgress.upsert({
    where: {
      userId_lessonId: { userId: session.user.id, lessonId: lesson.id },
    },
    create: {
      userId: session.user.id,
      lessonId: lesson.id,
      lastActivityAt: now,
      exerciseAcknowledgedAt: opts.exercise ? now : null,
      checkpointAcknowledgedAt: opts.checkpoint ? now : null,
    },
    update: {
      lastActivityAt: now,
      exerciseAcknowledgedAt: opts.exercise ? now : null,
      checkpointAcknowledgedAt: opts.checkpoint ? now : null,
    },
  });

  const afterAck = await prisma.lessonProgress.findUnique({
    where: {
      userId_lessonId: { userId: session.user.id, lessonId: lesson.id },
    },
  });
  if (afterAck?.completedAt && !canMarkLessonComplete(lesson, afterAck)) {
    await prisma.lessonProgress.update({
      where: {
        userId_lessonId: { userId: session.user.id, lessonId: lesson.id },
      },
      data: {
        completedAt: null,
        timeSpentSeconds: Math.min(afterAck.timeSpentSeconds, lesson.estimatedMinutes * 60),
      },
    });
  }

  await prisma.enrollment.updateMany({
    where: { userId: session.user.id, courseId: course.id },
    data: { lastActivityAt: now },
  });

  await syncEnrollmentAndCertificateFromLessonProgress(session.user.id, course.id);

  revalidatePath(`/portal/courses/${course.slug}`);
  revalidatePath(
    `/portal/courses/${course.slug}/modules/${courseModule.slug}/lessons/${lesson.slug}`,
  );
  revalidatePath("/portal");
  revalidatePath("/portal/reports");
  revalidatePath("/portal/certificates");
  revalidatePath(`/portal/paths/ai-agent-mastery`);

  return { ok: true as const };
}

export async function setLessonCompletion(opts: {
  courseSlug: string;
  moduleSlug: string;
  lessonSlug: string;
  completed: boolean;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" as const };
  }

  const course = await prisma.course.findUnique({
    where: { slug: opts.courseSlug },
  });
  if (!course) {
    return { error: "Course not found" as const };
  }

  try {
    await assertCourseContentAccess(session.user.id, course);
  } catch {
    return { error: "Access denied" as const };
  }

  const courseModule = await prisma.module.findFirst({
    where: {
      courseId: course.id,
      slug: opts.moduleSlug,
      archivedAt: null,
    },
  });
  if (!courseModule) {
    return { error: "Module not found" as const };
  }

  const lesson = await prisma.lesson.findFirst({
    where: {
      moduleId: courseModule.id,
      slug: opts.lessonSlug,
      archivedAt: null,
    },
  });
  if (!lesson) {
    return { error: "Lesson not found" as const };
  }

  const now = new Date();

  const existing = await prisma.lessonProgress.findUnique({
    where: {
      userId_lessonId: { userId: session.user.id, lessonId: lesson.id },
    },
  });

  if (opts.completed) {
    const ok = canMarkLessonComplete(lesson, existing);
    if (!ok) {
      return { error: "Acknowledgements required" as const };
    }
  }

  const targetSeconds = opts.completed
    ? Math.max(existing?.timeSpentSeconds ?? 0, lesson.estimatedMinutes * 60)
    : existing?.timeSpentSeconds ?? 0;

  await prisma.lessonProgress.upsert({
    where: {
      userId_lessonId: { userId: session.user.id, lessonId: lesson.id },
    },
    create: {
      userId: session.user.id,
      lessonId: lesson.id,
      completedAt: opts.completed ? now : null,
      lastActivityAt: now,
      timeSpentSeconds: opts.completed ? lesson.estimatedMinutes * 60 : 0,
    },
    update: {
      completedAt: opts.completed ? now : null,
      lastActivityAt: now,
      timeSpentSeconds: targetSeconds,
      ...(opts.completed
        ? {}
        : {
            exerciseAcknowledgedAt: null,
            checkpointAcknowledgedAt: null,
          }),
    },
  });

  await prisma.enrollment.updateMany({
    where: { userId: session.user.id, courseId: course.id },
    data: { lastActivityAt: now },
  });

  await syncEnrollmentAndCertificateFromLessonProgress(session.user.id, course.id);

  const { lessons } = await getCourseLessonMetricsForUser(session.user.id, course.id);
  const stats = lessonLevelStats(lessons);

  revalidatePath(`/portal/courses/${course.slug}`);
  revalidatePath(
    `/portal/courses/${course.slug}/modules/${courseModule.slug}/lessons/${lesson.slug}`,
  );
  revalidatePath("/portal");
  revalidatePath("/portal/reports");
  revalidatePath("/portal/certificates");
  revalidatePath(`/portal/paths/ai-agent-mastery`);

  return { ok: true as const, coursePercent: stats.percent };
}
