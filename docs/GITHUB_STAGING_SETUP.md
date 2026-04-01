# Phase 1 — GitHub staging setup (repo-side)

## A) Purpose of Phase 1

Prepare the **GitHub** side so **staging** is a first-class target: a dedicated **GitHub Environment** named `staging`, documented secrets, and a **separate workflow** that deploys only to staging. This phase does **not** create Azure resources; values are pasted from Azure, Stripe, PayPal, etc. when those exist.

**Out of scope for Phase 1:** Azure provisioning, App Service configuration, database migrations, webhook registration in dashboards (covered after staging URL exists).

---

## B) GitHub UI path — create the `staging` environment

1. Open the repository on GitHub.
2. Click **Settings** (repo settings, not your profile).
3. In the left sidebar, click **Environments**.
4. Click **New environment**.
5. Name: **`staging`** (exactly, lowercase).
6. Click **Configure environment**.

Optional: add **deployment protection rules** (required reviewers, wait timer) if your org requires them.

---

## C) & D) & E) & F) — Secret names, purpose, required vs optional, where values come from

These names match **`.github/workflows/deploy-azure-staging.yml`**. Add them under **Environment secrets** for **`staging`** (recommended), not in the commit history.

| Secret name | Purpose | Required for staging workflow? | Value source (high level) |
|-------------|---------|--------------------------------|---------------------------|
| `AZURE_WEBAPP_NAME` | Target Web App resource name for `azure/webapps-deploy` | **Yes** | Azure Portal → App Service → name |
| `AZURE_WEBAPP_PUBLISH_PROFILE` | Publish profile XML for deployment auth | **Yes** | Azure Portal → App Service → **Get publish profile** (download XML) |
| `AUTH_SECRET` | Auth.js signing (build uses it; must match App Service at runtime) | **Yes** | Generate (e.g. `openssl rand -base64 32`); store in Key Vault or GitHub only |
| `AUTH_URL` | Public app URL for Auth.js (no trailing slash) | **Yes** | Staging URL, e.g. `https://your-staging-app.azurewebsites.net` |
| `DATABASE_URL` | PostgreSQL URL for Prisma at build time | **Yes** | Staging PostgreSQL connection string |
| `APP_BASE_URL` | Canonical origin for billing return URLs and links | **Strongly yes** | Same as public staging URL as `AUTH_URL` typically |

**Billing — optional until you test checkout/webhooks on staging (use test/sandbox keys):**

| Secret name | Purpose | Required now? | Value source |
|-------------|---------|---------------|--------------|
| `STRIPE_SECRET_KEY` | Stripe API (test mode for staging) | Optional | Stripe Dashboard → API keys |
| `STRIPE_WEBHOOK_SECRET` | Verifies Stripe webhook signatures | Optional (required for webhook testing) | Stripe → Webhooks → signing secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client publishable key if used | Optional | Stripe Dashboard (not used by current server-only Checkout path) |
| `PAYPAL_CLIENT_ID` | PayPal REST app | Optional | PayPal Developer Dashboard |
| `PAYPAL_CLIENT_SECRET` | PayPal REST app | Optional | Same |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | PayPal JS SDK (public) | Optional | Same app |
| `PAYPAL_WEBHOOK_ID` | PayPal webhook id in app | Optional | PayPal → Webhooks |
| `PAYPAL_MODE` | `sandbox` or `live` | Optional (defaults in app) | Set `sandbox` for staging |

**Azure Blob — optional until you test uploads:**

| Secret name | Purpose | Required now? | Value source |
|-------------|---------|---------------|--------------|
| `AZURE_STORAGE_CONNECTION_STRING` | Full connection string | Optional* | Storage account → Access keys |
| `AZURE_STORAGE_ACCOUNT_NAME` | Alternative to connection string | Optional* | Storage account name |
| `AZURE_STORAGE_ACCOUNT_KEY` | Paired with account name | Optional* | Access keys |
| `AZURE_STORAGE_CONTAINER_NAME` | Blob container | Optional | e.g. `course-assets` |
| `AZURE_STORAGE_PUBLIC_BASE_URL` | Public base URL for blobs/CDN | Optional | If using custom domain/CDN |

\* Either connection string **or** name + key per app behavior; see `.env.example`.

**Monitoring — optional:**

| Secret name | Purpose | Required now? | Value source |
|-------------|---------|---------------|--------------|
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | APM (if not enabled via portal only) | Optional | Application Insights resource |

**Note:** The **workflow file** only references the **build/deploy** secrets in the table below (H). Runtime settings such as billing and blob should still be set on **Azure App Service → Configuration** for the running app; GitHub secrets for optional rows above are for teams that mirror all config into the environment for documentation or future automation. Minimum to **run** the staging workflow: first six rows (`AZURE_WEBAPP_*`, `AUTH_*`, `DATABASE_URL`, `APP_BASE_URL`).

---

## G) Warnings

- **Never** commit secrets, publish profiles, or connection strings to the repo.
- **Do not** reuse production credentials for staging unless you intentionally accept shared risk; prefer **Stripe test mode**, **PayPal sandbox**, and a **separate staging Web App / database**.
- Staging should use **HTTPS** URLs for `AUTH_URL` and `APP_BASE_URL` once the App Service URL is known.

---

## H) Which workflow uses which secrets

| Workflow file | GitHub Environment | When it runs |
|----------------|-------------------|--------------|
| `.github/workflows/deploy-azure-staging.yml` | **`staging`** (both `build` and `deploy` jobs) | Manual **Run workflow**, or **push** to branch **`staging`** |
| `.github/workflows/deploy-azure.yml` | **`production`** (deploy job only; build uses **repository** secrets) | Manual **Run workflow**, or **push** to **`main`** |

**Staging workflow — secrets read from Environment `staging`:**

- `AUTH_SECRET`, `AUTH_URL`, `DATABASE_URL`, `APP_BASE_URL` (build step)
- `AZURE_WEBAPP_NAME`, `AZURE_WEBAPP_PUBLISH_PROFILE` (deploy step)

**Production workflow — secrets:**

- **Build:** `secrets.*` from **repository** secrets (the build job has no `environment:` — add repository-level `AUTH_SECRET`, `AUTH_URL`, `DATABASE_URL`, optional `APP_BASE_URL`).
- **Deploy:** `AZURE_WEBAPP_NAME`, `AZURE_WEBAPP_PUBLISH_PROFILE` from Environment **`production`** (and any protection rules apply).

---

## Database migrations (not automated)

Neither workflow runs `prisma migrate deploy`. After a successful staging deploy, run migrations against the **staging** database from a trusted machine or pipeline. See `docs/DEPLOYMENT_AZURE.md` and `docs/STAGING_DEPLOY_READINESS.md`.

---

## Manual steps if the environment was not created by automation

### 1) Create environment `staging`

Follow **section B** above.

### 2) Add environment secrets

On **Settings → Environments → staging**:

- For each required secret in the tables above, click **Add secret**, paste the **name** exactly and the **value** from your provider.

### 3) Confirm the workflow sees the environment

- **Actions** tab → select **Deploy Azure App Service (staging)** → confirm the workflow file path is `.github/workflows/deploy-azure-staging.yml`.
- Run **Deploy Azure App Service (staging)** manually (**Run workflow**). The run should list **Environment: staging** on both jobs.

### 4) Trigger staging deploy

- **Option A:** Push commits to branch **`staging`** (workflow triggers on push). Create the branch first if it does not exist (`git checkout -b staging`).
- **Option B:** **Actions** → **Deploy Azure App Service (staging)** → **Run workflow** → choose branch (e.g. `staging` or your default branch).

**Branch note:** The **production** workflow triggers on pushes to **`main`**. If your repository default is **`master`** only, either add a **`main`** branch or edit `.github/workflows/deploy-azure.yml` to include `master` — otherwise automatic production deploys on push will not run.

### 5) After GitHub setup completes

1. Complete **Azure** staging App Service + DB + Application settings (Phase 2 — not this doc).
2. Run **`npx prisma migrate deploy`** against the staging database.
3. Run checks from `docs/STAGING_DEPLOY_READINESS.md` (`verify:staging`, `/api/health`, `/api/ready`).

---

## Related docs

- [STAGING_DEPLOY_READINESS.md](./STAGING_DEPLOY_READINESS.md) — env matrix and operator commands  
- [DEPLOYMENT_AZURE.md](./DEPLOYMENT_AZURE.md) — Azure App Service and production workflow notes  
- [STAGING_VERIFICATION.md](./STAGING_VERIFICATION.md) — verification checklist  
