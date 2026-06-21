import { NextResponse } from "next/server";
import { verifyHRDocument } from "@/modules/hrms/letters-service";
import { apiError } from "@/lib/rbac";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    if (!query) {
      return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message: "Missing verification query (q)" } }, { status: 400 });
    }

    const data = await verifyHRDocument(query);
    if (!data) {
      return NextResponse.json({ ok: false, error: { code: "NOT_FOUND", message: "No matching document found" } }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return apiError(error);
  }
}
