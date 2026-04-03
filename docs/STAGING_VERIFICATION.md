# Staging verification — AI Training Portal

Use this in order. Pair with `LAUNCH_READINESS.md` and `GO_LIVE_SIGNOFF.md`.

## Operator pass log (staging)

**Date:** 2026-04-03  
**Base URL:** `https://bidlow-ai-training-staging.azurewebsites.net`

### Infrastructure / public

| Check | Result |
|-------|--------|
| `GET /` | 200 |
| `GET /api/health` | 200 |
| `GET /api/ready` | 200 |
| `GET /pricing` | 200 |
| `GET /login` | 200 |

### Azure App Service — billing-related settings (names only)

Audited via Azure CLI: **all of the following were missing** on the staging Web App at the time of this pass:

- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `NEXT_PUBLIC_PAYPAL_CLIENT_ID`, `PAYPAL_WEBHOOK_ID`, `PAYPAL_MODE`

**Conclusion:** Real Stripe/PayPal checkout and webhook-driven entitlement proof **cannot** be verified on staging until these (or equivalent) settings are configured in App Service and provider dashboards.

### Azure App Service — blob (names only)

- `AZURE_STORAGE_CONNECTION_STRING` — **present**
- `AZURE_STORAGE_CONTAINER_NAME` — **present**
- `AZURE_STORAGE_ACCOUNT_NAME` — **missing** (connection string alone satisfies current app checks for “blob configured”)

### Authenticated flows (seed / docs accounts)

Playwright was run against live staging with `PLAYWRIGHT_BASE_URL` set to the URL above and `CI=true` (no local dev server).

- **Passed:** Marketing home, health/ready API checks, pricing “Plans” heading, purchase entry UI on pricing (signed out), `/api/admin/ops/env` returns **401** without session.
- **Failed / timed out:** Tests that sign in with `admin@aitraining.local` / `learner@aitraining.local` and `waitForURL(/portal)` — **30s timeout** (no redirect to `/portal` in time).

**Likely blockers (one or more):** seed users and roles not present in staging PostgreSQL, password mismatch vs docs, or auth URL / session configuration not aligned with manual testing assumptions.

**Action:** Run `npm run db:seed` (or equivalent) against the **staging** database with operator approval, **or** create dedicated staging-only users and update this doc with non-production test identities (still no secrets in tickets).

### Billing / webhooks / entitlements

With Stripe/PayPal app settings absent, **PaymentEvent** / ops billing tables **were not** end-to-end verifiable as part of this pass. Treat billing as **not yet verifiable** on staging until providers are configured.

---

## A) Environment setup

1. Copy `.env.example` → `.env` and fill values (no secrets in chat or tickets).
2. **Admin ops (recommended):** Sign in as staff → **Operations** (`/admin/ops`) — confirm **Environment readiness** shows expected “ok” for auth, database, Stripe/PayPal (if used), blob, URLs.
3. Optional JSON: `GET /api/admin/ops/env` (same auth cookie as browser or use authenticated session).

## B) Database

1. `npx prisma migrate deploy`
2. `npm run db:seed` (staging only if appropriate; never seed production with demo passwords).

## C) Auth

1. Register a test user or use seed accounts.
2. Confirm `/login` → `/portal` and `/admin` routes enforce role (learner cannot open admin).

## D) Learner flow

1. Dashboard, courses, one lesson, reports — no 500s.
2. Complete a lesson and confirm progress persists after refresh.

## E) Admin CMS

1. Edit a course field, save — validation errors show if invalid.
2. Optional: hero image upload if Azure Blob env is set.

## F) Stripe one-time purchase

1. Use Stripe sandbox keys and test card.
2. Complete checkout → return to billing with success query.
3. **Proof:** `/admin/ops` → recent **orders** (PAID), **payment events** (Stripe rows), **Entitlement verification** for learner email + course slug.

## G) Stripe subscription

1. Start membership checkout → complete.
2. **Proof:** subscriptions list on `/portal/billing` and `/admin/ops`; webhook events table shows Stripe types (e.g. `checkout.session.completed`, `customer.subscription.*`).

## H) PayPal one-time

1. Sandbox app + return URLs pointing at staging base URL.
2. **Proof:** `PaymentEvent` rows with PAYPAL, order PAID.

## I) PayPal subscription (if configured)

1. Same as PayPal one-time with billing plan id on `PricingPlan`.
2. **Proof:** subscription row + PayPal events.

## J) Webhook proof

1. In Stripe/PayPal dashboards, confirm delivery to your deployed URLs.
2. In `/admin/ops`, confirm **Payment / webhook events** shows new rows with masked ids and expected event types.
3. **No raw payload** is shown in the UI by design.

## K) Entitlement proof

1. Use **Entitlement verification** on `/admin/ops` with learner email + course slug.
2. Read reasons (included / entitlement / subscription / denied).

## L) Azure Blob upload

1. Configure storage env vars.
2. Upload hero on admin course edit.
3. **Proof:** `/admin/ops` → **Recent uploads**; learner course page shows image.

## M) Health / readiness

1. `node scripts/verify-staging.mjs` or curl `/api/health` and `/api/ready`.
2. **Ready** returns 503 if DB is down — expect 200 when healthy.

## N) Automation

- `npm run test:e2e` (with DB + seed for full coverage; tests skip DB-dependent cases when `/api/ready` is not 200).
