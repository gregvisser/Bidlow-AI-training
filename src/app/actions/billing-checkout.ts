"use server";

import { redirect } from "next/navigation";
import type Stripe from "stripe";
import { PlanKind } from "@/generated/prisma";
import { auth } from "@/auth";
import { getAppBaseUrl } from "@/lib/billing/env";
import { createPendingOrderForPlan } from "@/lib/billing/orders";
import { paypalConfigured, paypalCreateBillingSubscription } from "@/lib/billing/paypal-client";
import { getStripe } from "@/lib/billing/stripe-client";
import { prisma } from "@/lib/db";
import type { PricingPlan } from "@/generated/prisma";

function buildStripeLineItem(plan: PricingPlan, recurring: boolean): Stripe.Checkout.SessionCreateParams.LineItem {
  if (plan.stripePriceId) {
    return { price: plan.stripePriceId, quantity: 1 };
  }
  const interval =
    plan.interval === "MONTH" ? "month" : plan.interval === "YEAR" ? "year" : undefined;
  if (recurring && !interval) {
    throw new Error("Subscription plan requires MONTH or YEAR interval or stripePriceId");
  }
  return {
    quantity: 1,
    price_data: {
      currency: plan.currency,
      unit_amount: plan.amountCents,
      product_data: {
        name: plan.name,
        description: plan.description ?? undefined,
      },
      ...(recurring && interval
        ? {
            recurring: { interval },
          }
        : {}),
    },
  };
}

export async function startStripeCheckoutForPlan(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const planSlug = String(formData.get("planSlug") ?? "").trim();
  const courseSlug = formData.get("courseSlug") ? String(formData.get("courseSlug")).trim() : "";

  const plan = await prisma.pricingPlan.findUnique({ where: { slug: planSlug } });
  if (!plan?.isActive) {
    redirect("/portal/billing?checkout=invalid_plan");
  }

  let courseId: string | null = null;
  if (courseSlug) {
    const c = await prisma.course.findUnique({ where: { slug: courseSlug } });
    courseId = c?.id ?? null;
  }

  const stripe = getStripe();
  if (!stripe) {
    redirect("/portal/billing?checkout=stripe_not_configured");
  }

  const base = getAppBaseUrl();

  try {
    if (plan.kind === PlanKind.ONE_TIME) {
      const order = await createPendingOrderForPlan({
        userId: session.user.id,
        pricingPlanId: plan.id,
        provider: "STRIPE",
        courseId,
      });

      const checkout = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: session.user.email ?? undefined,
        line_items: [buildStripeLineItem(plan, false)],
        success_url: `${base}/portal/billing?checkout=stripe`,
        cancel_url: `${base}/portal/billing?canceled=1`,
        metadata: {
          orderId: order.id,
          userId: session.user.id,
          pricingPlanId: plan.id,
        },
        payment_intent_data: {
          metadata: {
            orderId: order.id,
            userId: session.user.id,
          },
        },
      });

      await prisma.order.update({
        where: { id: order.id },
        data: {
          stripeCheckoutSessionId: checkout.id,
          providerRef: checkout.id,
        },
      });

      if (checkout.url) {
        redirect(checkout.url);
      }
      redirect("/portal/billing?checkout=stripe_session_failed");
    }

    if (plan.kind === PlanKind.SUBSCRIPTION) {
      const sub = await prisma.subscription.create({
        data: {
          userId: session.user.id,
          pricingPlanId: plan.id,
          provider: "STRIPE",
          status: "INCOMPLETE",
        },
      });

      const checkout = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer_email: session.user.email ?? undefined,
        line_items: [buildStripeLineItem(plan, true)],
        success_url: `${base}/portal/billing?checkout=stripe`,
        cancel_url: `${base}/portal/billing?canceled=1`,
        metadata: {
          internalSubscriptionId: sub.id,
          userId: session.user.id,
          pricingPlanId: plan.id,
        },
        subscription_data: {
          metadata: {
            internalSubscriptionId: sub.id,
            userId: session.user.id,
            pricingPlanId: plan.id,
          },
        },
      });

      await prisma.subscription.update({
        where: { id: sub.id },
        data: {
          metadata: { stripeCheckoutSessionId: checkout.id } as object,
        },
      });

      if (checkout.url) {
        redirect(checkout.url);
      }
      redirect("/portal/billing?checkout=stripe_session_failed");
    }
  } catch (e) {
    console.error("Stripe checkout error", e);
    redirect("/portal/billing?checkout=stripe_error");
  }

  redirect("/portal/billing?checkout=invalid_plan");
}

export async function startStripeCustomerPortalSession() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const cust = await prisma.paymentProviderCustomer.findUnique({
    where: { userId: session.user.id },
  });
  if (!cust?.stripeCustomerId) {
    redirect("/portal/billing?portal=missing");
  }

  const stripe = getStripe();
  if (!stripe) {
    redirect("/portal/billing?checkout=stripe_not_configured");
  }

  const base = getAppBaseUrl();
  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: cust.stripeCustomerId,
      return_url: `${base}/portal/billing`,
    });
    if (portal.url) {
      redirect(portal.url);
    }
  } catch (e) {
    console.error("Stripe portal error", e);
    redirect("/portal/billing?checkout=stripe_portal_failed");
  }
  redirect("/portal/billing?checkout=stripe_portal_failed");
}

export async function startPayPalSubscriptionCheckout(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  if (!paypalConfigured()) {
    redirect("/portal/billing?checkout=paypal_not_configured");
  }

  const planSlug = String(formData.get("planSlug") ?? "").trim();
  const plan = await prisma.pricingPlan.findUnique({ where: { slug: planSlug } });
  if (!plan?.isActive || plan.kind !== PlanKind.SUBSCRIPTION || !plan.paypalPlanId) {
    redirect("/portal/billing?checkout=invalid_plan");
  }

  const internal = await prisma.subscription.create({
    data: {
      userId: session.user.id,
      pricingPlanId: plan.id,
      provider: "PAYPAL",
      status: "INCOMPLETE",
    },
  });

  const base = getAppBaseUrl();
  try {
    const paypal = await paypalCreateBillingSubscription({
      plan_id: plan.paypalPlanId,
      custom_id: internal.id,
      application_context: {
        brand_name: "AI Training Portal",
        locale: "en-US",
        shipping_preference: "NO_SHIPPING",
        user_action: "SUBSCRIBE_NOW",
        return_url: `${base}/portal/billing`,
        cancel_url: `${base}/portal/billing?canceled=1`,
      },
    });

    const approve = paypal.links?.find((l) => l.rel === "approve")?.href;
    if (approve) {
      redirect(approve);
    }
  } catch (e) {
    console.error("PayPal subscription checkout error", e);
    redirect("/portal/billing?checkout=paypal_error");
  }
  redirect("/portal/billing?checkout=paypal_error");
}
