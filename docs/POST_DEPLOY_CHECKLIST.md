# Post-deploy verification checklist

Run these checks after each production deployment (or before promoting staging).

## Smoke

- [ ] `GET /api/health` returns `200` and JSON `{ "status": "ok", ... }`
- [ ] `GET /api/ready` returns `200` when the database is reachable; `503` only if DB is down (expected during incidents)
- [ ] Marketing home `/` loads without console errors
- [ ] `/pricing` loads (DB-backed plans)

## Auth

- [ ] `/login` — credentials sign-in works
- [ ] Session persists across navigation (`/portal`)

## Data & progress

- [ ] `/portal` dashboard loads with DB-backed stats
- [ ] `/portal/courses` lists enrollments
- [ ] Open a course — hero image shows if uploaded in admin
- [ ] Complete a lesson — refresh confirms progress persisted

## Admin

- [ ] `/admin/courses` — list loads
- [ ] Edit a course — **Hero image** upload works (Blob configured); preview updates after refresh
- [ ] CMS save still works (course fields)

## Billing (test keys)

- [ ] `/portal/billing` loads without errors
- [ ] Stripe Checkout session can be started (test mode)
- [ ] PayPal create-order API succeeds (sandbox)
- [ ] Webhook URLs are reachable from the internet (Stripe/PayPal dashboard “Send test webhook” or real payment in test)

## Security

- [ ] `/api/webhooks/stripe` rejects missing/invalid signature
- [ ] `/api/admin/courses/{id}/hero-image` returns `401` when not signed in, `403` for non-admin

## Monitoring

- [ ] Application Insights (if enabled) shows requests to the app and failed dependencies
- [ ] No secrets appear in Application Insights traces (spot-check)

## Manual script (optional)

```bash
curl -sS https://<your-domain>/api/health
curl -sS https://<your-domain>/api/ready
```

Replace `<your-domain>` with your production hostname.
