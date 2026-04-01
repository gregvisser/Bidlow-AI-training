"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  name: z.string().min(2).max(120),
  headline: z.string().max(200).optional().nullable(),
  bio: z.string().max(5000).optional().nullable(),
});

export async function updateProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const parsed = schema.safeParse({
    name: formData.get("name"),
    headline: formData.get("headline") || null,
    bio: formData.get("bio") || null,
  });
  if (!parsed.success) {
    redirect("/portal/settings?error=validation");
  }
  await prisma.user.update({
    where: { id: session.user.id },
    data: { name: parsed.data.name },
  });
  await prisma.profile.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      headline: parsed.data.headline ?? undefined,
      bio: parsed.data.bio ?? undefined,
    },
    update: {
      headline: parsed.data.headline ?? undefined,
      bio: parsed.data.bio ?? undefined,
    },
  });
  revalidatePath("/portal/settings");
  redirect("/portal/settings?saved=1");
}
