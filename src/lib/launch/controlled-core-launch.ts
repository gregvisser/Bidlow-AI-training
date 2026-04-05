import { getStripe } from "@/lib/billing/stripe-client";
import { paypalConfigured } from "@/lib/billing/paypal-client";

/**
 * True when at least one payment provider is configured so self-serve checkout can run.
 * When false, the app should present controlled-launch copy (invite/admin access, no live checkout).
 */
export function isSelfServeBillingAvailable(): boolean {
  return !!getStripe() || paypalConfigured();
}
