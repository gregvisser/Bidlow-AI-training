import { NextResponse } from "next/server";
import { PlanKind } from "@/generated/prisma";
import { auth } from "@/auth";
import { getAppBaseUrl } from "@/lib/billing/env";
import { createPendingOrderForPlan } from "@/lib/billing/orders";
import { paypalCreateOrder } from "@/lib/billing/paypal-client";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { planSlug?: string; courseSlug?: string };
  const planSlug = body.planSlug?.trim();
  if (!planSlug) {
    return NextResponse.json({ error: "planSlug required" }, { status: 400 });
  }

  const plan = await prisma.pricingPlan.findUnique({ where: { slug: planSlug } });
  if (!plan?.isActive || plan.kind !== PlanKind.ONE_TIME) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  let courseId: string | null = null;
  if (body.courseSlug?.trim()) {
    const c = await prisma.course.findUnique({ where: { slug: body.courseSlug.trim() } });
    courseId = c?.id ?? null;
  }

  const order = await createPendingOrderForPlan({
    userId: session.user.id,
    pricingPlanId: plan.id,
    provider: "PAYPAL",
    courseId,
  });

  const base = getAppBaseUrl();
  const paypal = await paypalCreateOrder({
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: order.id,
        custom_id: order.id,
        amount: {
          currency_code: plan.currency.toUpperCase(),
          value: (plan.amountCents / 100).toFixed(2),
        },
      },
    ],
    application_context: {
      return_url: `${base}/portal/billing`,
      cancel_url: `${base}/portal/billing?canceled=1`,
    },
  });

  await prisma.order.update({
    where: { id: order.id },
    data: { paypalOrderId: paypal.id, providerRef: paypal.id },
  });

  return NextResponse.json({ paypalOrderId: paypal.id });
}
