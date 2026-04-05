import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PortalHeader } from "@/components/portal/portal-header";
import { ProgressRing } from "@/components/portal/progress-ring";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { CoursePurchasePanel } from "@/components/billing/course-purchase-panel";
import { auth } from "@/auth";
import { PlanKind } from "@/generated/prisma";
import { canAccessCourseContent } from "@/lib/access";
import { providerLabel } from "@/lib/labels";
import { prisma } from "@/lib/db";
import { isSelfServeBillingAvailable } from "@/lib/launch/controlled-core-launch";
import { getCourseDetailForLearner } from "@/lib/queries/learner-courses";
import { ArrowRight, BookOpen, Clock } from "lucide-react";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseSlug: string }>;
}) {
  const { courseSlug } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const data = await getCourseDetailForLearner(session.user.id, courseSlug);
  if (!data || !data.enrollment) {
    notFound();
  }

  const { course, courseStats, moduleStats, firstIncomplete, lastActivityAt } = data;
  const canAccess = await canAccessCourseContent(session.user.id, course);

  const purchasePlan =
    course.pricingModel !== "included" && !canAccess
      ? await prisma.pricingPlan.findFirst({
          where: { slug: "lifetime-core", isActive: true, kind: PlanKind.ONE_TIME },
        })
      : null;

  const selfServeBilling = isSelfServeBillingAvailable();

  return (
    <>
      <PortalHeader title={course.title} />
      <div className="flex-1 overflow-auto p-6">
        {course.heroImageUrl ? (
          <div className="relative mb-6 aspect-[21/9] max-h-56 w-full overflow-hidden rounded-2xl border border-white/[0.08]">
            <Image
              src={course.heroImageUrl}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 896px"
              priority
            />
          </div>
        ) : null}
        <div className="glass-panel relative overflow-hidden rounded-2xl p-8 md:p-10">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#7c6cff]/12 via-transparent to-[#38bdf8]/10" />
          <div className="relative flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl space-y-4">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--accent)]">
                {providerLabel(course.provider)}
              </p>
              <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight md:text-4xl">
                {course.title}
              </h1>
              {course.subtitle && (
                <p className="text-lg text-[var(--muted-foreground)]">{course.subtitle}</p>
              )}
              {course.description && (
                <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
                  {course.description}
                </p>
              )}
              <div className="flex flex-wrap gap-3 text-sm text-[var(--muted-foreground)]">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                  <Clock className="h-4 w-4 text-[var(--accent)]" aria-hidden />
                  {course.estimatedMinutes} min estimated
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                  <BookOpen className="h-4 w-4 text-[var(--accent)]" aria-hidden />
                  {courseStats.totalLessons} lessons
                </span>
                {lastActivityAt && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                    Last activity{" "}
                    {lastActivityAt.toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                )}
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-center gap-4">
              <ProgressRing percent={courseStats.percent} size={140} stroke={9} label="Course" />
              <p className="text-center text-xs text-[var(--muted-foreground)]">
                {courseStats.completedLessons} of {courseStats.totalLessons} lessons
                <br />
                · {Math.round(courseStats.minutesRemaining)}m est. remaining
              </p>
            </div>
          </div>
        </div>

        {!canAccess ? (
          <div className="mt-8 space-y-6">
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-6 text-sm text-amber-100">
              {selfServeBilling ? (
                <>
                  Lessons are locked because this course is not included in your current access. Purchase the
                  one-time unlock or an eligible membership, or ask your admin for access. Access is granted
                  only after payment is verified on the server (Stripe webhooks or PayPal capture)—not from
                  the return URL alone.
                </>
              ) : (
                <>
                  Lessons are locked because this course is not included in your current access. During this
                  phase, access is granted by invitation or administrator assignment—not through self-serve
                  checkout. If you need this course, contact your administrator or the person who invited you.
                </>
              )}
              <div className="mt-4 flex flex-wrap gap-3">
                <Button asChild variant="secondary">
                  <Link href="/portal/billing">Billing &amp; plans info</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/pricing">{selfServeBilling ? "Compare plans" : "View planned pricing"}</Link>
                </Button>
              </div>
            </div>
            {purchasePlan ? (
              <CoursePurchasePanel plan={purchasePlan} courseSlug={course.slug} />
            ) : null}
          </div>
        ) : (
          <>
            {firstIncomplete && (
              <div className="mt-8 flex flex-col items-start gap-4 rounded-2xl border border-[var(--accent)]/25 bg-[var(--accent)]/5 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-[var(--accent)]">
                    Continue learning
                  </p>
                  <p className="mt-1 font-medium text-[var(--foreground)]">{firstIncomplete.label}</p>
                </div>
                <Button asChild>
                  <Link href={firstIncomplete.href}>
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            )}

            <div className="mt-10">
              <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
                Modules
              </h2>
              <Accordion
                type="multiple"
                defaultValue={moduleStats[0] ? [moduleStats[0].moduleId] : []}
                className="mt-4 rounded-2xl border border-white/[0.08] bg-[#0a0a1a]/40 px-2"
              >
                {moduleStats.map((mod) => (
                  <AccordionItem key={mod.moduleId} value={mod.moduleId} className="border-white/[0.06]">
                    <AccordionTrigger className="px-4 hover:no-underline">
                      <div className="flex w-full flex-col items-start gap-1 text-left sm:flex-row sm:items-center sm:justify-between sm:pr-4">
                        <span className="font-medium text-[var(--foreground)]">{mod.title}</span>
                        <span className="text-xs text-[var(--muted-foreground)]">
                          {mod.stats.percent}% · {mod.stats.completedLessons}/{mod.stats.totalLessons}{" "}
                          lessons
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#a78bfa] via-[#7c6cff] to-[#38bdf8] transition-all"
                          style={{ width: `${mod.stats.percent}%` }}
                        />
                      </div>
                      <ul className="mt-4 space-y-2">
                        {mod.lessons.map((les) => (
                          <li key={les.id}>
                            <Link
                              href={`/portal/courses/${course.slug}/modules/${mod.slug}/lessons/${les.slug}`}
                              className="flex items-center justify-between rounded-xl border border-transparent px-3 py-2.5 text-sm transition hover:border-white/10 hover:bg-white/[0.04]"
                            >
                              <span className={les.completedAt ? "text-[var(--muted-foreground)]" : ""}>
                                {les.title}
                              </span>
                              <span className="tabular-nums text-xs text-[var(--muted-foreground)]">
                                {les.estimatedMinutes}m
                                {les.completedAt ? " · done" : ""}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </>
        )}
      </div>
    </>
  );
}
