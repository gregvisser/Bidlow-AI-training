/**
 * Idempotent launch curriculum sync. Only creates/updates rows that are new, tagged
 * `launch_v1`, or (when claimLegacy) existing untagged rows whose slug is in the manifest.
 */
import type { PrismaClient } from "@/generated/prisma";
import { CourseStatus, EntitlementSource } from "@/generated/prisma";
import {
  LAUNCH_CATALOG_SOURCE,
  LAUNCH_COURSE_SLUGS,
  LAUNCH_PATH_SLUGS,
  TRACKS,
  type CourseDef,
} from "./launch-catalog-data";

export type SyncLaunchCatalogOptions = {
  /**
   * When true (default), existing rows with `catalogSource: null` and a manifest slug are
   * tagged `launch_v1` and updated. Set `CURRICULUM_CLAIM_LEGACY=false` to skip adoption.
   */
  claimLegacy: boolean;
  /** When set, upserts enrollments + manual entitlements for launch courses (e.g. local seed). */
  enrollLearnerUserId: string | null;
};

function canMutateCatalogRow(
  existing: { catalogSource: string | null } | null,
  slug: string,
  manifestSlugs: Set<string>,
  claimLegacy: boolean,
): "yes" | "skip" | "blocked" {
  if (!existing) return "yes";
  const { catalogSource } = existing;
  if (catalogSource === LAUNCH_CATALOG_SOURCE) return "yes";
  if (catalogSource !== null && catalogSource !== LAUNCH_CATALOG_SOURCE) return "blocked";
  if (!manifestSlugs.has(slug)) return "skip";
  return claimLegacy ? "yes" : "skip";
}

export async function syncLaunchCatalog(
  prisma: PrismaClient,
  options: SyncLaunchCatalogOptions,
): Promise<{ warnings: string[] }> {
  const warnings: string[] = [];
  const { claimLegacy, enrollLearnerUserId } = options;

  for (const track of TRACKS) {
    const pathExisting = await prisma.learningPath.findUnique({
      where: { slug: track.slug },
    });
    const pathDecision = canMutateCatalogRow(
      pathExisting,
      track.slug,
      LAUNCH_PATH_SLUGS,
      claimLegacy,
    );
    if (pathDecision === "blocked") {
      warnings.push(`Skip track ${track.slug}: catalogSource conflicts with launch_v1`);
      continue;
    }
    if (pathDecision === "skip") {
      warnings.push(
        `Skip track ${track.slug}: row exists without launch tag; set CURRICULUM_CLAIM_LEGACY=true to adopt`,
      );
      continue;
    }

    const path = await prisma.learningPath.upsert({
      where: { slug: track.slug },
      update: {
        title: track.title,
        description: track.description,
        durationWeeks: track.durationWeeks,
        sortOrder: track.sortOrder,
        badgeLabel: track.badgeLabel,
        difficulty: track.difficulty,
        isPublic: true,
        isFeatured: true,
        catalogSource: LAUNCH_CATALOG_SOURCE,
      },
      create: {
        slug: track.slug,
        title: track.title,
        description: track.description,
        durationWeeks: track.durationWeeks,
        sortOrder: track.sortOrder,
        badgeLabel: track.badgeLabel,
        difficulty: track.difficulty,
        isPublic: true,
        isFeatured: true,
        catalogSource: LAUNCH_CATALOG_SOURCE,
      },
    });

    let courseOrder = 0;
    for (const c of track.courses) {
      const courseExisting = await prisma.course.findUnique({ where: { slug: c.slug } });
      const courseDecision = canMutateCatalogRow(
        courseExisting,
        c.slug,
        LAUNCH_COURSE_SLUGS,
        claimLegacy,
      );
      if (courseDecision === "blocked") {
        warnings.push(`Skip course ${c.slug}: catalogSource conflicts with launch_v1`);
        continue;
      }
      if (courseDecision === "skip") {
        warnings.push(
          `Skip course ${c.slug}: exists without launch tag; set CURRICULUM_CLAIM_LEGACY=true to adopt`,
        );
        continue;
      }

      const course = await prisma.course.upsert({
        where: { slug: c.slug },
        update: {
          title: c.title,
          subtitle: c.subtitle,
          description: c.description,
          provider: c.provider,
          estimatedMinutes: c.estimatedMinutes,
          status: CourseStatus.PUBLISHED,
          isPublic: true,
          isFeatured: true,
          pricingModel: "included",
          catalogSource: LAUNCH_CATALOG_SOURCE,
        },
        create: {
          slug: c.slug,
          title: c.title,
          subtitle: c.subtitle,
          description: c.description,
          provider: c.provider,
          estimatedMinutes: c.estimatedMinutes,
          status: CourseStatus.PUBLISHED,
          isPublic: true,
          isFeatured: true,
          pricingModel: "included",
          catalogSource: LAUNCH_CATALOG_SOURCE,
        },
      });

      await prisma.learningPathCourse.upsert({
        where: {
          learningPathId_courseId: { learningPathId: path.id, courseId: course.id },
        },
        update: { sortOrder: courseOrder },
        create: {
          learningPathId: path.id,
          courseId: course.id,
          sortOrder: courseOrder,
        },
      });
      courseOrder += 1;

      await syncCourseModulesLessons(prisma, c, course.id, claimLegacy, warnings);

      if (enrollLearnerUserId) {
        await prisma.enrollment.upsert({
          where: { userId_courseId: { userId: enrollLearnerUserId, courseId: course.id } },
          update: {},
          create: {
            userId: enrollLearnerUserId,
            courseId: course.id,
            status: "active",
          },
        });
        const ent = await prisma.entitlement.findFirst({
          where: { userId: enrollLearnerUserId, courseId: course.id },
        });
        if (!ent) {
          await prisma.entitlement.create({
            data: {
              userId: enrollLearnerUserId,
              courseId: course.id,
              source: EntitlementSource.MANUAL_GRANT,
              active: true,
            },
          });
        }
      }
    }
  }

  return { warnings };
}

async function syncCourseModulesLessons(
  prisma: PrismaClient,
  c: CourseDef,
  courseId: string,
  claimLegacy: boolean,
  warnings: string[],
) {
  const modExisting = await prisma.module.findUnique({
    where: { courseId_slug: { courseId, slug: c.moduleSlug } },
  });
  const modManifest = new Set([c.moduleSlug]);
  const modDecision = canMutateCatalogRow(modExisting, c.moduleSlug, modManifest, claimLegacy);
  if (modDecision === "blocked") {
    warnings.push(`Skip module ${c.moduleSlug} on ${c.slug}`);
    return;
  }
  if (modDecision === "skip") {
    warnings.push(
      `Skip module ${c.moduleSlug}: not launch-tagged; set CURRICULUM_CLAIM_LEGACY=true to adopt`,
    );
    return;
  }

  const mod = await prisma.module.upsert({
    where: {
      courseId_slug: { courseId, slug: c.moduleSlug },
    },
    update: {
      title: c.moduleTitle,
      description: "Structured lessons with objectives, exercises, and official reference links.",
      sortOrder: 0,
      estimatedMinutes: c.estimatedMinutes,
      trackProvider: c.provider,
      catalogSource: LAUNCH_CATALOG_SOURCE,
    },
    create: {
      courseId,
      slug: c.moduleSlug,
      title: c.moduleTitle,
      description: "Structured lessons with objectives, exercises, and official reference links.",
      sortOrder: 0,
      estimatedMinutes: c.estimatedMinutes,
      trackProvider: c.provider,
      catalogSource: LAUNCH_CATALOG_SOURCE,
    },
  });

  const lessonSlugs = new Set(c.lessons.map((x) => x.slug));
  let li = 0;
  for (const L of c.lessons) {
    const lesExisting = await prisma.lesson.findUnique({
      where: { moduleId_slug: { moduleId: mod.id, slug: L.slug } },
    });
    const lesDecision = canMutateCatalogRow(lesExisting, L.slug, lessonSlugs, claimLegacy);
    if (lesDecision === "blocked") {
      warnings.push(`Skip lesson ${L.slug}: blocked`);
      li += 1;
      continue;
    }
    if (lesDecision === "skip") {
      warnings.push(
        `Skip lesson ${L.slug}: not launch-tagged; set CURRICULUM_CLAIM_LEGACY=true to adopt`,
      );
      li += 1;
      continue;
    }

    const lessonRow = await prisma.lesson.upsert({
      where: {
        moduleId_slug: { moduleId: mod.id, slug: L.slug },
      },
      update: {
        title: L.title,
        summary: L.summary,
        learningObjectives: L.objectives.join("\n"),
        exerciseTask: L.exercise,
        content: L.content,
        estimatedMinutes: L.estimatedMinutes,
        sortOrder: li,
        difficulty: "beginner",
        catalogSource: LAUNCH_CATALOG_SOURCE,
      },
      create: {
        moduleId: mod.id,
        slug: L.slug,
        title: L.title,
        summary: L.summary,
        learningObjectives: L.objectives.join("\n"),
        exerciseTask: L.exercise,
        content: L.content,
        estimatedMinutes: L.estimatedMinutes,
        sortOrder: li,
        difficulty: "beginner",
        catalogSource: LAUNCH_CATALOG_SOURCE,
      },
    });

    await prisma.lessonResourceLink.deleteMany({
      where: {
        lessonId: lessonRow.id,
        catalogSource: LAUNCH_CATALOG_SOURCE,
      },
    });

    let rk = 0;
    for (const link of L.links) {
      await prisma.lessonResourceLink.create({
        data: {
          lessonId: lessonRow.id,
          label: link.label,
          url: link.url,
          sourceProvider: link.provider,
          sortOrder: rk++,
          catalogSource: LAUNCH_CATALOG_SOURCE,
        },
      });
    }
    li += 1;
  }
}
