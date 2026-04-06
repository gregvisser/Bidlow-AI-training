/**
 * Idempotent backfill: recompute Enrollment completion fields and Certificate unlock/issue state
 * from LessonProgress. Safe to run multiple times. Does not delete lesson progress or reset completion.
 *
 * Usage: tsx scripts/backfill-enrollment-completion.ts
 * Env: DATABASE_URL
 */
import "dotenv/config";
import { disconnectDb, prisma } from "../src/lib/db";
import { syncEnrollmentAndCertificateFromLessonProgress } from "../src/lib/progress/enrollment-completion";

async function main() {
  const enrollments = await prisma.enrollment.findMany({
    select: { userId: true, courseId: true },
  });

  let n = 0;
  for (const e of enrollments) {
    await syncEnrollmentAndCertificateFromLessonProgress(e.userId, e.courseId);
    n += 1;
  }

  console.log(`[backfill-enrollment-completion] Processed ${n} enrollment(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectDb();
  });
