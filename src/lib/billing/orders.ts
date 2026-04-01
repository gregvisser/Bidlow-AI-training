import type { PaymentProvider } from "@/generated/prisma";
import { prisma } from "@/lib/db";

export async function createPendingOrderForPlan(opts: {
  userId: string;
  pricingPlanId: string;
  provider: PaymentProvider;
  courseId?: string | null;
}) {
  const plan = await prisma.pricingPlan.findUnique({ where: { id: opts.pricingPlanId } });
  if (!plan?.isActive) {
    throw new Error("Invalid or inactive pricing plan");
  }
  const unitCents = plan.amountCents;
  return prisma.order.create({
    data: {
      userId: opts.userId,
      status: "PENDING",
      provider: opts.provider,
      currency: plan.currency,
      totalCents: unitCents,
      subtotalCents: unitCents,
      taxCents: 0,
      items: {
        create: {
          pricingPlanId: plan.id,
          courseId: opts.courseId ?? undefined,
          quantity: 1,
          unitCents,
        },
      },
    },
    include: { items: true },
  });
}
