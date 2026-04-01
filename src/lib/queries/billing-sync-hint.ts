import { prisma } from "@/lib/db";

/**
 * Whether the user likely still has provider-side confirmation in flight (eventual consistency).
 */
export async function getBillingWebhookSyncHint(userId: string): Promise<boolean> {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  const incompleteSub = await prisma.subscription.findFirst({
    where: { userId, status: "INCOMPLETE" },
  });
  if (incompleteSub) return true;

  const recentPendingOrder = await prisma.order.findFirst({
    where: {
      userId,
      status: "PENDING",
      createdAt: { gte: tenMinutesAgo },
    },
  });
  return !!recentPendingOrder;
}
