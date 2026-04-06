import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type CertificatePdfInput = {
  certificateTitle: string;
  courseTitle: string;
  learnerName: string;
  learnerEmail: string;
  credentialId: string;
  courseCompletedAt: Date | null;
  minutesCompletedEstimate: number | null;
  issuedAt: Date | null;
  /** Both unlock + issue timestamps set */
  active: boolean;
  certificateEligible: boolean;
};

/** Fixed English long date (UTC) — deterministic for the same instant. */
export function formatCertificateDateUtc(d: Date | null): string {
  if (!d) return "—";
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ] as const;
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/**
 * Builds a compact, print-friendly PDF certificate (Letter size).
 * Deterministic for identical inputs (same dates → same bytes).
 */
export async function buildCertificatePdf(input: CertificatePdfInput): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const textDark = rgb(0.12, 0.12, 0.14);
  const textMuted = rgb(0.35, 0.35, 0.4);
  const accent = rgb(0.25, 0.28, 0.45);

  let y = 720;

  const headline = input.active
    ? "Certificate of completion"
    : "Course completion record";
  const hs = 18;
  const hw = fontBold.widthOfTextAtSize(headline, hs);
  page.drawText(headline, {
    x: (612 - hw) / 2,
    y,
    size: hs,
    font: fontBold,
    color: accent,
  });
  y -= 36;

  const sub = input.certificateTitle;
  const ss = 13;
  const sw = fontBold.widthOfTextAtSize(sub, ss);
  page.drawText(sub, { x: (612 - sw) / 2, y, size: ss, font: fontBold, color: textDark });
  y -= 28;

  page.drawText(input.courseTitle, {
    x: 72,
    y,
    size: 11,
    font,
    color: textMuted,
  });
  y -= 36;

  page.drawText("Presented to", { x: 72, y, size: 10, font, color: textMuted });
  y -= 18;
  page.drawText(input.learnerName, { x: 72, y, size: 12, font: fontBold, color: textDark });
  y -= 16;
  page.drawText(input.learnerEmail, { x: 72, y, size: 10, font, color: textMuted });
  y -= 32;

  const lines: [string, string][] = [
    ["Course completed", formatCertificateDateUtc(input.courseCompletedAt)],
    ["Estimated minutes completed", input.minutesCompletedEstimate != null ? `${input.minutesCompletedEstimate} min` : "—"],
    ["Issued", formatCertificateDateUtc(input.issuedAt)],
    ["Credential id", input.credentialId],
  ];

  for (const [label, value] of lines) {
    page.drawText(`${label}:`, { x: 72, y, size: 10, font, color: textMuted });
    const lw = font.widthOfTextAtSize(`${label}:`, 10);
    page.drawText(` ${value}`, { x: 72 + lw + 4, y, size: 10, font, color: textDark });
    y -= 16;
  }

  y -= 16;
  page.drawText(
    input.certificateEligible
      ? "This course is designated as certificate-eligible."
      : "Completion is tracked; this course is not designated for a formal certificate.",
    { x: 72, y, size: 9, font, color: textMuted },
  );
  y -= 40;

  page.drawText("AI Training Portal", {
    x: 72,
    y: 48,
    size: 9,
    font,
    color: rgb(0.45, 0.45, 0.5),
  });

  return pdfDoc.save();
}
