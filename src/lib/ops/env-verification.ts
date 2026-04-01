import { getAppBaseUrl } from "@/lib/billing/env";
import { isBlobStorageConfigured } from "@/lib/azure/blob-config";
import { getPayPalWebhookId, paypalConfigured } from "@/lib/billing/paypal-client";

export type CheckState = "ok" | "missing" | "weak" | "warning";

export type NamedCheck = {
  key: string;
  label: string;
  state: CheckState;
  detail: string;
};

function authSecretCheck(): NamedCheck {
  const v = process.env.AUTH_SECRET?.trim();
  if (!v) {
    return {
      key: "auth_secret",
      label: "Auth secret",
      state: "missing",
      detail: "AUTH_SECRET is not set (required for sessions).",
    };
  }
  if (v.length < 32) {
    return {
      key: "auth_secret",
      label: "Auth secret",
      state: "weak",
      detail: "AUTH_SECRET should be at least 32 characters.",
    };
  }
  return {
    key: "auth_secret",
    label: "Auth secret",
    state: "ok",
    detail: "Present (length not shown).",
  };
}

function databaseUrlCheck(): NamedCheck {
  const v = process.env.DATABASE_URL?.trim();
  if (!v) {
    return {
      key: "database_url",
      label: "Database URL",
      state: "missing",
      detail: "DATABASE_URL is not set.",
    };
  }
  if (!v.startsWith("postgresql:") && !v.startsWith("postgres:")) {
    return {
      key: "database_url",
      label: "Database URL",
      state: "weak",
      detail: "Set but does not look like a PostgreSQL URL (prefix not shown).",
    };
  }
  return {
    key: "database_url",
    label: "Database URL",
    state: "ok",
    detail: "Configured (connection string hidden).",
  };
}

function stripeChecks(): NamedCheck[] {
  const secret = !!process.env.STRIPE_SECRET_KEY?.trim();
  const webhook = !!process.env.STRIPE_WEBHOOK_SECRET?.trim();
  return [
    {
      key: "stripe_secret",
      label: "Stripe secret key",
      state: secret ? "ok" : "missing",
      detail: secret ? "Configured (value hidden)." : "STRIPE_SECRET_KEY not set — card checkout disabled.",
    },
    {
      key: "stripe_webhook_secret",
      label: "Stripe webhook signing secret",
      state: webhook ? "ok" : "missing",
      detail: webhook
        ? "Configured (value hidden)."
        : "STRIPE_WEBHOOK_SECRET not set — webhooks cannot be verified.",
    },
  ];
}

function paypalChecks(): NamedCheck[] {
  const client = !!process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID?.trim();
  const secret = !!process.env.PAYPAL_CLIENT_SECRET?.trim();
  const webhookId = !!getPayPalWebhookId();
  const sdkOk = paypalConfigured();
  return [
    {
      key: "paypal_client",
      label: "PayPal client + server credentials",
      state: sdkOk ? "ok" : client && secret ? "weak" : "missing",
      detail: sdkOk
        ? "Client id and server secret present (values hidden)."
        : "Set NEXT_PUBLIC_PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET for PayPal flows.",
    },
    {
      key: "paypal_webhook_id",
      label: "PayPal webhook id",
      state: webhookId ? "ok" : "missing",
      detail: webhookId
        ? "PAYPAL_WEBHOOK_ID present (value hidden)."
        : "Not set — PayPal webhook endpoint will return 503.",
    },
  ];
}

function blobCheck(): NamedCheck {
  const ok = isBlobStorageConfigured();
  return {
    key: "blob_storage",
    label: "Azure Blob storage",
    state: ok ? "ok" : "missing",
    detail: ok
      ? "Connection string or account name+key present (secrets hidden)."
      : "Hero image uploads disabled until Azure storage env is set.",
  };
}

function urlChecks(): NamedCheck[] {
  const base = getAppBaseUrl();
  const hasExplicit = !!(process.env.APP_BASE_URL?.trim() || process.env.AUTH_URL?.trim());
  const https = base.startsWith("https://");
  return [
    {
      key: "app_base_url",
      label: "Public app base URL",
      state: base.includes("localhost") ? "warning" : https ? "ok" : "warning",
      detail: hasExplicit
        ? "APP_BASE_URL or AUTH_URL is set (hostname/path not printed)."
        : "Derived from AUTH_URL / NEXTAUTH_URL / localhost default — set APP_BASE_URL for production.",
    },
    {
      key: "https_public",
      label: "HTTPS for public URL",
      state: https ? "ok" : "warning",
      detail: https
        ? "Base URL uses https:// — appropriate for production."
        : "Base URL is not https:// — use HTTPS and set APP_BASE_URL / AUTH_URL in production.",
    },
  ];
}

function optionalMonitoring(): NamedCheck {
  const ai = !!process.env.APPLICATIONINSIGHTS_CONNECTION_STRING?.trim();
  return {
    key: "app_insights",
    label: "Application Insights (optional)",
    state: ai ? "ok" : "warning",
    detail: ai
      ? "APPLICATIONINSIGHTS_CONNECTION_STRING present (value hidden)."
      : "Not set — use Azure portal or other APM for production telemetry.",
  };
}

/**
 * Safe, non-secret configuration snapshot for operators.
 */
export function getEnvironmentVerification(): {
  checks: NamedCheck[];
  summary: { ok: number; issues: number };
} {
  const checks: NamedCheck[] = [
    authSecretCheck(),
    databaseUrlCheck(),
    ...stripeChecks(),
    ...paypalChecks(),
    blobCheck(),
    ...urlChecks(),
    optionalMonitoring(),
  ];

  const issues = checks.filter((c) => c.state !== "ok").length;
  const ok = checks.filter((c) => c.state === "ok").length;

  return {
    checks,
    summary: { ok, issues },
  };
}
