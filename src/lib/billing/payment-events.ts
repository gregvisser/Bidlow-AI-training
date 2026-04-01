import type { PaymentProvider } from "@/generated/prisma";
import { prisma } from "@/lib/db";

function toJsonPayload(payload: unknown): object | null {
  if (payload === undefined || payload === null) return null;
  return JSON.parse(JSON.stringify(payload)) as object;
}

/**
 * @returns true if this event was newly inserted; false if duplicate (idempotent skip).
 */
export async function recordPaymentEventIfNew(
  provider: PaymentProvider,
  externalEventId: string,
  eventType: string,
  payload: unknown,
  userId?: string | null,
): Promise<boolean> {
  try {
    await prisma.paymentEvent.create({
      data: {
        provider,
        externalEventId,
        eventType,
        payload: toJsonPayload(payload) ?? undefined,
        userId: userId ?? undefined,
      },
    });
    return true;
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2002") {
      return false;
    }
    throw e;
  }
}
