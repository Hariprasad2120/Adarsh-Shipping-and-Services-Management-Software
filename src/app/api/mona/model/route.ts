import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { loadUserPermissions } from "@/lib/rbac";
import {
  AVAILABLE_MODELS,
  resetQuotaCooldown,
} from "@/modules/mona/gemini-client";
import {
  getEffectiveMonaModelForUser,
  setPreferredMonaModelForUser,
} from "@/modules/mona/settings";
import {
  getMonaGovernanceForOrg,
  resolveMonaAvailability,
} from "@/modules/mona/governance";

/** GET — returns available models and current selection */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = await loadUserPermissions(session.user.id);
  const isAdmin = permissions.has("admin.org.manage");
  const availability = await resolveMonaAvailability({
    isAdmin,
    orgId: session.user.orgId,
    userId: session.user.id,
  });
  const governance = await getMonaGovernanceForOrg(session.user.orgId);
  const currentModel = await getEffectiveMonaModelForUser({
    orgId: session.user.orgId,
    userId: session.user.id,
  });
  const visibleModels = AVAILABLE_MODELS.filter((model) =>
    governance.allowedModelIds.includes(model.id),
  );

  const response = NextResponse.json({
    models: visibleModels,
    current: currentModel,
    canSwitchModel: governance.allowUserModelSwitching,
    rolloutMode: governance.rolloutMode,
    available: availability.allowed,
    disabledReason: availability.reason,
  });
  response.headers.set("Cache-Control", "private, max-age=300, stale-while-revalidate=600");
  return response;
}

/** POST — switch model */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = await loadUserPermissions(session.user.id);
  const isAdmin = permissions.has("admin.org.manage");
  const availability = await resolveMonaAvailability({
    isAdmin,
    orgId: session.user.orgId,
    userId: session.user.id,
  });
  if (!availability.allowed) {
    return NextResponse.json(
      { error: availability.reason ?? "Mona is not available." },
      { status: 403 },
    );
  }

  const body = await req.json();
  const { modelId } = body;

  if (!modelId || !AVAILABLE_MODELS.find((m) => m.id === modelId)) {
    return NextResponse.json({ error: "Invalid model ID" }, { status: 400 });
  }

  const savedModelId = await setPreferredMonaModelForUser({
    userId: session.user.id,
    orgId: session.user.orgId,
    modelId,
  });
  resetQuotaCooldown(savedModelId);
  console.log(`[Mona] Model switched to: ${modelId} by user ${session.user.id}`);

  return NextResponse.json({
    success: true,
    current: savedModelId,
  });
}
