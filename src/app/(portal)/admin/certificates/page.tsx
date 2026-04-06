import Link from "next/link";
import { PortalHeader } from "@/components/portal/portal-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAdminCertificates } from "@/lib/queries/admin-certificates";
import { Download, Search } from "lucide-react";

export default async function AdminCertificatesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const rows = await getAdminCertificates(q || undefined);

  const exportHref = `/api/admin/certificates/export${q ? `?q=${encodeURIComponent(q)}` : ""}`;

  return (
    <>
      <PortalHeader title="Certificates" />
      <div className="flex-1 space-y-6 overflow-auto p-6">
        <p className="text-sm text-[var(--muted-foreground)]">
          Audit certificate records: unlock/issue state, learner, course, and enrollment completion fields.
        </p>

        <form method="get" className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <label htmlFor="q" className="mb-1 block text-xs text-[var(--muted-foreground)]">
              Search learner or course
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]"
                aria-hidden
              />
              <Input
                id="q"
                name="q"
                type="search"
                defaultValue={q}
                placeholder="Email, name, or course title"
                className="pl-9"
                autoComplete="off"
              />
            </div>
          </div>
          <Button type="submit" variant="secondary">
            Search
          </Button>
          {q ? (
            <Button type="button" variant="ghost" asChild>
              <Link href="/admin/certificates">Clear</Link>
            </Button>
          ) : null}
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm tabular-nums text-[var(--muted-foreground)]">
            {rows.length} record{rows.length === 1 ? "" : "s"}
          </p>
          <Button asChild variant="outline" size="sm">
            <a href={exportHref}>
              <Download className="mr-2 h-4 w-4" aria-hidden />
              Export CSV
            </a>
          </Button>
        </div>

        <div className="glass-panel overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.08] text-[var(--muted-foreground)]">
                <th className="px-4 py-3 font-medium">Learner</th>
                <th className="px-4 py-3 font-medium">Course</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Course completed</th>
                <th className="px-4 py-3 font-medium">Issued</th>
                <th className="px-4 py-3 font-medium">Lessons</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-[var(--muted-foreground)]">
                    No certificate rows match.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-white/[0.04]">
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-[var(--foreground)]">{r.learnerName ?? "—"}</div>
                      <div className="text-xs text-[var(--muted-foreground)]">{r.learnerEmail}</div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div>{r.courseTitle}</div>
                      <div className="text-xs text-[var(--muted-foreground)]">
                        {r.certificateEligible ? "Certificate-eligible" : "Not certificate-eligible"}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      {r.active ? (
                        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-100/90">
                          Issued
                        </span>
                      ) : (
                        <span className="rounded-full border border-white/15 bg-white/[0.04] px-2 py-0.5 text-xs text-[var(--muted-foreground)]">
                          Not issued
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top tabular-nums text-[var(--muted-foreground)]">
                      {r.courseCompletedAt
                        ? r.courseCompletedAt.toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-3 align-top tabular-nums text-[var(--muted-foreground)]">
                      {r.issuedAt
                        ? r.issuedAt.toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-3 align-top tabular-nums">
                      {r.lessonsCompletedCount}
                      <span className="text-[var(--muted-foreground)]"> done</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
