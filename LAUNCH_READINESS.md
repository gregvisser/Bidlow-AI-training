# Launch readiness — AI Training Portal

Concise operator guide for staging and production. Pair with `docs/DEPLOYMENT_AZURE.md`, `docs/POST_DEPLOY_CHECKLIST.md`, **`docs/STAGING_VERIFICATION.md`**, and **`docs/GO_LIVE_SIGNOFF.md`**. Use **`/admin/ops`** for live env + webhook proof surfaces.

## Production snapshot — core app (2026-04-03)

- **Core app URL (default hostname):** `https://bidlow-ai-training-prod.azurewebsites.net` — **billing intentionally not enabled** (no Stripe/PayPal keys in App Service or GitHub for this pass).
- **Infra:** `rg-bidlow-ai-training-prod` — PostgreSQL **`bidlow-ai-training-prod-pg`** + Storage **`bidlowaitrainingprod`** in **UK South**; Web App **`bidlow-ai-training-prod`** on **Linux B1** in **West Europe** (plan **`bidlow-ai-training-prod-plan`**) because App Service **compute quota in UK South was 0** at create time. Cross-region app → DB until you colocate or raise quota.
- **CI/CD:** GitHub Environment **`production`** — OIDC + `az webapp deploy` (see `docs/DEPLOYMENT_AZURE.md`). **DB migrations** are manual: `npx prisma migrate deploy` (already applied once for production schema).
- **Hardening (2026-04-03):** **Key Vault** `kv-bidlow-training-prod` holds core secrets; App Service uses **Key Vault references** for `DATABASE_URL`, `AUTH_SECRET`, and `AZURE_STORAGE_CONNECTION_STRING`. **Plan is Basic B1 — no deployment slots.** **Custom domain** is still **not** bound in Azure (only the default `*.azurewebsites.net` hostname); add DNS + **Managed Certificate** when the domain is ready.
- **Smoke (paths only):** `/`, `/api/health`, `/api/ready`, `/pricing`, `/login` — **200** on default hostname after hardening.
- **Payments go-live:** Add provider keys + webhooks, then follow **`docs/GO_LIVE_SIGNOFF.md`** billing rows.

## Demo / seed accounts (local & staging)

After `npm run db:seed`:

| Role    | Email                   | Password     |
|---------|-------------------------|--------------|
| Admin   | `admin@aitraining.local` | `Admin123!`  |
| Learner | `learner@aitraining.local` | `Learner123!` |

The seeded learner receives a **manual entitlement** to the core curriculum so lesson flows and progress work without a real payment.

## Required secrets (production)

- **Auth:** `AUTH_SECRET` (32+ chars), `AUTH_URL` (public app URL).
- **Database:** `DATABASE_URL` (PostgreSQL).
- **Stripe (optional but needed for cards):** `STRIPE_SECRET_KEY`, webhook signing secret, price IDs as used in DB / env.
- **PayPal (optional):** `NEXT_PUBLIC_PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MODE`, plan IDs on `PricingPlan` rows, webhook id.
- **Azure Blob (hero images):** storage account + container env vars as in `.env.example`.

## Webhook verification checklist

1. Stripe: endpoint URL matches deployed `/api/webhooks/stripe`, signing secret matches env, events subscribed per implementation.
2. PayPal: webhook URL reachable, id verified in dashboard, sandbox vs live matches `PAYPAL_MODE`.
3. After deploy, send test events and confirm rows in `Order`, `Subscription`, `Entitlement` update as expected.

## Billing verification checklist

1. **Not configured:** Visit `/portal/billing` and `/pricing` — expect clear banners, not silent failures (Stripe/PayPal missing).
2. **Cancel:** Start checkout → cancel → return URL should show canceled messaging on billing.
3. **Success boundary:** After provider redirect, billing shows “checkout completed” while webhooks finalize DB state.
4. **Portal:** Stripe customer portal only after a Stripe customer exists (`portal=missing` otherwise).
5. **Invalid plan:** Tampered `planSlug` redirects with `checkout=invalid_plan`.

## Upload verification (hero image)

1. Azure Blob env set per `.env.example`.
2. Admin → edit course → upload JPEG/PNG/WebP under **5 MB**.
3. Learner course page shows hero with correct aspect behavior; remove + re-upload works.

## Smoke tests (E2E)

```bash
npm install
npx prisma migrate deploy
npm run db:seed
npm run test:e2e
```

Requires a **reachable PostgreSQL** (`DATABASE_URL`). Playwright starts `npm run dev` (or reuses an existing server). Tests that need the database are **skipped** when `/api/ready` is not `200` (e.g. DB down), so CI without Postgres still gets passing smoke checks for health and the marketing home page. For full coverage, run against local or staging DB with seed applied. Uses seed accounts above.

## Gates (release candidate)

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e   # optional but recommended before tag
```

## Rollback / incident-first checks

1. **App:** Revert deployment slot or previous container image revision; confirm `/api/health` and `/api/ready`.
2. **DB:** No destructive migrations without backup; document last good migration name.
3. **Billing:** If webhooks paused, stop marketing checkouts or display maintenance banner; do not grant access manually without matching entitlements in DB.

## Immediately after first production deploy

1. Hit `/api/health` and `/api/ready` (DB reachable).
2. Sign in with a real test user; open dashboard, one course, billing.
3. Run one **sandbox** payment per provider you use; confirm entitlement/subscription rows.
4. Confirm admin CMS save shows validation banners on bad input (not silent).
5. Scan application logs / Azure Monitor for 5xx and webhook errors.

## What is launch-ready vs needs real credentials

| Area              | Launch-ready in repo                         | Needs production setup                          |
|-------------------|-----------------------------------------------|-------------------------------------------------|
| Core app & UX     | Yes                                           | Custom domain, TLS, cookies                     |
| Auth              | Yes                                           | Real IdP secrets, `AUTH_URL`                    |
| Billing           | Flows + messaging                            | Live Stripe/PayPal keys, webhooks, price IDs  |
| Hero uploads      | Yes when Blob configured                     | Storage account, CORS, SAS or MI                |
| Monitoring        | Health/ready endpoints                        | Alerts, dashboards, log retention               |

## Non-blocking gaps (optional hardening)

- PDF certificates in Blob (print view exists today).
- Full CI E2E with Postgres service (currently run E2E locally or extend pipeline).
