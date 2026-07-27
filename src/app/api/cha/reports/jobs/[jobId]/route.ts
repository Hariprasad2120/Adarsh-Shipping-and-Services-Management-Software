import { auth } from "@/lib/auth";
import { createFileResponseHeaders, createTextPdfBuffer } from "@/lib/document-preview";
import { requirePermission } from "@/lib/rbac";
import { generateCompletedChaJobReport } from "@/modules/cha/job-report";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return new Response("Unauthorized", { status: 401 });
    }
    await requirePermission(session.user.id, "cha.audit.view");

    const { jobId } = await params;
    const report = await generateCompletedChaJobReport(session.user.orgId, jobId);
    const pdfBuffer = createTextPdfBuffer({
      title: report.title,
      subtitle: report.subtitle,
      lines: report.lines,
    });
    const { searchParams } = new URL(request.url);
    const forceDownload = searchParams.get("download") === "true";
    const headers = createFileResponseHeaders({
      filename: report.filename,
      mimeType: "application/pdf",
      contentLength: pdfBuffer.length,
      forceDownload,
    });
    headers.set("Cache-Control", "private, no-store");
    return new Response(new Uint8Array(pdfBuffer), { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate job report.";
    const status = message.includes("permission") || message.includes("Denied") ? 403 : 400;
    return new Response(message, { status });
  }
}
