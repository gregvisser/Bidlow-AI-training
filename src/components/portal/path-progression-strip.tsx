import Link from "next/link";
import { ArrowRight, Flag, ListOrdered, Play } from "lucide-react";
import type { PathProgressionVm } from "@/lib/path-progression";

export function PathProgressionStrip({ p }: { p: PathProgressionVm }) {
  return (
    <div
      className="grid gap-3 md:grid-cols-3"
      data-testid="path-progression-strip"
    >
      <div className="rounded-xl border border-white/[0.08] bg-[#070714]/50 px-4 py-3">
        <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          <Flag className="h-3.5 w-3.5 text-[var(--accent)]" aria-hidden />
          Start here
        </p>
        <p className="mt-1 text-sm font-medium text-[var(--foreground)] line-clamp-2">{p.startTitle}</p>
        <Link
          href={p.startHref}
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] underline-offset-4 hover:underline"
        >
          Open first lesson
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-[#070714]/50 px-4 py-3">
        <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          <Play className="h-3.5 w-3.5 text-[var(--accent)]" aria-hidden />
          Continue
        </p>
        {p.pathComplete ? (
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Path complete — nice work.</p>
        ) : p.resumeHref && p.resumeLabel ? (
          <>
            <p className="mt-1 text-sm font-medium text-[var(--foreground)] line-clamp-2">{p.resumeLabel}</p>
            <Link
              href={p.resumeHref}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] underline-offset-4 hover:underline"
            >
              Resume
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </>
        ) : (
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Open the first lesson to begin.</p>
        )}
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-[#070714]/50 px-4 py-3">
        <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          <ListOrdered className="h-3.5 w-3.5 text-[var(--accent)]" aria-hidden />
          Next in path
        </p>
        {p.nextCourseTitle && p.nextCourseHref ? (
          <>
            <p className="mt-1 text-sm font-medium text-[var(--foreground)] line-clamp-2">{p.nextCourseTitle}</p>
            <Link
              href={p.nextCourseHref}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] underline-offset-4 hover:underline"
            >
              View course
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </>
        ) : (
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {p.pathComplete ? "You finished every course in this path." : "Shown when another course follows your current one."}
          </p>
        )}
      </div>
    </div>
  );
}
