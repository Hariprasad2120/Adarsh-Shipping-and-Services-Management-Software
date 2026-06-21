import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { acceptHRLetterRequest } from "@/modules/hrms/letters-service";
import { apiError } from "@/lib/rbac";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { nameSignature } = body;

    if (!nameSignature) {
      return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message: "Missing signature name" } }, { status: 400 });
    }

    // Extract IP and User-Agent
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "Unknown";

    const data = await acceptHRLetterRequest(id, session.user.orgId!, session.user.id, ip, userAgent, nameSignature);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return apiError(error);
  }
}
