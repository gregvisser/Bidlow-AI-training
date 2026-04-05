import { prisma } from "@/lib/db";
import { coursePricingAllowsIncludedAccess } from "@/lib/billing/resolve-access";
import { parsePlanFeatures, subscriptionCoversCourse } from "@/lib/billing/plan-features";
import { subscriptionRowGrantsAccess } from "@/lib/billing/subscription-access";

export type CourseAccessExplanation = {
  found: boolean;
  courseTitle?: string;
  courseSlug: string;
  userEmail?: string;
  userId?: string;
  canAccess: boolean;
  reasons: string[];
};

/**
 * Operator-facing explanation of why a learner can or cannot access course content.
 * Mirrors `canAccessCourseContent` logic with human-readable reasons.
 */
export async function explainCourseAccessForUser(
  userId: string,
  courseSlug: string,
): Promise<CourseAccessExplanation> {
  const course = await prisma.course.findUnique({
    where: { slug: courseSlug },
    select: { id: true, slug: true, title: true, pricingModel: true },
  });

  if (!course) {
    return {
      found: false,
      courseSlug,
      canAccess: false,
      reasons: [`No course with slug "${courseSlug}".`],
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  const reasons: string[] = [];
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId: course.id } },
  });

  if (!enrollment) {
    return {
      found: true,
      courseTitle: course.title,
      courseSlug: course.slug,
      userEmail: user?.email ?? undefined,
      userId,
      canAccess: false,
      reasons: ["Learner is not enrolled in this course."],
    };
  }

  if (coursePricingAllowsIncludedAccess(course.pricingModel)) {
    reasons.push("Course pricing model is included (or unset) — no purchase required.");
    return {
      found: true,
      courseTitle: course.title,
      courseSlug: course.slug,
      userEmail: user?.email ?? undefined,
      userId,
      canAccess: true,
      reasons,
    };
  }

  const now = new Date();

  const entitlement = await prisma.entitlement.findFirst({
    where: {
      userId,
      courseId: course.id,
      active: true,
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
  });

  if (entitlement) {
    const src =
      entitlement.source === "ORDER"
        ? "one-time order / purchase"
        : entitlement.source === "SUBSCRIPTION"
          ? "subscription-linked entitlement"
          : entitlement.source === "MANUAL_GRANT"
            ? "manual grant (admin or seed)"
            : entitlement.source === "PROMO"
              ? "promotional entitlement"
              : String(entitlement.source);
    reasons.push(`Active entitlement (${src}).`);
    if (entitlement.orderId) {
      reasons.push(`Linked order id (internal): ${entitlement.orderId}`);
    }
    if (entitlement.subscriptionId) {
      reasons.push(`Linked subscription id (internal): ${entitlement.subscriptionId}`);
    }
    return {
      found: true,
      courseTitle: course.title,
      courseSlug: course.slug,
      userEmail: user?.email ?? undefined,
      userId,
      canAccess: true,
      reasons,
    };
  }

  const subs = await prisma.subscription.findMany({
    where: { userId },
    include: { pricingPlan: true },
  });

  for (const s of subs) {
    const grants = subscriptionRowGrantsAccess(s.status, s.cancelAtPeriodEnd, s.currentPeriodEnd, now);
    const features = parsePlanFeatures(s.pricingPlan.features);
    const covers = subscriptionCoversCourse(features, course.slug);
    if (grants && covers) {
      reasons.push(
        `Active subscription "${s.pricingPlan.name}" (${s.status}) covers this course via plan features.`,
      );
      return {
        found: true,
        courseTitle: course.title,
        courseSlug: course.slug,
        userEmail: user?.email ?? undefined,
        userId,
        canAccess: true,
        reasons,
      };
    }
    if (!grants) {
      reasons.push(
        `Subscription "${s.pricingPlan.name}" status ${s.status} does not grant access right now (cancel at period end / period end considered).`,
      );
    } else if (!covers) {
      reasons.push(
        `Subscription "${s.pricingPlan.name}" is active but plan does not include this course slug.`,
      );
    }
  }

  if (subs.length === 0) {
    reasons.push("No subscriptions on file for this user.");
  }

  reasons.push(
    "No active entitlement and no qualifying subscription for this course — content stays locked until purchase or grant is recorded in the database.",
  );

  return {
    found: true,
    courseTitle: course.title,
    courseSlug: course.slug,
    userEmail: user?.email ?? undefined,
    userId,
    canAccess: false,
    reasons,
  };
}

export async function explainCourseAccessByEmail(
  email: string,
  courseSlug: string,
): Promise<CourseAccessExplanation | { error: string }> {
  const user = await prisma.user.findFirst({
    where: { email: { equals: email.trim(), mode: "insensitive" } },
    select: { id: true },
  });
  if (!user) {
    return { error: `No user with email "${email}".` };
  }
  return explainCourseAccessForUser(user.id, courseSlug);
}
