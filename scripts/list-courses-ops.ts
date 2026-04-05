/**
 * Operator-only: list courses (slug, title, status, pricingModel) — no PII, no secrets.
 */
import "dotenv/config";
import { disconnectDb, prisma } from "../src/lib/db";

async function main() {
  const courses = await prisma.course.findMany({
    orderBy: { title: "asc" },
    select: {
      slug: true,
      title: true,
      status: true,
      pricingModel: true,
      isPublic: true,
    },
  });

  if (courses.length === 0) {
    console.log("list-courses-ops: no courses in database.");
  } else {
    console.log("slug\ttitle\tstatus\tpricingModel\tisPublic");
    for (const c of courses) {
      console.log(
        `${c.slug}\t${c.title}\t${c.status}\t${c.pricingModel ?? "null"}\t${c.isPublic}`,
      );
    }
  }

  await disconnectDb();
}

main().catch((e: unknown) => {
  console.error("list-courses-ops: FAILED");
  console.error(e instanceof Error ? e.message : String(e));
  process.exitCode = 1;
});
