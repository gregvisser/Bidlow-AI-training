export const runtime = "nodejs";

export async function GET() {
  return Response.json({
    status: "ok",
    service: "ai-training-portal",
    timestamp: new Date().toISOString(),
  });
}
