import Link from "next/link";
import { notFound } from "next/navigation";
import { PortalHeader } from "@/components/portal/portal-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addCourseToPathAction,
  movePathCourseForm,
  removeCourseFromPathAction,
  updateLearningPathAction,
} from "@/app/actions/admin-paths";
import { prisma } from "@/lib/db";

export default async function EditPathPage({
  params,
  searchParams,
}: {
  params: Promise<{ pathId: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { pathId } = await params;
  const sp = await searchParams;

  const path = await prisma.learningPath.findUnique({
    where: { id: pathId },
    include: {
      courses: {
        orderBy: { sortOrder: "asc" },
        include: { course: true },
      },
    },
  });

  if (!path) {
    notFound();
  }

  const allCourses = await prisma.course.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { title: "asc" },
    select: { id: true, title: true, slug: true },
  });

  const linkedIds = new Set(path.courses.map((c) => c.courseId));
  const available = allCourses.filter((c) => !linkedIds.has(c.id));

  return (
    <>
      <PortalHeader title="Edit track" />
      <div className="flex-1 space-y-10 overflow-auto p-6">
        <Link
          href="/admin/paths"
          className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          ← Tracks
        </Link>
        {sp.saved && (
          <p className="mt-4 rounded-xl border border-[var(--success)]/30 bg-[var(--success)]/10 px-4 py-2 text-sm text-[var(--success)]">
            Track saved.
          </p>
        )}

        <section className="glass-panel rounded-2xl p-8">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">Track</h2>
          <form action={updateLearningPathAction} className="mt-6 grid max-w-2xl gap-4">
            <input type="hidden" name="id" value={path.id} />
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" defaultValue={path.title} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" name="slug" defaultValue={path.slug} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                name="description"
                rows={4}
                defaultValue={path.description ?? ""}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-4 py-3 text-sm"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="durationWeeks">Duration (weeks)</Label>
                <Input
                  id="durationWeeks"
                  name="durationWeeks"
                  type="number"
                  defaultValue={path.durationWeeks}
                  min={1}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sortOrder">Sort order</Label>
                <Input id="sortOrder" name="sortOrder" type="number" defaultValue={path.sortOrder} min={0} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="badgeLabel">Badge label</Label>
              <Input id="badgeLabel" name="badgeLabel" defaultValue={path.badgeLabel ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty hint</Label>
              <Input id="difficulty" name="difficulty" defaultValue={path.difficulty ?? ""} />
            </div>
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="isPublic" defaultChecked={path.isPublic} />
                Public in catalog
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="isFeatured" defaultChecked={path.isFeatured} />
                Featured
              </label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="outcomeType">Outcome type</Label>
              <select
                id="outcomeType"
                name="outcomeType"
                defaultValue={path.outcomeType}
                className="flex h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-4 text-sm"
              >
                <option value="PLATFORM_CERTIFICATE">Platform certificate</option>
                <option value="PROVIDER_CERTIFICATE">Provider certificate</option>
                <option value="PROVIDER_EXAM_PREP">Provider exam prep</option>
                <option value="PROVIDER_ALIGNED">Provider-aligned</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="outcomeSummary">Outcome summary</Label>
              <textarea
                id="outcomeSummary"
                name="outcomeSummary"
                rows={3}
                defaultValue={path.outcomeSummary ?? ""}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-4 py-3 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="providerCertificationMapping">Provider certification mapping (optional)</Label>
              <textarea
                id="providerCertificationMapping"
                name="providerCertificationMapping"
                rows={3}
                defaultValue={path.providerCertificationMapping ?? ""}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-4 py-3 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="providerCertificationUrl">Provider reference URL (optional)</Label>
              <Input
                id="providerCertificationUrl"
                name="providerCertificationUrl"
                type="url"
                defaultValue={path.providerCertificationUrl ?? ""}
                placeholder="https://"
              />
            </div>
            <Button type="submit">Save track</Button>
          </form>
        </section>

        <section className="glass-panel rounded-2xl p-8">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">Courses in track</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Reorder with ↑ / ↓. Learners open modules from{" "}
            <code className="text-xs">/portal/paths/{path.slug}</code>.
          </p>
          <ul className="mt-6 space-y-4">
            {path.courses.map((row, i) => (
              <li
                key={row.id}
                className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-[#070714]/60 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{row.course.title}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{row.course.slug}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <form action={movePathCourseForm}>
                    <input type="hidden" name="pathId" value={path.id} />
                    <input type="hidden" name="linkId" value={row.id} />
                    <input type="hidden" name="direction" value="up" />
                    <Button type="submit" size="sm" variant="secondary" disabled={i === 0}>
                      ↑
                    </Button>
                  </form>
                  <form action={movePathCourseForm}>
                    <input type="hidden" name="pathId" value={path.id} />
                    <input type="hidden" name="linkId" value={row.id} />
                    <input type="hidden" name="direction" value="down" />
                    <Button type="submit" size="sm" variant="secondary" disabled={i === path.courses.length - 1}>
                      ↓
                    </Button>
                  </form>
                  <form action={removeCourseFromPathAction}>
                    <input type="hidden" name="learningPathId" value={path.id} />
                    <input type="hidden" name="linkId" value={row.id} />
                    <Button type="submit" size="sm" variant="ghost">
                      Remove
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>

          {available.length > 0 ? (
            <form action={addCourseToPathAction} className="mt-8 flex flex-col gap-3 rounded-xl border border-dashed border-white/15 p-4 sm:flex-row sm:items-end">
              <input type="hidden" name="learningPathId" value={path.id} />
              <div className="flex-1 space-y-2">
                <Label htmlFor="courseId">Add published course</Label>
                <select
                  id="courseId"
                  name="courseId"
                  required
                  className="flex h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-4 text-sm"
                >
                  <option value="">Select…</option>
                  {available.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.slug})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="weekNumber">Week # (optional)</Label>
                <Input id="weekNumber" name="weekNumber" type="number" min={1} placeholder="—" />
              </div>
              <Button type="submit">Add</Button>
            </form>
          ) : (
            <p className="mt-6 text-sm text-[var(--muted-foreground)]">
              All published courses are already linked, or none exist yet.
            </p>
          )}
        </section>
      </div>
    </>
  );
}
