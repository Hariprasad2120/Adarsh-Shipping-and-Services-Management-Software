import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listThreads } from "@/lib/google-gmail-client";
import { searchFiles } from "@/lib/google-drive-client";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const query = url.searchParams.get("q") || "";

  if (!query) {
    return NextResponse.json({ emails: [], files: [], jobs: [] });
  }

  try {
    // 1. Search Gmail threads matching query
    let emails: any[] = [];
    try {
      const gmailRes = await listThreads({
        userId: session.user.id,
        query: query
      });
      emails = gmailRes.threads || [];
    } catch (gmailErr) {
      console.error("[SearchAPI] Gmail search failed:", gmailErr);
    }

    // 2. Search Drive files matching query
    let files: any[] = [];
    try {
      files = await searchFiles(query);
    } catch (driveErr) {
      console.error("[SearchAPI] Drive search failed:", driveErr);
    }

    // 3. Search local Monolith jobs matching query
    let jobs: any[] = [];
    try {
      jobs = await db.chaJob.findMany({
        where: {
          orgId: session.user.orgId!,
          OR: [
            { jobNumber: { contains: query, mode: "insensitive" } },
            { title: { contains: query, mode: "insensitive" } },
            { remarks: { contains: query, mode: "insensitive" } }
          ]
        },
        select: {
          id: true,
          jobNumber: true,
          title: true,
          stage: true,
          status: true
        },
        take: 10
      });
    } catch (dbErr) {
      console.error("[SearchAPI] Database job search failed:", dbErr);
    }

    return NextResponse.json({ emails, files, jobs });
  } catch (err: any) {
    console.error("[SearchAPI] General search error:", err);
    return NextResponse.json({ error: err.message || "Search failed" }, { status: 500 });
  }
}
