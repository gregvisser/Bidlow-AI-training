import { prisma } from "@/lib/db";

export async function markOrderPaidAndGrantEntitlements(
  orderId: string,
  extra: {
    stripePaymentIntentId?: string | null;
    paypalCaptureId?: string | null;
    stripeCheckoutSessionId?: string | null;
  },
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.order.updateMany({
      where: { id: orderId, status: "PENDING" },
      data: {
        status: "PAID",
        stripePaymentIntentId: extra.stripePaymentIntentId ?? undefined,
        paypalCaptureId: extra.paypalCaptureId ?? undefined,
        stripeCheckoutSessionId: extra.stripeCheckoutSessionId ?? undefined,
        providerRef: extra.stripePaymentIntentId ?? extra.paypalCaptureId ?? undefined,
      },
    });
    if (updated.count === 0) {
      return false;
    }

    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: true },
    });

    for (const item of order.items) {
      if (!item.courseId) continue;
      const existing = await tx.entitlement.findFirst({
        where: {
          userId: order.userId,
          courseId: item.courseId,
          orderId: order.id,
          source: "ORDER",
        },
      });
      if (existing) continue;
      await tx.entitlement.create({
        data: {
          userId: order.userId,
          courseId: item.courseId,
          source: "ORDER",
          active: true,
          orderId: order.id,
        },
      });
    }
    return true;
  });
}

export async function markOrderRefunded(orderId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: { status: "REFUNDED" },
    });
    await tx.entitlement.updateMany({
      where: { orderId, source: "ORDER" },
      data: { active: false, endsAt: new Date() },
    });
  });
}

export async function deactivateEntitlementsForSubscription(subscriptionId: string): Promise<void> {
  await prisma.entitlement.updateMany({
    where: { subscriptionId, active: true },
    data: { active: false, endsAt: new Date() },
  });
}
