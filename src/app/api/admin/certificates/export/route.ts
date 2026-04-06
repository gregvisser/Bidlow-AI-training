import { auth } from "@/auth";
import { getAdminCertificates } from "@/lib/queries/admin-certificates";
import { NextRequest, NextResponse } from "next/server";

function csvEscape(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id || (role !== "ADMIN" && role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const q = req.nextUrl.searchParams.get("q");
  const rows = await getAdminCertificates(q ?? undefined);

  const header = [
    "certificate_id",
    "learner_email",
    "learner_name",
    "course_title",
    "course_slug",
    "certificate_eligible",
    "status",
    "unlocked_at",
    "issued_at",
    "course_completed_at",
    "lessons_completed",
    "minutes_completed_estimate",
  ];

  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [
        csvEscape(r.id),
        csvEscape(r.learnerEmail),
        csvEscape(r.learnerName),
        csvEscape(r.courseTitle),
        csvEscape(r.courseSlug),
        r.certificateEligible ? "yes" : "no",
        r.active ? "issued" : "not_issued",
        r.unlockedAt?.toISOString() ?? "",
        r.issuedAt?.toISOString() ?? "",
        r.courseCompletedAt?.toISOString() ?? "",
        r.lessonsCompletedCount,
        r.minutesCompletedEstimate,
      ].join(","),
    ),
  ];

  const body = "\uFEFF" + lines.join("\r\n");

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="certificates-audit.csv"',
    },
  });
}
