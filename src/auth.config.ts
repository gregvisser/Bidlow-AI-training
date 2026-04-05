import type { UserRole } from "@/generated/prisma";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { z } from "zod";

/**
 * Edge-safe Auth.js config (no Prisma at module scope).
 * Used by middleware (Edge) and merged in `auth.ts` with PrismaAdapter for Node route handlers.
 * DB access in callbacks uses dynamic import so Prisma is not bundled into the middleware Edge bundle.
 */
const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

function googleEnv() {
  const id = process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  return id && secret ? { id, secret } : null;
}

const googleProvider = googleEnv();

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
        const { compare } = await import("bcryptjs");
        const { prisma } = await import("@/lib/db");
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;
        const valid = await compare(password, user.passwordHash);
        if (!valid) return null;
        return {
          id: user.id,
          email: user.email ?? undefined,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
          role: user.role,
        };
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
        const { prisma } = await import("@/lib/db");
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id as string },
        });
        token.id = user.id as string;
        token.role = (dbUser?.role ?? "LEARNER") as UserRole;
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
