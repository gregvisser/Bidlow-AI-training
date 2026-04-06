"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/db";

const slugSchema = z
  .string()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug: lowercase letters, numbers, hyphens");

const pathSchema = z.object({
  title: z.string().min(2).max(200),
  slug: slugSchema,
  description: z.string().max(20000).optional().nullable(),
  durationWeeks: z.coerce.number().int().min(1).max(104),
  sortOrder: z.coerce.number().int().min(0),
  badgeLabel: z.string().max(120).optional().nullable(),
  difficulty: z.string().max(40).optional().nullable(),
});

function revalidateAllPaths() {
  revalidatePath("/admin/paths");
  revalidatePath("/portal/tracks");
  revalidatePath("/portal");
  revalidatePath("/portal/paths/ai-agent-mastery");
}

export async function createLearningPathAction(formData: FormData) {
  await requireAdmin();
  const parsed = pathSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    description: formData.get("description") || null,
    durationWeeks: formData.get("durationWeeks"),
    sortOrder: formData.get("sortOrder"),
    badgeLabel: formData.get("badgeLabel") || null,
    difficulty: formData.get("difficulty") || null,
  });
  if (!parsed.success) {
    redirect("/admin/paths/new?error=validation");
  }
  const d = parsed.data;
  const created = await prisma.learningPath.create({
    data: {
      title: d.title,
      slug: d.slug,
      description: d.description ?? undefined,
      durationWeeks: d.durationWeeks,
      sortOrder: d.sortOrder,
      badgeLabel: d.badgeLabel ?? undefined,
      difficulty: d.difficulty ?? undefined,
      isPublic: formData.get("isPublic") === "on",
      isFeatured: formData.get("isFeatured") === "on",
    },
  });
  revalidateAllPaths();
  redirect(`/admin/paths/${created.id}/edit`);
}

export async function updateLearningPathAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/paths?error=missing_id");
  const parsed = pathSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    description: formData.get("description") || null,
    durationWeeks: formData.get("durationWeeks"),
    sortOrder: formData.get("sortOrder"),
    badgeLabel: formData.get("badgeLabel") || null,
    difficulty: formData.get("difficulty") || null,
  });
  if (!parsed.success) {
    redirect(`/admin/paths/${id}/edit?error=validation`);
  }
  const d = parsed.data;
  await prisma.learningPath.update({
    where: { id },
    data: {
      title: d.title,
      slug: d.slug,
      description: d.description ?? undefined,
      durationWeeks: d.durationWeeks,
      sortOrder: d.sortOrder,
      badgeLabel: d.badgeLabel ?? undefined,
      difficulty: d.difficulty ?? undefined,
      isPublic: formData.get("isPublic") === "on",
      isFeatured: formData.get("isFeatured") === "on",
    },
  });
  revalidateAllPaths();
  redirect(`/admin/paths/${id}/edit?saved=1`);
}

export async function addCourseToPathAction(formData: FormData) {
  await requireAdmin();
  const pathId = String(formData.get("learningPathId") ?? "");
  const courseId = String(formData.get("courseId") ?? "");
  const weekRaw = formData.get("weekNumber");
  if (!pathId || !courseId) {
    redirect("/admin/paths?error=missing");
  }
  const maxOrder = await prisma.learningPathCourse.aggregate({
    where: { learningPathId: pathId },
    _max: { sortOrder: true },
  });
  await prisma.learningPathCourse.upsert({
    where: {
      learningPathId_courseId: { learningPathId: pathId, courseId },
    },
    update: {},
    create: {
      learningPathId: pathId,
      courseId,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      weekNumber:
        weekRaw === "" || weekRaw === null ? null : Number(weekRaw),
    },
  });
  revalidateAllPaths();
  revalidatePath("/admin/courses");
  redirect(`/admin/paths/${pathId}/edit`);
}

export async function removeCourseFromPathAction(formData: FormData) {
  await requireAdmin();
  const pathId = String(formData.get("learningPathId") ?? "");
  const linkId = String(formData.get("linkId") ?? "");
  if (!pathId || !linkId) redirect("/admin/paths?error=missing");
  await prisma.learningPathCourse.delete({ where: { id: linkId } });
  revalidateAllPaths();
  redirect(`/admin/paths/${pathId}/edit`);
}

export async function reorderPathCoursesAction(pathId: string, orderedLinkIds: string[]) {
  await requireAdmin();
  const valid = await prisma.learningPathCourse.count({
    where: { learningPathId: pathId, id: { in: orderedLinkIds } },
  });
  if (valid !== orderedLinkIds.length) {
    throw new Error("Invalid path course order");
  }
  await prisma.$transaction(
    orderedLinkIds.map((linkId, i) =>
      prisma.learningPathCourse.update({
        where: { id: linkId },
        data: { sortOrder: i },
      }),
    ),
  );
  revalidateAllPaths();
  revalidatePath(`/admin/paths/${pathId}/edit`);
}

export async function movePathCourse(pathId: string, linkId: string, direction: "up" | "down") {
  await requireAdmin();
  const rows = await prisma.learningPathCourse.findMany({
    where: { learningPathId: pathId },
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });
  const ids = rows.map((r) => r.id);
  const idx = ids.indexOf(linkId);
  if (idx < 0) return;
  const j = direction === "up" ? idx - 1 : idx + 1;
  if (j < 0 || j >= ids.length) return;
  const next = [...ids];
  const tmp = next[idx]!;
  next[idx] = next[j]!;
  next[j] = tmp;
  await reorderPathCoursesAction(pathId, next);
}

export async function movePathCourseForm(formData: FormData) {
  await requireAdmin();
  const pathId = String(formData.get("pathId") ?? "");
  const linkId = String(formData.get("linkId") ?? "");
  const direction = formData.get("direction") === "up" ? "up" : "down";
  if (!pathId || !linkId) {
    redirect("/admin/paths?error=missing");
  }
  await movePathCourse(pathId, linkId, direction);
  redirect(`/admin/paths/${pathId}/edit`);
}
