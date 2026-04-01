import Link from "next/link";
import { redirect } from "next/navigation";
import { PortalHeader } from "@/components/portal/portal-header";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Award } from "lucide-react";

export default async function CertificatesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const rows = await prisma.certificate.findMany({
    where: { userId: session.user.id },
    include: { course: { select: { title: true, slug: true } } },
    orderBy: { issuedAt: "desc" },
  });

  return (
    <>
      <PortalHeader title="Certificates" />
      <div className="flex-1 overflow-auto p-6">
        {rows.length === 0 ? (
          <div className="glass-panel rounded-2xl p-12 text-center">
            <Award className="mx-auto h-12 w-12 text-[var(--muted-foreground)]" aria-hidden />
            <p className="mt-4 text-[var(--muted-foreground)]">
              Complete all lessons in a course to unlock a certificate. Progress is evaluated from
              your database record—no simulated unlocks.
            </p>
            <Link
              href="/portal/courses"
              className="mt-6 inline-block text-sm font-medium text-[var(--accent)] hover:underline"
            >
              Go to courses
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {rows.map((c) => (
              <div key={c.id} className="glass-panel relative overflow-hidden rounded-2xl p-8">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#7c6cff]/15 to-transparent" />
                <div className="relative">
                  <p className="text-xs uppercase tracking-[0.25em] text-[var(--accent)]">Certificate</p>
                  <h2 className="mt-2 font-[family-name:var(--font-display)] text-xl font-semibold">
                    {c.title}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">{c.course.title}</p>
                  <dl className="mt-6 space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-[var(--muted-foreground)]">Unlocked</dt>
                      <dd>
                        {c.unlockedAt
                          ? c.unlockedAt.toLocaleString(undefined, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : "—"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-[var(--muted-foreground)]">Issued</dt>
                      <dd>
                        {c.issuedAt
                          ? c.issuedAt.toLocaleString(undefined, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : "—"}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                      href={`/portal/certificates/${c.id}/print`}
                      className="text-sm font-medium text-[var(--accent)] hover:underline"
                    >
                      View printable certificate
                    </Link>
                  </div>
                  <p className="mt-4 text-xs text-[var(--muted-foreground)]">
                    Eligibility is enforced when your course reaches 100% completion—stored in the database,
                    not simulated in the browser.
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
