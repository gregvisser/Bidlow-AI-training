# Controlled core launch — operator checklist

**Use when:** Production is live for **invited / admin-managed users only** — **not** public self-serve paid enrollment. **Billing (Stripe/PayPal) is intentionally deferred.**

**Canonical production URL:** `https://www.bidlow.co.uk`

**Last verified:** **2026-04-05** — deploy run **24010093584** green; public smoke **200** on `/`, `/api/health`, `/api/ready`, `/pricing`, `/login`; live HTML on **`www`** matches controlled-launch copy (invite/admin; pricing honest about deferred self-serve). Logged-in portal checks not run in automation (no production credentials in session).

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
| `/register` | 200 — invite-only copy when `OPEN_REGISTRATION` is unset |

**Quick check (no secrets):** `curl -sI` each URL above and confirm `HTTP/1.1 200`.

---

## Learner checks (invited user)

- [ ] Sign in with a **real** invited learner account (not seed credentials on production unless you explicitly created them).
- [ ] Open **Dashboard** → **Courses** → a course you should access.
- [ ] Open a **lesson** and confirm content loads; progress updates as expected.
- [ ] **Reports** / **Certificates** (as applicable) load without errors.
- [ ] If a course is **locked**, messaging explains **invitation/admin access** — not a broken checkout.

---

## Admin checks

- [ ] Sign in as **staff/admin**.
- [ ] **Admin → Courses** — list and edit load; hero upload works if Blob is configured.
- [ ] **Admin → Operations** — env/readiness reflects production (no surprise missing critical secrets).
- [ ] **User/access management** — use the flows you rely on today (entitlements, invites, or DB-backed grants — see `LAUNCH_READINESS.md` / ops docs for the **actual** access path in your tenant).

---

## Uploads

- [ ] Admin course edit → **hero image** upload (JPEG/PNG/WebP, size limits) succeeds if Azure Blob env is set.
- [ ] Learner course page shows the image.

---

## Billing page (expectations)

- [ ] **`/portal/billing`** — shows **controlled access / billing deferred** messaging when Stripe **and** PayPal are not configured; **no** misleading “start membership” checkout when self-serve billing is unavailable.
- [ ] **`/pricing`** — informational catalogue only; no working public checkout until providers are enabled.

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
