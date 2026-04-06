import { prisma } from "@/lib/db";

export async function getPublicLearningTracks() {
  return prisma.learningPath.findMany({
    where: { isPublic: true },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    include: {
      courses: {
        orderBy: { sortOrder: "asc" },
        include: {
          course: {
            select: {
              id: true,
              slug: true,
              title: true,
              subtitle: true,
              description: true,
              provider: true,
              status: true,
              estimatedMinutes: true,
              isPublic: true,
            },
          },
        },
      },
    },
  });
}
