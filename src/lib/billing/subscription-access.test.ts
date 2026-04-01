import { describe, expect, it } from "vitest";
import { subscriptionRowGrantsAccess } from "@/lib/billing/subscription-access";

describe("subscriptionRowGrantsAccess", () => {
  const now = new Date("2026-03-01T12:00:00.000Z");

  it("allows ACTIVE", () => {
    expect(subscriptionRowGrantsAccess("ACTIVE", false, null, now)).toBe(true);
  });

  it("denies INCOMPLETE", () => {
    expect(subscriptionRowGrantsAccess("INCOMPLETE", false, null, now)).toBe(false);
  });

  it("allows cancel at period end until period end", () => {
    const end = new Date("2026-04-01T12:00:00.000Z");
    expect(subscriptionRowGrantsAccess("ACTIVE", true, end, now)).toBe(true);
  });

  it("denies after period when cancel at period end", () => {
    const end = new Date("2026-02-01T12:00:00.000Z");
    expect(subscriptionRowGrantsAccess("ACTIVE", true, end, now)).toBe(false);
  });
});
