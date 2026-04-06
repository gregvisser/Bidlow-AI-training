# Controlled core launch — operator checklist

**Use when:** Production is live for **invited / admin-managed users only** — **not** public self-serve paid enrollment. **Billing (Stripe/PayPal) is intentionally deferred.**

**Canonical production URL:** `https://www.bidlow.co.uk`

**Last verified:** **2026-04-06** — public routes **200**; **`/api/ready`** DB up. **Learner** **`learner@bidlow.co.uk`**: portal + course + lesson + completion persistence; billing-deferred copy on **`/pricing`** / **`/portal/billing`**. **Admin** **`greg@bidlow.co.uk`**: **`/admin/ops`** + **`/admin/courses`** + **Core Launch Pilot** edit page — Ops env still shows Stripe/PayPal **not** configured. Prior deploy reference: **`24012503761`** (**`getToken({ secureCookie })`**).

**Access (truth):** There is **no email-invite feature** in the app. Production users are created by operators using **`npm run ops:create-user`** (see **`LAUNCH_READINESS.md`** — *Manual production user — copy/paste commands*), or **Google sign-in** if enabled, or raw DB/script access. **Temporary self-serve** only if **`INVITE_ONLY_REGISTER=false`** (omit in production). Seed emails in `LAUNCH_READINESS.md` are **not** for production.

### Create a pilot or admin login (operator)

1. On a trusted machine, set **`DATABASE_URL`** to production (Key Vault / App Service — **never commit**).
2. Set **`CREATE_USER_EMAIL`**, **`CREATE_USER_PASSWORD`** (min 8), **`CREATE_USER_NAME`**, **`CREATE_USER_ROLE`** (`LEARNER` or `ADMIN`; `SUPER_ADMIN` only if required).
3. From repo root: **`npm run ops:create-user`**.
4. Sign in at **`https://www.bidlow.co.uk/login`**. Do **not** paste passwords into chat or tickets.

### Enroll a learner in a course (operator)

1. If **`ops:list-courses`** is empty, run **`npm run ops:create-min-course`** (or **`scripts/ops-prod-min-course-and-enroll.ps1`** from a trusted shell with `az` + Key Vault access) to insert **`core-launch-pilot`** + enroll **`learner@bidlow.co.uk`**.
2. Else **`npm run ops:list-courses`** — pick a row with **`PUBLISHED`** and note **`slug`**.
3. **`$env:ENROLL_USER_EMAIL`**, **`$env:COURSE_SLUG`**, **`$env:DATABASE_URL`** → **`npm run ops:grant-enrollment`**.
4. Learner **`/portal/courses`** should list that course; open **`/portal/courses/core-launch-pilot/modules/intro/lessons/welcome`** for the minimum pilot path (billing off).

**`/register`:** **Invite-only** unless **`INVITE_ONLY_REGISTER=false`** (staging only). Omit or leave unset in production. The form is hidden by default; legacy **`OPEN_REGISTRATION`** is ignored.

Pair with `LAUNCH_READINESS.md`, `docs/GO_LIVE_SIGNOFF.md`, and `docs/DEPLOYMENT_AZURE.md`.

---

## Core routes (public smoke)

After deploy or incident, verify **200** (or expected auth redirect for protected paths):

| Path | Expected |
|------|----------|
| `/` | 200 |
| `/api/health` | 200 |
| `/api/ready` | 200 (503 if DB unreachable — investigate) |
| `/pricing` | 200 — copy should **not** promise live self-serve checkout when providers are off |
| `/login` | 200 |
| `/register` | 200 — invite-only copy when `INVITE_ONLY_REGISTER` is unset |
| `/portal` (signed out) | **3xx redirect** to `/login?callbackUrl=…` (e.g. **307**) — not **500** (middleware: `next-auth/jwt` `getToken` only; no Prisma in Edge bundle) |

**Quick check (no secrets):** `curl -sI` each URL above and confirm `HTTP/1.1 200`.

---

## Learner checks (invited user)

- [x] Sign in with a **real** invited learner account — **verified 2026-04-06** with **`learner@bidlow.co.uk`** on production.
- [x] Open **Dashboard** → **Courses** → a course you should access — **Core Launch Pilot** listed; dashboard showed **1** course enrolled, **0/1** lessons before completion test.
- [x] Open a **lesson** and confirm content loads; progress updates as expected — **welcome** lesson; **Mark complete** → **Mark incomplete** after save; **persists after reload**.
- [ ] **Reports** / **Certificates** (as applicable) load without errors — not explicitly exercised in the 2026-04-06 pass.
- [ ] If a course is **locked**, messaging explains **invitation/admin access** — not a broken checkout — N/A for included pilot course; locked-course copy not re-tested in that pass.

---

## Admin checks

- [x] Sign in as **staff/admin** — **verified 2026-04-06** with **`greg@bidlow.co.uk`** (Staff **`/portal`**, no login loop).
- [x] **Admin → Courses** — list and edit load — **verified 2026-04-06** (**Core Launch Pilot** listed; **Edit** opens **`/admin/courses/…/edit`**). Hero **upload** not exercised in that pass (Blob present per Ops; **no hero** on pilot course).
- [x] **Admin → Operations** — env/readiness reflects production — **verified 2026-04-06** (Stripe/PayPal **not set**; DB connected; no secrets printed).
- [ ] **User/access management** — use the flows you rely on today (entitlements, invites, or DB-backed grants — see `LAUNCH_READINESS.md` / ops docs for the **actual** access path in your tenant).

---

## Uploads

- [ ] Admin course edit → **hero image** upload (JPEG/PNG/WebP, size limits) succeeds if Azure Blob env is set.
- [ ] Learner course page shows the image.

---

## Billing page (expectations)

- [x] **`/portal/billing`** — shows **controlled access / billing deferred** messaging when Stripe **and** PayPal are not configured; **no** misleading “start membership” checkout when self-serve billing is unavailable — **verified 2026-04-06** (signed-in learner: heading **Controlled access — billing deferred**; explanatory copy; no checkout).
- [x] **`/pricing`** — informational catalogue only; no working public checkout until providers are enabled — **verified 2026-04-06** (copy: paid self-serve not available yet; invitation / contact).

---

## What **not** to promise yet

- Public **self-serve** purchase or **instant paid enrollment** via the site.
- **Live** card/PayPal checkout without operators enabling providers + webhooks (`docs/GO_LIVE_SIGNOFF.md`).

---

## What to monitor after launch

- **`/api/ready`** — database connectivity.
- **App Service** 5xx rate and latency (Azure Portal / App Insights if enabled).
- **Auth** — failed logins spike, cookie/session issues on canonical hostname.
- **Webhooks** — when billing is enabled later: Stripe/PayPal dashboard delivery success.

---

## Next phase before public paid rollout

1. Configure **Stripe and/or PayPal** (keys, webhooks, plan/price IDs aligned to `PricingPlan` rows).
2. Re-verify **`/pricing`** and **`/portal/billing`** with real sandbox transactions.
3. Complete **`docs/GO_LIVE_SIGNOFF.md`** payment rows and sign-off.

---

## Rollback / sanity if something breaks

1. **App:** Redeploy last known-good **GitHub Actions** artifact to the Web App (`docs/DEPLOYMENT_AZURE.md` — Basic B1 has **no** deployment slots).
2. **Health:** Confirm `/api/health` and `/api/ready` on `https://www.bidlow.co.uk`.
3. **DB:** Do not run destructive fixes without backup; migrations are manual (`prisma migrate deploy`).

---

## Access model (truth)

**Today:** Users are expected to be **invited** or **created/managed by administrators**; entitlements and course access are enforced server-side. **Self-serve checkout** appears only when at least one payment provider is configured (`isSelfServeBillingAvailable()` in code).
