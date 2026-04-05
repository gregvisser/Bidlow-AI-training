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

#### `bidlow.co.uk` → production Web App (GoDaddy DNS — observed 2026-04-03)

Azure **Web App** `bidlow-ai-training-prod` (resource group `rg-bidlow-ai-training-prod`) requires DNS to match before hostnames bind. Values below come from **`az webapp show`** / **`az rest`** (verification id, inbound IP) and from **`az webapp config hostname add`** error messages (TXT hostnames). **Do not invent values** — if Azure rotates verification, re-run hostname add and use the new error text.

| Purpose | Record type | Name / Host (GoDaddy: “Host” for zone `bidlow.co.uk`) | Value |
|--------|-------------|--------------------------------------------------------|--------|
| Domain ownership (apex) | TXT | `asuid` | `7b9435585c43845c742978d69dd1dd59b642c267c70449c9730a024e7f365181` |
| Domain ownership (`www`) | TXT | `asuid.www` | `7b9435585c43845c742978d69dd1dd59b642c267c70449c9730a024e7f365181` |
| Route apex traffic to this App Service | A | `@` | `20.105.232.16` (inbound IP from `properties.inboundIpAddress` via Azure REST for this Web App) |
| Route `www` to this App Service | CNAME | `www` | `bidlow-ai-training-prod.azurewebsites.net` |

**Public DNS snapshot (before changes):** `bidlow.co.uk` had **A** records not pointing at this App Service IP, and **`www.bidlow.co.uk`** was a **CNAME** to an **Azure Static Web Apps** hostname (`*.azurestaticapps.net`). Repointing **`www`** to this App Service **replaces** that Static Web Apps binding for `www`. Confirm no other production workload still needs the old `www` target before changing DNS.

**After DNS propagates:**

1. `az webapp config hostname add --resource-group rg-bidlow-ai-training-prod --webapp-name bidlow-ai-training-prod --hostname bidlow.co.uk`
2. `az webapp config hostname add ... --hostname www.bidlow.co.uk`
3. Managed TLS: `az webapp config ssl create --resource-group rg-bidlow-ai-training-prod --name bidlow-ai-training-prod --hostname bidlow.co.uk` and repeat for `www.bidlow.co.uk` (CLI preview; Portal **TLS/SSL settings** → **Add binding** → **Create App Service Managed Certificate** is equivalent).
4. Set **`AUTH_URL`** and **`APP_BASE_URL`** to one canonical HTTPS origin (e.g. `https://www.bidlow.co.uk` **or** `https://bidlow.co.uk`, no trailing slash) on the Web App and mirror in GitHub Environment **`production`** if used for builds.
5. Re-smoke test `/`, `/api/health`, `/api/ready`, `/pricing`, `/login` on the **custom** hostname.

**GoDaddy API:** not available in this repo/session; DNS must be applied in the **GoDaddy DNS management** UI (or via GoDaddy API with your own credentials). Preserve unrelated **TXT** records (e.g. Microsoft 365, SPF) where possible — add **additional** TXT rows for `asuid` / `asuid.www` rather than overwriting unrelated strings unless your DNS UI requires consolidation.

#### DNS cleanup + TLS (observed 2026-04-03)

- **Canonical production origin:** **`https://www.bidlow.co.uk`** (no trailing slash). **`AUTH_URL`** and **`APP_BASE_URL`** on the Web App and GitHub Environment **`production`** are set to this value. The default **`*.azurewebsites.net`** hostname remains enabled for Azure access.
- **Azure hostname bindings:** **`bidlow.co.uk`** and **`www.bidlow.co.uk`** remain **Verified** on **`bidlow-ai-training-prod`**.
- **`www` HTTPS:** App Service **managed certificate** created and **SNI** binding applied for **`www.bidlow.co.uk`** (`az webapp config ssl create`, `az webapp config ssl bind`). Public **`curl`** / **`Invoke-WebRequest`** to **`https://www.bidlow.co.uk`** paths (e.g. `/api/health`) succeed with **200** without disabling TLS validation.
- **Apex `bidlow.co.uk` HTTPS:** Public DNS (e.g. **8.8.8.8**) may still return **multiple** **A** records for the apex; a managed certificate for **`bidlow.co.uk`** did **not** materialize as a **`Microsoft.Web/certificates`** resource in this session, and **`curl https://bidlow.co.uk`** can still fail certificate validation. Prefer **`https://www.bidlow.co.uk`** as the public URL; to fix apex HTTPS, reduce apex **A** records to the App Service IP only (or use a redirect at the edge) and retry **Create App Service Managed Certificate** for **`bidlow.co.uk`** in the Portal or CLI.
- **Public DNS (8.8.8.8):** **`www.bidlow.co.uk`** → **CNAME** → **`bidlow-ai-training-prod.azurewebsites.net`**. **`asuid`** / **`asuid.www`** **TXT** records present for domain verification.

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

**Controlled core launch:** If **Stripe/PayPal keys are not set**, the app shows **controlled-launch** messaging (no live self-serve checkout on `/pricing` or `/portal/billing`). That is expected for invitation-only rollout; enable providers when you move to public paid self-serve (`docs/CONTROLLED_CORE_LAUNCH_CHECKLIST.md`, `docs/GO_LIVE_SIGNOFF.md`).

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
