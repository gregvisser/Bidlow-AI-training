# AI Training Portal

Full-stack Next.js app for structured AI training programs: marketing site, authenticated learner/admin portal, Prisma + PostgreSQL, Auth.js (email/password + optional Google OAuth), and a production-oriented Prisma 7 setup with the PostgreSQL driver adapter.

## Architecture (concise)

| Layer | Responsibility |
|--------|----------------|
| **App Router** | Routes grouped as `(marketing)`, `(auth)`, `(portal)`; server components + server actions |
| **`src/auth.ts`** | Auth.js config, JWT sessions, Prisma adapter, credentials + optional Google |
| **`src/lib/db.ts`** | Singleton `PrismaClient` with `@prisma/adapter-pg` + `pg` `Pool` (Prisma 7) |
| **`prisma/schema.prisma`** | Users, catalog (paths, courses, modules, lessons), progress, billing models, entitlements, audit |
| **Middleware** | Protects `/portal/*` and `/admin/*`; admin requires `ADMIN` or `SUPER_ADMIN` |

Course UX, admin CMS, analytics, **Stripe + PayPal billing with webhooks**, **Azure Blob hero uploads**, entitlements, **health/ready APIs**, **GitHub Actions CI + Azure deploy workflow**, and tests are implemented. See [docs/DEPLOYMENT_AZURE.md](docs/DEPLOYMENT_AZURE.md) and [docs/POST_DEPLOY_CHECKLIST.md](docs/POST_DEPLOY_CHECKLIST.md).

## Prerequisites

- Node.js 20+
- PostgreSQL 15+ (local or Docker)
- **Package manager:** This machine scaffolded with **npm** because `pnpm` was not on PATH. To use **pnpm**, install it (`corepack enable pnpm` or `npm i -g pnpm`) and run `pnpm install` / `pnpm dev` instead of `npm`.

## Local setup

1. Copy environment variables:

   ```bash
   cp .env.example .env
   ```

2. Set `DATABASE_URL` to a standard PostgreSQL URL (not `prisma+` URLs—use `postgresql://...` for the `pg` driver).

3. Set `AUTH_SECRET` (e.g. `openssl rand -base64 32`).

4. Apply schema and seed:

   ```bash
   npx prisma migrate deploy
   npm run db:seed
   ```

5. Start the dev server:

   ```bash
   npm run dev
   ```

### Seeded accounts (development)

| Role | Email | Password |
|------|--------|----------|
| Admin | `admin@aitraining.local` | `Admin123!` |
| Learner | `learner@aitraining.local` | `Learner123!` |

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript |
| `npm run db:migrate` | `prisma migrate deploy` |
| `npm run db:seed` | Seed database |
| `npm run test` | Vitest (unit tests) |

## Azure production deployment

- **Guide:** [docs/DEPLOYMENT_AZURE.md](docs/DEPLOYMENT_AZURE.md) — App Service, PostgreSQL, Blob Storage, Key Vault, HTTPS, webhooks.  
- **After deploy:** [docs/POST_DEPLOY_CHECKLIST.md](docs/POST_DEPLOY_CHECKLIST.md).  
- **CI:** `.github/workflows/ci.yml` (lint, typecheck, test, build on push/PR).  
- **Staging / deploy readiness matrix:** [docs/STAGING_DEPLOY_READINESS.md](docs/STAGING_DEPLOY_READINESS.md).  
- **GitHub staging (Phase 1):** [docs/GITHUB_STAGING_SETUP.md](docs/GITHUB_STAGING_SETUP.md) — Environment `staging`, secret names, manual UI steps.  
- **Deploy (production):** `.github/workflows/deploy-azure.yml` — **main** / manual; Environment **`production`** for deploy; build uses **repository** secrets for `AUTH_*` / `DATABASE_URL` / optional `APP_BASE_URL`.  
- **Deploy (staging):** `.github/workflows/deploy-azure-staging.yml` — branch **`staging`** / manual; Environment **`staging`** on build + deploy. Same Azure deploy action; separate Web App secrets per environment.  
- **Database migrations are not run in deploy workflows** — run `npx prisma migrate deploy` against the target DB after deploy or in a separate pipeline.  
- **Health:** `GET /api/health` (liveness), `GET /api/ready` (DB + blob config check).  
- **Application Insights:** Prefer enabling **Application Insights** on the Web App in Azure Portal (or set `APPLICATIONINSIGHTS_CONNECTION_STRING`). The `applicationinsights` Node SDK was **not** bundled (Turbopack compatibility); telemetry is via Azure agent + stdout.

## Billing (Stripe + PayPal)

1. **Stripe**
   - Create a [Stripe](https://dashboard.stripe.com) account (test mode for development).
   - Add API keys and webhook signing secret to `.env` (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, optional `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`).
   - Create a webhook endpoint pointing to `https://<your-domain>/api/webhooks/stripe` and subscribe at minimum to: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`, `charge.refunded`.
   - Enable Apple Pay / Google Pay in the Stripe Dashboard where applicable; Checkout surfaces wallet buttons when eligible.
   - **Customer portal**: after at least one successful subscription checkout, learners can open **Stripe customer portal** from `/portal/billing` (requires a Stripe customer id stored after checkout).

2. **PayPal**
   - Create sandbox (or live) REST app credentials; set `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `NEXT_PUBLIC_PAYPAL_CLIENT_ID`, `PAYPAL_MODE`, and create a [webhook](https://developer.paypal.com/dashboard/) with id `PAYPAL_WEBHOOK_ID` pointing to `https://<your-domain>/api/webhooks/paypal`.
   - One-time checkout uses Orders v2 (create + capture). Subscriptions use Billing Subscriptions API; set `paypalPlanId` on a `PricingPlan` row in the database for PayPal subscription CTAs to activate.

3. **Azure App Service**
   - Configure the same variables in **Configuration → Application settings** (use **Key Vault references** for secrets in production).
   - Set `APP_BASE_URL` and `AUTH_URL` to the public HTTPS URL of the app so success/cancel URLs and webhook callbacks are correct.
   - Ensure the site is served over HTTPS for wallet and PayPal return flows.

4. **Truth model**
   - Access is **not** granted from query parameters after redirect. Orders and subscriptions move to paid/active via **webhooks** or **server-side capture**; `PaymentEvent` stores provider event ids for idempotency.

## Phase 1 status (complete)

- Next.js 16 App Router, TypeScript, Tailwind CSS v4, Framer Motion (marketing hero)
- Auth.js: credentials + optional Google OAuth when `AUTH_GOOGLE_*` / `GOOGLE_*` are set
- Prisma schema + migrations + seed (AI Agent Mastery path, 12 weeks of modules/lessons, pricing plans with `features` JSON for catalog/course access, sample progress; core course is **paid** — unlock via test checkout)
- Premium dark UI shell: marketing layout, auth pages, portal sidebar + dashboard with **live** DB-backed metrics
- `.env.example` documents required vs optional variables (auth, DB, billing, blob, monitoring)
