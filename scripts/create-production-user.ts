/**
 * Operator-only: create or update a credentials user against DATABASE_URL.
 * Not run by the app; not exposed in the UI.
 *
 * Requires env (never commit values):
 *   CREATE_USER_EMAIL, CREATE_USER_PASSWORD, CREATE_USER_NAME, CREATE_USER_ROLE
 *
 * Password hashing matches app registration: bcrypt cost 12 (see `src/app/actions/register.ts`).
 */
import "dotenv/config";
import { hash } from "bcryptjs";
import { z } from "zod";
import { UserRole } from "../src/generated/prisma";
import { disconnectDb, prisma } from "../src/lib/db";

const envSchema = z.object({
  CREATE_USER_EMAIL: z.string().email(),
  CREATE_USER_PASSWORD: z.string().min(8, "password must be at least 8 characters"),
  CREATE_USER_NAME: z.string().min(2, "name must be at least 2 characters"),
  CREATE_USER_ROLE: z.nativeEnum(UserRole),
});

async function main() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("create-production-user: invalid or missing env. Required: CREATE_USER_EMAIL, CREATE_USER_PASSWORD (min 8), CREATE_USER_NAME (min 2), CREATE_USER_ROLE (LEARNER|ADMIN|SUPER_ADMIN).");
    console.error(parsed.error.flatten().fieldErrors);
    process.exitCode = 1;
    return;
  }

  const { CREATE_USER_EMAIL: email, CREATE_USER_PASSWORD: password, CREATE_USER_NAME: name, CREATE_USER_ROLE: role } =
    parsed.data;

  const passwordHash = await hash(password, 12);

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { name, passwordHash, role },
    });
    console.log(`create-production-user: OK — updated existing user, role=${role} (password rotated).`);
  } else {
    await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role,
        profile: { create: {} },
      },
    });
    console.log(`create-production-user: OK — created user, role=${role}.`);
  }

  await disconnectDb();
}

main().catch((e: unknown) => {
  console.error("create-production-user: FAILED");
  console.error(e instanceof Error ? e.message : String(e));
  process.exitCode = 1;
});
