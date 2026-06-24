import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  AVAILABLE_MODELS,
  getPreferredModel,
  setPreferredModel,
  resetQuotaCooldown,
} from "@/modules/mona/gemini-client";

/** GET — returns available models and current selection */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const response = NextResponse.json({
    models: AVAILABLE_MODELS,
    current: getPreferredModel(),
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

  const body = await req.json();
  const { modelId } = body;

  if (!modelId || !AVAILABLE_MODELS.find((m) => m.id === modelId)) {
    return NextResponse.json({ error: "Invalid model ID" }, { status: 400 });
  }

  setPreferredModel(modelId);
  resetQuotaCooldown(); // Reset cooldown when switching models
  console.log(`[Mona] Model switched to: ${modelId} by user ${session.user.id}`);

  return NextResponse.json({
    success: true,
    current: getPreferredModel(),
  });
}
