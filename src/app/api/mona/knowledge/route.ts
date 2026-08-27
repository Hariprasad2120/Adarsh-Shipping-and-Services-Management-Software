import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { loadUserPermissions } from "@/lib/rbac";
import { searchMonaKnowledgeForContext } from "@/modules/mona/knowledge";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() ?? "";
    const limitParam = Number(searchParams.get("limit") ?? "5");
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(Math.trunc(limitParam), 1), 10)
      : 5;
    const permissions = Array.from(await loadUserPermissions(session.user.id));

    return NextResponse.json({
      query,
      results: query
        ? await searchMonaKnowledgeForContext({
            query,
            limit,
            orgId: session.user.orgId,
            permissions,
            userId: session.user.id,
          })
        : [],
    });
  } catch (error) {
    console.error("[Mona Knowledge API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
