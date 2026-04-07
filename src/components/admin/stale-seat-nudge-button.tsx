"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type NudgeResult =
  | {
      ok: true;
      auditLogId: string;
      createdAt: string;
      mailto: string;
      message: string;
    }
  | {
      ok?: false;
      error: string;
      auditLogId?: string;
      createdAt?: string;
      cap?: number;
      cooldownEndsAt?: string;
    };

function coerceError(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const e = (json as { error?: unknown }).error;
  return typeof e === "string" && e.trim() ? e : null;
}

function coerceCap(json: unknown): number | undefined {
  if (!json || typeof json !== "object") return undefined;
  const v = (json as { cap?: unknown }).cap;
  return typeof v === "number" ? v : undefined;
}

function coerceCooldownEndsAt(json: unknown): string | undefined {
  if (!json || typeof json !== "object") return undefined;
  const v = (json as { cooldownEndsAt?: unknown }).cooldownEndsAt;
  return typeof v === "string" && v.trim() ? v : undefined;
}

export function StaleSeatNudgeButton({
  enrollmentId,
  cooldownUntilIso,
}: {
  enrollmentId: string;
  /** Server-computed end of cooldown (ISO); when in the future, prepare is blocked in UI. */
  cooldownUntilIso?: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NudgeResult | null>(null);

  const inCooldown = useMemo(() => {
    if (!cooldownUntilIso) return false;
    const t = new Date(cooldownUntilIso).getTime();
    return Number.isFinite(t) && t > Date.now();
  }, [cooldownUntilIso]);

  const cooldownLabel = useMemo(() => {
    if (!cooldownUntilIso || !inCooldown) return null;
    const d = new Date(cooldownUntilIso);
    return Number.isNaN(d.getTime()) ? cooldownUntilIso : d.toLocaleString();
  }, [cooldownUntilIso, inCooldown]);

  const createdAtLabel = useMemo(() => {
    if (!result || !("createdAt" in result) || !result.createdAt) return null;
    const d = new Date(result.createdAt);
    return Number.isNaN(d.getTime()) ? result.createdAt : d.toLocaleString();
  }, [result]);

  return (
    <div className="min-w-[14rem]">
      {inCooldown ? (
        <p className="text-xs text-[var(--muted-foreground)]" data-testid="admin-stale-seat-nudge-cooldown">
          Cooldown until <span className="tabular-nums text-[var(--foreground)]">{cooldownLabel}</span>
        </p>
      ) : null}

      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-8 text-xs"
        disabled={loading || inCooldown}
        data-testid="admin-stale-seat-nudge"
        onClick={async () => {
          setLoading(true);
          setResult(null);
          try {
            const res = await fetch("/api/admin/stale-enrollments/nudge", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ enrollmentId }),
            });
            const json: unknown = await res.json().catch(() => ({}));
            if (!res.ok) {
              setResult({
                ok: false,
                error: coerceError(json) ?? "Request failed",
                cap: coerceCap(json),
                cooldownEndsAt: coerceCooldownEndsAt(json),
              });
            } else {
              setResult(json as NudgeResult);
              router.refresh();
            }
          } catch {
            setResult({ ok: false, error: "Network error" });
          } finally {
            setLoading(false);
          }
        }}
      >
        {loading ? "Preparing…" : "Prepare nudge"}
      </Button>

      {result ? (
        <div className="mt-2 rounded-lg border border-white/[0.08] bg-white/[0.02] p-3 text-xs">
          {"ok" in result && result.ok ? (
            <>
              <p className="text-[var(--muted-foreground)]">
                Logged nudge intent.{" "}
                <span className="tabular-nums text-[var(--foreground)]">#{result.auditLogId.slice(0, 8)}</span>
                {createdAtLabel ? (
                  <>
                    {" "}
                    · <span className="tabular-nums">{createdAtLabel}</span>
                  </>
                ) : null}
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                <a
                  href={result.mailto}
                  className="text-[var(--accent)] hover:underline"
                  data-testid="admin-stale-seat-nudge-mailto"
                >
                  Open email draft
                </a>
                <button
                  type="button"
                  className="text-[var(--accent)] hover:underline"
                  data-testid="admin-stale-seat-nudge-copy"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(result.message);
                    } catch {
                      /* ignore */
                    }
                  }}
                >
                  Copy message
                </button>
              </div>
            </>
          ) : (
            <p className="text-amber-200/90">
              {result.error}
              {result.cap ? ` (cap ${result.cap}/day)` : null}
              {result.cooldownEndsAt ? (
                <>
                  {" "}
                  · until{" "}
                  <span className="tabular-nums">
                    {new Date(result.cooldownEndsAt).toLocaleString()}
                  </span>
                </>
              ) : null}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
