"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { StaleSeatNudgeOutcome } from "@/lib/stale-seat-nudge-types";

const OPTIONS: { value: StaleSeatNudgeOutcome; label: string }[] = [
  { value: "sent", label: "Sent" },
  { value: "not_sent", label: "Not sent" },
  { value: "bounced", label: "Bounced" },
];

export function StaleSeatNudgeOutcomeForm({ auditLogId }: { auditLogId: string }) {
  const router = useRouter();
  const [outcome, setOutcome] = useState<StaleSeatNudgeOutcome>("sent");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor={`outcome-${auditLogId}`}>
        Record nudge outcome
      </label>
      <select
        id={`outcome-${auditLogId}`}
        className="h-8 rounded-md border border-white/[0.12] bg-white/[0.04] px-2 text-xs text-[var(--foreground)]"
        value={outcome}
        onChange={(e) => setOutcome(e.target.value as StaleSeatNudgeOutcome)}
        data-testid="admin-stale-seat-nudge-outcome-select"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="h-8 text-xs"
        disabled={loading}
        data-testid="admin-stale-seat-nudge-outcome-save"
        onClick={async () => {
          setLoading(true);
          setError(null);
          try {
            const res = await fetch("/api/admin/stale-enrollments/nudge/outcome", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ auditLogId, outcome }),
            });
            const json: unknown = await res.json().catch(() => ({}));
            if (!res.ok) {
              const err =
                json && typeof json === "object" && "error" in json && typeof (json as { error: unknown }).error === "string"
                  ? (json as { error: string }).error
                  : "Save failed";
              setError(err);
              return;
            }
            router.refresh();
          } catch {
            setError("Network error");
          } finally {
            setLoading(false);
          }
        }}
      >
        {loading ? "Saving…" : "Record outcome"}
      </Button>
      {error ? <span className="text-xs text-amber-200/90">{error}</span> : null}
    </div>
  );
}
