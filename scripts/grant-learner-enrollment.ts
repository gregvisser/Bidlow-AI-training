/**
 * Operator-only: upsert Enrollment for a learner email + course slug.
 * Matches production access rules: enrollment is required; "included" courses need no entitlement.
 *
 * Env:
 *   DATABASE_URL (or .env)
 *   ENROLL_USER_EMAIL — learner email
 *   COURSE_SLUG — published course slug (e.g. from list-courses-ops output)
 */
import "dotenv/config";
import { z } from "zod";
import { CourseStatus } from "../src/generated/prisma";
import { disconnectDb, prisma } from "../src/lib/db";
import { canAccessCourseContent } from "../src/lib/billing/resolve-access";

const envSchema = z.object({
  ENROLL_USER_EMAIL: z.string().email(),
  COURSE_SLUG: z.string().min(1),
});

async function main() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("grant-learner-enrollment: set ENROLL_USER_EMAIL and COURSE_SLUG.");
    console.error(parsed.error.flatten().fieldErrors);
    process.exitCode = 1;
    return;
  }

  const { ENROLL_USER_EMAIL: email, COURSE_SLUG: courseSlug } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true },
  });
  if (!user) {
    console.error("grant-learner-enrollment: no user with that email. Run npm run ops:create-user first.");
    process.exitCode = 1;
    return;
  }

  const course = await prisma.course.findUnique({
    where: { slug: courseSlug },
  });
  if (!course) {
    console.error(`grant-learner-enrollment: no course with slug "${courseSlug}".`);
    process.exitCode = 1;
    return;
  }

  if (course.status !== CourseStatus.PUBLISHED) {
    console.error(
      `grant-learner-enrollment: course status is ${course.status}, not PUBLISHED — learner UI may not list it.`,
    );
    process.exitCode = 1;
    return;
  }

  await prisma.enrollment.upsert({
    where: {
      userId_courseId: { userId: user.id, courseId: course.id },
    },
    create: {
      userId: user.id,
      courseId: course.id,
      status: "active",
    },
    update: {
      status: "active",
    },
  });

  const canAccess = await canAccessCourseContent(user.id, {
    id: course.id,
    slug: course.slug,
    pricingModel: course.pricingModel,
  });

  console.log(
    `grant-learner-enrollment: OK — enrollment ensured for course slug="${courseSlug}". canAccessCourseContent=${canAccess}.`,
  );
  if (!canAccess) {
    console.error(
      "grant-learner-enrollment: content may still be locked — course is not 'included' or needs entitlement/subscription per resolve-access.ts.",
    );
    process.exitCode = 1;
  }

  await disconnectDb();
}

main().catch((e: unknown) => {
  console.error("grant-learner-enrollment: FAILED");
  console.error(e instanceof Error ? e.message : String(e));
  process.exitCode = 1;
});
