import fs from "fs/promises";
import path from "path";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { createFileResponseHeaders } from "@/lib/document-preview";
import { resolveInside } from "@/lib/security";

const EXPENSE_ARTIFACT_LOCAL_ROOT = path.join(process.cwd(), "storage", "cha", "receipts-and-payment-proof");

function inferMimeType(fileName: string) {
  const extension = fileName.toLowerCase().split(".").pop();
  if (extension === "pdf") return "application/pdf";
  if (extension === "png") return "image/png";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "gif") return "image/gif";
  if (extension === "webp") return "image/webp";
  if (extension === "bmp") return "image/bmp";
  if (extension === "tif" || extension === "tiff") return "image/tiff";
  if (extension === "heic") return "image/heic";
  if (extension === "heif") return "image/heif";
  return "application/octet-stream";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const session = await auth();
  if (!session?.user?.orgId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const resolvedParams = await params;
  const pathSegments = resolvedParams.path || [];
  const [requestId] = pathSegments;
  if (!requestId || pathSegments.length < 3) {
    return new Response("Expense artifact not found", { status: 404 });
  }

  const expenseRequest = await db.chaExpenseRequest.findFirst({
    where: { id: requestId, orgId: session.user.orgId },
    include: {
      job: { include: { assignments: true } },
    },
  });
  if (!expenseRequest) {
    return new Response("Expense artifact not found", { status: 404 });
  }

  const actorId = session.user.id;
  const isRequester = expenseRequest.requestedById === actorId;
  const isConcernedJobUser =
    expenseRequest.job?.primaryOwnerId === actorId ||
    expenseRequest.job?.assignedManagerId === actorId ||
    Boolean(expenseRequest.job?.assignments.some((assignment) => assignment.userId === actorId));
  const hasExpenseAccess =
    await can(actorId, "cha.expense.pay") ||
    await can(actorId, "cha.expense.review") ||
    await can(actorId, "cha.job.view_all");

  if (!isRequester && !isConcernedJobUser && !hasExpenseAccess) {
    return new Response("Access Denied", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const forceDownload = searchParams.get("download") === "true";
  const fileName = decodeURIComponent(pathSegments[pathSegments.length - 1] || "expense-artifact");
  let absolutePath: string;
  try {
    absolutePath = resolveInside(EXPENSE_ARTIFACT_LOCAL_ROOT, path.join(...pathSegments.map(decodeURIComponent)));
  } catch {
    return new Response("Invalid file path", { status: 400 });
  }

  const localFileStat = await fs.stat(absolutePath).catch(() => null);
  if (!localFileStat?.isFile()) {
    return new Response("Expense artifact not found", { status: 404 });
  }

  const fileBuffer = await fs.readFile(absolutePath);
  const headers = createFileResponseHeaders({
    filename: fileName,
    mimeType: inferMimeType(fileName),
    contentLength: fileBuffer.length,
    forceDownload,
  });
  return new Response(fileBuffer, { headers });
}
