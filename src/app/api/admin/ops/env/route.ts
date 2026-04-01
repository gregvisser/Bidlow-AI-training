import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getEnvironmentVerification } from "@/lib/ops/env-verification";

export const runtime = "nodejs";

/**
 * Admin-only JSON snapshot of environment readiness (no secret values).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(getEnvironmentVerification());
}
