import type Stripe from "stripe";
import type { SubscriptionStatus } from "@/generated/prisma";
import {
  deactivateEntitlementsForSubscription,
  markOrderPaidAndGrantEntitlements,
  markOrderRefunded,
} from "@/lib/billing/fulfillment";
import { requireStripe } from "@/lib/billing/stripe-client";
import { prisma } from "@/lib/db";

function stripeSubscriptionPeriodEnd(sub: Stripe.Subscription): Date {
  const end = sub.items?.data?.[0]?.current_period_end;
  if (typeof end === "number") {
    return new Date(end * 1000);
  }
  return new Date(sub.start_date * 1000);
}

function invoiceSubscriptionId(inv: Stripe.Invoice): string | null {
  const sub = inv.parent?.subscription_details?.subscription;
  if (typeof sub === "string") return sub;
  if (sub && typeof sub === "object" && "id" in sub) return (sub as { id: string }).id;
  return null;
}

function mapStripeSubscriptionStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "active":
      return "ACTIVE";
    case "trialing":
      return "TRIALING";
    case "past_due":
      return "PAST_DUE";
    case "canceled":
      return "CANCELED";
    case "unpaid":
      return "UNPAID";
    case "paused":
      return "PAUSED";
    case "incomplete":
    case "incomplete_expired":
    default:
      return "INCOMPLETE";
  }
}

async function upsertStripeCustomer(userId: string, stripeCustomerId: string) {
  await prisma.paymentProviderCustomer.upsert({
    where: { userId },
    create: { userId, stripeCustomerId },
    update: { stripeCustomerId },
  });
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
  if (userId && customerId) {
    await upsertStripeCustomer(userId, customerId);
  }

  if (session.mode === "payment") {
    const orderId = session.metadata?.orderId;
    if (!orderId) return;
    const pi =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;
    await markOrderPaidAndGrantEntitlements(orderId, {
      stripePaymentIntentId: pi,
      stripeCheckoutSessionId: session.id,
    });
    return;
  }

  if (session.mode === "subscription") {
    const internalId = session.metadata?.internalSubscriptionId;
    const stripeSubId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id ?? null;
    if (!internalId || !stripeSubId) return;

    const stripe = requireStripe();
    const ss = await stripe.subscriptions.retrieve(stripeSubId, {
      expand: ["items.data"],
    });
    await prisma.subscription.update({
      where: { id: internalId },
      data: {
        stripeSubscriptionId: ss.id,
        status: mapStripeSubscriptionStatus(ss.status),
        currentPeriodEnd: stripeSubscriptionPeriodEnd(ss),
        cancelAtPeriodEnd: ss.cancel_at_period_end,
      },
    });
  }
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
  const internal = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: sub.id },
  });
  if (!internal) return;

  await prisma.subscription.update({
    where: { id: internal.id },
    data: {
      status: mapStripeSubscriptionStatus(sub.status),
      currentPeriodEnd: stripeSubscriptionPeriodEnd(sub),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
  });

  if (sub.status === "canceled" || sub.status === "unpaid") {
    await deactivateEntitlementsForSubscription(internal.id);
  }
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const internal = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: sub.id },
  });
  if (!internal) return;
  const ended =
    sub.ended_at != null ? new Date(sub.ended_at * 1000) : stripeSubscriptionPeriodEnd(sub);
  await prisma.subscription.update({
    where: { id: internal.id },
    data: {
      status: "CANCELED",
      cancelAtPeriodEnd: false,
      currentPeriodEnd: ended,
    },
  });
  await deactivateEntitlementsForSubscription(internal.id);
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const existing = await prisma.invoice.findFirst({
    where: { stripeInvoiceId: invoice.id },
  });
  if (existing) return;

  const subId = invoiceSubscriptionId(invoice);
  if (!subId) return;
  const stripe = requireStripe();
  const ss = await stripe.subscriptions.retrieve(subId, { expand: ["items.data"] });
  const internal = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: ss.id },
  });
  if (!internal) return;

  await prisma.subscription.update({
    where: { id: internal.id },
    data: {
      status: mapStripeSubscriptionStatus(ss.status),
      currentPeriodEnd: stripeSubscriptionPeriodEnd(ss),
    },
  });

  const userId = internal.userId;
  const amount = invoice.amount_paid ?? 0;
  if (amount > 0) {
    await prisma.invoice.create({
      data: {
        userId,
        subscriptionId: internal.id,
        status: "PAID",
        provider: "STRIPE",
        providerRef: invoice.id,
        stripeInvoiceId: invoice.id,
        amountCents: amount,
        currency: invoice.currency ?? "usd",
        paidAt: invoice.status_transitions?.paid_at
          ? new Date(invoice.status_transitions.paid_at * 1000)
          : new Date(),
      },
    });
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subId = invoiceSubscriptionId(invoice);
  if (!subId) return;
  const internal = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subId },
  });
  if (!internal) return;
  await prisma.subscription.update({
    where: { id: internal.id },
    data: { status: "PAST_DUE" },
  });
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!pi) return;
  const order = await prisma.order.findFirst({
    where: { stripePaymentIntentId: pi, status: "PAID" },
  });
  if (order) {
    await markOrderRefunded(order.id);
  }
}

export async function processStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    case "invoice.paid":
      await handleInvoicePaid(event.data.object as Stripe.Invoice);
      break;
    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;
    case "charge.refunded":
      await handleChargeRefunded(event.data.object as Stripe.Charge);
      break;
    default:
      break;
  }
}
