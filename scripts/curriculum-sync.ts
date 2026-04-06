/**
 * Production-safe launch curriculum sync. Idempotent; does not wipe the database.
 *
 * Env:
 *   DATABASE_URL — required
 *   CURRICULUM_CLAIM_LEGACY — default true; set "false" to skip adopting untagged rows with manifest slugs
 *   CURRICULUM_ENROLL_EMAIL — optional; if set, enrolls that user + grants entitlements for launch courses
 */
import "dotenv/config";
import { disconnectDb, prisma } from "../src/lib/db";
import { syncLaunchCatalog } from "../src/lib/curriculum/sync-launch-catalog";

async function main() {
  const claimLegacy = process.env.CURRICULUM_CLAIM_LEGACY !== "false";
  const enrollEmail = process.env.CURRICULUM_ENROLL_EMAIL?.trim();
  let enrollLearnerUserId: string | null = null;
  if (enrollEmail) {
    const u = await prisma.user.findUnique({ where: { email: enrollEmail } });
    if (!u) {
      console.warn(
        `curriculum-sync: CURRICULUM_ENROLL_EMAIL=${enrollEmail} not found — skipping enrollment grants`,
      );
    } else {
      enrollLearnerUserId = u.id;
    }
  }

  const { warnings } = await syncLaunchCatalog(prisma, {
    claimLegacy,
    enrollLearnerUserId,
  });

  for (const w of warnings) {
    console.warn(w);
  }
  console.log("curriculum:sync OK", { claimLegacy, enrolled: Boolean(enrollLearnerUserId) });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectDb();
  });
