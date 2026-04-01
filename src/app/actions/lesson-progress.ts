"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { assertCourseContentAccess } from "@/lib/access";
import { ensureCertificateForCompletedCourse } from "@/lib/certificates";
import { prisma } from "@/lib/db";
import { lessonLevelStats } from "@/lib/progress/compute";
import type { LessonMetric } from "@/lib/progress/compute";

async function loadCourseLessonMetrics(
  userId: string,
  courseId: string,
): Promise<{ title: string; lessons: LessonMetric[] }> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      modules: {
        where: { archivedAt: null },
        orderBy: { sortOrder: "asc" },
        include: {
          lessons: {
            where: { archivedAt: null },
            orderBy: { sortOrder: "asc" },
            include: {
              progress: {
                where: { userId },
              },
            },
          },
        },
      },
    },
  });

  if (!course) {
    throw new Error("Course not found");
  }

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

  return { title: course.title, lessons };
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
    },
  });

  await prisma.enrollment.updateMany({
    where: { userId: session.user.id, courseId: course.id },
    data: { lastActivityAt: now },
  });

  const { title, lessons } = await loadCourseLessonMetrics(session.user.id, course.id);
  await ensureCertificateForCompletedCourse(session.user.id, course.id, title, lessons);

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
