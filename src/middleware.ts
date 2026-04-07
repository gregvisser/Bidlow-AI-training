import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Edge-safe route protection: validate the Auth.js JWT cookie only.
 * Do NOT import `NextAuth(authConfig)` or `@/auth` here — the bundler pulls Prisma/pg/bcrypt
 * into the Edge middleware chunk and production can return 500 for /portal, /admin.
 *
 * On HTTPS, Auth.js sets `__Secure-authjs.session-token` and derives JWT salt from that name.
 * `getToken` defaults to `secureCookie: false` (non-prefixed cookie + wrong salt) → decode fails →
 * null token → redirect loop to /login after successful sign-in. Must match server cookie mode.
 */
function authSecret(): string | undefined {
  return process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
}

/** Match @auth/core `useSecureCookies` (HTTPS / forwarded proto). */
function isHttpsRequest(req: NextRequest): boolean {
  const forwarded = req.headers.get("x-forwarded-proto");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() === "https";
  }
  return req.nextUrl.protocol === "https:";
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const secret = authSecret();
  const secureCookie = isHttpsRequest(req);

  const token = secret
    ? await getToken({
        req,
        secret,
        secureCookie,
      })
    : null;

  const loggedIn = !!token;
  const role = token?.role as string | undefined;

  if (pathname.startsWith("/portal") || pathname.startsWith("/admin")) {
    if (!loggedIn) {
      const login = new URL("/login", req.url);
      const pathWithQuery = `${pathname}${req.nextUrl.search}`;
      login.searchParams.set("callbackUrl", pathWithQuery);
      return NextResponse.redirect(login);
    }
  }

  if (pathname.startsWith("/admin")) {
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/portal", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/portal", "/portal/:path*", "/admin", "/admin/:path*"],
};
