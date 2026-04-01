import type Stripe from "stripe";
import { recordPaymentEventIfNew } from "@/lib/billing/payment-events";
import { processStripeEvent } from "@/lib/billing/stripe-sync";
import { getStripe } from "@/lib/billing/stripe-client";
import { getClientIp } from "@/lib/http/client-ip";
import { checkRateLimit } from "@/lib/http/rate-limit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!stripe || !webhookSecret) {
    return new Response("Stripe webhook not configured", { status: 503 });
  }

  const buf = await req.text();
  const ip = getClientIp(req);
  const rl = checkRateLimit(`wh:stripe:${ip}`, 2000, 60_000);
  if (!rl.ok) {
    return new Response("Too many requests", { status: 429 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return new Response("Missing stripe-signature", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const isNew = await recordPaymentEventIfNew("STRIPE", event.id, event.type, event);
  if (!isNew) {
    return Response.json({ received: true, duplicate: true });
  }

  await processStripeEvent(event);
  return Response.json({ received: true });
}
