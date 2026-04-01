import {
  deactivateEntitlementsForSubscription,
  markOrderPaidAndGrantEntitlements,
} from "@/lib/billing/fulfillment";
import { prisma } from "@/lib/db";

type PayPalWebhookPayload = {
  id: string;
  event_type: string;
  resource: Record<string, unknown>;
};

function getString(obj: Record<string, unknown>, key: string): string | undefined {
  const v = obj[key];
  return typeof v === "string" ? v : undefined;
}

/**
 * PayPal v2 webhook JSON body (subset).
 */
export async function processPayPalWebhookPayload(payload: PayPalWebhookPayload): Promise<void> {
  switch (payload.event_type) {
    case "PAYMENT.CAPTURE.COMPLETED": {
      const res = payload.resource as Record<string, unknown>;
      const customId = getString(res, "custom_id");
      const captureId = getString(res, "id");
      if (customId && captureId) {
        await markOrderPaidAndGrantEntitlements(customId, {
          paypalCaptureId: captureId,
        });
      }
      break;
    }
    case "BILLING.SUBSCRIPTION.ACTIVATED": {
      const res = payload.resource as Record<string, unknown>;
      const paypalSubId = getString(res, "id");
      if (!paypalSubId) break;
      const internalId = getString(res, "custom_id");
      if (!internalId) break;
      const sub = await prisma.subscription.findFirst({
        where: { id: internalId },
      });
      if (!sub) break;
      await prisma.subscription.update({
        where: { id: sub.id },
        data: {
          paypalSubscriptionId: paypalSubId,
          status: "ACTIVE",
        },
      });
      break;
    }
    case "BILLING.SUBSCRIPTION.CANCELLED":
    case "BILLING.SUBSCRIPTION.EXPIRED": {
      const res = payload.resource as Record<string, unknown>;
      const paypalSubId = getString(res, "id");
      if (!paypalSubId) break;
      const internal = await prisma.subscription.findFirst({
        where: { paypalSubscriptionId: paypalSubId },
      });
      if (!internal) break;
      await prisma.subscription.update({
        where: { id: internal.id },
        data: { status: "CANCELED", cancelAtPeriodEnd: false },
      });
      await deactivateEntitlementsForSubscription(internal.id);
      break;
    }
    default:
      break;
  }
}
