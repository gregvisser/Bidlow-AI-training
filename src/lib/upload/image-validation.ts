const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED: Record<string, { magic: (b: Uint8Array) => boolean }> = {
  "image/jpeg": {
    magic: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  "image/png": {
    magic: (b) =>
      b.length >= 8 &&
      b[0] === 0x89 &&
      b[1] === 0x50 &&
      b[2] === 0x4e &&
      b[3] === 0x47 &&
      b[4] === 0x0d &&
      b[5] === 0x0a &&
      b[6] === 0x1a &&
      b[7] === 0x0a,
  },
  "image/webp": {
    magic: (b) =>
      b.length >= 12 &&
      b[0] === 0x52 &&
      b[1] === 0x49 &&
      b[2] === 0x46 &&
      b[3] === 0x46 &&
      b[8] === 0x57 &&
      b[9] === 0x45 &&
      b[10] === 0x42 &&
      b[11] === 0x50,
  },
};

export async function validateImageBufferAndType(
  buffer: Buffer,
  declaredType: string,
): Promise<{ ok: true; contentType: string } | { ok: false; error: string }> {
  if (buffer.length > MAX_BYTES) {
    return { ok: false, error: `File too large (max ${MAX_BYTES / 1024 / 1024} MB)` };
  }
  const b = new Uint8Array(buffer);
  const ct = declaredType.toLowerCase();
  const rule = ALLOWED[ct];
  if (!rule || !rule.magic(b)) {
    return { ok: false, error: "Invalid image content for declared type" };
  }
  return { ok: true, contentType: ct };
}

export function sanitizeFileStem(name: string): string {
  const base = name.replace(/\.[^.]+$/, "");
  return base.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 80) || "image";
}

/** Detect image MIME from magic bytes (no trust in client-provided Content-Type). */
export function sniffImageMime(buffer: Buffer): string | null {
  const b = new Uint8Array(buffer);
  for (const [mime, rule] of Object.entries(ALLOWED)) {
    if (rule.magic(b)) {
      return mime;
    }
  }
  return null;
}
