/**
 * Phase 1 launch catalog — original summaries/objectives/exercises; official links only.
 * Synced idempotently via `npm run curriculum:sync` or prisma seed (local).
 */
import { ContentProvider } from "@/generated/prisma";

type LinkDef = { label: string; url: string; provider: ContentProvider };

type LessonDef = {
  slug: string;
  title: string;
  summary: string;
  objectives: string[];
  exercise: string;
  content: string;
  estimatedMinutes: number;
  links: LinkDef[];
};

export type CourseDef = {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  provider: ContentProvider;
  estimatedMinutes: number;
  moduleSlug: string;
  moduleTitle: string;
  lessons: LessonDef[];
};

type TrackDef = {
  slug: string;
  title: string;
  description: string;
  durationWeeks: number;
  sortOrder: number;
  badgeLabel: string;
  difficulty: string;
  courses: CourseDef[];
};

const MS_LEARN_AI = "https://learn.microsoft.com/en-us/training/browse/?products=azure-ai-services";
const MS_AZURE_AI = "https://learn.microsoft.com/en-us/azure/ai-services/";
const MS_FOUNDRY = "https://learn.microsoft.com/en-us/azure/ai-foundry/";
const MS_RESPONSIBLE = "https://learn.microsoft.com/en-us/training/paths/responsible-ai-business-principles/";
const HF_LEARN = "https://huggingface.co/learn";
const HF_HUB = "https://huggingface.co/docs/hub/en";
const HF_TRANSFORMERS = "https://huggingface.co/docs/transformers/index";
const HF_DATASETS = "https://huggingface.co/docs/datasets/en/index";
const HF_TOKENIZERS = "https://huggingface.co/docs/tokenizers/index";
const HF_EVALUATE = "https://huggingface.co/docs/evaluate/index";
const MCP_PROTOCOL = "https://modelcontextprotocol.io/";
const CURSOR_DOCS = "https://cursor.com/docs";
const CURSOR_AGENT = "https://cursor.com/docs/agent/overview";
const CURSOR_RULES = "https://cursor.com/docs/context/rules-for-ai";
const CURSOR_SKILLS = "https://cursor.com/docs/context/skills";
const CURSOR_PLAN = "https://cursor.com/docs/agent/planning";

function lesson(
  slug: string,
  title: string,
  summary: string,
  objectives: string[],
  exercise: string,
  body: string,
  minutes: number,
  links: LinkDef[],
): LessonDef {
  return {
    slug,
    title,
    summary,
    objectives,
    exercise,
    content: body,
    estimatedMinutes: minutes,
    links,
  };
}

const TRACKS: TrackDef[] = [
  {
    slug: "track-microsoft-azure-ai",
    title: "Microsoft / Azure AI",
    description:
      "From business framing to Foundry operations and agent-style systems on Azure—including practical MCP-style tool thinking for real deployments.",
    durationWeeks: 8,
    sortOrder: 0,
    badgeLabel: "Azure",
    difficulty: "beginner",
    courses: [
      {
        slug: "azure-ai-foundations",
        title: "Azure AI Foundations",
        subtitle: "Business context, responsibility, and the Azure AI map",
        description:
          "Connect outcomes to constraints before you choose models: ownership, data boundaries, evaluation, how Azure AI services fit a delivery roadmap, and how you ship changes without gambling on production.",
        provider: ContentProvider.AZURE,
        estimatedMinutes: 164,
        moduleSlug: "core",
        moduleTitle: "Core lessons",
        lessons: [
          lesson(
            "what-ai-is-business",
            "What AI Is and Where It Fits in Business",
            "Frame AI as a systems problem: data, interfaces, reliability, and accountability—not a single model purchase.",
            [
              "Explain to a non-technical exec why “accuracy” depends on task definition and measurement.",
              "Separate automation (repeatable) from judgment (human-owned) for one real workflow.",
              "List three decisions that must stay with humans even if the model is “good enough.”",
            ],
            "Choose one internal process (support triage, contract review, forecasting). Write a one-pager: trigger, inputs, success metric, failure mode, rollback, and who signs off. No tool names in the body—only in an appendix.",
            "Stress that the brief is a contract for what “done” means. Use official Azure AI docs as reference links only in the appendix.",
            32,
            [
              { label: "Microsoft Learn — AI on Azure", url: MS_LEARN_AI, provider: ContentProvider.AZURE },
              { label: "Azure AI services documentation", url: MS_AZURE_AI, provider: ContentProvider.AZURE },
            ],
          ),
          lesson(
            "responsible-ai-fundamentals",
            "Responsible AI Fundamentals",
            "Turn principles into release gates: who is harmed if this fails, what you log, and when humans intervene.",
            [
              "Map “fairness” to measurable slices for your domain (not abstract ethics).",
              "Define incident severity for model mistakes vs software bugs.",
              "Pick three production signals (latency, refusal rate, human override rate) you would watch weekly.",
            ],
            "For a customer-facing chat assistant, draft: (1) content policy summary, (2) escalation path, (3) data retention stance, (4) red-team scenarios to run before launch.",
            "Keep language original; cite Microsoft responsible AI learning paths as references, not pasted policy text.",
            34,
            [
              { label: "Responsible AI business principles — Microsoft Learn", url: MS_RESPONSIBLE, provider: ContentProvider.AZURE },
              { label: "Azure AI services documentation", url: MS_AZURE_AI, provider: ContentProvider.AZURE },
            ],
          ),
          lesson(
            "core-azure-ai-workloads",
            "Core Azure AI Workloads",
            "Use a small set of patterns—classification, retrieval Q&A, code assist, agents with tools—to reason about architecture without overfitting to a SKU.",
            [
              "For each pattern, state the bottleneck: latency, grounding, tool correctness, or cost.",
              "Describe where embeddings, search, and policy filters sit in the loop.",
            ],
            "Draw one architecture for a retrieval-grounded assistant: user → gateway → retrieval → model → post-checks → audit log. Annotate trust boundaries and what must never leave a region.",
            "Stay at service-family level; link Azure AI docs for the components you label.",
            34,
            [
              { label: "Azure AI services documentation", url: MS_AZURE_AI, provider: ContentProvider.AZURE },
              { label: "Microsoft Learn browse — Azure AI", url: MS_LEARN_AI, provider: ContentProvider.AZURE },
            ],
          ),
          lesson(
            "azure-ai-services-map",
            "Azure AI Services Map",
            "Build a repeatable “problem → candidate capability → doc entry point → open questions” habit so teams stop guessing in Slack.",
            [
              "Match modality and integration style (sync API, batch, streaming) to product needs.",
              "Know what to verify before POC: region, quota, data residency, and identity model.",
            ],
            "Create a picker table with 6 rows: scenario, modality, candidate Azure AI capability family, doc link, unknown risk, owner. Use your own words; links are references only.",
            "This is an operational artifact—optimize for the next engineer onboarding in 10 minutes.",
            30,
            [
              { label: "Azure AI services documentation", url: MS_AZURE_AI, provider: ContentProvider.AZURE },
              { label: "Microsoft Foundry documentation hub", url: MS_FOUNDRY, provider: ContentProvider.AZURE },
            ],
          ),
          lesson(
            "operational-release-discipline-azure-ai",
            "Operational Release Discipline for Azure AI Features",
            "Ship AI changes like you ship any critical service: change records, blast-radius limits, verification, and rollback—Responsible AI included as release criteria, not a slide deck.",
            [
              "Define what “green” means for a model or prompt change (metrics + human spot checks).",
              "Separate model regressions from infrastructure incidents in your runbooks.",
              "Name who can approve promotions when safety or privacy impact changes.",
            ],
            "Write a one-page release template for an Azure-hosted AI feature: scope, dependencies, data boundaries, evaluation results, monitoring plan, rollback, and comms. Include a Responsible AI sign-off line with a named owner.",
            "Use your org’s real change process vocabulary; Microsoft Learn links belong in an appendix as references only.",
            34,
            [
              { label: "Responsible AI business principles — Microsoft Learn", url: MS_RESPONSIBLE, provider: ContentProvider.AZURE },
              { label: "Azure AI services documentation", url: MS_AZURE_AI, provider: ContentProvider.AZURE },
            ],
          ),
        ],
      },
      {
        slug: "microsoft-foundry-foundations",
        title: "Microsoft Foundry Foundations",
        subtitle: "Portal, projects, and choosing components",
        description:
          "Treat Foundry as the place where projects, models, evaluations, and governance meet—so experiments graduate to production with the same guardrails you started with.",
        provider: ContentProvider.AZURE,
        estimatedMinutes: 4 * 32,
        moduleSlug: "core",
        moduleTitle: "Core lessons",
        lessons: [
          lesson(
            "what-foundry-is",
            "What Microsoft Foundry Is",
            "Explain Foundry as the operational home for an AI initiative: project scope, configuration, iteration, and handoff to deployed services.",
            [
              "Contrast “team workspace” vs billing/subscription boundaries in terms stakeholders understand.",
              "Name three artifacts that should exist before any demo: owner, data classification, evaluation plan.",
            ],
            "Write a 150-word note to a product lead: why a project workspace beats ad-hoc API keys for auditability and velocity. No hype—tie each sentence to a risk.",
            "Original wording only; link Foundry docs for feature names you reference.",
            32,
            [
              { label: "Microsoft Foundry documentation", url: MS_FOUNDRY, provider: ContentProvider.AZURE },
              { label: "Azure AI services documentation", url: MS_AZURE_AI, provider: ContentProvider.AZURE },
            ],
          ),
          lesson(
            "foundry-portal-setup",
            "Foundry Portal and Project Setup",
            "Repeatable setup: environments, access, and where humans approve changes.",
            [
              "List gates: who can create projects, who can deploy, who can view logs.",
              "Separate dev/stage/prod data and keys—even if you “move fast.”",
            ],
            "Produce a checklist: account prerequisites, project naming, RBAC roles, logging destination, quota watch, rollback. Mark items that require security review.",
            "Bullets only; link Microsoft docs where steps vary by tenant.",
            34,
            [{ label: "Microsoft Foundry documentation", url: MS_FOUNDRY, provider: ContentProvider.AZURE }],
          ),
          lesson(
            "sdks-tools-structure",
            "SDKs, Tools, and Project Structure",
            "Keep experiments from corrupting production: repo layout, config, and evaluation harnesses.",
            [
              "Isolate notebooks and one-off scripts from deployable services.",
              "Define how prompts and model versions are versioned alongside code.",
            ],
            "Design a folder tree: `experiments/`, `services/`, `eval/` (golden sets, red-team prompts), `infra/`. For each top-level folder, one sentence on what must never ship to prod from there.",
            "Intent only—no pasted SDK snippets.",
            32,
            [
              { label: "Microsoft Foundry documentation", url: MS_FOUNDRY, provider: ContentProvider.AZURE },
              { label: "Azure AI services documentation", url: MS_AZURE_AI, provider: ContentProvider.AZURE },
            ],
          ),
          lesson(
            "choosing-azure-ai-components",
            "Choosing the Right Azure AI Components",
            "Score options against SLOs, residency, safety, and cost—not feature lists.",
            [
              "Translate “fast” into p95 latency and concurrency targets.",
              "Define evaluation gates: offline, shadow, canary, promote.",
            ],
            "Pick a live scenario (e.g., internal doc Q&A). Build a weighted matrix: grounding quality, ops burden, $/1k requests, regional availability, audit trail. Weights sum to 100%.",
            "Footnote each component with official doc links; no copied tables from vendors.\n\nWhen two options tie, write the tie-breaker you will use in production (team skill, existing integration, operational maturity, or regional fit)—and who owns revisiting the decision quarterly.",
            32,
            [
              { label: "Azure AI services documentation", url: MS_AZURE_AI, provider: ContentProvider.AZURE },
              { label: "Microsoft Learn — AI on Azure", url: MS_LEARN_AI, provider: ContentProvider.AZURE },
            ],
          ),
        ],
      },
      {
        slug: "azure-ai-agents",
        title: "Azure AI Agents",
        subtitle: "Agents, orchestration, and operations on Azure",
        description:
          "Ship agents as products: explicit tools, budgets, observability, and Azure-ready operations—plus how MCP-style contracts fit your API and identity model.",
        provider: ContentProvider.AZURE,
        estimatedMinutes: 4 * 34,
        moduleSlug: "core",
        moduleTitle: "Core lessons",
        lessons: [
          lesson(
            "agent-concepts-use-cases",
            "Agent Concepts and Use Cases",
            "Define an agent as policy + tools + memory + evaluation—not a chat window with extra courage.",
            [
              "Separate “planning” from “tool execution” and assign owners for each.",
              "List five failure modes: hallucinated tool args, auth drift, runaway loops, data leaks, silent regressions.",
            ],
            "Pick an internal workflow (e.g., ticket enrichment). Write: allowed tools, forbidden actions, max autonomous steps, escalation trigger, and how you measure weekly success.",
            "Assume production: include rollback and an on-call note.",
            34,
            [
              { label: "Microsoft Foundry documentation", url: MS_FOUNDRY, provider: ContentProvider.AZURE },
              { label: "Azure AI services documentation", url: MS_AZURE_AI, provider: ContentProvider.AZURE },
            ],
          ),
          lesson(
            "foundry-agent-service-basics",
            "Foundry Agent Service Basics",
            "Map Foundry’s agent-oriented surfaces to what you must observe before customers do.",
            [
              "Trace one user request through model, tools, and logging sinks you expect.",
              "Define “ready to canary” vs “ready to promote” with different test bars.",
            ],
            "Author a rollout doc: pre-checks (evals, safety), canary cohort, rollback command, owner roster. Link Azure/Foundry docs as references for terminology only.",
            "No pasted procedures—your words, their docs as citations.",
            34,
            [{ label: "Microsoft Foundry documentation", url: MS_FOUNDRY, provider: ContentProvider.AZURE }],
          ),
          lesson(
            "mcp-fundamentals",
            "Model Context Protocol Fundamentals",
            "Use MCP thinking on Azure: explicit capabilities, structured calls, and least privilege—whether or not you adopt a given stack wholesale.",
            [
              "Explain why a protocol beats ad-hoc JSON over REST for agent tools at scale.",
              "Relate MCP-style contracts to your API gateway, auth, and audit requirements.",
            ],
            "Design two tool specs: (1) read-only CRM lookup, (2) ticket update with human approval. For each: input schema, output schema, timeout, idempotency key, and denial behavior.",
            "Link the MCP project site for vocabulary; link Azure AI docs for security context on your account.\n\nFor enterprise rollout, map every tool to an identity principal (who may invoke it), an approval path for changes, and where audit logs land—before you expose tools to end-user agents.",
            36,
            [
              { label: "Model Context Protocol", url: MCP_PROTOCOL, provider: ContentProvider.AZURE },
              { label: "Azure AI services documentation", url: MS_AZURE_AI, provider: ContentProvider.AZURE },
            ],
          ),
          lesson(
            "deploying-managing-agents-azure",
            "Deploying and Managing AI Agents on Azure",
            "Run agents like services: SLOs, budgets, identity, and incident response—not “set and forget.”",
            [
              "Pick dashboards: latency, tool error rate, token spend, human override rate.",
              "Schedule secret rotation and permission reviews tied to agent capabilities.",
            ],
            "Write a monthly ops review agenda: metrics review, top incidents, eval regression, cost anomaly, roadmap of new tools with risk tier.",
            "Tie each item to an Azure doc you would follow for implementation detail.",
            36,
            [
              { label: "Azure AI services documentation", url: MS_AZURE_AI, provider: ContentProvider.AZURE },
              { label: "Microsoft Learn — AI on Azure", url: MS_LEARN_AI, provider: ContentProvider.AZURE },
            ],
          ),
        ],
      },
    ],
  },
  {
    slug: "track-hugging-face",
    title: "Hugging Face",
    description:
      "From Hub hygiene to Transformers/Datasets/Tokenizers, pipelines, evaluation loops, and agent-style tool use—practical literacy for shipping open-ecosystem AI without pretending benchmarks equal customers.",
    durationWeeks: 6,
    sortOrder: 1,
    badgeLabel: "HF",
    difficulty: "beginner",
    courses: [
      {
        slug: "llm-foundations-hugging-face",
        title: "LLM Foundations with Hugging Face",
        subtitle: "Hub, transformers, and inference patterns",
        description:
          "Build a defensible stack: reproducible Hub revisions, tokenizer-aware evaluation, dataset discipline, pipeline baselines, org-grade access—and honest model selection tradeoffs before you fine-tune.",
        provider: ContentProvider.HUGGING_FACE,
        estimatedMinutes: 166,
        moduleSlug: "core",
        moduleTitle: "Core lessons",
        lessons: [
          lesson(
            "hf-ecosystem-overview",
            "Hugging Face Ecosystem Overview",
            "Treat the Hub as infrastructure you depend on: artifacts, licenses, revisions, and an owner when upstream moves.",
            [
              "Contrast community momentum with operational risk (breaking revisions, deprecated APIs).",
              "Name the four pins you need in prod: model revision, tokenizer, runtime stack, eval snapshot.",
            ],
            "Write an internal one-pager for stakeholders: what artifact you use, why this family, license constraints, export posture, and how you will handle upstream churn (freeze vs upgrade policy).",
            "No pasted model cards—your synthesis; Hub/Learn docs as link references only.",
            32,
            [
              { label: "Hugging Face — Learn", url: HF_LEARN, provider: ContentProvider.HUGGING_FACE },
              { label: "Hugging Face Hub documentation", url: HF_HUB, provider: ContentProvider.HUGGING_FACE },
            ],
          ),
          lesson(
            "transformers-tokenizers-datasets",
            "Transformers, Tokenizers, and Datasets",
            "Debug the boring layers first: bad tokens, dirty splits, and silent label drift swamp model cleverness.",
            [
              "Explain how truncation changes metrics when inputs exceed context.",
              "Design train/val/test splits that respect time, users, and leakage boundaries.",
            ],
            "Produce a dataset QA checklist (≥14 bullets) spanning schema validation, PII, duplicates, long-tail languages, adversarial strings, and label agreement—then mark which checks block training vs warn.",
            "Link Transformers, Datasets, and Tokenizers docs for concepts only.",
            36,
            [
              { label: "Transformers documentation", url: HF_TRANSFORMERS, provider: ContentProvider.HUGGING_FACE },
              { label: "Datasets documentation", url: HF_DATASETS, provider: ContentProvider.HUGGING_FACE },
              { label: "Tokenizers documentation", url: HF_TOKENIZERS, provider: ContentProvider.HUGGING_FACE },
            ],
          ),
          lesson(
            "pipelines-model-inference",
            "Pipelines and Model Inference",
            "Use high-level pipelines to get a fast, honest baseline: latency, cost, and failure buckets on real inputs—not leaderboard trivia.",
            [
              "Map each pipeline task to a product-visible metric (latency, precision@k, human edit rate).",
              "Decide batching, streaming, and caching with correctness constraints spelled out.",
            ],
            "Author a one-week benchmark plan: hardware target, 50–200 real inputs, primary metric, secondary metrics, failure taxonomy, and stop rules. Include a ‘ship / no-ship’ bar tied to user-visible pain.",
            "Reference Transformers pipeline docs for API names only.",
            34,
            [
              { label: "Transformers documentation", url: HF_TRANSFORMERS, provider: ContentProvider.HUGGING_FACE },
              { label: "Hugging Face — Learn", url: HF_LEARN, provider: ContentProvider.HUGGING_FACE },
            ],
          ),
          lesson(
            "working-with-hf-hub",
            "Working with the Hugging Face Hub",
            "Run the Hub like prod: least-privilege tokens, CI secrets, namespaces, and an on-call story for compromised credentials.",
            [
              "Separate interactive developer tokens from CI robots; rotate on a calendar.",
              "Define publish vs read vs download scopes for each automation account.",
            ],
            "Draft a 15-bullet internal policy: naming, visibility, who can push, how forks are approved, secret storage, and the exact incident steps if a write token leaks.",
            "Link Hub documentation; every bullet is your wording.",
            30,
            [{ label: "Hugging Face Hub documentation", url: HF_HUB, provider: ContentProvider.HUGGING_FACE }],
          ),
          lesson(
            "open-model-selection-tradeoffs",
            "Choosing Open Models: Tradeoffs That Matter",
            "Pick models like you pick databases: fit to workload, cost envelope, compliance, and team skill—not leaderboard rank alone.",
            [
              "Score license risk, size/latency, fine-tune cost, and observability needs for your use case.",
              "Anticipate ops work: quantization, batching, GPU memory, and on-call debugging.",
            ],
            "Build a weighted scorecard (weights sum to 100) for one real initiative: columns might include task fit, p95 latency target, $/1M tokens, fine-tuning complexity, eval coverage, and legal review burden. Document tie-breakers.",
            "Footnote official Hub/Transformers docs for terminology; the scorecard is original.",
            34,
            [
              { label: "Hugging Face Hub documentation", url: HF_HUB, provider: ContentProvider.HUGGING_FACE },
              { label: "Transformers documentation", url: HF_TRANSFORMERS, provider: ContentProvider.HUGGING_FACE },
            ],
          ),
        ],
      },
      {
        slug: "ai-agents-hugging-face",
        title: "AI Agents with Hugging Face",
        subtitle: "Tools, memory, orchestration, evaluation",
        description:
          "Design agent-shaped systems: explicit tool contracts, governed memory, orchestration you can reason about under failure, and evaluation that separates model drift from tool breakage.",
        provider: ContentProvider.HUGGING_FACE,
        estimatedMinutes: 172,
        moduleSlug: "core",
        moduleTitle: "Core lessons",
        lessons: [
          lesson(
            "what-ai-agents-are",
            "What AI Agents Are",
            "An agent is a policy loop: observe context, choose a bounded action (often a tool), update state, repeat—under budgets and human gates.",
            [
              "Separate the policy (what to try next) from tools (side effects) and from memory (what you persist).",
              "Name failure modes: hallucinated tool args, infinite loops, permission escalation, and silent partial writes.",
            ],
            "Write Gherkin scenarios for one workflow: happy path, tool timeout, permission denied, and user abort mid-run. Each scenario lists observable signals you will log.",
            "Link Learn for vocabulary; scenarios are your product’s wording.",
            32,
            [{ label: "Hugging Face — Learn", url: HF_LEARN, provider: ContentProvider.HUGGING_FACE }],
          ),
          lesson(
            "tools-memory-orchestration",
            "Tools, Memory, and Orchestration",
            "Tools are APIs with blast radius; memory is retention policy; orchestration is sequencing under concurrency and partial failure.",
            [
              "Define per-tool: idempotency key, max retries, timeout, and compensating action if half succeeds.",
              "Classify memory tiers (ephemeral scratch, session, durable profile) with TTL, encryption, and legal basis.",
            ],
            "Produce a tool registry table (≥5 tools): columns for purpose, auth scope, rate limit, idempotency, and what ‘done’ means. Add a one-pager memory policy referencing GDPR/CCPA obligations only at your org’s level of detail.",
            "Transformers docs for naming only; policies are original.",
            34,
            [
              { label: "Hugging Face — Learn", url: HF_LEARN, provider: ContentProvider.HUGGING_FACE },
              { label: "Transformers documentation", url: HF_TRANSFORMERS, provider: ContentProvider.HUGGING_FACE },
            ],
          ),
          lesson(
            "building-simple-agent",
            "Building a Simple Agent",
            "Ship narrow first: one model revision, a small tool surface, structured telemetry, shadow mode, then widen.",
            [
              "Instrument each step: model version, tool name, arg schema validation, latency, and outcome class.",
              "Choose eval slices from real support or product analytics—not toy prompts.",
            ],
            "Draft a two-week rollout: Week A—read-only tools + logging; Week B—mutating tools behind feature flag + automatic rollback on error budget burn. Include kill-switch criteria tied to user-visible incidents.",
            "Bullet list of HF doc entry points you’ll bookmark—no pasted text.",
            36,
            [{ label: "Hugging Face — Learn", url: HF_LEARN, provider: ContentProvider.HUGGING_FACE }],
          ),
          lesson(
            "evaluating-iterating-agents",
            "Evaluating and Iterating on Agent Behavior",
            "Iteration without a harness is random walk: offline goldens, canary cohorts, and human review for high-stakes paths.",
            [
              "Split metrics: model quality vs tool reliability vs policy mistakes (wrong tool chosen).",
              "Define regression gates: block release if new tool error rate exceeds baseline by X% on the same eval set.",
            ],
            "Spec an analytics view: dimensions (model version, tool, prompt cluster), primary KPI (task success), guardrails (toxicity/PII flags), and alert owners. Reference Evaluate/Hub docs only for terminology.",
            "Emphasize operational metrics: rework, escalation rate, time-to-resolution.",
            36,
            [
              { label: "Hugging Face — Learn", url: HF_LEARN, provider: ContentProvider.HUGGING_FACE },
              { label: "Evaluate documentation", url: HF_EVALUATE, provider: ContentProvider.HUGGING_FACE },
              { label: "Hugging Face Hub documentation", url: HF_HUB, provider: ContentProvider.HUGGING_FACE },
            ],
          ),
          lesson(
            "orchestration-tool-failures-hf",
            "Orchestration Under Failure: Ordering, Parallelism, and Recovery",
            "Parallel tools can race; retries can double-charge; caches can lie. Design orchestration with explicit failure domains.",
            [
              "Decide when parallel tool calls are safe vs when ordering is mandatory (financial writes, user state).",
              "Plan idempotency tokens and dedupe keys for any mutating tool.",
            ],
            "Write a failure playbook: scenarios for duplicate submission, partial success, stale cache, and poisoned memory—each with detection signal and operator action. Link Hub/Transformers docs as references, not quoted text.",
            "Keep examples domain-agnostic; focus on control flow.",
            34,
            [
              { label: "Hugging Face — Learn", url: HF_LEARN, provider: ContentProvider.HUGGING_FACE },
              { label: "Transformers documentation", url: HF_TRANSFORMERS, provider: ContentProvider.HUGGING_FACE },
            ],
          ),
        ],
      },
    ],
  },
  {
    slug: "track-cursor",
    title: "Cursor",
    description:
      "Ship from the editor with intent: agent sessions with clear stop rules, Plan Mode before risky diffs, Rules + AGENTS.md as the contract, reusable Skills, and browser-backed checks so AI speed does not outrun evidence.",
    durationWeeks: 6,
    sortOrder: 2,
    badgeLabel: "Cursor",
    difficulty: "intermediate",
    courses: [
      {
        slug: "cursor-fundamentals-ai-builders",
        title: "Cursor Fundamentals for AI Builders",
        subtitle: "Workflow, prompting, navigation, debugging",
        description:
          "Turn Cursor into a disciplined pair: scoped prompts, reviewable diffs, mechanical refactors separated from behavior changes, and debugging that favors instrumentation over vibes.",
        provider: ContentProvider.CURSOR,
        estimatedMinutes: 128,
        moduleSlug: "core",
        moduleTitle: "Core lessons",
        lessons: [
          lesson(
            "cursor-agent-workflow",
            "How Cursor Agent Workflow Actually Works",
            "The agent optimizes for plausibility; you own scope, invariants, and the merge. Treat every session as a branch with a budget.",
            [
              "Choose chat vs inline vs terminal-assisted flows based on blast radius (toy script vs auth core).",
              "Define “done”: CI green, diff read, risky areas called out, and a one-line rollback note if deploy fails.",
            ],
            "Write a reusable session playbook: naming branches, max touched files per iteration, when to run tests locally vs push to CI, when to pause for human review. Include an explicit ‘abort session’ trigger (e.g., three red CI runs).",
            "Name Cursor features you rely on; link docs for spelling only.",
            32,
            [
              { label: "Cursor documentation", url: CURSOR_DOCS, provider: ContentProvider.CURSOR },
              { label: "Cursor — Agent overview", url: CURSOR_AGENT, provider: ContentProvider.CURSOR },
            ],
          ),
          lesson(
            "prompting-clean-changes",
            "Prompting for Code Changes That Land Cleanly",
            "Treat prompts like tickets: acceptance criteria, negative cases, file anchors, and what must not change.",
            [
              "Reference `@` files or symbols so imports and types stay grounded.",
              "Split ‘design the approach’ from ‘write the patch’ when touching concurrency, security, or migrations.",
            ],
            "Author three copy-paste templates: (1) bugfix with repro, failing test name, and forbidden files; (2) refactor listing invariants + mechanical steps; (3) vertical slice with feature flag + telemetry hooks. Each ends with ‘Stop if…’ conditions.",
            "Templates are original; Cursor docs are bibliography.",
            32,
            [{ label: "Cursor documentation", url: CURSOR_DOCS, provider: ContentProvider.CURSOR }],
          ),
          lesson(
            "navigating-refactoring-safely",
            "Navigating and Refactoring a Codebase Safely",
            "Refactor so each commit is reviewable: rename first, behavior second, cleanup last—never all at once.",
            [
              "Enumerate call sites and data migrations before wide renames.",
              "Keep feature flags and schema changes deployable in either order when possible (expand/contract).",
            ],
            "Outline a 4-commit sequence for untangling a hot module: pure rename, extract pure functions, swap implementation behind interface, delete dead paths. After each step, list the test command you expect to pass.",
            "Stress CI as the arbiter, not the model’s confidence.",
            34,
            [{ label: "Cursor documentation", url: CURSOR_DOCS, provider: ContentProvider.CURSOR }],
          ),
          lesson(
            "fast-debugging-iteration",
            "Fast Debugging and Iteration in Cursor",
            "Instrument first: narrow repro, one hypothesis, verify with logs or failing tests—then let the model suggest fixes.",
            [
              "Prefer adding temporary logging with clear tags over speculative rewrites.",
              "After green, add a regression test or assertion that would have caught the bug class.",
            ],
            "Draft a lightweight postmortem: symptom, minimal repro, evidence trail, root cause, fix, guardrail, and ‘how the agent misled me’ (hallucinated API, wrong file). Optional: note when browser devtools or MCP-backed snapshots helped beyond unit tests.",
            "Reference Cursor search/agent/terminal only where they saved time.",
            30,
            [{ label: "Cursor documentation", url: CURSOR_DOCS, provider: ContentProvider.CURSOR }],
          ),
        ],
      },
      {
        slug: "cursor-planning-guardrails",
        title: "Cursor Planning and Guardrails",
        subtitle: "Plan mode, rules, repo discipline",
        description:
          "Make velocity safe: plans before irreversible edits, Rules that encode org policy, AGENTS.md as the onboarding + agent contract, and explicit autonomy caps.",
        provider: ContentProvider.CURSOR,
        estimatedMinutes: 126,
        moduleSlug: "core",
        moduleTitle: "Core lessons",
        lessons: [
          lesson(
            "plan-mode-controlled-execution",
            "Plan Mode for Controlled Execution",
            "Planning is how you keep AI from ‘improving’ things you did not ask for—especially near auth, data, or money.",
            [
              "Decompose into PR-sized slices with measurable verification per slice.",
              "List out-of-scope areas explicitly (e.g., billing, secrets, unrelated refactors).",
            ],
            "Write a one-page plan for a sensitive change: context, assumptions, ordered steps, data backout, feature flag strategy, and a verification matrix (unit, integration, manual). Link Plan Mode / Agent docs as references, not screenshots.",
            "Headings and content are yours.",
            32,
            [
              { label: "Cursor — Plan Mode", url: CURSOR_PLAN, provider: ContentProvider.CURSOR },
              { label: "Cursor — Agent overview", url: CURSOR_AGENT, provider: ContentProvider.CURSOR },
            ],
          ),
          lesson(
            "rules-persistent-instructions",
            "Rules and Persistent Instructions",
            "Rules are executable policy: what tests to run, what patterns are banned, how big a PR may be, and how secrets are handled.",
            [
              "Resolve conflicts between global and repo rules before they confuse the model.",
              "Co-locate rules with code reviews so policy evolves with the codebase.",
            ],
            "Draft twelve concise rules covering: test commands, lint/format, logging/PII, dependency updates, SQL safety, max LOC per PR, and security review triggers. For each rule, name the human owner and review cadence.",
            "Link Cursor Rules docs; bullets are your standards.",
            30,
            [{ label: "Cursor — Rules for AI", url: CURSOR_RULES, provider: ContentProvider.CURSOR }],
          ),
          lesson(
            "agents-md-repo-discipline",
            "AGENTS.md and Repo Operating Discipline",
            "AGENTS.md is the README for machines: how to bootstrap, what commands prove health, and where agents must not roam.",
            [
              "Document env vars by purpose, never values; point to secret stores.",
              "Spell out branch naming, required checks before merge, and data-handling red lines.",
            ],
            "Produce an AGENTS.md outline: mission, setup steps, `npm run …` matrix, architecture boundaries, review checklist, on-call/incident expectations, and explicit stop conditions for autonomous agents.",
            "No credentials; Cursor context docs linked only for product concepts.",
            32,
            [{ label: "Cursor documentation", url: CURSOR_DOCS, provider: ContentProvider.CURSOR }],
          ),
          lesson(
            "preventing-drift-bad-autonomy",
            "Preventing Drift and Bad Autonomy",
            "Unbounded agent steps delete migrations, widen permissions, and ‘tidy’ files you needed. Cap steps and require human gates for irreversible ops.",
            [
              "Set numeric limits: max files touched, max migrations per session, max dependency major bumps without approval.",
              "Keep a short ADR or decision log entry for structural moves.",
            ],
            "Build a risk matrix: rows for schema change, dependency major, auth tweak, infra script; columns for blast radius, observability, rollback path, required reviewer role. Add a row for ‘agent ran without plan’ with mitigations.",
            "Connect gates to CI checks you already trust.",
            32,
            [{ label: "Cursor — Agent overview", url: CURSOR_AGENT, provider: ContentProvider.CURSOR }],
          ),
        ],
      },
      {
        slug: "advanced-cursor-delivery",
        title: "Advanced Cursor Delivery",
        subtitle: "Skills, browser tooling, multi-step slices",
        description:
          "Compound quality: versioned Skills for repeat workflows, browser verification for flows tests mock poorly, vertical slices with rollback thinking, and release hygiene when AI touches the diff.",
        provider: ContentProvider.CURSOR,
        estimatedMinutes: 134,
        moduleSlug: "core",
        moduleTitle: "Core lessons",
        lessons: [
          lesson(
            "skills-reusable-agent-capabilities",
            "Skills and Reusable Agent Capabilities",
            "Skills package how your team wants work done: inputs, guardrails, failure handling, and how to test them.",
            [
              "Specify success/failure outputs so agents cannot ‘almost’ complete a skill.",
              "Use semantic versioning when skill behavior changes downstream prompts or scripts.",
            ],
            "Write a skill spec in markdown: name, purpose, required context files, inputs, outputs, side effects, test plan, rollback, and deprecation policy. Pick one real workflow (e.g., staged rollout checklist).",
            "Link Cursor Skills docs; the spec is original.",
            34,
            [{ label: "Cursor — Skills", url: CURSOR_SKILLS, provider: ContentProvider.CURSOR }],
          ),
          lesson(
            "browser-tooling-app-testing",
            "Browser Tooling for Real App Testing",
            "Automated browsers catch layout, routing, and auth integration bugs that Jest will never see—use them deliberately, not as a substitute for unit tests.",
            [
              "Decide which journeys are CI-blocking vs release-day manual smoke.",
              "Collect artifacts on failure: URL, steps, console, network red entries, screenshot if policy allows.",
            ],
            "Design a smoke matrix: rows = critical journeys; columns = local/staging/prod (as applicable); cells note data prerequisites and whether AI-assisted browser tooling is allowed to drive the session.",
            "High-level alignment with Cursor browser features; no vendor script copy.",
            34,
            [{ label: "Cursor documentation", url: CURSOR_DOCS, provider: ContentProvider.CURSOR }],
          ),
          lesson(
            "multi-step-build-slices",
            "Running Larger Multi-Step Build Slices",
            "Large changes fail when merged as a lump: slice by deployability—schema expand, dual-write, backfill, contract, then delete old paths.",
            [
              "Pair migrations with code that tolerates both old and new rows during rollout.",
              "Align telemetry milestones so you know each slice worked before the next.",
            ],
            "Write a slicing plan for a sensitive adjacent feature (without touching real billing code): API sketch, shadow traffic, metrics gate, user-visible flag, cleanup. Explicitly list files/repos that are off limits.",
            "Reference Agent/Plan docs as pointers.",
            34,
            [{ label: "Cursor documentation", url: CURSOR_DOCS, provider: ContentProvider.CURSOR }],
          ),
          lesson(
            "shipping-faster-without-losing-control",
            "Shipping Faster Without Losing Control",
            "AI-written code needs the same release bar—plus explicit checks for areas the model frequently gets wrong (authz, async, migrations).",
            [
              "Add ‘AI touched’ to risk review when files match sensitive paths.",
              "Pre-write rollback: feature flag off, redeploy previous image, or DB forward-only undo steps.",
            ],
            "Create a go-live checklist: automated tests, staged canary %, dashboards to watch, rollback command/runbook, customer comms if user-visible, post-deploy verification window, and debrief slot if metrics drift.",
            "Rules/Agent docs supplement policy—they do not replace it.",
            32,
            [
              { label: "Cursor documentation", url: CURSOR_DOCS, provider: ContentProvider.CURSOR },
              { label: "Cursor — Rules for AI", url: CURSOR_RULES, provider: ContentProvider.CURSOR },
            ],
          ),
        ],
      },
    ],
  },
];

/** Rows tagged with this value are owned by the launch curriculum sync (safe to upsert). */
export const LAUNCH_CATALOG_SOURCE = "launch_v1" as const;

export const LAUNCH_PATH_SLUGS = new Set(TRACKS.map((t) => t.slug));
export const LAUNCH_COURSE_SLUGS = new Set(TRACKS.flatMap((t) => t.courses.map((c) => c.slug)));

export { TRACKS };
