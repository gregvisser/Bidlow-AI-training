import { describe, expect, it } from "vitest";
import { parsePlanFeatures, subscriptionCoversCourse } from "@/lib/billing/plan-features";

describe("subscriptionCoversCourse", () => {
  it("covers any course for catalog access", () => {
    expect(subscriptionCoversCourse({ access: "catalog" }, "any-slug")).toBe(true);
  });

  it("covers only matching slug for course access", () => {
    expect(subscriptionCoversCourse({ access: "course", courseSlug: "a" }, "a")).toBe(true);
    expect(subscriptionCoversCourse({ access: "course", courseSlug: "a" }, "b")).toBe(false);
  });

  it("parses valid features json", () => {
    expect(parsePlanFeatures({ access: "catalog" })).toEqual({ access: "catalog" });
  });

  it("returns empty object for invalid json", () => {
    expect(parsePlanFeatures("bad")).toEqual({});
  });
});
