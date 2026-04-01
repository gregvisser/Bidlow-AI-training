import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  CircleAlert,
  CircleDot,
  ExternalLink,
} from "lucide-react";
import { PortalHeader } from "@/components/portal/portal-header";
import { auth } from "@/auth";
import { explainCourseAccessByEmail } from "@/lib/ops/access-explanation";
import { getEnvironmentVerification } from "@/lib/ops/env-verification";
import { maskExternalEventId, summarizePaymentEventType } from "@/lib/ops/payment-event-summary";
import { getOpsDashboardData } from "@/lib/queries/ops-dashboard";
import { prisma } from "@/lib/db";
import { isBlobStorageConfigured } from "@/lib/azure/blob-config";

function stateStyles(state: string) {
  switch (state) {
    case "ok":
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-100";
    case "weak":
    case "warning":
      return "border-amber-500/25 bg-amber-500/10 text-amber-100";
    case "missing":
      return "border-rose-500/25 bg-rose-500/10 text-rose-100";
    default:
      return "border-white/10 bg-white/[0.04] text-[var(--muted-foreground)]";
  }
}

export default async function AdminOpsPage({
  searchParams,
}: {
  searchParams: Promise<{ lookupEmail?: string; lookupCourseSlug?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
    redirect("/portal");
  }

  const sp = await searchParams;
  const lookupEmail = sp.lookupEmail?.trim();
  const lookupCourseSlug = sp.lookupCourseSlug?.trim();

  let accessLookup:
    | Awaited<ReturnType<typeof explainCourseAccessByEmail>>
    | null = null;

  if (lookupEmail && lookupCourseSlug) {
    accessLookup = await explainCourseAccessByEmail(lookupEmail, lookupCourseSlug);
  }

  const env = getEnvironmentVerification();
  const dashboard = await getOpsDashboardData();

  let dbPing = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbPing = true;
  } catch {
    dbPing = false;
  }

  const blobReady = isBlobStorageConfigured();

  return (
    <>
      <PortalHeader title="Operations" />
      <div className="flex-1 space-y-10 overflow-auto p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              Staging &amp; production verification
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
              Operator diagnostics
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--muted-foreground)]">
              Read-only views from the database and environment. Secrets are never displayed. Use this after
              deploys and payment tests to prove webhooks and entitlements.
            </p>
          </div>
        </div>

        {/* A — Environment */}
        <section className="glass-panel rounded-2xl p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
              Environment readiness
            </h2>
            <span className="text-xs text-[var(--muted-foreground)]">
              JSON: <code className="rounded bg-black/30 px-1">GET /api/admin/ops/env</code>
            </span>
          </div>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Summary: {env.summary.ok} ok · {env.summary.issues} need attention
          </p>
          <ul className="mt-6 space-y-3">
            {env.checks.map((c) => (
              <li
                key={c.key}
                className={`flex flex-col gap-1 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${stateStyles(c.state)}`}
              >
                <span className="font-medium text-[var(--foreground)]">{c.label}</span>
                <span className="text-sm opacity-95">{c.detail}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* H — Runtime health (live process) */}
        <section className="glass-panel rounded-2xl p-6 md:p-8">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Live runtime checks
          </h2>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            This server process — not the same as external uptime probes.
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            <li className="flex items-center gap-2">
              {dbPing ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden />
              ) : (
                <CircleAlert className="h-4 w-4 text-rose-400" aria-hidden />
              )}
              Database query (SELECT 1): {dbPing ? "connected" : "failed"}
            </li>
            <li className="flex items-center gap-2">
              {blobReady ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden />
              ) : (
                <CircleDot className="h-4 w-4 text-amber-300" aria-hidden />
              )}
              Azure Blob env: {blobReady ? "configured" : "not configured"}
            </li>
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="/api/health"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-[var(--accent)] hover:bg-white/[0.07]"
            >
              /api/health <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
            <a
              href="/api/ready"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-[var(--accent)] hover:bg-white/[0.07]"
            >
              /api/ready <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          </div>
        </section>

        {/* I — Quick links */}
        <section className="glass-panel rounded-2xl p-6 md:p-8">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">Quick links</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {[
              { href: "/pricing", label: "Public pricing" },
              { href: "/portal/billing", label: "Billing (learner)" },
              { href: "/admin/courses", label: "Admin courses" },
              { href: "/admin/reports", label: "Admin reports" },
              { href: "/portal/reports", label: "Learner reports" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-[var(--foreground)] transition hover:border-[var(--accent)]/30"
              >
                {l.label}
                <ArrowUpRight className="h-3.5 w-3.5 text-[var(--accent)]" aria-hidden />
              </Link>
            ))}
          </div>
        </section>

        {/* Entitlement lookup */}
        <section className="glass-panel rounded-2xl p-6 md:p-8">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Entitlement verification
          </h2>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Explains access from database state (same rules as the learner app). No secrets.
          </p>
          <form method="get" className="mt-6 flex max-w-xl flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1">
              <label htmlFor="lookupEmail" className="text-xs text-[var(--muted-foreground)]">
                Learner email
              </label>
              <input
                id="lookupEmail"
                name="lookupEmail"
                type="email"
                defaultValue={lookupEmail ?? ""}
                placeholder="learner@example.com"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-4 py-2.5 text-sm"
              />
            </div>
            <div className="flex-1 space-y-1">
              <label htmlFor="lookupCourseSlug" className="text-xs text-[var(--muted-foreground)]">
                Course slug
              </label>
              <input
                id="lookupCourseSlug"
                name="lookupCourseSlug"
                defaultValue={lookupCourseSlug ?? ""}
                placeholder="ai-agent-mastery-core"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-4 py-2.5 text-sm"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-[var(--accent-foreground)]"
            >
              Explain access
            </button>
          </form>

          {lookupEmail && lookupCourseSlug && accessLookup ? (
            "error" in accessLookup ? (
              <p className="mt-4 text-sm text-amber-200/90">{accessLookup.error}</p>
            ) : (
              <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm font-medium text-[var(--foreground)]">
                  {accessLookup.courseTitle ?? accessLookup.courseSlug}{" "}
                  <span className="text-[var(--muted-foreground)]">({accessLookup.courseSlug})</span>
                </p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">{accessLookup.userEmail}</p>
                <p className="mt-3 text-sm">
                  Access:{" "}
                  <span className={accessLookup.canAccess ? "text-emerald-300" : "text-rose-200/90"}>
                    {accessLookup.canAccess ? "allowed" : "denied"}
                  </span>
                </p>
                <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-[var(--muted-foreground)]">
                  {accessLookup.reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            )
          ) : null}
        </section>

        {/* B–G — Tables */}
        <section className="grid gap-6 xl:grid-cols-2">
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-[family-name:var(--font-display)] text-base font-semibold">
                Recent orders
              </h2>
              <span className="text-xs text-[var(--muted-foreground)]">{dashboard.counts.orders} total</span>
            </div>
            <ul className="mt-4 space-y-3 text-sm">
              {dashboard.recentOrders.length === 0 ? (
                <li className="text-[var(--muted-foreground)]">No orders yet.</li>
              ) : (
                dashboard.recentOrders.map((o) => (
                  <li
                    key={o.id}
                    className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="font-mono text-xs text-[var(--muted-foreground)]">
                        {o.id.slice(0, 12)}…
                      </span>
                      <span className="capitalize text-emerald-200/90">{o.status.toLowerCase()}</span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      {o.user.email} · {o.provider}
                    </p>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="glass-panel rounded-2xl p-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-[family-name:var(--font-display)] text-base font-semibold">
                Recent subscriptions
              </h2>
              <span className="text-xs text-[var(--muted-foreground)]">
                {dashboard.counts.subscriptions} total
              </span>
            </div>
            <ul className="mt-4 space-y-3 text-sm">
              {dashboard.recentSubscriptions.length === 0 ? (
                <li className="text-[var(--muted-foreground)]">No subscriptions yet.</li>
              ) : (
                dashboard.recentSubscriptions.map((s) => (
                  <li
                    key={s.id}
                    className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="font-medium">{s.pricingPlan.name}</span>
                      <span className="capitalize text-amber-100/90">{s.status.toLowerCase()}</span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      {s.user.email} · {s.provider}
                    </p>
                  </li>
                ))
              )}
            </ul>
          </div>
        </section>

        <section className="glass-panel rounded-2xl p-6 md:p-8">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
              Payment / webhook events (stored)
            </h2>
            <span className="text-xs text-[var(--muted-foreground)]">
              {dashboard.counts.paymentEvents} total · payload not shown
            </span>
          </div>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Rows are written after signature verification. Duplicate provider ids are skipped (idempotent).
            Effect on orders/subscriptions is reflected in those tables — not inferred from redirect URLs.
          </p>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
                  <th className="pb-2 pr-4">Time</th>
                  <th className="pb-2 pr-4">Provider</th>
                  <th className="pb-2 pr-4">Event id (masked)</th>
                  <th className="pb-2 pr-4">Type</th>
                  <th className="pb-2 pr-4">User</th>
                  <th className="pb-2">Note</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.recentPaymentEvents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-[var(--muted-foreground)]">
                      No webhook events recorded yet.
                    </td>
                  </tr>
                ) : (
                  dashboard.recentPaymentEvents.map((e) => (
                    <tr key={e.id} className="border-b border-white/[0.04]">
                      <td className="py-3 pr-4 align-top tabular-nums text-xs text-[var(--muted-foreground)]">
                        {e.processedAt.toISOString()}
                      </td>
                      <td className="py-3 pr-4 align-top">{e.provider}</td>
                      <td className="py-3 pr-4 align-top font-mono text-xs">
                        {maskExternalEventId(e.externalEventId)}
                      </td>
                      <td className="py-3 pr-4 align-top text-xs">{e.eventType}</td>
                      <td className="py-3 pr-4 align-top text-xs">{e.userEmail ?? "—"}</td>
                      <td className="py-3 align-top text-xs text-[var(--muted-foreground)]">
                        {summarizePaymentEventType(e.provider, e.eventType)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="glass-panel rounded-2xl p-6">
            <h2 className="font-[family-name:var(--font-display)] text-base font-semibold">
              Recent certificates
            </h2>
            <ul className="mt-4 space-y-2 text-sm">
              {dashboard.recentCertificates.length === 0 ? (
                <li className="text-[var(--muted-foreground)]">None yet.</li>
              ) : (
                dashboard.recentCertificates.map((c) => (
                  <li key={c.id} className="rounded-lg border border-white/[0.06] px-3 py-2">
                    <p className="font-medium">{c.title}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {c.user.email} · {c.course.title}
                    </p>
                  </li>
                ))
              )}
            </ul>
          </div>
          <div className="glass-panel rounded-2xl p-6">
            <h2 className="font-[family-name:var(--font-display)] text-base font-semibold">
              Recent uploads
            </h2>
            <ul className="mt-4 space-y-2 text-sm">
              {dashboard.recentUploads.length === 0 ? (
                <li className="text-[var(--muted-foreground)]">None yet.</li>
              ) : (
                dashboard.recentUploads.map((u) => (
                  <li key={u.id} className="rounded-lg border border-white/[0.06] px-3 py-2">
                    <p className="text-xs font-mono text-[var(--muted-foreground)]">{u.kind}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {u.course?.title ?? "—"} · {u.bytes ? `${u.bytes} B` : "size n/a"}
                    </p>
                  </li>
                ))
              )}
            </ul>
          </div>
        </section>

        <p className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
          <Activity className="h-4 w-4 text-[var(--accent)]" aria-hidden />
          For scripted checks, run <code className="rounded bg-white/5 px-1">node scripts/verify-staging.mjs</code>{" "}
          (see STAGING_VERIFICATION.md).
        </p>
      </div>
    </>
  );
}
