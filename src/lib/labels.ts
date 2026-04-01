import type { ContentProvider } from "@/generated/prisma";

export function providerLabel(p: ContentProvider): string {
  switch (p) {
    case "AZURE":
      return "Microsoft / Azure";
    case "HUGGING_FACE":
      return "Hugging Face";
    case "CURSOR":
      return "Cursor";
    case "AWS_INACTIVE":
      return "AWS (roadmap)";
    case "GCP_INACTIVE":
      return "Google Cloud (roadmap)";
    default:
      return p;
  }
}
