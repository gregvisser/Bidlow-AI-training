import { describe, expect, it } from "vitest";
import { parseUtcDateEnd, parseUtcDateStart } from "./stale-seat-nudge-query-params";

describe("stale-seat-nudge-query-params", () => {
  it("parses YYYY-MM-DD to UTC day start/end", () => {
    expect(parseUtcDateStart("2024-06-15")?.toISOString()).toBe("2024-06-15T00:00:00.000Z");
    expect(parseUtcDateEnd("2024-06-15")?.toISOString()).toBe("2024-06-15T23:59:59.999Z");
    expect(parseUtcDateStart(undefined)).toBeNull();
    expect(parseUtcDateStart("not-a-date")).toBeNull();
  });
});
