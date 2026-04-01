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
| `deploy-azure.yml` (**production**) | Push **`main`**, or **workflow_dispatch** | **`production`** on the **deploy** job only | **Repository** secrets for build (`AUTH_SECRET`, `AUTH_URL`, `DATABASE_URL`, optional `APP_BASE_URL`). Environment **`production`** for `AZURE_WEBAPP_NAME`, `AZURE_WEBAPP_PUBLISH_PROFILE`. |
| `deploy-azure-staging.yml` (**staging**) | Push branch **`staging`**, or **workflow_dispatch** | **`staging`** on **build** and **deploy** | All of the above for staging should be under Environment **`staging`** so build and deploy both resolve them. |

Full staging secret list and UI steps: **[GITHUB_STAGING_SETUP.md](./GITHUB_STAGING_SETUP.md)**.

**Production** workflow — required secrets at a glance:

| Secret | Purpose |
|--------|---------|
| `AUTH_SECRET` | Build-time (and should match App Service setting) — **repository** secret for this workflow’s build job |
| `AUTH_URL` | Build-time public URL used during build |
| `DATABASE_URL` | Build-time (align with your policy vs App Service DB) |
| `APP_BASE_URL` | Optional; HTTPS URL for consistent build-time resolution |
| `AZURE_WEBAPP_NAME` | Target Web App name — typically **production** environment |
| `AZURE_WEBAPP_PUBLISH_PROFILE` | Publish profile XML — **production** environment |

**Database migrations are not run** in either deploy workflow. Run `npx prisma migrate deploy` against the target database after deploy.

**App Service Application settings** must still define runtime values (`DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `APP_BASE_URL`, billing, blob, etc.). The zip artifact does not inject secrets at runtime.

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
