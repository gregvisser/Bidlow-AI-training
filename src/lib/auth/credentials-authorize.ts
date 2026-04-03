import { compare } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

/** Used only from the Credentials provider (Node / API route), never from Edge middleware. */
export async function authorizeCredentials(raw: unknown) {
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
}
