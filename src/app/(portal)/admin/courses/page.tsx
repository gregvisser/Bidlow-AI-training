import Link from "next/link";
import { PortalHeader } from "@/components/portal/portal-header";
import { ValidationBanner } from "@/components/portal/validation-banner";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { BookOpen, Plus } from "lucide-react";

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;

  const courses = await prisma.course.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { modules: true, enrollments: true } },
    },
  });

  return (
    <>
      <PortalHeader title="Courses" />
      <div className="flex-1 overflow-auto p-6">
        <ValidationBanner error={sp.error} />
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-[var(--muted-foreground)]">
            Manage catalog, visibility, and curriculum structure.
          </p>
          <Button asChild>
            <Link href="/admin/courses/new">
              <Plus className="mr-2 h-4 w-4" />
              New course
            </Link>
          </Button>
        </div>
        {courses.length === 0 ? (
          <div className="glass-panel rounded-2xl p-12 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-[var(--muted-foreground)]" aria-hidden />
            <p className="mt-4 text-[var(--muted-foreground)]">
              No courses yet. Create a draft course to start building modules and lessons.
            </p>
            <Button asChild className="mt-6">
              <Link href="/admin/courses/new">
                <Plus className="mr-2 h-4 w-4" />
                New course
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {courses.map((c) => (
              <div
                key={c.id}
                className="flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-[#0a0a1a]/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium text-[var(--foreground)]">{c.title}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {c.status} · {c._count.modules} modules · {c._count.enrollments} enrollments ·{" "}
                    <span className="break-all">{c.slug}</span>
                  </p>
                </div>
                <Button asChild variant="secondary" className="shrink-0">
                  <Link href={`/admin/courses/${c.id}/edit`}>Edit</Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
