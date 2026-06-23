import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listThreads } from "@/lib/google-gmail-client";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q") || undefined;
  const pageToken = url.searchParams.get("pageToken") || undefined;
  const maxResults = url.searchParams.get("maxResults")
    ? parseInt(url.searchParams.get("maxResults")!, 10)
    : 20;

  try {
    const result = await listThreads({
      userId: session.user.id,
      query: q,
      maxResults,
      pageToken
    });
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[MailListAPI] Error listing threads:", err);
    return NextResponse.json({ error: err.message || "Failed to list threads" }, { status: 500 });
  }
}
