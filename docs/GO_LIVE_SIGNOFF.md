# Go / production sign-off — AI Training Portal

**Purpose:** Final checklist before pointing production traffic and real money at this app.

**Owner:** _________________  
**Date:** _________________  
**Environment:** staging verified / production cutover

### Production core — 2026-04-03 (billing deferred)

- **Default hostname:** `https://bidlow-ai-training-prod.azurewebsites.net` — core smoke **200** on `/`, `/api/health`, `/api/ready`, `/pricing`, `/login`. **No Stripe/PayPal** App Service keys in this pass.
- **Azure:** `rg-bidlow-ai-training-prod` — PostgreSQL **`bidlow-ai-training-prod-pg`** + Storage **`bidlowaitrainingprod`** (**UK South**); Web App **`bidlow-ai-training-prod`** on **Linux B1** (**West Europe**) because **UK South** had **no App Service compute quota** for Basic/Standard at create time.
- **GitHub:** Environment **`production`** — OIDC + `az webapp deploy` (see `docs/DEPLOYMENT_AZURE.md`). **Startup command:** `node server.js`.
- **DB:** `prisma migrate deploy` applied to production (operator session). **No** demo seed on production.
- **Key Vault:** Not wired — optional: App Service **Configuration** → Key Vault references.
- **Custom domain / TLS:** **Manual** — Portal → Web App → **Custom domains** → validate DNS per wizard → **TLS/SSL settings** → add **managed certificate**. Then set **`AUTH_URL`** / **`APP_BASE_URL`** (and GitHub secrets) to the custom HTTPS URL.
- **Enable payments (final phase):** Add Stripe/PayPal keys + webhooks, complete checklist rows below.

---

## Pre-flight (must be true)

- [ ] All items in `docs/STAGING_VERIFICATION.md` completed on staging with evidence.
- [ ] `/admin/ops` shows **no missing** critical env for auth, `DATABASE_URL`, and providers you will use in prod.
- [ ] HTTPS public URL configured (`APP_BASE_URL` / `AUTH_URL`); cookies/session work on the real domain.
- [ ] Stripe **live** keys and **live** webhook endpoint + signing secret (if using Stripe).
- [ ] PayPal **live** mode and webhook id (if using PayPal).
- [ ] Azure Blob (if using hero uploads) in production storage account.

## Rollback-first

- [ ] Deployment slot / previous revision / image tag recorded for rollback.
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
