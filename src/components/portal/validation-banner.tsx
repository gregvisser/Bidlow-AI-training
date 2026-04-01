import { AlertCircle } from "lucide-react";
import { adminValidationHint } from "@/lib/form-errors";

export function ValidationBanner({
  error,
  ctx,
  title = "Couldn’t save",
  scope = "admin",
}: {
  error?: string | null;
  ctx?: string | null;
  title?: string;
  scope?: "admin" | "profile";
}) {
  if (error !== "validation" && error !== "missing_id") {
    return null;
  }
  const body =
    error === "missing_id"
      ? "Missing course identifier. Open the course from the admin list and try again."
      : scope === "profile"
        ? "Display name must be at least 2 characters. Headline and bio must stay within their limits."
        : adminValidationHint(ctx);
  return (
    <div
      className="mt-4 flex items-start gap-3 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
      role="alert"
    >
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" aria-hidden />
      <div>
        <p className="font-medium text-[var(--foreground)]">{title}</p>
        <p className="mt-1 text-rose-100/95">{body}</p>
      </div>
    </div>
  );
}
