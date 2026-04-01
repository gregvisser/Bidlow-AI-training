/**
 * Canonical public app URL for redirects and webhooks (no trailing slash).
 * Prefer APP_BASE_URL in production (Azure App Service, custom domain).
 */
export function getAppBaseUrl(): string {
  const raw =
    process.env.APP_BASE_URL ?? process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return raw.replace(/\/$/, "");
}
