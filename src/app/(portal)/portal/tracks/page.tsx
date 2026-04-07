import Link from "next/link";
import { redirect } from "next/navigation";
import { PortalHeader } from "@/components/portal/portal-header";
import { auth } from "@/auth";
import { getPublicLearningTracks } from "@/lib/queries/tracks";
import { learningOutcomeShortLabel } from "@/lib/learning-outcomes";
import { ArrowRight, Layers } from "lucide-react";

export default async function TracksCatalogPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const tracks = await getPublicLearningTracks();

  return (
    <>
      <PortalHeader title="Tracks" />
      <div className="flex-1 overflow-auto p-6">
        <div className="mb-8 max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--accent)]">
            Catalog
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold md:text-3xl">
            Learning tracks
          </h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Pick a track to see outcomes, your path order, and every lesson in one place. Progress syncs across
            courses you’re enrolled in.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2" data-testid="portal-tracks-catalog">
          {tracks.map((t) => (
            <Link
              key={t.id}
              data-testid={`track-card-${t.slug}`}
              href={`/portal/paths/${t.slug}`}
              className="group glass-panel block rounded-2xl p-8 transition hover:border-[var(--accent)]/35"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  {t.badgeLabel ? (
                    <span className="inline-block rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                      {t.badgeLabel}
                    </span>
                  ) : null}
                  <h2 className="mt-3 font-[family-name:var(--font-display)] text-xl font-semibold leading-snug group-hover:text-white">
                    {t.title}
                  </h2>
                  {t.description ? (
                    <p className="mt-2 line-clamp-3 text-sm text-[var(--muted-foreground)]">
                      {t.description}
                    </p>
                  ) : null}
                  <p className="mt-3 line-clamp-2 text-xs text-[var(--muted-foreground)]">
                    <span className="font-medium text-[var(--foreground)]">
                      {learningOutcomeShortLabel[t.outcomeType]}
                    </span>
                    {t.outcomeSummary ? (
                      <>
                        <span className="text-white/30" aria-hidden>
                          {" "}
                          ·{" "}
                        </span>
                        {t.outcomeSummary}
                      </>
                    ) : null}
                  </p>
                  <p className="mt-4 flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                    <Layers className="h-4 w-4 text-[var(--accent)]" aria-hidden />
                    {t.courses.length} course{t.courses.length === 1 ? "" : "s"} · {t.durationWeeks} week
                    {t.durationWeeks === 1 ? "" : "s"} planned
                    {t.difficulty ? ` · ${t.difficulty}` : ""}
                  </p>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[var(--accent)] transition group-hover:border-[var(--accent)]/40">
                  <ArrowRight className="h-5 w-5" aria-hidden />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
