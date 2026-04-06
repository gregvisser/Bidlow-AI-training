import { auth } from "@/auth";
import { buildCertificatePdf } from "@/lib/certificates/build-certificate-pdf";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function safeFilenamePart(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 60) || "course";
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ certificateId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { certificateId } = await context.params;

  const cert = await prisma.certificate.findFirst({
    where: { id: certificateId, userId: session.user.id },
    include: {
      course: { select: { title: true, slug: true, certificateEligible: true } },
    },
  });

  if (!cert) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: session.user.id, courseId: cert.courseId } },
  });

  const learnerName = session.user.name ?? session.user.email ?? "Learner";
  const learnerEmail = session.user.email ?? "";
  const active = !!(cert.unlockedAt && cert.issuedAt);

  const bytes = await buildCertificatePdf({
    certificateTitle: cert.title,
    courseTitle: cert.course.title,
    learnerName,
    learnerEmail,
    credentialId: cert.id,
    courseCompletedAt: enrollment?.courseCompletedAt ?? null,
    minutesCompletedEstimate: enrollment?.minutesCompletedEstimate ?? null,
    issuedAt: cert.issuedAt,
    active,
    certificateEligible: cert.course.certificateEligible,
  });

  const filename = `certificate-${safeFilenamePart(cert.course.slug)}-${certificateId.slice(0, 8)}.pdf`;

  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
