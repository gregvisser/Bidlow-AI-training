import { auth } from "@/auth";
import {
  deleteBlobIfExists,
  ensureContainerExists,
  isBlobStorageConfigured,
  uploadBufferToBlob,
} from "@/lib/azure/blob-service";
import { getClientIp } from "@/lib/http/client-ip";
import { checkRateLimit } from "@/lib/http/rate-limit";
import { safeApiError } from "@/lib/http/api-error";
import { opsLog } from "@/lib/observability/logger";
import {
  sanitizeFileStem,
  sniffImageMime,
  validateImageBufferAndType,
} from "@/lib/upload/image-validation";
import { prisma } from "@/lib/db";
import { randomBytes } from "node:crypto";

export const runtime = "nodejs";

const KIND = "course-hero";

export async function POST(req: Request, ctx: { params: Promise<{ courseId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return safeApiError(401, "Unauthorized");
  }
  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
    return safeApiError(403, "Forbidden");
  }

  const ip = getClientIp(req);
  const rl = checkRateLimit(`upload:hero:${session.user.id}`, 30, 60_000);
  if (!rl.ok) {
    return new Response(JSON.stringify({ error: "Too many uploads" }), {
      status: 429,
      headers: { "Retry-After": String(rl.retryAfterSec), "Content-Type": "application/json" },
    });
  }

  if (!isBlobStorageConfigured()) {
    return safeApiError(503, "File storage is not configured");
  }

  const { courseId } = await ctx.params;
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) {
    return safeApiError(404, "Course not found");
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return safeApiError(400, "Invalid form data");
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return safeApiError(400, "Missing file");
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length === 0) {
    return safeApiError(400, "Empty file");
  }
  const sniffed = sniffImageMime(buf);
  if (!sniffed) {
    return safeApiError(400, "Invalid or unsupported image");
  }
  const v = await validateImageBufferAndType(buf, sniffed);
  if (!v.ok) {
    return safeApiError(400, v.error);
  }

  const ext =
    v.contentType === "image/jpeg" ? "jpg" : v.contentType === "image/png" ? "png" : "webp";
  const stem = sanitizeFileStem(file.name);
  const blobName = `courses/${courseId}/hero-${stem}-${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;

  try {
    await ensureContainerExists();
    const previous = await prisma.uploadedAsset.findFirst({
      where: { courseId, kind: KIND },
      orderBy: { createdAt: "desc" },
    });
    if (previous?.blobName) {
      await deleteBlobIfExists(previous.blobName);
    }

    const { url } = await uploadBufferToBlob({
      blobName,
      buffer: buf,
      contentType: v.contentType,
    });

    await prisma.$transaction([
      prisma.uploadedAsset.create({
        data: {
          userId: session.user.id,
          courseId,
          kind: KIND,
          blobName,
          url,
          contentType: v.contentType,
          bytes: buf.length,
        },
      }),
      prisma.course.update({
        where: { id: courseId },
        data: { heroImageUrl: url },
      }),
      prisma.auditLog.create({
        data: {
          actorId: session.user.id,
          action: "course.hero.upload",
          entity: "Course",
          entityId: courseId,
          metadata: { bytes: buf.length, contentType: v.contentType },
        },
      }),
    ]);

    return Response.json({ ok: true, url });
  } catch (e) {
    opsLog.upload("hero", `failed course=${courseId} ip=${ip}`);
    opsLog.error("upload-hero", e);
    return safeApiError(500, "Upload failed", e);
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ courseId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return safeApiError(401, "Unauthorized");
  }
  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
    return safeApiError(403, "Forbidden");
  }
  if (!isBlobStorageConfigured()) {
    return safeApiError(503, "File storage is not configured");
  }

  const { courseId } = await ctx.params;
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) {
    return safeApiError(404, "Course not found");
  }

  const previous = await prisma.uploadedAsset.findFirst({
    where: { courseId, kind: KIND },
    orderBy: { createdAt: "desc" },
  });

  try {
    if (previous?.blobName) {
      await deleteBlobIfExists(previous.blobName);
    }
    await prisma.course.update({
      where: { id: courseId },
      data: { heroImageUrl: null },
    });
    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "course.hero.remove",
        entity: "Course",
        entityId: courseId,
      },
    });
    return Response.json({ ok: true });
  } catch (e) {
    opsLog.error("upload-hero-delete", e);
    return safeApiError(500, "Remove failed", e);
  }
}
