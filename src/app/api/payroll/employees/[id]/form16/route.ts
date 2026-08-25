import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { generateForm16PdfBuffer } from "@/modules/payroll/pdf/generate-form16";

function currentFiscalYear() {
  const now = new Date();
  const startYear = now.getUTCMonth() >= 3 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    // Self-service: an employee downloading their own Form 16 doesn't need
    // the HR "read" permission — only downloading someone else's does.
    if (id !== session.user.id) {
      await requirePermission(session.user.id, "hrms.salary.read");
    }
    const { searchParams } = new URL(request.url);
    const fiscalYear = searchParams.get("fy") || currentFiscalYear();

    const result = await generateForm16PdfBuffer(session.user.orgId, id, fiscalYear);
    if (!result) {
      return NextResponse.json({ ok: false, error: "Form 16 not available for this employee" }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${result.fileName}"`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to generate Form 16";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
