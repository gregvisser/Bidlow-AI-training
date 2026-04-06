import "dotenv/config";
import { hash } from "bcryptjs";
import {
  ContentProvider,
  CourseStatus,
  EntitlementSource,
  PlanKind,
  PricingInterval,
  UserRole,
} from "../src/generated/prisma";
import { disconnectDb, prisma } from "../src/lib/db";
import { syncLaunchCatalog } from "../src/lib/curriculum/sync-launch-catalog";

const MODULE_THEMES: { title: string; provider: ContentProvider; blurb: string }[] = [
  {
    title: "Azure AI platform & safety",
    provider: ContentProvider.AZURE,
    blurb: "Azure OpenAI, content filters, and responsible AI baselines.",
  },
  {
    title: "Model selection & evaluation",
    provider: ContentProvider.AZURE,
    blurb: "Choosing models, benchmarking, and cost-aware routing.",
  },
  {
    title: "Hugging Face ecosystem",
    provider: ContentProvider.HUGGING_FACE,
    blurb: "Hub, datasets, Spaces, and reproducible pipelines.",
  },
  {
    title: "Fine-tuning & adapters",
    provider: ContentProvider.HUGGING_FACE,
    blurb: "LoRA, PEFT, and evaluation loops for domain tasks.",
  },
  {
    title: "Agents & tool use",
    provider: ContentProvider.CURSOR,
    blurb: "Planning, tools, and guardrails for autonomous loops.",
  },
  {
    title: "RAG at scale",
    provider: ContentProvider.AZURE,
    blurb: "Chunking, embeddings, hybrid search, and citations.",
  },
  {
    title: "Cursor workflows",
    provider: ContentProvider.CURSOR,
    blurb: "Repo-aware edits, reviews, and test-driven agent changes.",
  },
  {
    title: "Observability & evals",
    provider: ContentProvider.AZURE,
    blurb: "Tracing, dashboards, and regression suites for agents.",
  },
  {
    title: "Deployment patterns",
    provider: ContentProvider.AZURE,
    blurb: "Container Apps, Functions, and secure endpoints.",
  },
  {
    title: "Data governance",
    provider: ContentProvider.AZURE,
    blurb: "PII boundaries, retention, and audit-friendly logging.",
  },
  {
    title: "Multi-agent orchestration",
    provider: ContentProvider.CURSOR,
    blurb: "Handoffs, state machines, and failure recovery.",
  },
  {
    title: "Capstone & certification",
    provider: ContentProvider.CURSOR,
    blurb: "Ship a production-grade agentic workflow end-to-end.",
  },
];

async function main() {
  const adminPass = await hash("Admin123!", 12);
  const learnerPass = await hash("Learner123!", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@aitraining.local" },
    update: { passwordHash: adminPass, role: UserRole.ADMIN },
    create: {
      email: "admin@aitraining.local",
      name: "Portal Admin",
      passwordHash: adminPass,
      role: UserRole.ADMIN,
      profile: { create: {} },
    },
  });

  const learner = await prisma.user.upsert({
    where: { email: "learner@aitraining.local" },
    update: { passwordHash: learnerPass },
    create: {
      email: "learner@aitraining.local",
      name: "Demo Learner",
      passwordHash: learnerPass,
      role: UserRole.LEARNER,
      profile: { create: {} },
    },
  });

  const path = await prisma.learningPath.upsert({
    where: { slug: "ai-agent-mastery" },
    update: {
      title: "AI Agent Mastery",
      durationWeeks: 12,
      isFeatured: true,
      isPublic: true,
      sortOrder: 50,
    },
    create: {
      slug: "ai-agent-mastery",
      title: "AI Agent Mastery",
      description:
        "Twelve weekly milestones spanning Azure AI, Hugging Face, and Cursor—structured for production teams.",
      durationWeeks: 12,
      isFeatured: true,
      isPublic: true,
      sortOrder: 50,
    },
  });

  const course = await prisma.course.upsert({
    where: { slug: "ai-agent-mastery-core" },
    update: {
      status: CourseStatus.PUBLISHED,
      isPublic: true,
      isFeatured: true,
      estimatedMinutes: 12 * 3 * 45,
      pricingModel: "one_time",
    },
    create: {
      slug: "ai-agent-mastery-core",
      title: "AI Agent Mastery — Core Curriculum",
      subtitle: "12-week structured program",
      description:
        "Weekly modules with lessons, external resources, and measurable completion. Tracks: Azure, Hugging Face, Cursor.",
      status: CourseStatus.PUBLISHED,
      isPublic: true,
      isFeatured: true,
      provider: ContentProvider.AZURE,
      estimatedMinutes: 12 * 3 * 45,
      pricingModel: "one_time",
    },
  });

  await prisma.learningPathCourse.upsert({
    where: {
      learningPathId_courseId: { learningPathId: path.id, courseId: course.id },
    },
    update: { sortOrder: 0, weekNumber: null },
    create: {
      learningPathId: path.id,
      courseId: course.id,
      sortOrder: 0,
    },
  });

  const existingModules = await prisma.module.findMany({
    where: { courseId: course.id },
    orderBy: { sortOrder: "asc" },
  });

  if (existingModules.length === 0) {
    for (let i = 0; i < MODULE_THEMES.length; i++) {
      const week = MODULE_THEMES[i]!;
      const mod = await prisma.module.create({
        data: {
          courseId: course.id,
          slug: `week-${i + 1}`,
          title: `Week ${i + 1}: ${week.title}`,
          description: week.blurb,
          sortOrder: i,
          weekNumber: i + 1,
          estimatedMinutes: 3 * 45,
          trackProvider: week.provider,
        },
      });

      const lessons = [
        {
          slug: "overview",
          title: "Overview & outcomes",
          minutes: 20,
          content: `Establish outcomes for ${week.title}. Review prerequisites and success criteria.`,
        },
        {
          slug: "lab",
          title: "Hands-on lab",
          minutes: 40,
          content: `Apply concepts from ${week.title} in a guided exercise with clear acceptance tests.`,
        },
        {
          slug: "resources",
          title: "Resources & next steps",
          minutes: 15,
          content: `Curated links and checklists. Provider focus: ${week.provider}.`,
        },
      ];

      for (let j = 0; j < lessons.length; j++) {
        const L = lessons[j]!;
        await prisma.lesson.create({
          data: {
            moduleId: mod.id,
            slug: L.slug,
            title: L.title,
            content: L.content,
            sortOrder: j,
            estimatedMinutes: L.minutes,
            externalLinks: {
              docs: "https://learn.microsoft.com/azure/ai-services/",
            },
          },
        });
      }
    }
  }

  await prisma.pricingPlan.upsert({
    where: { slug: "membership-monthly" },
    update: {
      features: { access: "catalog" },
    },
    create: {
      slug: "membership-monthly",
      name: "Membership",
      description: "Full library access, billed monthly.",
      kind: PlanKind.SUBSCRIPTION,
      interval: PricingInterval.MONTH,
      amountCents: 7900,
      isActive: true,
      features: { access: "catalog" },
    },
  });

  await prisma.pricingPlan.upsert({
    where: { slug: "lifetime-core" },
    update: {
      features: { access: "course", courseSlug: "ai-agent-mastery-core" },
    },
    create: {
      slug: "lifetime-core",
      name: "Lifetime — Core",
      description: "One-time purchase for the core curriculum.",
      kind: PlanKind.ONE_TIME,
      interval: PricingInterval.ONE_TIME,
      amountCents: 79900,
      isActive: true,
      features: { access: "course", courseSlug: "ai-agent-mastery-core" },
    },
  });

  await prisma.enrollment.upsert({
    where: {
      userId_courseId: { userId: learner.id, courseId: course.id },
    },
    update: {},
    create: {
      userId: learner.id,
      courseId: course.id,
      status: "active",
    },
  });

  const demoEntitlement = await prisma.entitlement.findFirst({
    where: { userId: learner.id, courseId: course.id },
  });
  if (!demoEntitlement) {
    await prisma.entitlement.create({
      data: {
        userId: learner.id,
        courseId: course.id,
        source: EntitlementSource.MANUAL_GRANT,
        active: true,
      },
    });
  }

  const firstLessons = await prisma.lesson.findMany({
    where: { module: { courseId: course.id } },
    orderBy: [{ module: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    take: 3,
  });

  for (const lesson of firstLessons) {
    await prisma.lessonProgress.upsert({
      where: {
        userId_lessonId: { userId: learner.id, lessonId: lesson.id },
      },
      update: {
        completedAt: new Date(),
        timeSpentSeconds: lesson.estimatedMinutes * 60,
        lastActivityAt: new Date(),
      },
      create: {
        userId: learner.id,
        lessonId: lesson.id,
        completedAt: new Date(),
        timeSpentSeconds: lesson.estimatedMinutes * 60,
      },
    });
  }

  const claimLegacy = process.env.CURRICULUM_CLAIM_LEGACY !== "false";
  const { warnings } = await syncLaunchCatalog(prisma, {
    claimLegacy,
    enrollLearnerUserId: learner.id,
  });
  for (const w of warnings) {
    console.warn("[seed] curriculum:", w);
  }

  console.log("Seed complete.", {
    admin: admin.email,
    learner: learner.email,
    path: path.slug,
    course: course.slug,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectDb();
  });
