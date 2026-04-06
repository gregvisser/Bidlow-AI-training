import { describe, expect, it } from "vitest";
import { certificatePdfBlobName } from "./certificate-pdf-blob";

describe("certificatePdfBlobName", () => {
  it("uses a stable owner-scoped path", () => {
    expect(certificatePdfBlobName("user_abc", "cert_xyz")).toBe("certificates/user_abc/cert_xyz.pdf");
  });
});
