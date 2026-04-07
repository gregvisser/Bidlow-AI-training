/**
 * In-progress enrollment is "stale" when the learner has started (has activity or lesson progress)
 * but has had no touch for longer than this window. Aligned with Phase 1K admin/learner analytics.
 */
export const STALE_IN_PROGRESS_THRESHOLD_MS = 14 * 86_400_000;

export function enrollmentLastTouchAt(enrollment: {
  lastActivityAt: Date | null;
  enrolledAt: Date;
}): Date {
  return enrollment.lastActivityAt ?? enrollment.enrolledAt;
}

export function isStaleInProgressEnrollment(
  nowMs: number,
  enrollment: { lastActivityAt: Date | null; enrolledAt: Date },
): boolean {
  const lastMs = enrollmentLastTouchAt(enrollment).getTime();
  return nowMs - lastMs > STALE_IN_PROGRESS_THRESHOLD_MS;
}
