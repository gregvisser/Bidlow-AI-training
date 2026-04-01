import { isBlobStorageConfigured } from "@/lib/azure/blob-config";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  let database = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = true;
  } catch {
    database = false;
  }

  const blob = isBlobStorageConfigured() ? "configured" : "not_configured";

  const ready = database;
  return Response.json(
    {
      ready,
      checks: {
        database: database ? "up" : "down",
        blobStorage: blob,
      },
      timestamp: new Date().toISOString(),
    },
    { status: ready ? 200 : 503 },
  );
}
