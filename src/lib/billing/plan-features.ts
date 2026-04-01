import { z } from "zod";

/**
 * Stored on PricingPlan.features (Json). Drives subscription coverage.
 */
export const planFeaturesSchema = z
  .object({
    access: z.enum(["course", "catalog"]).optional(),
    courseSlug: z.string().optional(),
  })
  .passthrough();

export type PlanFeatures = z.infer<typeof planFeaturesSchema>;

export function parsePlanFeatures(raw: unknown): PlanFeatures {
  if (raw === null || raw === undefined) return {};
  const r = planFeaturesSchema.safeParse(raw);
  return r.success ? r.data : {};
}

export function subscriptionCoversCourse(features: PlanFeatures, courseSlug: string): boolean {
  if (features.access === "catalog") return true;
  if (features.access === "course" && features.courseSlug === courseSlug) return true;
  return false;
}
