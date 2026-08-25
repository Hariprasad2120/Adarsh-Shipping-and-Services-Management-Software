import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { generatePayslipPdfBuffer } from "@/modules/payroll/pdf/generate-payslip";

function parsePeriod(searchPeriod: string | null) {
  if (!searchPeriod) return new Date();
  const match = searchPeriod.match(/^(\d{4})-(\d{2})$/);
  if (!match) return new Date();
  const [, year, month] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, 1));
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    // Self-service: an employee downloading their own payslip doesn't need
    // the HR "read" permission — only downloading someone else's does.
    if (id !== session.user.id) {
      await requirePermission(session.user.id, "hrms.salary.read");
    }
    const { searchParams } = new URL(request.url);
    const monthDate = parsePeriod(searchParams.get("period"));

    const result = await generatePayslipPdfBuffer(session.user.orgId, id, monthDate);
    if (!result) {
      return NextResponse.json({ ok: false, error: "Payslip not available for this period" }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${result.fileName}"`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to generate payslip";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
