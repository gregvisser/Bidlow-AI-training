import Link from "next/link";
import type { LearningOutcomeType } from "@/generated/prisma";
import { learningOutcomeDescription, learningOutcomeShortLabel } from "@/lib/learning-outcomes";

type Props = {
  outcomeType: LearningOutcomeType;
  outcomeSummary: string | null;
  providerCertificationUrl?: string | null;
  providerCertificationMapping?: string | null;
  /** e.g. "Track" | "Course" */
  contextLabel: string;
  /** Optional test id for e2e */
  testId?: string;
  compact?: boolean;
};

export function LearningOutcomeBlock({
  outcomeType,
  outcomeSummary,
  providerCertificationUrl,
  providerCertificationMapping,
  contextLabel,
  testId,
  compact,
}: Props) {
  const badge = learningOutcomeShortLabel[outcomeType];
  const explainer = learningOutcomeDescription[outcomeType];

  return (
    <div
      data-testid={testId}
      className={
        compact
          ? "rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3"
          : "rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-4"
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          {contextLabel} outcome
        </span>
        <span className="rounded-full border border-[var(--accent)]/35 bg-[var(--accent)]/10 px-2.5 py-0.5 text-[11px] font-medium text-[var(--accent)]">
          {badge}
        </span>
      </div>
      {outcomeSummary ? (
        <p className="mt-2 text-sm leading-relaxed text-[var(--foreground)]">{outcomeSummary}</p>
      ) : (
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">{explainer}</p>
      )}
      {providerCertificationMapping ? (
        <p className="mt-3 text-xs leading-relaxed text-[var(--muted-foreground)]">
          {providerCertificationMapping}
        </p>
      ) : null}
      {providerCertificationUrl ? (
        <p className="mt-2">
          <Link
            href={providerCertificationUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-[var(--accent)] underline-offset-4 hover:underline"
          >
            Provider credential &amp; docs reference
          </Link>
        </p>
      ) : null}
    </div>
  );
}
