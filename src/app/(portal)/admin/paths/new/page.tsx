import Link from "next/link";
import { PortalHeader } from "@/components/portal/portal-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createLearningPathAction } from "@/app/actions/admin-paths";

export default async function NewPathPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;

  return (
    <>
      <PortalHeader title="New track" />
      <div className="flex-1 overflow-auto p-6">
        <Link
          href="/admin/paths"
          className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          ← Tracks
        </Link>
        {sp.error && (
          <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-100">
            Validation failed — check slug format (lowercase, hyphens).
          </p>
        )}
        <form
          action={createLearningPathAction}
          className="glass-panel mt-6 max-w-xl space-y-4 rounded-2xl p-8"
        >
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" name="slug" placeholder="my-track" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              name="description"
              rows={4}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-4 py-3 text-sm"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="durationWeeks">Duration (weeks)</Label>
              <Input id="durationWeeks" name="durationWeeks" type="number" defaultValue={8} min={1} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sortOrder">Sort order</Label>
              <Input id="sortOrder" name="sortOrder" type="number" defaultValue={0} min={0} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="badgeLabel">Badge label (optional)</Label>
            <Input id="badgeLabel" name="badgeLabel" placeholder="Azure" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="difficulty">Difficulty hint (optional)</Label>
            <Input id="difficulty" name="difficulty" placeholder="beginner" />
          </div>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isPublic" defaultChecked />
              Public in catalog
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isFeatured" />
              Featured
            </label>
          </div>
          <Button type="submit">Create track</Button>
        </form>
      </div>
    </>
  );
}
