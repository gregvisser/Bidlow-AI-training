# Azure production deployment

This app targets **Azure App Service (Linux, Node 20)** with **Azure Database for PostgreSQL**, **Azure Blob Storage** for media, and optional **Application Insights**.

## Azure resources (assumed)

| Resource | Purpose |
|----------|---------|
| **App Service Plan** (Linux) | Hosts the Next.js Node process |
| **Web App** | Runs `node server.js` from the standalone build |
| **Azure Database for PostgreSQL – Flexible Server** | `DATABASE_URL` for Prisma |
| **Storage account + blob container** | Course images (`course-assets` or `AZURE_STORAGE_CONTAINER_NAME`) |
| **Application Insights** (optional) | Metrics, failures, dependencies (enable from portal or connection string) |
| **Key Vault** (recommended) | Secrets referenced from App Service settings |

### Production Key Vault (observed 2026-04-03)

- **Vault:** `kv-bidlow-training-prod` in **`rg-bidlow-ai-training-prod`** (West Europe), **RBAC** authorization enabled. If `az keyvault create` fails with `MissingSubscriptionRegistration`, run `az provider register --namespace Microsoft.KeyVault --wait` once per subscription.
- **Web App** `bidlow-ai-training-prod` has a **system-assigned managed identity** with **Key Vault Secrets User** on the vault (runtime resolution of references).
- **Secrets stored:** `DATABASE-URL`, `AUTH-SECRET`, `AZURE-STORAGE-CONNECTION-STRING` (names in Key Vault; hyphens are normal).
- **App Service references:** `DATABASE_URL`, `AUTH_SECRET`, and `AZURE_STORAGE_CONNECTION_STRING` use **`@Microsoft.KeyVault(SecretUri=https://kv-bidlow-training-prod.vault.azure.net/secrets/...)`** (latest version). Non-secret settings remain plain (`AUTH_URL`, `APP_BASE_URL`, `AZURE_STORAGE_CONTAINER_NAME`, `NODE_ENV`, `WEBSITES_PORT`).
- **GitHub Actions build** still needs **literal** `DATABASE_URL`, `AUTH_SECRET`, etc. in Environment **`production`** for `npm run build` / Prisma. Keep those values **aligned** with Key Vault when you rotate secrets (update both Key Vault and GitHub).
- **App Service plan** is **Basic B1** — **no deployment slots**; roll back by redeploying a previous workflow artifact or zip, not by swapping slots.

## App Service configuration

### Startup

For a **Next.js standalone** build:

1. **General settings → Stack**: Node 20 LTS  
2. **Startup command**: `node server.js`  
3. **Working directory**: the folder where the deployed zip extracted (root should contain `server.js`).

The GitHub Action zips `.next/standalone` so `server.js` is at the root of the package.

### Public URL / HTTPS

- Bind a **custom domain** and enable **HTTPS** (App Service managed certificate or your own).  
- Set **`APP_BASE_URL`** and **`AUTH_URL`** to `https://your-domain` (no trailing slash).  
- Stripe/PayPal **success/cancel** URLs and **webhook** endpoints use this origin.

### Application Insights (recommended)

**Option A — Portal:** Link an Application Insights resource to the Web App (auto-instrumentation for Node on App Service).

**Option B — Connection string:** Add `APPLICATIONINSIGHTS_CONNECTION_STRING` in App Settings (or Key Vault reference). The app uses structured `opsLog` / `console` for operational messages; Azure captures stdout/stderr and request telemetry when the agent is enabled.

Avoid logging secrets, raw webhook bodies, or PII in application code.

## PostgreSQL

- Use **Flexible Server**, TLS required.  
- Connection string format:  
  `postgresql://USER:PASSWORD@HOST.postgres.database.azure.com:5432/DB?sslmode=require`  
- **Migrations are not run by the GitHub Action in this repo.** After the first deploy (or any schema change), run `npx prisma migrate deploy` against the target database from a trusted runner, release pipeline, or operator workstation with network access to Azure PostgreSQL.

## GitHub Actions (deploy workflows)

| Workflow | Triggers | GitHub Environment | Where secrets live |
|----------|----------|--------------------|--------------------|
| `deploy-azure.yml` (**production**) | Push **`main`**, or **workflow_dispatch** | **`production`** on **build** and **deploy** | **OIDC:** `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`. **Build:** `AUTH_SECRET`, `AUTH_URL`, `DATABASE_URL`, `APP_BASE_URL` (should match App Service runtime). Deploy targets **`rg-bidlow-ai-training-prod`** / **`bidlow-ai-training-prod`** via `az webapp deploy` (see workflow file). |
| `deploy-azure-staging.yml` (**staging**) | Push branch **`staging`**, or **workflow_dispatch** | **`staging`** on **build** and **deploy** | Same OIDC + build secret pattern; deploy targets **`rg-bidlow-ai-training-staging`** / **`bidlow-ai-training-staging`**. |

Full staging secret list and UI steps: **[GITHUB_STAGING_SETUP.md](./GITHUB_STAGING_SETUP.md)**.

**Production** — Entra app **`bidlow-ai-training-staging-gh-oidc`** (shared with staging) uses federated credentials for GitHub `environment:staging` and `environment:production` (`repo:gregvisser/Bidlow-AI-training:environment:production`). The service principal has **Contributor** on **`rg-bidlow-ai-training-staging`** and **`rg-bidlow-ai-training-prod`**.

**Production** workflow — required Environment **`production`** secrets (names only):

| Secret | Purpose |
|--------|---------|
| `AZURE_CLIENT_ID` | OIDC application (client) id |
| `AZURE_TENANT_ID` | Microsoft Entra tenant |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription |
| `AUTH_SECRET` | Build-time; must match App Service |
| `AUTH_URL` | Public HTTPS origin (no trailing slash) |
| `DATABASE_URL` | Build-time Prisma; align with production DB policy |
| `APP_BASE_URL` | Canonical origin for links |

**Database migrations are not run** in either deploy workflow. Run `npx prisma migrate deploy` against the target database after deploy (or from a trusted machine with firewall access to PostgreSQL).

**Deploy note:** Production uses `az webapp deploy --track-status false` so the job does not fail on the default 10-minute startup wait on cold **Basic** plans; verify `/api/health` after deploy.

**App Service Application settings** must still define runtime configuration (`AUTH_URL`, `APP_BASE_URL`, blob container, billing when enabled, etc.). Sensitive values can be **Key Vault references** (production uses them for `DATABASE_URL`, `AUTH_SECRET`, `AZURE_STORAGE_CONNECTION_STRING`). The zip artifact does not inject secrets at runtime.

## Blob Storage

1. Create a storage account (general-purpose v2).  
2. Create a container (e.g. `course-assets`).  
3. Set **public read access** for **blob** if learners should load hero images without SAS (typical for public marketing images).  
4. App settings (or Key Vault):

   - `AZURE_STORAGE_CONNECTION_STRING` **or** `AZURE_STORAGE_ACCOUNT_NAME` + `AZURE_STORAGE_ACCOUNT_KEY`  
   - `AZURE_STORAGE_CONTAINER_NAME` (default `course-assets`)  
   - Optional: `AZURE_STORAGE_PUBLIC_BASE_URL` if you front blobs with CDN/custom domain.

## Environment variables (App Service)

See root **`.env.example`** for the full list. Required for production:

- `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `APP_BASE_URL`  
- Billing: `STRIPE_*`, `PAYPAL_*` as used in your environment  
- Blob: storage connection or name+key  

Use **Key Vault references** in App Service: `@Microsoft.KeyVault(SecretUri=...)`.

## Webhooks (after go-live)

- **Stripe:** Dashboard → Webhooks → endpoint `https://<domain>/api/webhooks/stripe` — raw body signing unchanged on App Service.  
- **PayPal:** Developer dashboard → Webhooks → `https://<domain>/api/webhooks/paypal`.

## Rollback

- Redeploy a previous **GitHub Actions artifact** or prior zip to the Web App.  
- Database: restore PostgreSQL backup if a bad migration shipped (test migrations in staging first).

## Related

- [POST_DEPLOY_CHECKLIST.md](./POST_DEPLOY_CHECKLIST.md) — operator verification steps.
