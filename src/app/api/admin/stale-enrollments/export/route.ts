import { auth } from "@/auth";
import {
  getStaleInProgressEnrollmentRows,
  STALE_ENROLLMENT_LIST_MAX,
} from "@/lib/queries/admin-stale-enrollments";
import { NextResponse } from "next/server";

function csvEscape(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id || (role !== "ADMIN" && role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await getStaleInProgressEnrollmentRows();

  const header = [
    "enrollment_id",
    "user_id",
    "learner_email",
    "learner_name",
    "course_title",
    "course_slug",
    "enrolled_at_utc",
    "last_activity_at_utc",
    "last_touch_at_utc",
    "lessons_completed_count",
    "progress_percent",
    "days_since_last_activity",
    "stale_rule_days",
  ];

  const lines = [
    "# stale-in-progress export — in-progress seats with no activity for 14+ days (same rule as Reports)",
    `# max_rows=${STALE_ENROLLMENT_LIST_MAX}`,
    header.join(","),
    ...rows.map((r) =>
      [
        csvEscape(r.enrollmentId),
        csvEscape(r.userId),
        csvEscape(r.learnerEmail),
        csvEscape(r.learnerName),
        csvEscape(r.courseTitle),
        csvEscape(r.courseSlug),
        r.enrolledAt.toISOString(),
        r.lastActivityAt?.toISOString() ?? "",
        r.lastTouchAt.toISOString(),
        r.lessonsCompletedCount,
        r.progressPercent,
        r.daysSinceLastActivity,
        14,
      ].join(","),
    ),
  ];

  const body = "\uFEFF" + lines.join("\r\n");

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="stale-in-progress-enrollments.csv"',
    },
  });
}
