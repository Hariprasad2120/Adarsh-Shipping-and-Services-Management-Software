import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getThread } from "@/lib/google-gmail-client";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing thread ID" }, { status: 400 });
  }

  try {
    const thread = await getThread(session.user.id, id);
    return NextResponse.json({ thread });
  } catch (err: any) {
    console.error("[MailThreadAPI] Error fetching thread details:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch thread" }, { status: 500 });
  }
}
