/** Parse `YYYY-MM-DD` to UTC midnight (inclusive range start). */
export function parseUtcDateStart(s: string | undefined): Date | null {
  if (!s?.trim()) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  if (!Number.isFinite(y) || mo < 0 || mo > 11 || d < 1 || d > 31) return null;
  return new Date(Date.UTC(y, mo, d, 0, 0, 0, 0));
}

/** Parse `auditPage` URL param (1-based). Invalid values default to 1. */
export function parseAuditPage(s: string | undefined): number {
  const n = parseInt(String(s ?? "").trim(), 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

/** Parse `YYYY-MM-DD` to end of that UTC day (inclusive range end). */
export function parseUtcDateEnd(s: string | undefined): Date | null {
  if (!s?.trim()) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  if (!Number.isFinite(y) || mo < 0 || mo > 11 || d < 1 || d > 31) return null;
  return new Date(Date.UTC(y, mo, d, 23, 59, 59, 999));
}
