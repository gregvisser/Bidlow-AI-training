import { prisma } from "@/lib/db";

export type AdjacentLesson = {
  href: string | null;
  label: string | null;
};

/**
 * Previous / next lesson within the same course (non-archived content only).
 */
export async function getAdjacentLessons(
  courseSlug: string,
  moduleSlug: string,
  lessonSlug: string,
): Promise<{ prev: AdjacentLesson; next: AdjacentLesson }> {
  const course = await prisma.course.findUnique({
    where: { slug: courseSlug },
    include: {
      modules: {
        where: { archivedAt: null },
        orderBy: { sortOrder: "asc" },
        include: {
          lessons: {
            where: { archivedAt: null },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  });

  if (!course) {
    return {
      prev: { href: null, label: null },
      next: { href: null, label: null },
    };
  }

  type Entry = { moduleSlug: string; lessonSlug: string; title: string };
  const flat: Entry[] = [];
  for (const mod of course.modules) {
    for (const les of mod.lessons) {
      flat.push({ moduleSlug: mod.slug, lessonSlug: les.slug, title: les.title });
    }
  }

  const idx = flat.findIndex((e) => e.moduleSlug === moduleSlug && e.lessonSlug === lessonSlug);
  if (idx < 0) {
    return {
      prev: { href: null, label: null },
      next: { href: null, label: null },
    };
  }

  const base = `/portal/courses/${courseSlug}/modules`;
  const prevEntry = idx > 0 ? flat[idx - 1]! : null;
  const nextEntry = idx < flat.length - 1 ? flat[idx + 1]! : null;

  return {
    prev: prevEntry
      ? {
          href: `${base}/${prevEntry.moduleSlug}/lessons/${prevEntry.lessonSlug}`,
          label: prevEntry.title,
        }
      : { href: null, label: null },
    next: nextEntry
      ? {
          href: `${base}/${nextEntry.moduleSlug}/lessons/${nextEntry.lessonSlug}`,
          label: nextEntry.title,
        }
      : { href: null, label: null },
  };
}
