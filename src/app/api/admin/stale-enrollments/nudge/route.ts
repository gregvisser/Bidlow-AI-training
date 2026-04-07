import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getLearnerCourseProgressPercent } from "@/lib/queries/learner-course-percent";
import {
  countStaleSeatNudgesInWindow,
  findRecentNudgeForEnrollment,
  STALE_SEAT_NUDGE_ACTION,
  STALE_SEAT_NUDGE_ENTITY,
  STALE_SEAT_NUDGE_TEMPLATE_VERSION,
} from "@/lib/queries/admin-stale-seat-nudges";
import { enrollmentLastTouchAt, isStaleInProgressEnrollment } from "@/lib/stale-enrollment";
import { NextRequest, NextResponse } from "next/server";

const DAILY_CAP_PER_ACTOR = 25;
const DEDUPE_WINDOW_MS = 12 * 60 * 60 * 1000;

function baseUrl(): string {
  const v = process.env.APP_BASE_URL?.trim() || process.env.AUTH_URL?.trim();
  return v && /^https?:\/\//.test(v) ? v.replace(/\/$/, "") : "http://localhost:3000";
}

function buildMessage(args: { learnerName: string; courseTitle: string; courseUrl: string }) {
  const name = args.learnerName?.trim() || "there";
  return [
    `Hi ${name},`,
    "",
    `Quick nudge to pick back up “${args.courseTitle}”.`,
    `Your next step is waiting here: ${args.courseUrl}`,
    "",
    "If you got stuck, hit reply with the point you paused — happy to help.",
    "",
    "— Bidlow AI Training",
  ].join("\n");
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id || (role !== "ADMIN" && role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as { enrollmentId?: string } | null;
  const enrollmentId = body?.enrollmentId?.trim();
  if (!enrollmentId) {
    return NextResponse.json({ error: "Missing enrollmentId" }, { status: 400 });
  }

  const actorId = session.user.id;
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const count24h = await countStaleSeatNudgesInWindow({ actorId, since: dayAgo });
  if (count24h >= DAILY_CAP_PER_ACTOR) {
    return NextResponse.json(
      { error: "Daily cap reached", cap: DAILY_CAP_PER_ACTOR },
      { status: 429 },
    );
  }

  const recent = await findRecentNudgeForEnrollment({
    enrollmentId,
    since: new Date(now.getTime() - DEDUPE_WINDOW_MS),
  });
  if (recent) {
    return NextResponse.json(
      { error: "Recent nudge already logged", auditLogId: recent.id, createdAt: recent.createdAt },
      { status: 409 },
    );
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      user: { select: { id: true, email: true, name: true } },
      course: { select: { id: true, title: true, slug: true } },
    },
  });
  if (!enrollment) {
    return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
  }
  if (enrollment.courseCompletedAt) {
    return NextResponse.json({ error: "Enrollment already completed" }, { status: 400 });
  }
  const started = (enrollment.lessonsCompletedCount ?? 0) > 0 || enrollment.lastActivityAt != null;
  if (!started) {
    return NextResponse.json({ error: "Enrollment not started" }, { status: 400 });
  }
  if (
    !isStaleInProgressEnrollment(now.getTime(), {
      lastActivityAt: enrollment.lastActivityAt,
      enrolledAt: enrollment.enrolledAt,
    })
  ) {
    return NextResponse.json({ error: "Enrollment is not stale" }, { status: 400 });
  }

  const progressPercent =
    Math.round((await getLearnerCourseProgressPercent(enrollment.courseId, enrollment.userId)) * 10) /
    10;
  const lastTouchAt = enrollmentLastTouchAt(enrollment);
  const daysSinceLastActivity =
    Math.round(((now.getTime() - lastTouchAt.getTime()) / 86_400_000) * 10) / 10;

  const learnerEmail = enrollment.user.email ?? "";
  const learnerName = enrollment.user.name?.trim() || learnerEmail || enrollment.userId;
  const courseUrl = `${baseUrl()}/portal/courses/${enrollment.course.slug}`;
  const message = buildMessage({
    learnerName,
    courseTitle: enrollment.course.title,
    courseUrl,
  });

  const audit = await prisma.auditLog.create({
    data: {
      actorId,
      action: STALE_SEAT_NUDGE_ACTION,
      entity: STALE_SEAT_NUDGE_ENTITY,
      entityId: enrollment.id,
      metadata: {
        templateVersion: STALE_SEAT_NUDGE_TEMPLATE_VERSION,
        channel: "email",
        status: "intent_logged",
        learner: {
          userId: enrollment.userId,
          email: learnerEmail,
          name: learnerName,
        },
        course: {
          courseId: enrollment.courseId,
          title: enrollment.course.title,
          slug: enrollment.course.slug,
          url: courseUrl,
        },
        enrollment: {
          enrollmentId: enrollment.id,
          enrolledAt: enrollment.enrolledAt.toISOString(),
          lastTouchAt: lastTouchAt.toISOString(),
          lessonsCompletedCount: enrollment.lessonsCompletedCount,
          progressPercent,
          daysSinceLastActivity,
        },
        message,
      },
    },
  });

  const subject = `Quick nudge: ${enrollment.course.title}`;
  const mailto = `mailto:${encodeURIComponent(learnerEmail)}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(message)}`;

  return NextResponse.json({
    ok: true,
    auditLogId: audit.id,
    createdAt: audit.createdAt,
    templateVersion: STALE_SEAT_NUDGE_TEMPLATE_VERSION,
    learnerEmail,
    courseTitle: enrollment.course.title,
    courseUrl,
    mailto,
    message,
  });
}

