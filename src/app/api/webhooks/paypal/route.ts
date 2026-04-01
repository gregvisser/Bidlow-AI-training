import { recordPaymentEventIfNew } from "@/lib/billing/payment-events";
import { getPayPalWebhookId, verifyPayPalWebhook } from "@/lib/billing/paypal-client";
import { processPayPalWebhookPayload } from "@/lib/billing/paypal-sync";
import { getClientIp } from "@/lib/http/client-ip";
import { checkRateLimit } from "@/lib/http/rate-limit";

export const runtime = "nodejs";

type PayPalWebhookBody = {
  id: string;
  event_type: string;
  resource?: Record<string, unknown>;
};

export async function POST(req: Request) {
  const webhookId = getPayPalWebhookId();
  if (!webhookId) {
    return new Response("PayPal webhook not configured", { status: 503 });
  }

  const raw = await req.text();
  const ip = getClientIp(req);
  const rl = checkRateLimit(`wh:paypal:${ip}`, 1500, 60_000);
  if (!rl.ok) {
    return new Response("Too many requests", { status: 429 });
  }
  const ok = await verifyPayPalWebhook(webhookId, req.headers, raw);
  if (!ok) {
    return new Response("Invalid PayPal webhook signature", { status: 400 });
  }

  let body: PayPalWebhookBody;
  try {
    body = JSON.parse(raw) as PayPalWebhookBody;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const isNew = await recordPaymentEventIfNew("PAYPAL", body.id, body.event_type, body);
  if (!isNew) {
    return Response.json({ received: true, duplicate: true });
  }

  await processPayPalWebhookPayload({
    id: body.id,
    event_type: body.event_type,
    resource: (body.resource ?? {}) as Record<string, unknown>,
  });
  return Response.json({ received: true });
}
