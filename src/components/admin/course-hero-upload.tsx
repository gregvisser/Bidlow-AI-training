"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CourseHeroUpload({
  courseId,
  currentUrl,
  storageConfigured,
}: {
  courseId: string;
  currentUrl: string | null;
  storageConfigured: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!storageConfigured) {
    return (
      <p className="text-sm text-[var(--muted-foreground)]">
        Configure Azure Blob Storage (see <code className="rounded bg-white/5 px-1">.env.example</code>) to
        enable uploads.
      </p>
    );
  }

  const maxBytes = 5 * 1024 * 1024;

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setErr(null);
    if (f.size > maxBytes) {
      setErr("File is too large. Maximum size is 5 MB.");
      return;
    }
    const okType = ["image/jpeg", "image/png", "image/webp"].includes(f.type);
    if (!okType) {
      setErr("Use JPEG, PNG, or WebP only.");
      return;
    }
    setBusy(true);
    const fd = new FormData();
    fd.append("file", f);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/hero-image`, {
        method: "POST",
        body: fd,
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErr(j.error ?? "Upload failed");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/hero-image`, { method: "DELETE" });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErr(j.error ?? "Remove failed");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {currentUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- admin preview of user-uploaded blob URL
        <img
          src={currentUrl}
          alt=""
          className="max-h-44 max-w-full rounded-xl border border-white/10 object-cover"
        />
      ) : (
        <p className="text-sm text-[var(--muted-foreground)]">No hero image yet.</p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <label className="cursor-pointer rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm hover:bg-white/[0.07]">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={busy}
            onChange={onFile}
          />
          {busy ? "Uploading…" : "Upload / replace"}
        </label>
        {currentUrl ? (
          <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={remove}>
            Remove
          </Button>
        ) : null}
      </div>
      {err ? <p className="text-xs text-amber-200/95">{err}</p> : null}
      <p className="text-xs text-[var(--muted-foreground)]">
        JPEG, PNG, or WebP · max 5 MB · stored in Azure Blob Storage.
      </p>
    </div>
  );
}
