import Link from "next/link";
import { redirect } from "next/navigation";
import { startStripeCustomerPortalSession } from "@/app/actions/billing-checkout";
import { PayPalSubscriptionButton } from "@/components/billing/paypal-subscription-button";
import { StripeCheckoutButton } from "@/components/billing/stripe-checkout-button";
import { PortalHeader } from "@/components/portal/portal-header";
import { Button } from "@/components/ui/button";
import { auth } from "@/auth";
import { PlanKind } from "@/generated/prisma";
import { getStripe } from "@/lib/billing/stripe-client";
import { paypalConfigured } from "@/lib/billing/paypal-client";
import { getBillingOverview } from "@/lib/queries/billing";
import { prisma } from "@/lib/db";
import { getBillingWebhookSyncHint } from "@/lib/queries/billing-sync-hint";
import { isSelfServeBillingAvailable } from "@/lib/launch/controlled-core-launch";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

function centsToDisplay(cents: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function statusTone(s: string) {
  if (s === "PAID" || s === "ACTIVE") return "text-emerald-300/95";
  if (s === "PENDING" || s === "INCOMPLETE") return "text-amber-200/90";
  if (s === "PAST_DUE" || s === "FAILED") return "text-rose-300/95";
  return "text-[var(--muted-foreground)]";
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{
    checkout?: string;
    canceled?: string;
    portal?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const sp = await searchParams;
  const { subscriptions, invoices, orders, plans } = await getBillingOverview(session.user.id);
  const providerCustomer = await prisma.paymentProviderCustomer.findUnique({
    where: { userId: session.user.id },
  });

  const stripeOk = !!getStripe();
  const paypalOk = paypalConfigured();
  const selfServe = isSelfServeBillingAvailable();
  const membershipPlan = plans.find((p) => p.slug === "membership-monthly" && p.kind === PlanKind.SUBSCRIPTION);

  const checkoutSuccess = sp.checkout === "stripe" || sp.checkout === "paypal";
  const webhookSyncPending =
    checkoutSuccess && session.user.id ? await getBillingWebhookSyncHint(session.user.id) : false;

  return (
    <>
      <PortalHeader title="Billing" />
      <div className="flex-1 space-y-8 overflow-auto p-6">
        {!selfServe && (
          <div className="flex items-start gap-3 rounded-2xl border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-sky-200" aria-hidden />
            <div>
              <p className="font-medium text-[var(--foreground)]">Controlled access — billing deferred</p>
              <p className="mt-1 text-[var(--muted-foreground)]">
                Self-serve checkout is not enabled. Your access comes from invitation or administrator
                assignment. Orders, subscriptions, and invoices will appear here after payment providers are
                connected and used.
              </p>
            </div>
          </div>
        )}
        {checkoutSuccess && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" aria-hidden />
            <div>
              Checkout completed with the payment provider. Access and billing rows are updated from
              verified webhooks and server-side confirmation—not from this page alone.
            </div>
          </div>
        )}
        {checkoutSuccess && webhookSyncPending && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-200" aria-hidden />
            <div>
              Still syncing: you have a recent pending order or an incomplete subscription row. Wait up to a
              minute for Stripe/PayPal webhooks to finalize. Refresh this page—do not assume access from the
              return URL alone.
            </div>
          </div>
        )}
        {sp.canceled && (
          <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-[var(--muted-foreground)]">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            Checkout was canceled before payment finished. No charge was finalized—you can try again
            anytime.
          </div>
        )}
        {sp.portal === "missing" && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            Stripe customer portal requires at least one successful Stripe checkout so a customer id is on
            file.
          </div>
        )}
        {sp.checkout === "invalid_plan" && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            That plan is not available for checkout. Return to pricing or billing and pick an active plan.
          </div>
        )}
        {sp.checkout === "stripe_not_configured" && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            Stripe is not configured on the server (<code className="rounded bg-black/30 px-1">STRIPE_SECRET_KEY</code>
            ). Ask an operator to add keys before accepting card payments.
          </div>
        )}
        {sp.checkout === "stripe_session_failed" && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            Stripe did not return a checkout URL. Try again in a moment; if this persists, check Stripe
            dashboard logs and server configuration.
          </div>
        )}
        {(sp.checkout === "stripe_error" || sp.checkout === "stripe_portal_failed") && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            Stripe returned an error. Verify API keys, plan/price IDs, and retry. If you were opening the
            customer portal, ensure a Stripe customer exists for your account.
          </div>
        )}
        {sp.checkout === "paypal_not_configured" && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            PayPal is not configured (server and client PayPal variables). Operators can enable it in
            environment settings.
          </div>
        )}
        {sp.checkout === "paypal_error" && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            PayPal could not start that subscription. Confirm plan IDs and PayPal app credentials, then try
            again.
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="glass-panel rounded-2xl p-6 lg:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
                  Subscription
                </h2>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  {selfServe
                    ? "Live status from the database (Stripe / PayPal webhooks)."
                    : "No live payment sync yet—rows will populate when providers are configured."}
                </p>
              </div>
              {providerCustomer?.stripeCustomerId && stripeOk ? (
                <form action={startStripeCustomerPortalSession}>
                  <Button type="submit" variant="secondary" size="sm">
                    Stripe customer portal
                  </Button>
                </form>
              ) : null}
            </div>
            {subscriptions.length === 0 ? (
              <p className="mt-6 text-sm text-[var(--muted-foreground)]">
                {selfServe ? (
                  <>
                    No subscription rows yet. Start a membership below—state will appear after the provider
                    confirms payment.
                  </>
                ) : (
                  <>
                    No subscription rows yet. Access is managed outside of self-serve checkout until Stripe or
                    PayPal is enabled.
                  </>
                )}
              </p>
            ) : (
              <ul className="mt-6 space-y-4">
                {subscriptions.map((s) => (
                  <li
                    key={s.id}
                    className="flex flex-col gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium">{s.pricingPlan.name}</p>
                      <p className={`text-sm capitalize tabular-nums ${statusTone(s.status)}`}>
                        {s.status.toLowerCase().replace(/_/g, " ")}
                      </p>
                    </div>
                    <div className="text-right text-sm text-[var(--muted-foreground)]">
                      {s.currentPeriodEnd
                        ? `Renews ${s.currentPeriodEnd.toLocaleDateString()}`
                        : "—"}
                      {s.cancelAtPeriodEnd ? " · ends at period" : ""}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {membershipPlan && selfServe && (
              <div className="mt-8 border-t border-white/[0.06] pt-6">
                <p className="text-sm font-medium text-[var(--foreground)]">Start membership</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {stripeOk ? (
                    <StripeCheckoutButton planSlug={membershipPlan.slug} label="Stripe membership" />
                  ) : (
                    <p className="text-xs text-[var(--muted-foreground)]">Stripe not configured.</p>
                  )}
                  <PayPalSubscriptionButton
                    planSlug={membershipPlan.slug}
                    disabled={!membershipPlan.paypalPlanId || !paypalOk}
                  />
                </div>
              </div>
            )}
            {membershipPlan && !selfServe && (
              <div className="mt-8 border-t border-white/[0.06] pt-6">
                <p className="text-sm font-medium text-[var(--foreground)]">Membership checkout</p>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                  Not available until payment providers are configured. Ask an administrator if you need
                  access now.
                </p>
              </div>
            )}
          </div>

          <div className="glass-panel rounded-2xl p-6">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">Quick links</h2>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link href="/pricing" className="text-[var(--accent)] hover:underline">
                  Public pricing
                </Link>
              </li>
              <li>
                <Link href="/portal/courses" className="text-[var(--accent)] hover:underline">
                  Courses
                </Link>
              </li>
              <li>
                <Link href="/portal/settings" className="text-[var(--accent)] hover:underline">
                  Profile
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="glass-panel rounded-2xl p-6">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">Orders</h2>
            {orders.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--muted-foreground)]">
                No orders yet. Purchases appear here with provider references.
              </p>
            ) : (
              <ul className="mt-4 space-y-3 text-sm">
                {orders.map((o) => (
                  <li
                    key={o.id}
                    className="flex flex-col gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
                  >
                    <div className="flex justify-between gap-2">
                      <span className={`font-medium capitalize ${statusTone(o.status)}`}>
                        {o.status.toLowerCase()}
                      </span>
                      <span className="tabular-nums text-[var(--muted-foreground)]">
                        {centsToDisplay(o.totalCents, o.currency)}
                      </span>
                    </div>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {o.provider} · {o.createdAt.toLocaleString()}
                    </span>
                    {o.items.length > 0 && (
                      <span className="text-xs text-[var(--muted-foreground)]">
                        {o.items.map((i) => i.pricingPlan.name).join(", ")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="glass-panel rounded-2xl p-6">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">Invoices</h2>
            {invoices.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--muted-foreground)]">
                Invoices sync from Stripe subscription billing when configured.
              </p>
            ) : (
              <ul className="mt-4 space-y-2 text-sm">
                {invoices.map((inv) => (
                  <li key={inv.id} className="flex justify-between gap-2 rounded-lg border border-white/[0.05] px-3 py-2">
                    <span className="capitalize text-[var(--muted-foreground)]">{inv.status.toLowerCase()}</span>
                    <span className="tabular-nums text-[var(--foreground)]">
                      {centsToDisplay(inv.amountCents, inv.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">Catalog plans</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {selfServe
              ? "Same rows power marketing pricing and checkout—single source of truth."
              : "Catalogue plans for future self-serve checkout; access today is via invitation or admin grant."}
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {plans.map((p) => (
              <li
                key={p.id}
                className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm"
              >
                <p className="font-medium">{p.name}</p>
                <p className="text-[var(--muted-foreground)]">
                  {centsToDisplay(p.amountCents, p.currency)} · {p.kind} · {p.interval}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
