export function adminValidationHint(ctx?: string | null): string {
  const base =
    "Check required fields. Slugs must be lowercase letters, numbers, and hyphens only (no spaces). URLs must be valid including https://.";
  if (ctx === "course") return `Course: ${base}`;
  if (ctx === "module") return `Module: ${base}`;
  if (ctx === "lesson") return `Lesson: resource URLs must be empty or a full https:// link. ${base}`;
  return base;
}
