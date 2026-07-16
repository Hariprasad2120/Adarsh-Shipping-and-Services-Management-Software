import { db } from "@/lib/db";
import { getNow } from "@/lib/clock";
import * as driveClient from "@/lib/google-drive-client";
import { getPortalSession } from "@/modules/customer-portal/auth";

const CUSTOMER_UPLOAD_CATEGORY = "Customer Uploads";
const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024;

function buildStoredFileName(documentName: string, originalFileName: string) {
  const trimmedName = documentName.trim().replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ");
  const extensionIndex = originalFileName.lastIndexOf(".");
  const extension = extensionIndex >= 0 ? originalFileName.slice(extensionIndex) : "";
  if (!extension) return trimmedName || "Customer Upload";
  return trimmedName.toLowerCase().endsWith(extension.toLowerCase())
    ? trimmedName
    : `${trimmedName || "Customer Upload"}${extension}`;
}

async function uploadCustomerFile(params: {
  file: File;
  documentName: string;
  rootFolderId: string | null;
  categoryFolderId: string | null;
}) {
  const storedFileName = buildStoredFileName(params.documentName, params.file.name);
  const fileBuffer = Buffer.from(await params.file.arrayBuffer());
  const parentFolderId = params.categoryFolderId || params.rootFolderId;

  if (parentFolderId && !parentFolderId.startsWith("mock-")) {
    try {
      const uploaded = await driveClient.uploadFile({
        name: storedFileName,
        mimeType: params.file.type || "application/octet-stream",
        parentFolderId,
        fileBuffer,
      });
      return {
        fileKey: uploaded.webViewLink,
        fileName: storedFileName,
        mimeType: params.file.type || "application/octet-stream",
        sizeBytes: params.file.size,
      };
    } catch (error) {
      if (process.env.NODE_ENV === "production") {
        throw error;
      }
    }
  }

  return {
    fileKey: `https://drive.google.com/file/d/mock-uploaded-${Math.random().toString(36).slice(2)}/view`,
    fileName: storedFileName,
    mimeType: params.file.type || "application/octet-stream",
    sizeBytes: params.file.size,
  };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ shipmentId: string }> },
) {
  try {
    const session = await getPortalSession();
    if (!session?.portalUser?.id || !session.portalUser.customerId || !session.orgId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { shipmentId } = await params;
    const formData = await request.formData();
    const documentName = String(formData.get("documentName") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const file = formData.get("file");

    if (documentName.length < 2) {
      return Response.json({ error: "Add a document name with at least 2 characters." }, { status: 400 });
    }
    if (!(file instanceof File) || file.size <= 0) {
      return Response.json({ error: "Choose a file to upload." }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      return Response.json({ error: "The selected file is larger than 25 MB." }, { status: 400 });
    }

    const job = await db.chaJob.findFirst({
      where: {
        id: shipmentId,
        orgId: session.orgId,
        customerId: session.portalUser.customerId,
        deletedAt: null,
      },
      select: {
        id: true,
        orgId: true,
      },
    });

    if (!job) {
      return Response.json({ error: "Shipment not found." }, { status: 404 });
    }

    const existingRequirements = await db.chaJobDocumentRequirement.findMany({
      where: { jobId: shipmentId },
      select: {
        id: true,
        name: true,
        category: true,
      },
    });

    let requirement = existingRequirements.find(
      (item) =>
        item.category === CUSTOMER_UPLOAD_CATEGORY &&
        item.name.trim().toLowerCase() === documentName.toLowerCase(),
    );

    if (!requirement) {
      requirement = await db.chaJobDocumentRequirement.create({
        data: {
          jobId: shipmentId,
          name: documentName,
          category: CUSTOMER_UPLOAD_CATEGORY,
          isMandatory: false,
          status: "PENDING",
        },
        select: {
          id: true,
          name: true,
          category: true,
        },
      });
    }

    const workspaceProfile = await db.jobWorkspaceProfile.findUnique({
      where: { jobId: shipmentId },
      select: {
        rootFolderId: true,
        categoryFolders: true,
      },
    });
    const categoryFolders = (workspaceProfile?.categoryFolders ?? null) as Record<string, string> | null;
    const uploadTarget = await uploadCustomerFile({
      file,
      documentName,
      rootFolderId: workspaceProfile?.rootFolderId ?? null,
      categoryFolderId: categoryFolders?.[CUSTOMER_UPLOAD_CATEGORY] ?? null,
    });
    const now = await getNow();

    await db.$transaction(async (tx) => {
      await tx.customerDocumentSubmission.updateMany({
        where: {
          orgId: session.orgId,
          customerId: session.portalUser.customerId,
          jobId: shipmentId,
          requirementId: requirement.id,
          status: { not: "SUPERSEDED" },
        },
        data: {
          status: "SUPERSEDED",
        },
      });

      const submission = await tx.customerDocumentSubmission.create({
        data: {
          orgId: session.orgId,
          customerId: session.portalUser.customerId,
          jobId: shipmentId,
          requirementId: requirement.id,
          portalUserId: session.portalUser.id,
          status: "UPLOADED",
          customerComment: description || null,
        },
      });

      const version = await tx.customerDocumentVersion.create({
        data: {
          submissionId: submission.id,
          fileKey: uploadTarget.fileKey,
          fileName: uploadTarget.fileName,
          mimeType: uploadTarget.mimeType,
          sizeBytes: uploadTarget.sizeBytes,
          uploadedAt: now,
        },
      });

      await tx.customerDocumentSubmission.update({
        where: { id: submission.id },
        data: {
          currentVersionId: version.id,
        },
      });

      await tx.chaJobDocumentRequirement.update({
        where: { id: requirement.id },
        data: { status: "UPLOADED" },
      });
    });

    return Response.json({ message: "Customer document uploaded successfully." });
  } catch (error) {
    console.error("Customer portal shipment upload failed:", error);
    return Response.json({ error: "The document could not be uploaded right now." }, { status: 500 });
  }
}
