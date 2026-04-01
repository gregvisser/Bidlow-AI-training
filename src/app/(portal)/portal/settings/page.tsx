import { redirect } from "next/navigation";
import { PortalHeader } from "@/components/portal/portal-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { ValidationBanner } from "@/components/portal/validation-banner";
import { updateProfile } from "@/app/actions/profile";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const sp = await searchParams;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { profile: true },
  });

  return (
    <>
      <PortalHeader title="Settings" />
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-lg glass-panel rounded-2xl p-8">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">Profile</h2>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Updates persist to PostgreSQL via a server action.
          </p>
          {sp.saved && (
            <p className="mt-4 rounded-xl border border-[var(--success)]/30 bg-[var(--success)]/10 px-4 py-2 text-sm text-[var(--success)]">
              Profile saved.
            </p>
          )}
          <ValidationBanner error={sp.error} title="Profile not updated" scope="profile" />
          <form action={updateProfile} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Display name</Label>
              <Input id="name" name="name" defaultValue={user?.name ?? ""} required minLength={2} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="headline">Headline</Label>
              <Input
                id="headline"
                name="headline"
                defaultValue={user?.profile?.headline ?? ""}
                placeholder="e.g. ML Engineer"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <textarea
                id="bio"
                name="bio"
                rows={4}
                defaultValue={user?.profile?.bio ?? ""}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              />
            </div>
            <p className="text-xs text-[var(--muted-foreground)]">Email: {user?.email}</p>
            <Button type="submit">Save changes</Button>
          </form>
        </div>
      </div>
    </>
  );
}
