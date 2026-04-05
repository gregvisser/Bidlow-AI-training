import Link from "next/link";
import { PayPalOneTimeButton } from "@/components/billing/paypal-one-time-button";
import { PayPalSubscriptionButton } from "@/components/billing/paypal-subscription-button";
import { StripeCheckoutButton } from "@/components/billing/stripe-checkout-button";
import { PlanKind, PricingInterval } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/billing/stripe-client";
import { paypalConfigured } from "@/lib/billing/paypal-client";
import { isSelfServeBillingAvailable } from "@/lib/launch/controlled-core-launch";
import { AlertTriangle, Check } from "lucide-react";

export const dynamic = "force-dynamic";

function fmt(cents: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function intervalLabel(interval: PricingInterval) {
  switch (interval) {
    case "MONTH":
      return "/mo";
    case "YEAR":
      return "/yr";
    default:
      return "";
  }
}

export default async function PricingPage() {
  const plans = await prisma.pricingPlan.findMany({
    where: { isActive: true },
    orderBy: { amountCents: "asc" },
  });

  const stripeOk = !!getStripe();
  const paypalOk = paypalConfigured();
  const selfServe = isSelfServeBillingAvailable();

  return (
    <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
      <div className="text-center">
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight">
          Plans &amp; pricing
        </h1>
        {selfServe ? (
          <>
            <p className="mt-4 max-w-2xl mx-auto text-[var(--muted-foreground)]">
              Database-backed plans. Checkout uses Stripe (cards, Apple Pay / Google Pay where enabled in
              Stripe) and PayPal. Access unlocks only after verified payment events update the database—never
              from return URLs alone.
            </p>
            <p className="mt-3 text-sm text-[var(--muted-foreground)]">
              <Link href="/login" className="text-[var(--accent)] hover:underline">
                Sign in
              </Link>{" "}
              (or{" "}
              <Link href="/register" className="text-[var(--accent)] hover:underline">
                create an account
              </Link>
              ) before checkout.
            </p>
            {(!stripeOk || !paypalOk) && (
              <div className="mx-auto mt-8 flex max-w-2xl items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-left text-sm text-amber-100">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-200/90" aria-hidden />
                <span>
                  {!stripeOk && !paypalOk
                    ? "Neither Stripe nor PayPal is configured in this environment—checkout buttons are disabled until operators add keys."
                    : !stripeOk
                      ? "Stripe is not configured—card checkout is disabled until STRIPE_SECRET_KEY is set."
                      : "PayPal is not configured—PayPal checkout is disabled until client and server PayPal variables are set."}
                </span>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="mt-4 max-w-2xl mx-auto text-[var(--muted-foreground)]">
              Listed amounts reflect planned catalogue pricing for when self-serve checkout goes live.
              <strong className="font-medium text-[var(--foreground)]">
                {" "}
                Paid self-serve enrollment is not available yet.
              </strong>{" "}
              Access to the platform is currently by invitation or administrator assignment.
            </p>
            <p className="mt-3 text-sm text-[var(--muted-foreground)]">
              Already invited?{" "}
              <Link href="/login" className="text-[var(--accent)] hover:underline">
                Sign in
              </Link>
              . Need access? Contact your organisation or Bidlow—there is no public checkout yet.
            </p>
            <div className="mx-auto mt-8 flex max-w-2xl items-start gap-3 rounded-2xl border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-left text-sm text-sky-100">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-sky-200/90" aria-hidden />
              <span>
                Stripe and PayPal are not configured in this environment. Checkout buttons are hidden so
                learners are not sent through a broken purchase flow. Billing architecture remains in place
                for a future paid rollout.
              </span>
            </div>
          </>
        )}
      </div>

      <div className="mt-14 grid gap-8 lg:grid-cols-2">
        {plans.map((p) => {
          const recommended = p.slug === "membership-monthly";
          return (
            <div
              key={p.id}
              className={`glass-panel relative flex flex-col rounded-2xl p-8 ${
                recommended ? "ring-2 ring-[var(--accent)]/40" : ""
              }`}
            >
              {recommended ? (
                <span className="absolute -top-3 left-6 rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-[var(--accent-foreground)]">
                  Recommended
                </span>
              ) : null}
              <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">{p.name}</h2>
              {p.description ? (
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">{p.description}</p>
              ) : null}
              <p className="mt-6 font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--foreground)]">
                {fmt(p.amountCents, p.currency)}
                <span className="text-lg font-medium text-[var(--muted-foreground)]">
                  {p.kind === PlanKind.SUBSCRIPTION ? intervalLabel(p.interval) : " one-time"}
                </span>
              </p>
              <ul className="mt-8 flex-1 space-y-3 text-sm text-[var(--muted-foreground)]">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden />
                  {p.kind === PlanKind.SUBSCRIPTION ? "Recurring membership access" : "Lifetime course access"}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden />
                  Progress, reports &amp; certificates
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden />
                  {selfServe ? "Secure billing &amp; webhooks" : "Future self-serve billing when enabled"}
                </li>
              </ul>

              <div className="mt-8 space-y-3">
                {selfServe ? (
                  p.kind === PlanKind.ONE_TIME ? (
                    <>
                      {stripeOk ? (
                        <StripeCheckoutButton
                          planSlug={p.slug}
                          courseSlug="ai-agent-mastery-core"
                          label="Checkout with Stripe"
                        />
                      ) : (
                        <p className="text-xs text-[var(--muted-foreground)]">Configure Stripe keys.</p>
                      )}
                      {paypalOk ? (
                        <PayPalOneTimeButton planSlug={p.slug} courseSlug="ai-agent-mastery-core" />
                      ) : (
                        <p className="text-xs text-[var(--muted-foreground)]">Configure PayPal.</p>
                      )}
                    </>
                  ) : (
                    <>
                      {stripeOk ? (
                        <StripeCheckoutButton planSlug={p.slug} label="Subscribe with Stripe" />
                      ) : (
                        <p className="text-xs text-[var(--muted-foreground)]">Configure Stripe keys.</p>
                      )}
                      <PayPalSubscriptionButton
                        planSlug={p.slug}
                        disabled={!p.paypalPlanId || !paypalOk}
                      />
                    </>
                  )
                ) : (
                  <p className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-[var(--muted-foreground)]">
                    Self-serve purchase is not available during this phase. Use your invitation or ask an
                    administrator to grant access.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
