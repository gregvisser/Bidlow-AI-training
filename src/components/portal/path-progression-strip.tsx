import Link from "next/link";
import { ArrowRight, Flag, ListOrdered, Play } from "lucide-react";
import type { PathProgressionVm } from "@/lib/path-progression";

export function PathProgressionStrip({ p }: { p: PathProgressionVm }) {
  return (
    <div
      className="grid gap-3 md:grid-cols-3"
      data-testid="path-progression-strip"
    >
      <div
        className="rounded-xl border border-white/[0.08] bg-[#070714]/50 px-4 py-3"
        data-testid="path-progression-start"
      >
        <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          <Flag className="h-3.5 w-3.5 text-[var(--accent)]" aria-hidden />
          Where to start
        </p>
        <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">First lesson in this path</p>
        <p className="mt-1 text-sm font-medium text-[var(--foreground)] line-clamp-2">{p.startTitle}</p>
        <Link
          href={p.startHref}
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] underline-offset-4 hover:underline"
        >
          Open first lesson
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      <div
        className="rounded-xl border border-white/[0.08] bg-[#070714]/50 px-4 py-3"
        data-testid="path-progression-continue"
      >
        <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          <Play className="h-3.5 w-3.5 text-[var(--accent)]" aria-hidden />
          Continue
        </p>
        <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">Pick up where you left off</p>
        {p.pathComplete ? (
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Every lesson in this path is complete. Nice work.
          </p>
        ) : p.resumeHref && p.resumeLabel ? (
          <>
            <p className="mt-1 text-sm font-medium text-[var(--foreground)] line-clamp-2">{p.resumeLabel}</p>
            <Link
              href={p.resumeHref}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] underline-offset-4 hover:underline"
            >
              Continue lesson
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </>
        ) : (
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Open the first lesson above to begin.</p>
        )}
      </div>

      <div
        className="rounded-xl border border-white/[0.08] bg-[#070714]/50 px-4 py-3"
        data-testid="path-progression-next"
      >
        <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          <ListOrdered className="h-3.5 w-3.5 text-[var(--accent)]" aria-hidden />
          Next in path
        </p>
        <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
          {p.pathComplete
            ? "When you’re done"
            : p.inLastIncompleteCourse
              ? "Final course in this path"
              : "The course after the one you’re in"}
        </p>
        {p.pathComplete && p.moreTracksHref ? (
          <>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">Explore another track or course.</p>
            <Link
              href={p.moreTracksHref}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] underline-offset-4 hover:underline"
            >
              Browse tracks
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </>
        ) : p.nextCourseTitle && p.nextCourseHref ? (
          <>
            <p className="mt-1 text-sm font-medium text-[var(--foreground)] line-clamp-2">{p.nextCourseTitle}</p>
            <Link
              href={p.nextCourseHref}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] underline-offset-4 hover:underline"
            >
              Open course overview
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </>
        ) : p.inLastIncompleteCourse ? (
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            You’re in the last course—finish its lessons to complete this path.
          </p>
        ) : (
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            The next course appears here when you still have a later course ahead.
          </p>
        )}
      </div>
    </div>
  );
}
