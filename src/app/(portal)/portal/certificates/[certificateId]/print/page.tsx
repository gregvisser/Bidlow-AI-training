import { notFound, redirect } from "next/navigation";
import { CertificatePrintActions } from "@/components/portal/certificate-print-actions";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export default async function CertificatePrintPage({
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
    include: { course: { select: { title: true, slug: true } } },
  });

  if (!cert) {
    notFound();
  }

  return (
    <div className="certificate-print-root min-h-screen bg-[#0a0a14] p-8 text-[var(--foreground)] print:bg-white print:p-12 print:text-black">
      <div className="mx-auto max-w-3xl border border-white/15 bg-[#0f1020]/90 p-10 shadow-2xl print:border-slate-300 print:bg-white print:shadow-none">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)] print:text-slate-600">
          Certificate of completion
        </p>
        <h1 className="mt-6 text-center font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight print:text-slate-900">
          {cert.title}
        </h1>
        <p className="mt-3 text-center text-sm text-[var(--muted-foreground)] print:text-slate-600">
          {cert.course.title}
        </p>
        <p className="mt-8 text-center text-sm text-[var(--muted-foreground)] print:text-slate-600">
          Presented to
        </p>
        <p className="mt-2 text-center text-xl font-semibold print:text-slate-900">{session.user.name}</p>
        <dl className="mx-auto mt-10 max-w-md space-y-3 border-t border-white/10 pt-8 text-sm print:border-slate-200">
          <div className="flex justify-between gap-6">
            <dt className="text-[var(--muted-foreground)] print:text-slate-600">Issued</dt>
            <dd className="tabular-nums text-[var(--foreground)] print:text-slate-900">
              {cert.issuedAt
                ? cert.issuedAt.toLocaleDateString(undefined, { dateStyle: "long" })
                : "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-6">
            <dt className="text-[var(--muted-foreground)] print:text-slate-600">Credential id</dt>
            <dd className="break-all font-mono text-xs text-[var(--foreground)] print:text-slate-900">
              {cert.id}
            </dd>
          </div>
        </dl>
      </div>
      <CertificatePrintActions />
    </div>
  );
}
