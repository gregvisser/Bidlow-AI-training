import { auth } from "@/auth";
import { getAdminReportStats } from "@/lib/queries/admin-reports";
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

  const stats = await getAdminReportStats();

  const summaryHeader = ["metric", "value"];
  const summaryRows: [string, string | number][] = [
    ["total_learners", stats.totalLearners],
    ["active_learners_30d", stats.activeLearners],
    ["enrollments", stats.enrollments],
    ["lesson_completions_total", stats.lessonCompletionTotal],
    ["hours_consumed", stats.totalHoursConsumed],
    ["completed_enrollments", stats.completedEnrollments],
    ["in_progress_enrollments", stats.inProgressEnrollments],
    ["certificate_eligible_completed", stats.certificateEligibleCompleted],
    ["certificates_unlocked", stats.certificatesUnlocked],
    ["certificates_issued", stats.certificatesIssued],
    ["overall_enrollment_finish_rate_pct", stats.overallEnrollmentCompletionRate],
    ["funnel_enrolled", stats.funnelEnrolled],
    ["funnel_not_started", stats.funnelNotStarted],
    ["funnel_started", stats.funnelStarted],
    ["funnel_in_progress", stats.funnelInProgress],
    ["funnel_completed", stats.funnelCompleted],
    [
      "avg_days_to_complete_all",
      stats.avgDaysToCompleteAll != null ? stats.avgDaysToCompleteAll : "",
    ],
    ["cohort_30d_enrolled", stats.cohort30dEnrolled],
    ["cohort_30d_completed", stats.cohort30dCompleted],
    ["cohort_30d_finish_rate_pct", stats.cohort30dFinishRate],
    ["stale_in_progress_enrollments", stats.staleInProgressEnrollmentCount],
    [
      "certificate_issuance_rate_pct",
      stats.certificateIssuanceRatePct != null ? stats.certificateIssuanceRatePct : "",
    ],
  ];

  const courseHeader = [
    "course_title",
    "course_slug",
    "enrollments",
    "course_completions",
    "enrollment_finish_rate_pct",
    "avg_days_to_complete",
    "stale_in_progress_on_course",
    "avg_completion_pct",
    "lesson_completions",
    "lesson_count",
  ];

  const lines = [
    "# completion-analytics export",
    summaryHeader.join(","),
    ...summaryRows.map(([k, v]) => [csvEscape(k), csvEscape(v)].join(",")),
    "",
    courseHeader.join(","),
    ...stats.courseStats.map((c) =>
      [
        csvEscape(c.title),
        csvEscape(c.slug),
        c.enrollmentCount,
        c.completedEnrollmentCount,
        c.completionRatePct,
        c.avgDaysToComplete != null ? c.avgDaysToComplete : "",
        c.staleInProgressOnCourse,
        c.avgCompletion,
        c.lessonCompletions,
        c.lessonCount,
      ].join(","),
    ),
  ];

  const body = "\uFEFF" + lines.join("\r\n");

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="completion-analytics.csv"',
    },
  });
}
