import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import type { NextAuthRequest } from "next-auth";
import { authConfig } from "@/auth.config";

/**
 * Edge-safe middleware: use Auth.js config without PrismaAdapter (see `auth.config.ts`).
 * Importing `auth` from `@/auth` would pull Prisma into the Edge bundle and crash /portal, /admin, etc.
 */
const { auth } = NextAuth(authConfig);

export default auth((req: NextAuthRequest) => {
  const { pathname } = req.nextUrl;
  const role = req.auth?.user?.role;
  const loggedIn = !!req.auth;

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
});

export const config = {
  matcher: ["/portal", "/portal/:path*", "/admin", "/admin/:path*"],
};
