import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/db";

/**
 * Full Auth.js instance with Prisma adapter + DB events (Node only).
 * API routes and server components import from here — not from Edge middleware.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  events: {
    async createUser({ user }) {
      await prisma.profile.upsert({
        where: { userId: user.id! },
        create: { userId: user.id! },
        update: {},
      });
    },
  },
});
