import { prisma } from "@/lib/db";

export async function getBillingOverview(userId: string) {
  const [subscriptions, invoices, orders, plans] = await Promise.all([
    prisma.subscription.findMany({
      where: { userId },
      include: { pricingPlan: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.invoice.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 25,
      include: {
        items: { include: { pricingPlan: true, course: { select: { title: true } } } },
      },
    }),
    prisma.pricingPlan.findMany({
      where: { isActive: true },
      orderBy: { amountCents: "asc" },
    }),
  ]);

  return { subscriptions, invoices, orders, plans };
}
