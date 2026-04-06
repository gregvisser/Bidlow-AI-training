/**
 * Verifies launch curriculum structure, learner resolution paths, and completion persistence.
 *
 * Env:
 *   DATABASE_URL
 *   CURRICULUM_VERIFY_EMAIL — learner email (default: learner@aitraining.local)
 */
import "dotenv/config";
import { disconnectDb, prisma } from "../src/lib/db";
import { getPublicLearningTracks } from "../src/lib/queries/tracks";
import { LAUNCH_CATALOG_SOURCE } from "../src/lib/curriculum/launch-catalog-data";

const EXPECT_TRACK_SLUGS = [
  "track-microsoft-azure-ai",
  "track-hugging-face",
  "track-cursor",
] as const;

const LAUNCH_COURSE_SLUGS = [
  "azure-ai-foundations",
  "microsoft-foundry-foundations",
  "azure-ai-agents",
  "llm-foundations-hugging-face",
  "ai-agents-hugging-face",
  "cursor-fundamentals-ai-builders",
  "cursor-planning-guardrails",
  "advanced-cursor-delivery",
] as const;

const SAMPLE_COURSE = "azure-ai-foundations";
const SAMPLE_LESSON = "what-ai-is-business";
const SAMPLE_MODULE = "core";

async function main() {
  const verifyEmail =
    process.env.CURRICULUM_VERIFY_EMAIL?.trim() || "learner@aitraining.local";

  const launchPaths = await prisma.learningPath.findMany({
    where: {
      slug: { in: [...EXPECT_TRACK_SLUGS] },
      catalogSource: LAUNCH_CATALOG_SOURCE,
      isPublic: true,
    },
    orderBy: { sortOrder: "asc" },
  });
  if (launchPaths.length !== EXPECT_TRACK_SLUGS.length) {
    throw new Error(
      `Expected ${EXPECT_TRACK_SLUGS.length} public launch tracks (catalogSource=${LAUNCH_CATALOG_SOURCE}), found ${launchPaths.length}`,
    );
  }

  const launchCourseCount = await prisma.course.count({
    where: {
      slug: { in: [...LAUNCH_COURSE_SLUGS] },
      catalogSource: LAUNCH_CATALOG_SOURCE,
    },
  });
  if (launchCourseCount !== LAUNCH_COURSE_SLUGS.length) {
    throw new Error(
      `Expected ${LAUNCH_COURSE_SLUGS.length} launch courses, found ${launchCourseCount}`,
    );
  }

  const linkCount = await prisma.lessonResourceLink.count({
    where: { catalogSource: LAUNCH_CATALOG_SOURCE },
  });
  if (linkCount < 1) {
    throw new Error("Expected at least one launch-tagged LessonResourceLink");
  }

  const lesson = await prisma.lesson.findFirst({
    where: {
      slug: SAMPLE_LESSON,
      catalogSource: LAUNCH_CATALOG_SOURCE,
      module: {
        slug: SAMPLE_MODULE,
        course: { slug: SAMPLE_COURSE },
      },
    },
    include: { resourceLinks: { orderBy: { sortOrder: "asc" } } },
  });
  if (!lesson) {
    throw new Error(`Sample lesson ${SAMPLE_COURSE}/${SAMPLE_MODULE}/${SAMPLE_LESSON} not found`);
  }
  if (lesson.resourceLinks.length < 1) {
    throw new Error("Sample lesson should have resource links");
  }

  const tracks = await getPublicLearningTracks();
  const resolved = tracks.find((t) => t.slug === "track-microsoft-azure-ai");
  if (!resolved?.courses?.length) {
    throw new Error(
      "getPublicLearningTracks should resolve the Microsoft/Azure launch track with courses",
    );
  }

  const user = await prisma.user.findUnique({ where: { email: verifyEmail } });
  if (!user) {
    throw new Error(`Verify user not found: ${verifyEmail}`);
  }

  const enrollment = await prisma.enrollment.findFirst({
    where: {
      userId: user.id,
      course: { slug: SAMPLE_COURSE },
    },
  });
  if (!enrollment) {
    throw new Error(
      `User ${verifyEmail} should be enrolled in ${SAMPLE_COURSE} (run seed or curriculum:sync with CURRICULUM_ENROLL_EMAIL)`,
    );
  }

  await prisma.lessonProgress.deleteMany({
    where: { userId: user.id, lessonId: lesson.id },
  });
  await prisma.lessonProgress.create({
    data: {
      userId: user.id,
      lessonId: lesson.id,
      completedAt: new Date(),
      timeSpentSeconds: lesson.estimatedMinutes * 60,
    },
  });

  const reread = await prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId: user.id, lessonId: lesson.id } },
  });
  if (!reread?.completedAt) {
    throw new Error("Lesson completion did not persist");
  }

  const lines = [
    "",
    "=== curriculum:verify PASS ===",
    `  Launch tracks (public, ${LAUNCH_CATALOG_SOURCE}): ${launchPaths.length} — ${EXPECT_TRACK_SLUGS.join(", ")}`,
    `  Launch courses: ${launchCourseCount}`,
    `  Launch-tagged resource links: ${linkCount}`,
    `  Sample lesson: ${SAMPLE_COURSE} / ${SAMPLE_MODULE} / ${SAMPLE_LESSON} (${lesson.resourceLinks.length} links)`,
    `  Learner query: getPublicLearningTracks includes track-microsoft-azure-ai with courses`,
    `  Completion persistence: user ${verifyEmail} — write + read OK`,
    "==============================",
    "",
  ];
  console.log(lines.join("\n"));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectDb();
  });
