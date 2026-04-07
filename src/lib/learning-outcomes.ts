import type { LearningOutcomeType } from "@/generated/prisma";

/** Short label for chips (learner + admin). */
export const learningOutcomeShortLabel: Record<LearningOutcomeType, string> = {
  PLATFORM_CERTIFICATE: "Platform certificate",
  PROVIDER_CERTIFICATE: "Provider certificate",
  PROVIDER_EXAM_PREP: "Exam prep",
  PROVIDER_ALIGNED: "Provider-aligned",
};

/** One-line explanation of what the enum means in this product. */
export const learningOutcomeDescription: Record<LearningOutcomeType, string> = {
  PLATFORM_CERTIFICATE:
    "Completing requirements can earn a certificate issued by this training platform.",
  PROVIDER_CERTIFICATE:
    "Maps to an official credential or certificate program from the named provider (see mapping).",
  PROVIDER_EXAM_PREP:
    "Structured to support preparation for an official provider exam; the exam is administered by the vendor.",
  PROVIDER_ALIGNED:
    "Skills and references align with the provider’s documentation; no official vendor certificate is claimed unless noted separately.",
};

export function outcomeTypeOptions(): { value: LearningOutcomeType; label: string }[] {
  return (Object.keys(learningOutcomeShortLabel) as LearningOutcomeType[]).map((value) => ({
    value,
    label: learningOutcomeShortLabel[value],
  }));
}
