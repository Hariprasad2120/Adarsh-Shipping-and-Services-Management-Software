import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { loadUserPermissions } from "@/lib/rbac";
import { buildMonaContext } from "@/modules/mona/context";
import { listMonaSkills, resolveMonaSkillSelection } from "@/modules/mona/skills";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const currentPath = searchParams.get("currentPath") || "/dashboard";
    const message = searchParams.get("message") || "";
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

    const selection = resolveMonaSkillSelection(context, message);

    return NextResponse.json({
      skills: listMonaSkills(),
      selected: {
        id: selection.skill.id,
        label: selection.skill.label,
        reason: selection.reason,
        allowedToolNames: selection.allowedToolNames,
      },
    });
  } catch (error) {
    console.error("[Mona Skills API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
