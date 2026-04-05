import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Edge-safe route protection: validate the Auth.js JWT cookie only.
 * Do NOT import `NextAuth(authConfig)` or `@/auth` here — the bundler pulls Prisma/pg/bcrypt
 * into the Edge middleware chunk and production can return 500 for /portal, /admin.
 */
function authSecret(): string | undefined {
  return process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const secret = authSecret();

  const token = secret
    ? await getToken({
        req,
        secret,
      })
    : null;

  const loggedIn = !!token;
  const role = token?.role as string | undefined;

  if (pathname.startsWith("/portal") || pathname.startsWith("/admin")) {
    if (!loggedIn) {
      const login = new URL("/login", req.url);
      login.searchParams.set("callbackUrl", pathname);
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
