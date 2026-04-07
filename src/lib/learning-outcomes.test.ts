import { describe, expect, it } from "vitest";
import { learningOutcomeShortLabel } from "./learning-outcomes";

describe("learningOutcomeShortLabel", () => {
  it("covers all four outcome types", () => {
    expect(Object.keys(learningOutcomeShortLabel).length).toBe(4);
    expect(learningOutcomeShortLabel.PLATFORM_CERTIFICATE).toContain("Platform");
    expect(learningOutcomeShortLabel.PROVIDER_ALIGNED).toContain("Provider");
  });
});
