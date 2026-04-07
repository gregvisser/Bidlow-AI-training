import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { STALE_SEAT_NUDGE_ACTION, STALE_SEAT_NUDGE_ENTITY } from "@/lib/queries/admin-stale-seat-nudges";
import type { StaleSeatNudgeOutcome } from "@/lib/stale-seat-nudge-types";
import { NextRequest, NextResponse } from "next/server";

const OUTCOMES = new Set<StaleSeatNudgeOutcome>(["sent", "not_sent", "bounced"]);

export async function POST(req: NextRequest) {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id || (role !== "ADMIN" && role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as
    | { auditLogId?: string; outcome?: string }
    | null;
  const auditLogId = body?.auditLogId?.trim();
  const outcomeRaw = body?.outcome?.trim();
  if (!auditLogId || !outcomeRaw) {
    return NextResponse.json({ error: "Missing auditLogId or outcome" }, { status: 400 });
  }
  if (!OUTCOMES.has(outcomeRaw as StaleSeatNudgeOutcome)) {
    return NextResponse.json({ error: "Invalid outcome" }, { status: 400 });
  }
  const outcome = outcomeRaw as StaleSeatNudgeOutcome;

  const row = await prisma.auditLog.findUnique({ where: { id: auditLogId } });
  if (!row) {
    return NextResponse.json({ error: "Audit row not found" }, { status: 404 });
  }
  if (row.action !== STALE_SEAT_NUDGE_ACTION || row.entity !== STALE_SEAT_NUDGE_ENTITY) {
    return NextResponse.json({ error: "Not a stale-seat nudge record" }, { status: 400 });
  }

  const md =
    row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? { ...(row.metadata as Record<string, unknown>) }
      : {};

  if (typeof md["outcome"] === "string" && md["outcome"].trim()) {
    return NextResponse.json(
      { error: "Outcome already recorded", existingOutcome: md["outcome"] },
      { status: 409 },
    );
  }

  const recordedAt = new Date().toISOString();
  const actorId = session.user.id;

  const nextMetadata = {
    ...md,
    status: "outcome_recorded",
    outcome,
    outcomeRecordedAt: recordedAt,
    outcomeRecordedBy: actorId,
  };

  const updated = await prisma.auditLog.update({
    where: { id: auditLogId },
    data: { metadata: nextMetadata },
  });

  return NextResponse.json({
    ok: true,
    auditLogId: updated.id,
    outcome,
    outcomeRecordedAt: recordedAt,
    outcomeRecordedBy: actorId,
  });
}
