"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/db";
import type { ContentProvider, CourseStatus } from "@/generated/prisma";

const slugSchema = z
  .string()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug: lowercase letters, numbers, hyphens");

const courseCreateSchema = z.object({
  title: z.string().min(2).max(200),
  slug: slugSchema,
  subtitle: z.string().max(300).optional().nullable(),
  description: z.string().max(20000).optional().nullable(),
  provider: z.enum(["AZURE", "HUGGING_FACE", "CURSOR", "AWS_INACTIVE", "GCP_INACTIVE"]),
  estimatedMinutes: z.coerce.number().int().min(0),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  isPublic: z.coerce.boolean(),
  isFeatured: z.coerce.boolean(),
  pricingModel: z.enum(["included", "subscription", "one_time"]).optional(),
});

const moduleSchema = z.object({
  courseId: z.string(),
  title: z.string().min(1).max(200),
  slug: slugSchema,
  description: z.string().max(20000).optional().nullable(),
  weekNumber: z.coerce.number().int().min(1).max(52).optional().nullable(),
  estimatedMinutes: z.coerce.number().int().min(0),
  trackProvider: z
    .enum(["AZURE", "HUGGING_FACE", "CURSOR", "AWS_INACTIVE", "GCP_INACTIVE"])
    .optional()
    .nullable(),
});

const lessonSchema = z.object({
  moduleId: z.string(),
  title: z.string().min(1).max(200),
  slug: slugSchema,
  content: z.string().max(100000).optional().nullable(),
  resourceUrl: z.string().url().optional().nullable().or(z.literal("")),
  estimatedMinutes: z.coerce.number().int().min(1),
});

function pathsToRevalidate() {
  revalidatePath("/admin/courses");
  revalidatePath("/portal/courses");
  revalidatePath("/portal");
  revalidatePath("/portal/paths/ai-agent-mastery");
}

export async function createCourse(formData: FormData) {
  await requireAdmin();
  const raw = Object.fromEntries(formData.entries());
  const parsed = courseCreateSchema.safeParse({
    ...raw,
    isPublic: formData.get("isPublic") === "on",
    isFeatured: formData.get("isFeatured") === "on",
  });
  if (!parsed.success) {
    redirect("/admin/courses/new?error=validation");
  }
  const d = parsed.data;
  const created = await prisma.course.create({
    data: {
      title: d.title,
      slug: d.slug,
      subtitle: d.subtitle ?? undefined,
      description: d.description ?? undefined,
      provider: d.provider as ContentProvider,
      estimatedMinutes: d.estimatedMinutes,
      status: d.status as CourseStatus,
      isPublic: d.isPublic,
      isFeatured: d.isFeatured,
      pricingModel: d.pricingModel ?? "included",
    },
  });
  pathsToRevalidate();
  redirect(`/admin/courses/${created.id}/edit`);
}

export async function updateCourse(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) {
    redirect("/admin/courses?error=missing_id");
  }
  const parsed = courseCreateSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    subtitle: formData.get("subtitle") || null,
    description: formData.get("description") || null,
    provider: formData.get("provider"),
    estimatedMinutes: formData.get("estimatedMinutes"),
    status: formData.get("status"),
    isPublic: formData.get("isPublic") === "on",
    isFeatured: formData.get("isFeatured") === "on",
    pricingModel: formData.get("pricingModel") || "included",
  });
  if (!parsed.success) {
    redirect(`/admin/courses/${id}/edit?error=validation&ctx=course`);
  }
  const d = parsed.data;
  await prisma.course.update({
    where: { id },
    data: {
      title: d.title,
      slug: d.slug,
      subtitle: d.subtitle ?? undefined,
      description: d.description ?? undefined,
      provider: d.provider as ContentProvider,
      estimatedMinutes: d.estimatedMinutes,
      status: d.status as CourseStatus,
      isPublic: d.isPublic,
      isFeatured: d.isFeatured,
      pricingModel: d.pricingModel ?? "included",
    },
  });
  pathsToRevalidate();
  revalidatePath(`/admin/courses/${id}/edit`);
  redirect(`/admin/courses/${id}/edit?saved=1`);
}

export async function setCourseArchived(courseId: string, archived: boolean) {
  await requireAdmin();
  await prisma.course.update({
    where: { id: courseId },
    data: { status: archived ? "ARCHIVED" : "PUBLISHED" },
  });
  pathsToRevalidate();
  revalidatePath(`/admin/courses/${courseId}/edit`);
}

export async function createModuleAction(formData: FormData) {
  await requireAdmin();
  const raw = Object.fromEntries(formData.entries());
  const weekRaw = formData.get("weekNumber");
  const parsed = moduleSchema.safeParse({
    ...raw,
    weekNumber:
      weekRaw === "" || weekRaw === null
        ? null
        : Number(weekRaw),
    trackProvider: (() => {
      const t = formData.get("trackProvider");
      if (t === "" || t === null) return null;
      return t;
    })(),
  });
  if (!parsed.success) {
    const courseId = String(formData.get("courseId") ?? "");
    if (courseId) {
      redirect(`/admin/courses/${courseId}/edit?error=validation&ctx=module`);
    }
    redirect("/admin/courses?error=validation");
  }
  const d = parsed.data;
  const maxOrder = await prisma.module.aggregate({
    where: { courseId: d.courseId },
    _max: { sortOrder: true },
  });
  await prisma.module.create({
    data: {
      courseId: d.courseId,
      title: d.title,
      slug: d.slug,
      description: d.description ?? undefined,
      weekNumber: d.weekNumber ?? undefined,
      estimatedMinutes: d.estimatedMinutes,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      trackProvider: d.trackProvider ?? undefined,
    },
  });
  pathsToRevalidate();
  revalidatePath(`/admin/courses/${d.courseId}/edit`);
}

export async function updateModuleAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const courseIdFallback = String(formData.get("courseId") ?? "");
  if (!id) {
    if (courseIdFallback) {
      redirect(`/admin/courses/${courseIdFallback}/edit?error=validation&ctx=module`);
    }
    redirect("/admin/courses?error=missing_id");
  }
  const weekRaw = formData.get("weekNumber");
  const parsed = moduleSchema.partial().safeParse({
    courseId: formData.get("courseId"),
    title: formData.get("title"),
    slug: formData.get("slug"),
    description: formData.get("description") || null,
    weekNumber:
      weekRaw === "" || weekRaw === null ? null : Number(weekRaw),
    estimatedMinutes: formData.get("estimatedMinutes"),
    trackProvider: (() => {
      const t = formData.get("trackProvider");
      if (t === "" || t === null) return null;
      return t;
    })(),
  });
  if (!parsed.success) {
    const courseId = String(formData.get("courseId") ?? "");
    if (courseId) {
      redirect(`/admin/courses/${courseId}/edit?error=validation&ctx=module`);
    }
    redirect("/admin/courses?error=validation");
  }
  const d = parsed.data;
  await prisma.module.update({
    where: { id },
    data: {
      ...("title" in d && d.title !== undefined ? { title: d.title } : {}),
      ...("slug" in d && d.slug !== undefined ? { slug: d.slug } : {}),
      ...("description" in d ? { description: d.description } : {}),
      ...("weekNumber" in d ? { weekNumber: d.weekNumber } : {}),
      ...("estimatedMinutes" in d && d.estimatedMinutes !== undefined
        ? { estimatedMinutes: d.estimatedMinutes }
        : {}),
      ...("trackProvider" in d ? { trackProvider: d.trackProvider } : {}),
    },
  });
  pathsToRevalidate();
  const mod = await prisma.module.findUnique({ where: { id } });
  if (mod) revalidatePath(`/admin/courses/${mod.courseId}/edit`);
}

export async function setModuleArchived(moduleId: string, archived: boolean) {
  await requireAdmin();
  await prisma.module.update({
    where: { id: moduleId },
    data: { archivedAt: archived ? new Date() : null },
  });
  pathsToRevalidate();
  const mod = await prisma.module.findUnique({ where: { id: moduleId } });
  if (mod) revalidatePath(`/admin/courses/${mod.courseId}/edit`);
}

export async function reorderModules(courseId: string, orderedModuleIds: string[]) {
  await requireAdmin();
  const valid = await prisma.module.count({
    where: { courseId, id: { in: orderedModuleIds } },
  });
  if (valid !== orderedModuleIds.length) {
    throw new Error("Invalid module order");
  }
  await prisma.$transaction(
    orderedModuleIds.map((id, i) =>
      prisma.module.update({
        where: { id },
        data: { sortOrder: i },
      }),
    ),
  );
  pathsToRevalidate();
  revalidatePath(`/admin/courses/${courseId}/edit`);
}

export async function createLessonAction(formData: FormData) {
  await requireAdmin();
  const raw = Object.fromEntries(formData.entries());
  const parsed = lessonSchema.safeParse({
    ...raw,
    resourceUrl: raw.resourceUrl === "" ? null : raw.resourceUrl,
  });
  if (!parsed.success) {
    const moduleId = String(formData.get("moduleId") ?? "");
    const mod = moduleId
      ? await prisma.module.findUnique({ where: { id: moduleId }, select: { courseId: true } })
      : null;
    if (mod) {
      redirect(`/admin/courses/${mod.courseId}/edit?error=validation&ctx=lesson`);
    }
    redirect("/admin/courses?error=validation");
  }
  const d = parsed.data;
  const maxOrder = await prisma.lesson.aggregate({
    where: { moduleId: d.moduleId },
    _max: { sortOrder: true },
  });
  await prisma.lesson.create({
    data: {
      moduleId: d.moduleId,
      title: d.title,
      slug: d.slug,
      content: d.content ?? undefined,
      resourceUrl: d.resourceUrl || undefined,
      estimatedMinutes: d.estimatedMinutes,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  });
  pathsToRevalidate();
  const mod = await prisma.module.findUnique({ where: { id: d.moduleId } });
  if (mod) revalidatePath(`/admin/courses/${mod.courseId}/edit`);
}

export async function updateLessonAction(formData: FormData) {
  await requireAdmin();
  const raw = Object.fromEntries(formData.entries());
  const id = String(raw.id ?? "");
  const parsed = lessonSchema.partial().safeParse({
    ...raw,
    resourceUrl: raw.resourceUrl === "" ? null : raw.resourceUrl,
    id,
  });
  if (!parsed.success || !id) {
    const moduleId = String(formData.get("moduleId") ?? "");
    const mod = moduleId
      ? await prisma.module.findUnique({ where: { id: moduleId }, select: { courseId: true } })
      : null;
    if (mod) {
      redirect(`/admin/courses/${mod.courseId}/edit?error=validation&ctx=lesson`);
    }
    redirect("/admin/courses?error=validation");
  }
  const d = parsed.data;
  await prisma.lesson.update({
    where: { id },
    data: {
      ...("title" in d && d.title !== undefined ? { title: d.title } : {}),
      ...("slug" in d && d.slug !== undefined ? { slug: d.slug } : {}),
      ...("content" in d ? { content: d.content } : {}),
      ...("resourceUrl" in d ? { resourceUrl: d.resourceUrl || undefined } : {}),
      ...("estimatedMinutes" in d && d.estimatedMinutes !== undefined
        ? { estimatedMinutes: d.estimatedMinutes }
        : {}),
    },
  });
  pathsToRevalidate();
  const lesson = await prisma.lesson.findUnique({
    where: { id },
    include: { module: true },
  });
  if (lesson) revalidatePath(`/admin/courses/${lesson.module.courseId}/edit`);
}

export async function setLessonArchived(lessonId: string, archived: boolean) {
  await requireAdmin();
  await prisma.lesson.update({
    where: { id: lessonId },
    data: { archivedAt: archived ? new Date() : null },
  });
  pathsToRevalidate();
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: true },
  });
  if (lesson) revalidatePath(`/admin/courses/${lesson.module.courseId}/edit`);
}

export async function reorderLessons(moduleId: string, orderedLessonIds: string[]) {
  await requireAdmin();
  const valid = await prisma.lesson.count({
    where: { moduleId, id: { in: orderedLessonIds } },
  });
  if (valid !== orderedLessonIds.length) {
    throw new Error("Invalid lesson order");
  }
  await prisma.$transaction(
    orderedLessonIds.map((id, i) =>
      prisma.lesson.update({
        where: { id },
        data: { sortOrder: i },
      }),
    ),
  );
  pathsToRevalidate();
  const mod = await prisma.module.findUnique({ where: { id: moduleId } });
  if (mod) revalidatePath(`/admin/courses/${mod.courseId}/edit`);
}

export async function moveModule(courseId: string, moduleId: string, direction: "up" | "down") {
  await requireAdmin();
  const modules = await prisma.module.findMany({
    where: { courseId, archivedAt: null },
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });
  const ids = modules.map((m) => m.id);
  const idx = ids.indexOf(moduleId);
  if (idx < 0) return;
  const j = direction === "up" ? idx - 1 : idx + 1;
  if (j < 0 || j >= ids.length) return;
  const next = [...ids];
  const tmp = next[idx]!;
  next[idx] = next[j]!;
  next[j] = tmp;
  await reorderModules(courseId, next);
}

export async function moveLesson(
  courseId: string,
  moduleId: string,
  lessonId: string,
  direction: "up" | "down",
) {
  await requireAdmin();
  const lessons = await prisma.lesson.findMany({
    where: { moduleId, archivedAt: null },
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });
  const ids = lessons.map((l) => l.id);
  const idx = ids.indexOf(lessonId);
  if (idx < 0) return;
  const j = direction === "up" ? idx - 1 : idx + 1;
  if (j < 0 || j >= ids.length) return;
  const next = [...ids];
  const tmp = next[idx]!;
  next[idx] = next[j]!;
  next[j] = tmp;
  await reorderLessons(moduleId, next);
}

export async function toggleCourseArchiveForm(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("courseId"));
  const archived = formData.get("archived") === "true";
  await setCourseArchived(id, archived);
  revalidatePath(`/admin/courses/${id}/edit`);
}

export async function toggleModuleArchiveForm(formData: FormData) {
  await requireAdmin();
  const courseId = String(formData.get("courseId"));
  const moduleId = String(formData.get("moduleId"));
  const archived = formData.get("archived") === "true";
  await setModuleArchived(moduleId, archived);
  revalidatePath(`/admin/courses/${courseId}/edit`);
}

export async function toggleLessonArchiveForm(formData: FormData) {
  await requireAdmin();
  const courseId = String(formData.get("courseId"));
  const lessonId = String(formData.get("lessonId"));
  const archived = formData.get("archived") === "true";
  await setLessonArchived(lessonId, archived);
  revalidatePath(`/admin/courses/${courseId}/edit`);
}
