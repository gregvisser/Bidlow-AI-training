import { prisma } from "@/lib/db";

const take = {
  orders: 15,
  subscriptions: 15,
  paymentEvents: 30,
  certificates: 12,
  uploads: 12,
};

export async function getOpsDashboardData() {
  const [
    recentOrders,
    recentSubscriptions,
    recentPaymentEvents,
    recentCertificates,
    recentUploads,
    orderCount,
    subscriptionCount,
    paymentEventCount,
  ] = await Promise.all([
    prisma.order.findMany({
      orderBy: { updatedAt: "desc" },
      take: take.orders,
      include: {
        user: { select: { email: true } },
        items: { include: { pricingPlan: { select: { name: true } } } },
      },
    }),
    prisma.subscription.findMany({
      orderBy: { updatedAt: "desc" },
      take: take.subscriptions,
      include: {
        user: { select: { email: true } },
        pricingPlan: { select: { name: true, slug: true } },
      },
    }),
    prisma.paymentEvent.findMany({
      orderBy: { processedAt: "desc" },
      take: take.paymentEvents,
      select: {
        id: true,
        provider: true,
        externalEventId: true,
        eventType: true,
        processedAt: true,
        userId: true,
      },
    }),
    prisma.certificate.findMany({
      orderBy: { issuedAt: "desc" },
      take: take.certificates,
      include: {
        user: { select: { email: true } },
        course: { select: { title: true, slug: true } },
      },
    }),
    prisma.uploadedAsset.findMany({
      orderBy: { createdAt: "desc" },
      take: take.uploads,
      include: {
        user: { select: { email: true } },
        course: { select: { title: true, slug: true } },
      },
    }),
    prisma.order.count(),
    prisma.subscription.count(),
    prisma.paymentEvent.count(),
  ]);

  const userIds = [...new Set(recentPaymentEvents.map((e) => e.userId).filter(Boolean))] as string[];
  const eventUsers =
    userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, email: true },
        })
      : [];
  const userEmailById = new Map(eventUsers.map((u) => [u.id, u.email]));

  return {
    recentOrders,
    recentSubscriptions,
    recentPaymentEvents: recentPaymentEvents.map((e) => ({
      ...e,
      userEmail: e.userId ? userEmailById.get(e.userId) ?? null : null,
    })),
    recentCertificates,
    recentUploads,
    counts: {
      orders: orderCount,
      subscriptions: subscriptionCount,
      paymentEvents: paymentEventCount,
    },
  };
}
