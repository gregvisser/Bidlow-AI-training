import Link from "next/link";
import { CourseCreateForm } from "@/components/admin/course-create-form";
import { PortalHeader } from "@/components/portal/portal-header";
import { ValidationBanner } from "@/components/portal/validation-banner";

export default async function AdminNewCoursePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;

  return (
    <>
      <PortalHeader title="New course" />
      <div className="flex-1 overflow-auto p-6">
        <Link href="/admin/courses" className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
          ← Back to courses
        </Link>
        <div className="mx-auto mt-6 max-w-4xl glass-panel rounded-2xl p-8">
          <ValidationBanner error={sp.error} ctx="course" />
          <CourseCreateForm />
        </div>
      </div>
    </>
  );
}
