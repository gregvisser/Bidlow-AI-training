import { prisma } from "@/lib/db";

export type AdminCertificateRow = {
  id: string;
  userId: string;
  learnerEmail: string | null;
  learnerName: string | null;
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  certificateEligible: boolean;
  title: string;
  unlockedAt: Date | null;
  issuedAt: Date | null;
  active: boolean;
  courseCompletedAt: Date | null;
  lessonsCompletedCount: number;
  minutesCompletedEstimate: number;
};

/**
 * All certificate rows (including not yet issued) for admin audit.
 * Optional `search` filters learner email/name and course title (case-insensitive).
 */
export async function getAdminCertificates(search?: string | null): Promise<AdminCertificateRow[]> {
  const q = search?.trim();
  const where = q
    ? {
        OR: [
          { user: { email: { contains: q, mode: "insensitive" as const } } },
          { user: { name: { contains: q, mode: "insensitive" as const } } },
          { course: { title: { contains: q, mode: "insensitive" as const } } },
        ],
      }
    : {};

  const certs = await prisma.certificate.findMany({
    where,
    include: {
      user: { select: { email: true, name: true } },
      course: { select: { title: true, slug: true, certificateEligible: true } },
    },
    orderBy: [{ issuedAt: "desc" }, { unlockedAt: "desc" }, { id: "desc" }],
  });

  if (certs.length === 0) return [];

  const userIds = [...new Set(certs.map((c) => c.userId))];
  const courseIds = [...new Set(certs.map((c) => c.courseId))];
  const enrollments = await prisma.enrollment.findMany({
    where: { userId: { in: userIds }, courseId: { in: courseIds } },
  });
  const enrollmentByPair = new Map(
    enrollments.map((e) => [`${e.userId}:${e.courseId}`, e] as const),
  );

  return certs.map((cert) => {
    const e = enrollmentByPair.get(`${cert.userId}:${cert.courseId}`);
    const active = !!(cert.unlockedAt && cert.issuedAt);
    return {
      id: cert.id,
      userId: cert.userId,
      learnerEmail: cert.user.email ?? null,
      learnerName: cert.user.name,
      courseId: cert.courseId,
      courseTitle: cert.course.title,
      courseSlug: cert.course.slug,
      certificateEligible: cert.course.certificateEligible,
      title: cert.title,
      unlockedAt: cert.unlockedAt,
      issuedAt: cert.issuedAt,
      active,
      courseCompletedAt: e?.courseCompletedAt ?? null,
      lessonsCompletedCount: e?.lessonsCompletedCount ?? 0,
      minutesCompletedEstimate: e?.minutesCompletedEstimate ?? 0,
    };
  });
}
