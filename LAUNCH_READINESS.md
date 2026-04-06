# Launch readiness — AI Training Portal

Concise operator guide for staging and production. Pair with `docs/DEPLOYMENT_AZURE.md`, `docs/POST_DEPLOY_CHECKLIST.md`, **`docs/STAGING_VERIFICATION.md`**, and **`docs/GO_LIVE_SIGNOFF.md`**. Use **`/admin/ops`** for live env + webhook proof surfaces.

## Production snapshot — core app (2026-04-03)

- **Canonical production URL:** **`https://www.bidlow.co.uk`** — **`AUTH_URL`** / **`APP_BASE_URL`** aligned to this origin (Web App + GitHub **`production`**). Default **`https://bidlow-ai-training-prod.azurewebsites.net`** still works. **Billing intentionally not enabled** (no Stripe/PayPal keys in App Service or GitHub for this pass).
- **Infra:** `rg-bidlow-ai-training-prod` — PostgreSQL **`bidlow-ai-training-prod-pg`** + Storage **`bidlowaitrainingprod`** in **UK South**; Web App **`bidlow-ai-training-prod`** on **Linux B1** in **West Europe** (plan **`bidlow-ai-training-prod-plan`**) because App Service **compute quota in UK South was 0** at create time. Cross-region app → DB until you colocate or raise quota.
- **CI/CD:** GitHub Environment **`production`** — OIDC + `az webapp deploy` (see `docs/DEPLOYMENT_AZURE.md`). **DB migrations** are manual: `npx prisma migrate deploy` (already applied once for production schema).
- **Hardening (2026-04-03):** **Key Vault** `kv-bidlow-training-prod` holds core secrets; App Service uses **Key Vault references** for `DATABASE_URL`, `AUTH_SECRET`, and `AZURE_STORAGE_CONNECTION_STRING`. **Plan is Basic B1 — no deployment slots.**
- **Custom domain (2026-04-03):** **`https://www.bidlow.co.uk`** is the **canonical** HTTPS site (managed cert + SNI). **Apex** **`https://bidlow.co.uk`** may still show certificate issues while public DNS exposes multiple **A** records — see **`docs/DEPLOYMENT_AZURE.md`**.
- **Smoke (paths only):** `/`, `/api/health`, `/api/ready`, `/pricing`, `/login` — **200** on **`https://www.bidlow.co.uk`**.
- **Deploy verified (2026-04-05):** GitHub Actions run **[24010093584](https://github.com/gregvisser/Bidlow-AI-training/actions/runs/24010093584)** completed **success** (build + deploy). **`main`** at **`0de56e5`** (controlled core launch UX). Spot-check on **`https://www.bidlow.co.uk`**: home shows invite/admin copy; **`/pricing`** shows “Paid self-serve enrollment is not available yet” and no checkout buttons when providers are off.
- **`/register` fix (2026-04-05):** Run **[24010496447](https://github.com/gregvisser/Bidlow-AI-training/actions/runs/24010496447)** — **`/register`** returns **200** with **invite-only** copy (no global error). Public signup form only if **`INVITE_ONLY_REGISTER=false`** on the Web App.
- **`/register`:** **Invite-only** unless **`INVITE_ONLY_REGISTER=false`** is set on the Web App (then the self-serve form appears). Default/omitted = invite-only. Legacy **`OPEN_REGISTRATION`** is **not** read—set **`INVITE_ONLY_REGISTER=false`** on staging if you need signup testing. Production should **not** set `INVITE_ONLY_REGISTER=false`.
- **`/portal` middleware (2026-04-05):** Edge middleware must **not** bundle Prisma/pg/bcrypt. Even `NextAuth(authConfig)` pulled the full provider graph into the Edge chunk and caused **500** on `/portal` and `/admin`. **`src/middleware.ts`** uses **`getToken`** from **`next-auth/jwt`** (session cookie + `AUTH_SECRET` only). On **HTTPS** production, Auth.js issues **`__Secure-authjs.session-token`**; **`getToken` must use `secureCookie: true`** (infer from `x-forwarded-proto` / URL) or JWT decode fails → **login loop** back to `/login` after successful credentials sign-in. **`src/auth.config.ts`** + **`src/auth.ts`** remain the full Auth.js setup for Node (routes, `authorize`, Prisma adapter).
- **Who can sign in (production):** There is **no in-app invite or “send invitation” flow** in this repo. **`/register`** is invite-only copy unless **`INVITE_ONLY_REGISTER=false`**. Production users are created **outside the UI**: **operator script** (recommended), **Google OAuth** (if configured), raw **DB/Prisma** access, or **self-serve signup** only if you explicitly enable **`INVITE_ONLY_REGISTER=false`** (not recommended for controlled launch). **Do not run demo seed on production** — seed accounts in this doc are **local/staging only** after `npm run db:seed`.
- **Manual user creation (operator):** From a trusted machine with the production **`DATABASE_URL`** (Key Vault / App Service — do not commit), run **`npm run ops:create-user`** with env vars **`CREATE_USER_EMAIL`**, **`CREATE_USER_PASSWORD`** (min 8 chars), **`CREATE_USER_NAME`**, **`CREATE_USER_ROLE`** (`LEARNER`, **`ADMIN`**, or **`SUPER_ADMIN`**). Script: **`scripts/create-production-user.ts`** — creates a user + **`Profile`** row, or **updates password + role + name** if the email already exists. Uses **bcrypt cost 12** like registration. **Never** log or paste passwords into tickets. Then sign in at **`/login`** on **`https://www.bidlow.co.uk`**. See **Manual production user — copy/paste commands** below.
- **Learner course access (operator):** The portal **courses** list is **enrollments only** (`Enrollment` rows). Lesson content unlock uses **`canAccessCourseContent`** in **`src/lib/billing/resolve-access.ts`**: need **enrollment** and then **`pricingModel` included or unset** (treated like included), **or** an active **entitlement**, **or** a qualifying **subscription** — no fake orders required for **included** courses. For a pilot learner: create **`LEARNER`** with **`ops:create-user`**, run **`npm run ops:list-courses`** (`scripts/list-courses-ops.ts`) to see **PUBLISHED** slugs, then **`npm run ops:grant-enrollment`** with **`ENROLL_USER_EMAIL`** + **`COURSE_SLUG`** (`scripts/grant-learner-enrollment.ts`). **Billing remains off**; this path does not create Stripe/PayPal events.
- **Minimum production catalog (2026-04-06):** If production had **no courses**, use **`npm run ops:create-min-course`** (`scripts/create-minimum-production-course.ts`) to insert one **`PUBLISHED`** course (**`core-launch-pilot`**, **`pricingModel` included**, one module **`intro`**, one lesson **`welcome`**) — operator-only, not a CMS feature. Or run **`scripts/ops-prod-min-course-and-enroll.ps1`** (loads **`DATABASE_URL`** from Key Vault via `az`, then create + list + enroll **`learner@bidlow.co.uk`**). **PostgreSQL:** a **temporary firewall rule** for your current public IP may be required from a local machine; remove it after use.
- **Controlled core launch (current posture):** Production core is live for **controlled access** (operator-created accounts or OAuth), not public self-serve signup by default. **Self-serve billing is deferred** (no Stripe/PayPal in App Service). The app treats “no payment providers configured” as **controlled launch** UX: honest copy on `/`, `/pricing`, `/portal/billing`, and locked-course panels — see **`docs/CONTROLLED_CORE_LAUNCH_CHECKLIST.md`**. Checkout UI is suppressed when `isSelfServeBillingAvailable()` is false; API routes and future billing code remain intact.
- **Payments go-live (later):** Add provider keys + webhooks, then follow **`docs/GO_LIVE_SIGNOFF.md`** billing rows.

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

## Manual production user — copy/paste commands

Run from the **`ai-training-portal`** repo root on a machine that can reach PostgreSQL. Set **`DATABASE_URL`** to the **production** connection string (same as App Service / Key Vault — **never commit**). On Windows PowerShell, replace `export` with `$env:VAR = "value"` per line.

**Create an `ADMIN` user (example):**

```bash
export DATABASE_URL="postgresql://…"
export CREATE_USER_EMAIL="you@yourdomain.com"
export CREATE_USER_PASSWORD="…"   # min 8 characters; do not echo or log
export CREATE_USER_NAME="Your Name"
export CREATE_USER_ROLE="ADMIN"
npm run ops:create-user
```

**Create a `LEARNER` pilot user (example):**

```bash
export DATABASE_URL="postgresql://…"
export CREATE_USER_EMAIL="pilot@example.com"
export CREATE_USER_PASSWORD="…"
export CREATE_USER_NAME="Pilot User"
export CREATE_USER_ROLE="LEARNER"
npm run ops:create-user
```

**Super-admin:** use **`CREATE_USER_ROLE="SUPER_ADMIN"`** only when you truly need full operator control; prefer **`ADMIN`** for day-to-day CMS work.

If the email already exists, the script **rotates the password** and updates **name** and **role**. Then open **`https://www.bidlow.co.uk/login`** and sign in with email + password.

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
