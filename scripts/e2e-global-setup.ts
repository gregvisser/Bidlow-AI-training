/**
 * Idempotent DB prep for certificate E2E: complete all Azure AI Foundations lessons for the
 * seeded learner and sync enrollment + certificate (same path as learner actions).
 *
 * Invoked by Playwright globalSetup via `npm run e2e:global-setup`.
 */
import "dotenv/config";

const url =
  process.env.E2E_DATABASE_URL?.trim() ||
  process.env.DATABASE_URL?.trim() ||
  "postgresql://postgres:postgres@127.0.0.1:5432/ai_training_portal";
process.env.DATABASE_URL = url;

async function main() {
  const { disconnectDb, prisma } = await import("../src/lib/db");
  const { syncEnrollmentAndCertificateFromLessonProgress } = await import(
    "../src/lib/progress/enrollment-completion"
  );

  try {
    const user = await prisma.user.findUnique({
      where: { email: "learner@aitraining.local" },
    });
    const course = await prisma.course.findUnique({
      where: { slug: "azure-ai-foundations" },
    });
    if (!user || !course) {
      console.warn("[e2e-global-setup] Skip: learner or course missing (run db:seed)");
      return;
    }

    const lessons = await prisma.lesson.findMany({
      where: { module: { courseId: course.id }, archivedAt: null },
    });

    const now = new Date();
    for (const lesson of lessons) {
      await prisma.lessonProgress.upsert({
        where: {
          userId_lessonId: { userId: user.id, lessonId: lesson.id },
        },
        create: {
          userId: user.id,
          lessonId: lesson.id,
          completedAt: now,
          lastActivityAt: now,
          timeSpentSeconds: lesson.estimatedMinutes * 60,
        },
        update: {
          completedAt: now,
          lastActivityAt: now,
          timeSpentSeconds: lesson.estimatedMinutes * 60,
        },
      });
    }

    await syncEnrollmentAndCertificateFromLessonProgress(user.id, course.id);
    console.log(
      `[e2e-global-setup] Synced Azure AI Foundations (${lessons.length} lessons) + enrollment/certificate.`,
    );
  } finally {
    await disconnectDb();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
