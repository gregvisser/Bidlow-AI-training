import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import type { UserRole } from "@/generated/prisma";

function googleEnv() {
  const id = process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  return id && secret ? { id, secret } : null;
}

const googleProvider = googleEnv();

/**
 * Edge-safe Auth.js config (no Prisma / bcrypt static imports).
 * Middleware must use this only — see `src/middleware.ts`.
 */
export const authConfig = {
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const { authorizeCredentials } = await import("@/lib/auth/credentials-authorize");
        return authorizeCredentials(raw);
      },
    }),
    ...(googleProvider
      ? [
          Google({
            clientId: googleProvider.id,
            clientSecret: googleProvider.secret,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id as string;
        token.role = ((user as { role?: UserRole }).role ?? "LEARNER") as UserRole;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
