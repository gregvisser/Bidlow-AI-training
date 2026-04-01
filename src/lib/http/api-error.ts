import { NextResponse } from "next/server";

const isProd = process.env.NODE_ENV === "production";

export function safeApiError(
  status: number,
  publicMessage: string,
  internal?: unknown,
): NextResponse {
  if (internal !== undefined && !isProd) {
    console.error("[api-error]", publicMessage, internal);
  } else if (internal !== undefined && isProd) {
    console.error("[api-error]", publicMessage);
  }
  return NextResponse.json({ error: publicMessage }, { status });
}
