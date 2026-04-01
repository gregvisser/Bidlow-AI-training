# Staging deployment readiness — evidence matrix

This document is the **repo-side** audit artifact. It does **not** assert Azure resources exist; it maps **code + docs** to required configuration.

**GitHub Phase 1 (Environment `staging`, workflows, secret names):** [GITHUB_STAGING_SETUP.md](./GITHUB_STAGING_SETUP.md).

## Verdict (update when staging is live)

Run local gates (`npm run lint`, `typecheck`, `test`, `build`, `test:e2e`) and operator checks on the real staging URL, then record:

- **Last audited (repo):** see git history for `docs/STAGING_DEPLOY_READINESS.md`
- **Staging URL:** _(operator fills after deploy — not stored in repo)_

## Environment matrix (presence only — no values)

| Variable | Required for minimal staging app? | Referenced in app code? | In `.env.example`? | Risk if missing / wrong |
|----------|-----------------------------------|---------------------------|----------------------|---------------------------|
| `DATABASE_URL` | **Yes** | Yes (`prisma`, `db.ts`) | Yes | App cannot connect; `/api/ready` 503 |
| `AUTH_SECRET` | **Yes** | Yes (Auth.js) | Yes | Sessions/auth fail |
| `AUTH_URL` | **Yes** (public URL) | Yes (`auth`, `getAppBaseUrl` fallback) | Yes | Wrong OAuth/callbacks; URL resolution |
| `APP_BASE_URL` | **Strongly recommended** (same as public URL in staging) | Yes (`lib/billing/env.ts`) | Yes | Billing return URLs, webhooks base default to wrong host |
| `STRIPE_SECRET_KEY` | No* | Yes | Yes | *Required if testing Stripe |
| `STRIPE_WEBHOOK_SECRET` | No* | Yes (webhook route) | Yes | *Webhooks 503 without it |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | No | **No** (not read by server checkout in current code) | Yes | Optional / future client-side Stripe |
| `PAYPAL_CLIENT_ID` | No* | Yes (server + `paypalConfigured`) | Yes | *PayPal server API |
| `PAYPAL_CLIENT_SECRET` | No* | Yes | Yes | *PayPal server API |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | No* | Yes (client SDK) | Yes | *PayPal buttons |
| `PAYPAL_WEBHOOK_ID` | No* | Yes | Yes | *PayPal webhooks 503 |
| `PAYPAL_MODE` | No (defaults sandbox) | Yes | Yes | Wrong PayPal API host if wrong |
| `AZURE_STORAGE_CONNECTION_STRING` **or** `AZURE_STORAGE_ACCOUNT_NAME` + `AZURE_STORAGE_ACCOUNT_KEY` | No | Yes | Yes | Hero uploads disabled |
| `AZURE_STORAGE_CONTAINER_NAME` | No | Yes (default `course-assets`) | Yes | Wrong container |
| `AZURE_STORAGE_PUBLIC_BASE_URL` | No | Yes | Yes | Wrong public image URLs if set incorrectly |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | No | Yes (ops env check only) | Yes | No APM |

OAuth (`AUTH_GOOGLE_ID` / `GOOGLE_*`) — optional; see `auth.ts`.

## Repo deployment mechanics (verified)

| Item | Status |
|------|--------|
| Next.js `output: "standalone"` | `next.config.ts` — OK for App Service `node server.js` |
| Workflow stages `public` + `.next/static` into standalone | `deploy-azure.yml` — OK |
| Prisma `postinstall` generate | `package.json` — OK for CI/build |
| Migrations in deploy workflow | **Not automated** — operator must run `npx prisma migrate deploy` against staging DB |
| Build-time secrets in `deploy-azure-staging.yml` | `AUTH_SECRET`, `AUTH_URL`, `DATABASE_URL`; optional `APP_BASE_URL` (Environment **`staging`**) |
| Production build secrets | `deploy-azure.yml` build job uses **repository** secrets for the same names |
| App Service runtime settings | **Must** include full runtime env (especially `APP_BASE_URL`, `AUTH_URL`, providers) — not only build secrets |

## Webhook URLs (documented paths)

- Stripe: `https://<public-host>/api/webhooks/stripe`
- PayPal: `https://<public-host>/api/webhooks/paypal`

Must match `APP_BASE_URL` / actual host.

## Operator commands after first staging deploy

Replace `<STAGING_URL>` (no trailing slash):

```bash
export BASE_URL=https://<STAGING_URL>
npm run verify:staging
curl -sS "$BASE_URL/api/health"
curl -sS "$BASE_URL/api/ready"
```

Then sign in and open `/admin/ops` for env + webhook proof surfaces.
