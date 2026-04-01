/**
 * Structured operational logging (no secrets / full payloads).
 * Application Insights picks up console when configured via instrumentation.
 */
export const opsLog = {
  billingWebhook(provider: "STRIPE" | "PAYPAL", event: string, detail?: string) {
    console.warn(`[billing-webhook] ${provider} ${event}${detail ? ` ${detail}` : ""}`);
  },
  upload(kind: string, detail: string) {
    console.warn(`[upload] ${kind} ${detail}`);
  },
  error(scope: string, err: unknown) {
    console.error(`[${scope}]`, err instanceof Error ? err.message : err);
  },
};
