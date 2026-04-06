import { describe, expect, it } from "vitest";
import { buildCertificatePdf, formatCertificateDateUtc } from "./build-certificate-pdf";

describe("formatCertificateDateUtc", () => {
  it("formats UTC deterministically", () => {
    expect(formatCertificateDateUtc(new Date("2026-04-06T12:00:00.000Z"))).toBe("April 6, 2026");
  });

  it("returns em dash for null", () => {
    expect(formatCertificateDateUtc(null)).toBe("—");
  });
});

describe("buildCertificatePdf", () => {
  it("produces a valid PDF with expected header bytes", async () => {
    const bytes = await buildCertificatePdf({
      certificateTitle: "Test Course — Completion",
      courseTitle: "Test Course",
      learnerName: "Demo Learner",
      learnerEmail: "learner@example.com",
      credentialId: "cred_test_123",
      courseCompletedAt: new Date("2026-01-15T00:00:00.000Z"),
      minutesCompletedEstimate: 120,
      issuedAt: new Date("2026-01-15T00:00:00.000Z"),
      active: true,
      certificateEligible: true,
    });

    const header = new TextDecoder().decode(bytes.slice(0, 5));
    expect(header.startsWith("%PDF")).toBe(true);
    expect(bytes.length).toBeGreaterThan(400);
  });
});
