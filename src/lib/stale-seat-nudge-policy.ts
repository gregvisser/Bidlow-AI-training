/**
 * Stale-seat nudge policy (Phase 1N).
 * Default: at most one prepared nudge per enrollment within 7 days.
 * Optional env override for CI / local E2E (minimum 60s to avoid accidents).
 */
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const MIN_OVERRIDE_MS = 60_000;

export function getStaleSeatNudgeCooldownMs(): number {
  const raw = process.env.STALE_SEAT_NUDGE_COOLDOWN_MS?.trim();
  if (!raw) return SEVEN_DAYS_MS;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return SEVEN_DAYS_MS;
  return Math.max(MIN_OVERRIDE_MS, n);
}
