import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { generateQuotePdfBuffer } from "@/modules/crm/pdf/generate";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ quoteId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    await requirePermission(session.user.id, "crm.invoice.manage");

    const { quoteId } = await params;
    const result = await generateQuotePdfBuffer(quoteId, session.user.orgId);
    if (!result) {
      return NextResponse.json({ ok: false, error: "Quote not found" }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${result.quoteNumber}.pdf"`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to generate PDF";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
