import type { Course } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { parsePlanFeatures, subscriptionCoversCourse } from "@/lib/billing/plan-features";
import { subscriptionRowGrantsAccess } from "@/lib/billing/subscription-access";

/**
 * Central access check: enrollment required; then included OR entitlement OR active subscription plan coverage.
 */
export async function canAccessCourseContent(
  userId: string,
  course: Pick<Course, "id" | "slug" | "pricingModel">,
): Promise<boolean> {
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId: course.id } },
  });
  if (!enrollment) return false;

  if (course.pricingModel === "included") return true;

  const now = new Date();

  const entitlement = await prisma.entitlement.findFirst({
    where: {
      userId,
      courseId: course.id,
      active: true,
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
  });
  if (entitlement) return true;

  const subs = await prisma.subscription.findMany({
    where: { userId },
    include: { pricingPlan: true },
  });

  for (const s of subs) {
    if (!subscriptionRowGrantsAccess(s.status, s.cancelAtPeriodEnd, s.currentPeriodEnd, now)) {
      continue;
    }
    const features = parsePlanFeatures(s.pricingPlan.features);
    if (subscriptionCoversCourse(features, course.slug)) {
      return true;
    }
  }

  return false;
}

export async function assertCourseContentAccess(
  userId: string,
  course: Pick<Course, "id" | "slug" | "pricingModel">,
) {
  const ok = await canAccessCourseContent(userId, course);
  if (!ok) {
    throw new Error("Access denied");
  }
}
