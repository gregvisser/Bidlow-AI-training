import type { SubscriptionStatus } from "@/generated/prisma";

/**
 * Whether a subscription row should grant catalog/course access right now.
 * Stripe: ACTIVE until period end even when cancel_at_period_end is true.
 */
export function subscriptionRowGrantsAccess(
  status: SubscriptionStatus,
  cancelAtPeriodEnd: boolean,
  currentPeriodEnd: Date | null,
  now: Date = new Date(),
): boolean {
  if (status === "INCOMPLETE") return false;
  if (status === "CANCELED" || status === "UNPAID") return false;
  if (status === "PAST_DUE") return false;
  if (status === "PAUSED") return false;

  if (cancelAtPeriodEnd && currentPeriodEnd) {
    return currentPeriodEnd > now;
  }

  return status === "ACTIVE" || status === "TRIALING";
}
