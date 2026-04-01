import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { markOrderPaidAndGrantEntitlements } from "@/lib/billing/fulfillment";
import { paypalCaptureOrder } from "@/lib/billing/paypal-client";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { paypalOrderId?: string };
  const paypalOrderId = body.paypalOrderId?.trim();
  if (!paypalOrderId) {
    return NextResponse.json({ error: "paypalOrderId required" }, { status: 400 });
  }

  const order = await prisma.order.findFirst({
    where: {
      paypalOrderId,
      userId: session.user.id,
      status: "PENDING",
    },
  });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const cap = await paypalCaptureOrder(paypalOrderId);
  const captureId = cap.purchase_units?.[0]?.payments?.captures?.[0]?.id;

  await markOrderPaidAndGrantEntitlements(order.id, {
    paypalCaptureId: captureId ?? null,
  });

  return NextResponse.json({ ok: true });
}
