import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PortalHeader } from "@/components/portal/portal-header";
import { Button } from "@/components/ui/button";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Award, ArrowLeft, FileDown, Printer } from "lucide-react";

export default async function CertificateDetailPage({
  params,
}: {
  params: Promise<{ certificateId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { certificateId } = await params;
  const cert = await prisma.certificate.findFirst({
    where: { id: certificateId, userId: session.user.id },
    include: {
      course: {
        select: {
          title: true,
          slug: true,
          certificateEligible: true,
          estimatedMinutes: true,
        },
      },
    },
  });

  if (!cert) {
    notFound();
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: session.user.id, courseId: cert.courseId } },
  });

  const active = !!(cert.unlockedAt && cert.issuedAt);
  const learnerEmail = session.user.email ?? "—";
  const learnerName = session.user.name ?? session.user.email ?? "Learner";

  return (
    <>
      <PortalHeader title="Certificate" />
      <div className="flex-1 overflow-auto p-6">
        <Link
          href="/portal/certificates"
          className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          All certificates
        </Link>

        <div className="mt-8 glass-panel relative overflow-hidden rounded-2xl p-8 md:p-10">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#7c6cff]/12 via-transparent to-[#38bdf8]/10" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--accent)]">
              {active ? "Completion record" : "Course record"}
            </p>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight md:text-3xl">
              {cert.title}
            </h1>
            <p className="mt-2 text-[var(--muted-foreground)]">{cert.course.title}</p>

            <div className="mt-6 flex flex-wrap gap-2">
              {cert.course.certificateEligible ? (
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-100/90">
                  Certificate-eligible course
                </span>
              ) : (
                <span className="rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-xs text-[var(--muted-foreground)]">
                  Completion tracked · no certificate offered for this course
                </span>
              )}
              {!active && (
                <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-xs text-amber-100/90">
                  Not currently issued — complete the course or check eligibility
                </span>
              )}
            </div>

            <dl className="mt-10 grid gap-6 border-t border-white/[0.08] pt-8 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                  Learner
                </dt>
                <dd className="mt-1 text-sm font-medium text-[var(--foreground)]">{learnerName}</dd>
                <dd className="mt-0.5 text-sm text-[var(--muted-foreground)]">{learnerEmail}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                  Course completion
                </dt>
                <dd className="mt-1 text-sm text-[var(--foreground)]">
                  {enrollment?.courseCompletedAt
                    ? enrollment.courseCompletedAt.toLocaleString(undefined, {
                        dateStyle: "long",
                        timeStyle: "short",
                      })
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                  Lessons completed
                </dt>
                <dd className="mt-1 tabular-nums text-sm text-[var(--foreground)]">
                  {enrollment != null ? enrollment.lessonsCompletedCount : "—"}
                  <span className="text-[var(--muted-foreground)]"> recorded</span>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                  Estimated minutes completed
                </dt>
                <dd className="mt-1 tabular-nums text-sm text-[var(--foreground)]">
                  {enrollment != null ? enrollment.minutesCompletedEstimate : "—"}
                  <span className="text-[var(--muted-foreground)]"> min (catalog estimates)</span>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                  Unlocked
                </dt>
                <dd className="mt-1 text-sm text-[var(--foreground)]">
                  {cert.unlockedAt
                    ? cert.unlockedAt.toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                  Issued
                </dt>
                <dd className="mt-1 text-sm text-[var(--foreground)]">
                  {cert.issuedAt
                    ? cert.issuedAt.toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : "—"}
                </dd>
              </div>
            </dl>

            <div className="mt-10 flex flex-wrap gap-3 border-t border-white/[0.08] pt-8">
              <Button asChild>
                <a href={`/api/portal/certificates/${certificateId}/pdf`} download>
                  <FileDown className="mr-2 h-4 w-4" aria-hidden />
                  Download PDF
                </a>
              </Button>
              <Button asChild variant="secondary">
                <Link href={`/portal/certificates/${certificateId}/print`}>
                  <Printer className="mr-2 h-4 w-4" aria-hidden />
                  Printable view
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href={`/portal/courses/${cert.course.slug}`}>Open course</Link>
              </Button>
            </div>

            <p className="mt-8 text-xs text-[var(--muted-foreground)]">
              Credential id: <code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[11px]">{cert.id}</code>
            </p>
          </div>
        </div>

        {!active && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-sm text-[var(--muted-foreground)]">
            <Award className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent)]" aria-hidden />
            <p>
              A completion record appears here after all lessons are finished and the course allows certificates.
              Progress is read from your account—refresh the page after completing the last lesson if needed.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
