/**
 * Operator-only: one PUBLISHED course + one module + one lesson (controlled launch, billing off).
 * Idempotent: if the course slug already exists, skips creation.
 *
 * Env:
 *   DATABASE_URL
 *   OPS_MIN_COURSE_SLUG (optional, default core-launch-pilot)
 */
import "dotenv/config";
import { CourseStatus } from "../src/generated/prisma";
import { disconnectDb, prisma } from "../src/lib/db";

const DEFAULT_SLUG = "core-launch-pilot";

async function main() {
  const slug = process.env.OPS_MIN_COURSE_SLUG?.trim() || DEFAULT_SLUG;

  const existing = await prisma.course.findUnique({
    where: { slug },
    include: {
      modules: {
        include: { _count: { select: { lessons: true } } },
      },
    },
  });

  if (existing) {
    const modCount = existing.modules.length;
    const lessonCount = existing.modules.reduce((n, m) => n + m._count.lessons, 0);
    console.log(
      `create-minimum-production-course: OK — already exists slug="${slug}" modules=${modCount} lessons=${lessonCount} (skipped).`,
    );
    await disconnectDb();
    return;
  }

  await prisma.course.create({
    data: {
      slug,
      title: "Core Launch Pilot",
      subtitle: "Controlled core launch — minimum catalog for access verification",
      description: "Single-module pilot course. Self-serve billing is off.",
      status: CourseStatus.PUBLISHED,
      isPublic: false,
      pricingModel: "included",
      modules: {
        create: [
          {
            slug: "intro",
            title: "Introduction",
            sortOrder: 0,
            lessons: {
              create: [
                {
                  slug: "welcome",
                  title: "Welcome",
                  sortOrder: 0,
                  estimatedMinutes: 5,
                  content:
                    "This lesson exists so enrolled learners can open real portal routes. Billing remains off for this launch phase.",
                },
              ],
            },
          },
        ],
      },
    },
  });

  console.log(`create-minimum-production-course: OK — created slug="${slug}" with one module and one lesson.`);
  await disconnectDb();
}

main().catch((e: unknown) => {
  console.error("create-minimum-production-course: FAILED");
  console.error(e instanceof Error ? e.message : String(e));
  process.exitCode = 1;
});
