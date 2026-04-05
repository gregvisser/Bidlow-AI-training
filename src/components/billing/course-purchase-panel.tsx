import { StripeCheckoutButton } from "@/components/billing/stripe-checkout-button";
import { PayPalOneTimeButton } from "@/components/billing/paypal-one-time-button";
import { paypalConfigured } from "@/lib/billing/paypal-client";
import { getStripe } from "@/lib/billing/stripe-client";
import { isSelfServeBillingAvailable } from "@/lib/launch/controlled-core-launch";
import type { PricingPlan } from "@/generated/prisma";

export function CoursePurchasePanel({
  plan,
  courseSlug,
}: {
  plan: Pick<PricingPlan, "slug" | "name" | "amountCents" | "currency">;
  courseSlug: string;
}) {
  const stripeOk = !!getStripe();
  const paypalOk = paypalConfigured();
  const selfServe = isSelfServeBillingAvailable();

  if (!selfServe) {
    return (
      <div className="mt-6 rounded-2xl border border-white/[0.1] bg-gradient-to-br from-[#1a1a2e]/90 to-[#0f0f1a]/90 p-6">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--accent)]">Access</p>
        <h3 className="mt-2 font-[family-name:var(--font-display)] text-lg font-semibold">
          This course requires access
        </h3>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Self-serve purchase is not available yet. Access is granted by invitation or by an administrator
          (entitlement or organisation policy)—not through checkout on this site.
        </p>
        <p className="mt-4 rounded-xl border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
          If you believe you should already have access, contact your administrator or the person who invited
          you. Payment providers are not configured for public checkout in this environment.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border border-white/[0.1] bg-gradient-to-br from-[#1a1a2e]/90 to-[#0f0f1a]/90 p-6">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--accent)]">Unlock</p>
      <h3 className="mt-2 font-[family-name:var(--font-display)] text-lg font-semibold">
        Purchase access — {plan.name}
      </h3>
      <p className="mt-2 text-sm text-[var(--muted-foreground)]">
        Complete checkout on Stripe (cards &amp; digital wallets) or PayPal. Access is granted only after
        payment is confirmed server-side—never from the return URL alone.
      </p>
      {!stripeOk && !paypalOk ? (
        <div className="mt-6 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Payments are not configured yet. An operator must set Stripe and/or PayPal environment variables
          before learners can purchase this course.
        </div>
      ) : null}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {stripeOk ? (
          <StripeCheckoutButton
            planSlug={plan.slug}
            courseSlug={courseSlug}
            label="Pay with card (Stripe)"
          />
        ) : (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs text-[var(--muted-foreground)]">
            Stripe unavailable — set <code className="rounded bg-black/30 px-1">STRIPE_SECRET_KEY</code> on
            the server.
          </div>
        )}
        {paypalOk ? (
          <PayPalOneTimeButton planSlug={plan.slug} courseSlug={courseSlug} disabled={false} />
        ) : (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs text-[var(--muted-foreground)]">
            PayPal unavailable — set client id and PayPal server secrets.
          </div>
        )}
      </div>
    </div>
  );
}
