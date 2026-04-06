import Link from "next/link";
import { PortalHeader } from "@/components/portal/portal-header";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";

export default async function AdminPathsPage() {
  const paths = await prisma.learningPath.findMany({
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    include: {
      _count: { select: { courses: true } },
    },
  });

  return (
    <>
      <PortalHeader title="Tracks (paths)" />
      <div className="flex-1 space-y-8 overflow-auto p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-[var(--muted-foreground)]">
            Learning paths group published courses. Learners browse from{" "}
            <Link href="/portal/tracks" className="text-[var(--accent)] hover:underline">
              /portal/tracks
            </Link>
            .
          </p>
          <Button asChild>
            <Link href="/admin/paths/new">New track</Link>
          </Button>
        </div>

        <div className="space-y-3">
          {paths.map((p) => (
            <div
              key={p.id}
              className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-[#070714]/80 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-xs uppercase tracking-wider text-[var(--accent)]">
                  {p.isPublic ? "Public" : "Hidden"} · sort {p.sortOrder}
                  {p.badgeLabel ? ` · ${p.badgeLabel}` : ""}
                </p>
                <h2 className="mt-1 font-[family-name:var(--font-display)] text-lg font-semibold">
                  {p.title}
                </h2>
                <p className="text-sm text-[var(--muted-foreground)]">
                  /portal/paths/{p.slug} · {p._count.courses} course{p._count.courses === 1 ? "" : "s"}
                </p>
              </div>
              <Button asChild variant="secondary">
                <Link href={`/admin/paths/${p.id}/edit`}>Edit</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
