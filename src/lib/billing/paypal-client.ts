import { getAppBaseUrl } from "@/lib/billing/env";

function paypalApiBase(): string {
  return process.env.PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getPayPalAccessToken(): Promise<string> {
  const now = Date.now() / 1000;
  if (cachedToken && cachedToken.expiresAt > now + 60) {
    return cachedToken.token;
  }
  const id = process.env.PAYPAL_CLIENT_ID?.trim();
  const secret = process.env.PAYPAL_CLIENT_SECRET?.trim();
  if (!id || !secret) {
    throw new Error("PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are required for PayPal");
  }
  const auth = Buffer.from(`${id}:${secret}`).toString("base64");
  const res = await fetch(`${paypalApiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`PayPal token failed: ${res.status} ${t}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    token: json.access_token,
    expiresAt: now + json.expires_in,
  };
  return json.access_token;
}

export async function paypalFetch<T>(path: string, init: RequestInit): Promise<T> {
  const token = await getPayPalAccessToken();
  const res = await fetch(`${paypalApiBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`PayPal API ${path} failed: ${res.status} ${text}`);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

export type PayPalCreateOrderResponse = {
  id: string;
  status: string;
  links?: { href: string; rel: string; method: string }[];
};

export async function paypalCreateOrder(body: object): Promise<PayPalCreateOrderResponse> {
  return paypalFetch<PayPalCreateOrderResponse>("/v2/checkout/orders", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export type PayPalCaptureResponse = {
  id: string;
  status: string;
  purchase_units?: {
    payments?: { captures?: { id: string; status: string }[] };
  }[];
};

export async function paypalCaptureOrder(paypalOrderId: string): Promise<PayPalCaptureResponse> {
  return paypalFetch<PayPalCaptureResponse>(`/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export type PayPalBillingSubscriptionResponse = {
  id: string;
  status?: string;
  links?: { href: string; rel: string; method?: string }[];
};

export async function paypalCreateBillingSubscription(
  body: object,
): Promise<PayPalBillingSubscriptionResponse> {
  return paypalFetch<PayPalBillingSubscriptionResponse>("/v1/billing/subscriptions", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * PayPal webhook signature verification (POST /v1/notifications/verify-webhook-signature).
 */
export async function verifyPayPalWebhook(
  webhookId: string,
  headers: Headers,
  rawBody: string,
): Promise<boolean> {
  const transmissionId = headers.get("paypal-transmission-id");
  const transmissionTime = headers.get("paypal-transmission-time");
  const certUrl = headers.get("paypal-cert-url");
  const authAlgo = headers.get("paypal-auth-algo");
  const transmissionSig = headers.get("paypal-transmission-sig");
  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
    return false;
  }
  const token = await getPayPalAccessToken();
  const res = await fetch(`${paypalApiBase()}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transmission_id: transmissionId,
      transmission_time: transmissionTime,
      cert_url: certUrl,
      auth_algo: authAlgo,
      transmission_sig: transmissionSig,
      webhook_id: webhookId,
      webhook_event: JSON.parse(rawBody),
    }),
  });
  if (!res.ok) {
    return false;
  }
  const json = (await res.json()) as { verification_status?: string };
  return json.verification_status === "SUCCESS";
}

export function getPayPalWebhookId(): string | null {
  return process.env.PAYPAL_WEBHOOK_ID?.trim() ?? null;
}

export function getPayPalClientId(): string | null {
  return process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID?.trim() ?? null;
}

export function paypalConfigured(): boolean {
  return Boolean(
    process.env.PAYPAL_CLIENT_ID?.trim() &&
      process.env.PAYPAL_CLIENT_SECRET?.trim() &&
      process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID?.trim(),
  );
}

export function getWebhookBaseUrl(): string {
  return getAppBaseUrl();
}
