# Staging verification — AI Training Portal

Use this in order. Pair with `LAUNCH_READINESS.md` and `GO_LIVE_SIGNOFF.md`.

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
