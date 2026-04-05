# Go / production sign-off — AI Training Portal

**Purpose:** Final checklist before pointing production traffic and real money at this app.

**Owner:** _________________  
**Date:** _________________  
**Environment:** staging verified / production cutover

### Production core — 2026-04-03 (billing deferred)

- **Canonical hostname:** **`https://www.bidlow.co.uk`** — core smoke **200** on `/`, `/api/health`, `/api/ready`, `/pricing`, `/login` on that origin. Default **`*.azurewebsites.net`** still available. **No Stripe/PayPal** App Service keys in this pass.
- **Controlled core launch:** Access is **invitation / administrator-managed**, not public self-serve checkout. UI copy and pricing/billing surfaces reflect this when payment providers are absent. Operator checklist: **`docs/CONTROLLED_CORE_LAUNCH_CHECKLIST.md`**. Greg should monitor health/ready, 5xx, and auth after invites go out; next phase for **paid public self-serve** is provider keys + webhooks + sign-off below.
- **Azure:** `rg-bidlow-ai-training-prod` — PostgreSQL **`bidlow-ai-training-prod-pg`** + Storage **`bidlowaitrainingprod`** (**UK South**); Web App **`bidlow-ai-training-prod`** on **Linux B1** (**West Europe**) because **UK South** had **no App Service compute quota** for Basic/Standard at create time.
- **GitHub:** Environment **`production`** — OIDC + `az webapp deploy` (see `docs/DEPLOYMENT_AZURE.md`). **Startup command:** `node server.js`.
- **DB:** `prisma migrate deploy` applied to production (operator session). **No** demo seed on production.
- **Key Vault:** **`kv-bidlow-training-prod`** — Web App managed identity has **Secrets User**; App Service settings **`DATABASE_URL`**, **`AUTH_SECRET`**, **`AZURE_STORAGE_CONNECTION_STRING`** use **Key Vault references**. Rotate secrets in Key Vault and keep GitHub build secrets aligned when values change.
- **Custom domain / TLS:** **Canonical:** **`https://www.bidlow.co.uk`** with **App Service managed certificate** and **SNI** for **`www`**. **`AUTH_URL`** / **`APP_BASE_URL`** set to that origin (Web App + GitHub **`production`**). **Apex** **`bidlow.co.uk`** may still need DNS cleanup (single **A** to App Service) for a matching apex cert — details in **`docs/DEPLOYMENT_AZURE.md`**. **Billing** remains off.
- **Deployment slots:** **Not available** on **Basic B1** — use GitHub Actions artifact / redeploy for rollback, not slot swap.
- **Enable payments (final phase):** Add Stripe/PayPal keys + webhooks, complete checklist rows below.
- **Controlled-launch deploy (2026-04-05):** Latest production deploy run **`24010949663`** (success) includes **`getToken`-only** `/portal` middleware fix. **`https://www.bidlow.co.uk`** spot-checked: **`/portal`** (signed out) redirects to **`/login`**; home + pricing show controlled-access / billing-deferred messaging when providers are absent. **Admin/learner logged-in smoke** still requires a real operator session (not automated here).
- **`/register`:** Invite-only unless **`INVITE_ONLY_REGISTER=false`**. Production keeps invite-only (omit the var). **`OPEN_REGISTRATION`** is legacy/ignored. The old self-serve **`RegisterForm`** could error in production; default path is now server-rendered invite copy.
- **`/portal` / `/admin`:** Middleware uses **`getToken` from `next-auth/jwt`** only (no `NextAuth(authConfig)` in Edge — the bundler still pulled Prisma/pg into the middleware chunk and caused **500**). Unauthenticated visits should **redirect to `/login`**, not error.
- **Access model:** No **in-app invite** system. Grant access by **creating users in the database** (or OAuth), enrolling users in courses as your process requires, and sharing credentials **out of band**. Do **not** rely on demo seed accounts in production.

---

## Pre-flight (must be true)

- [ ] All items in `docs/STAGING_VERIFICATION.md` completed on staging with evidence.
- [ ] `/admin/ops` shows **no missing** critical env for auth, `DATABASE_URL`, and providers you will use in prod.
- [ ] HTTPS public URL configured (`APP_BASE_URL` / `AUTH_URL`); cookies/session work on the real domain.
- [ ] Stripe **live** keys and **live** webhook endpoint + signing secret (if using Stripe).
- [ ] PayPal **live** mode and webhook id (if using PayPal).
- [ ] Azure Blob (if using hero uploads) in production storage account.

## Rollback-first

- [ ] **Production is Basic B1 — no slots.** Record a previous **GitHub Actions** deploy artifact or zip to redeploy; slot-based rollback does not apply.
- [ ] Database backup or migration rollback plan documented.

## Production switch

- [ ] Run `prisma migrate deploy` against production DB.
- [ ] **Do not** run demo seed on production.
- [ ] Deploy application; verify `/api/health` and `/api/ready` (200).
- [ ] Smoke login (real operator account), open `/admin/ops`.

## Post-deploy (first 30 minutes)

- [ ] One **real** Stripe test payment (smallest amount) or PayPal sandbox-equivalent in prod **only if** you intend to go live.
- [ ] Confirm webhook deliveries in provider dashboards + new rows in `/admin/ops` payment events.
- [ ] Confirm entitlement explanation for a test learner matches expected access.

## Sign-off

| Role | Name | Approved |
|------|------|----------|
| Engineering | | |
| Operations / Security | | |
| Product / Owner | | |

**Notes:**

---

## Still requires external setup (not in repo)

- DNS, TLS certificates, and firewall rules.
- Provider dashboards (Stripe/PayPal) URLs, secrets rotation, and webhook retry policy.
- Monitoring alerts and on-call rotation.
