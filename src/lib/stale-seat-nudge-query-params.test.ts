import { describe, expect, it } from "vitest";
import { parseAuditPage, parseUtcDateEnd, parseUtcDateStart } from "./stale-seat-nudge-query-params";

describe("stale-seat-nudge-query-params", () => {
  it("parses audit page as positive integer", () => {
    expect(parseAuditPage(undefined)).toBe(1);
    expect(parseAuditPage("")).toBe(1);
    expect(parseAuditPage("1")).toBe(1);
    expect(parseAuditPage("3")).toBe(3);
    expect(parseAuditPage("0")).toBe(1);
    expect(parseAuditPage("-2")).toBe(1);
    expect(parseAuditPage("nope")).toBe(1);
  });

  it("parses YYYY-MM-DD to UTC day start/end", () => {
    expect(parseUtcDateStart("2024-06-15")?.toISOString()).toBe("2024-06-15T00:00:00.000Z");
    expect(parseUtcDateEnd("2024-06-15")?.toISOString()).toBe("2024-06-15T23:59:59.999Z");
    expect(parseUtcDateStart(undefined)).toBeNull();
    expect(parseUtcDateStart("not-a-date")).toBeNull();
  });
});
