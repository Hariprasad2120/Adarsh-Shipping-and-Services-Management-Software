import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { loadUserPermissions } from "@/lib/rbac";
import { buildMonaContext } from "@/modules/mona/context";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const currentPath = searchParams.get("currentPath") || "/dashboard";
    const permissions = Array.from(await loadUserPermissions(session.user.id));

    const context = await buildMonaContext({
      userId: session.user.id,
      userName: session.user.name || "User",
      orgId: session.user.orgId,
      currentPath,
      permissions,
      isAdmin: permissions.includes("admin.org.manage"),
      channel: "web",
    });

    return NextResponse.json({
      route: context.route,
      workspace: context.workspace,
      entity: context.entity,
    });
  } catch (error) {
    console.error("[Mona Context API] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
