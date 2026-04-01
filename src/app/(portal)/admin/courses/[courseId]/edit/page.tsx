import Link from "next/link";
import { notFound } from "next/navigation";
import { LessonReorderButtons, ModuleReorderButtons } from "@/components/admin/reorder-buttons";
import { PortalHeader } from "@/components/portal/portal-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createLessonAction,
  createModuleAction,
  toggleCourseArchiveForm,
  toggleLessonArchiveForm,
  toggleModuleArchiveForm,
  updateCourse,
  updateLessonAction,
  updateModuleAction,
} from "@/app/actions/admin-catalog";
import { ValidationBanner } from "@/components/portal/validation-banner";
import { CourseHeroUpload } from "@/components/admin/course-hero-upload";
import { isBlobStorageConfigured } from "@/lib/azure/blob-config";
import { prisma } from "@/lib/db";

export default async function AdminEditCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ saved?: string; error?: string; ctx?: string }>;
}) {
  const { courseId } = await params;
  const sp = await searchParams;

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      modules: {
        orderBy: { sortOrder: "asc" },
        include: {
          lessons: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });

  if (!course) {
    notFound();
  }

  const storageConfigured = isBlobStorageConfigured();

  return (
    <>
      <PortalHeader title="Edit course" />
      <div className="flex-1 space-y-10 overflow-auto p-6">
        <Link href="/admin/courses" className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
          ← Courses
        </Link>

        {sp.saved && (
          <p className="mt-4 rounded-xl border border-[var(--success)]/30 bg-[var(--success)]/10 px-4 py-2 text-sm text-[var(--success)]">
            Course saved.
          </p>
        )}
        <ValidationBanner error={sp.error} ctx={sp.ctx} />

        <section className="glass-panel rounded-2xl p-8">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">Course</h2>
          <form action={updateCourse} className="mt-6 grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="id" value={course.id} />
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" defaultValue={course.title} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" name="slug" defaultValue={course.slug} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider">Provider</Label>
              <select
                id="provider"
                name="provider"
                defaultValue={course.provider}
                className="flex h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-4 text-sm"
              >
                <option value="AZURE">Azure</option>
                <option value="HUGGING_FACE">Hugging Face</option>
                <option value="CURSOR">Cursor</option>
              </select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="subtitle">Subtitle</Label>
              <Input id="subtitle" name="subtitle" defaultValue={course.subtitle ?? ""} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                name="description"
                rows={4}
                defaultValue={course.description ?? ""}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-4 py-3 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estimatedMinutes">Estimated minutes</Label>
              <Input
                id="estimatedMinutes"
                name="estimatedMinutes"
                type="number"
                defaultValue={course.estimatedMinutes}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                name="status"
                defaultValue={course.status}
                className="flex h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-4 text-sm"
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pricingModel">Pricing model</Label>
              <select
                id="pricingModel"
                name="pricingModel"
                defaultValue={course.pricingModel ?? "included"}
                className="flex h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-4 text-sm"
              >
                <option value="included">Included</option>
                <option value="subscription">Subscription</option>
                <option value="one_time">One-time</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-6 sm:col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="isPublic" defaultChecked={course.isPublic} />
                Public
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="isFeatured" defaultChecked={course.isFeatured} />
                Featured
              </label>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">Save course</Button>
            </div>
          </form>

          <div className="mt-8 border-t border-white/[0.06] pt-8">
            <h3 className="font-[family-name:var(--font-display)] text-base font-semibold">Hero image</h3>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Shown on the learner course page. Files are stored in Azure Blob Storage—not on the app server.
            </p>
            <div className="mt-4">
              <CourseHeroUpload
                courseId={course.id}
                currentUrl={course.heroImageUrl}
                storageConfigured={storageConfigured}
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 border-t border-white/[0.06] pt-6">
            <form action={toggleCourseArchiveForm}>
              <input type="hidden" name="courseId" value={course.id} />
              <input
                type="hidden"
                name="archived"
                value={course.status === "ARCHIVED" ? "false" : "true"}
              />
              <Button type="submit" variant="secondary">
                {course.status === "ARCHIVED" ? "Unarchive (publish)" : "Archive course"}
              </Button>
            </form>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">Modules</h2>
          {course.modules.map((mod, mi) => (
            <div
              key={mod.id}
              className="rounded-2xl border border-white/[0.08] bg-[#070714]/80 p-6"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-[var(--accent)]">
                    Module {mi + 1}
                    {mod.archivedAt ? " · archived" : ""}
                  </p>
                  <h3 className="mt-1 font-medium">{mod.title}</h3>
                </div>
                <ModuleReorderButtons
                  courseId={course.id}
                  moduleId={mod.id}
                  index={mi}
                  total={course.modules.length}
                />
              </div>
              <form action={updateModuleAction} className="mt-4 grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="id" value={mod.id} />
                <input type="hidden" name="courseId" value={course.id} />
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input name="title" defaultValue={mod.title} required />
                </div>
                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input name="slug" defaultValue={mod.slug} required />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Description</Label>
                  <textarea
                    name="description"
                    rows={2}
                    defaultValue={mod.description ?? ""}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-4 py-2 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Week #</Label>
                  <Input name="weekNumber" type="number" defaultValue={mod.weekNumber ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label>Est. minutes</Label>
                  <Input name="estimatedMinutes" type="number" defaultValue={mod.estimatedMinutes} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Track provider</Label>
                  <select
                    name="trackProvider"
                    defaultValue={mod.trackProvider ?? course.provider}
                    className="flex h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-4 text-sm"
                  >
                    <option value="AZURE">Azure</option>
                    <option value="HUGGING_FACE">Hugging Face</option>
                    <option value="CURSOR">Cursor</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <Button type="submit" size="sm" variant="secondary">
                    Save module
                  </Button>
                </div>
              </form>
              <form action={toggleModuleArchiveForm} className="mt-2">
                <input type="hidden" name="courseId" value={course.id} />
                <input type="hidden" name="moduleId" value={mod.id} />
                <input type="hidden" name="archived" value={mod.archivedAt ? "false" : "true"} />
                <Button type="submit" size="sm" variant="ghost">
                  {mod.archivedAt ? "Restore module" : "Archive module"}
                </Button>
              </form>

              <div className="mt-6 border-t border-white/[0.06] pt-6">
                <h4 className="text-sm font-semibold">Lessons</h4>
                <ul className="mt-3 space-y-4">
                  {mod.lessons.map((les, li) => (
                    <li
                      key={les.id}
                      className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-sm font-medium">{les.title}</span>
                        <LessonReorderButtons
                          courseId={course.id}
                          moduleId={mod.id}
                          lessonId={les.id}
                          index={li}
                          total={mod.lessons.length}
                        />
                      </div>
                      <form action={updateLessonAction} className="mt-3 grid gap-2 sm:grid-cols-2">
                        <input type="hidden" name="id" value={les.id} />
                        <input type="hidden" name="moduleId" value={mod.id} />
                        <div className="space-y-1">
                          <Label className="text-xs">Title</Label>
                          <Input name="title" defaultValue={les.title} required />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Slug</Label>
                          <Input name="slug" defaultValue={les.slug} required />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <Label className="text-xs">Content</Label>
                          <textarea
                            name="content"
                            rows={3}
                            defaultValue={les.content ?? ""}
                            className="w-full rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Resource URL</Label>
                          <Input name="resourceUrl" defaultValue={les.resourceUrl ?? ""} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Minutes</Label>
                          <Input name="estimatedMinutes" type="number" defaultValue={les.estimatedMinutes} />
                        </div>
                        <div className="sm:col-span-2">
                          <Button type="submit" size="sm" variant="secondary">
                            Save lesson
                          </Button>
                        </div>
                      </form>
                      <form action={toggleLessonArchiveForm} className="mt-2">
                        <input type="hidden" name="courseId" value={course.id} />
                        <input type="hidden" name="lessonId" value={les.id} />
                        <input type="hidden" name="archived" value={les.archivedAt ? "false" : "true"} />
                        <Button type="submit" size="sm" variant="ghost">
                          {les.archivedAt ? "Restore lesson" : "Archive lesson"}
                        </Button>
                      </form>
                    </li>
                  ))}
                </ul>
                <form action={createLessonAction} className="mt-6 grid gap-2 rounded-xl border border-dashed border-white/15 p-4 sm:grid-cols-2">
                  <input type="hidden" name="moduleId" value={mod.id} />
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs">New lesson title</Label>
                    <Input name="title" placeholder="Lesson title" required />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Slug</Label>
                    <Input name="slug" placeholder="lesson-slug" required />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Minutes</Label>
                    <Input name="estimatedMinutes" type="number" defaultValue={20} />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs">Content</Label>
                    <textarea name="content" rows={2} className="w-full rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-xs" />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs">Resource URL</Label>
                    <Input name="resourceUrl" placeholder="https://..." />
                  </div>
                  <Button type="submit" size="sm">
                    Add lesson
                  </Button>
                </form>
              </div>
            </div>
          ))}

          <form action={createModuleAction} className="glass-panel grid gap-3 rounded-2xl p-6 sm:grid-cols-2">
            <input type="hidden" name="courseId" value={course.id} />
            <h3 className="font-medium sm:col-span-2">Add module</h3>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input name="title" required />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input name="slug" required />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>
              <textarea name="description" rows={2} className="w-full rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-4 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <Label>Week #</Label>
              <Input name="weekNumber" type="number" />
            </div>
            <div className="space-y-2">
              <Label>Est. minutes</Label>
              <Input name="estimatedMinutes" type="number" defaultValue={90} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Track provider</Label>
              <select
                name="trackProvider"
                defaultValue="AZURE"
                className="flex h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-4 text-sm"
              >
                <option value="AZURE">Azure</option>
                <option value="HUGGING_FACE">Hugging Face</option>
                <option value="CURSOR">Cursor</option>
              </select>
            </div>
            <Button type="submit" className="sm:col-span-2">
              Add module
            </Button>
          </form>
        </section>
      </div>
    </>
  );
}
