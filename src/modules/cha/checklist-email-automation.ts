import { Prisma } from "@/generated/prisma/client";
import { getNow } from "@/lib/clock";
import { db } from "@/lib/db";

export const CHA_CHECKLIST_MAIN_EMAIL_TYPE = "CHECKLIST_MAIN" as const;
const CHA_CHECKLIST_AUTOMATION_SOURCE_PREFIX = "CHA_CHECKLIST_AUTOMATION";
const COMPANY_NAME = "Adarsh Shipping";

type QueueChecklistMainCustomerEmailParams = {
  actorId: string;
  jobId: string;
  jobNumber: string;
  checklistId: string;
  fileVersionId: string;
  customerId: string;
  customerName: string;
  customerReference?: string | null;
  recipientEmail: string;
  recipientName?: string | null;
  approvalVisibleAt: Date;
  checklistFileName: string;
  checklistVersionLabel: string;
  checklistSummary: string[];
  checklistUrl?: string | null;
};

type QueueChecklistMainCustomerEmailResult = {
  queued: boolean;
  duplicate: boolean;
  queueId: string | null;
  automationKey: string;
};

type ChecklistMainQueueMetadata = {
  module: "CHA";
  emailType: typeof CHA_CHECKLIST_MAIN_EMAIL_TYPE;
  automationKey: string;
  source: string;
  checklistId: string;
  fileVersionId: string;
  jobId: string;
  customerId: string;
  customerReference: string | null;
  sentById: string;
  recipients: string[];
  recipientName: string | null;
  approvalVisibleAt: string;
  attachmentFileKey: null;
  attachmentFileName: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildChecklistMainAutomationKey(checklistId: string, fileVersionId: string) {
  return `cha:checklist-main:${checklistId}:${fileVersionId}`;
}

function buildChecklistMainMailLogSource(automationKey: string) {
  return `${CHA_CHECKLIST_AUTOMATION_SOURCE_PREFIX}:${automationKey}`;
}

function buildChecklistMainSubject(jobNumber: string) {
  return `Checklist Main Ready For Review - ${jobNumber}`;
}

function buildChecklistMainEmailContent(params: {
  customerName: string;
  jobNumber: string;
  customerReference?: string | null;
  checklistVersionLabel: string;
  checklistSummary: string[];
  checklistUrl?: string | null;
}) {
  const checklistSummaryHtml = params.checklistSummary
    .map((item) => `<li style="margin:0 0 8px 0;">${escapeHtml(item)}</li>`)
    .join("");
  const checklistSummaryText = params.checklistSummary.map((item) => `- ${item}`).join("\n");
  const referenceLines = [
    `Customer: ${params.customerName}`,
    `Job / Shipment Ref: ${params.jobNumber}`,
    params.customerReference ? `Customer Ref: ${params.customerReference}` : null,
    `Checklist: Checklist Main`,
    `Version: ${params.checklistVersionLabel}`,
  ].filter((line): line is string => Boolean(line));

  const html = `
    <div style="background:#f7f9fb;padding:24px;font-family:Arial,sans-serif;color:#191c1e;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #d9e3e1;border-radius:16px;overflow:hidden;">
        <div style="padding:20px 24px;border-top:4px solid #F9D972;">
          <p style="margin:0 0 12px 0;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#404947;">${COMPANY_NAME}</p>
          <h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.2;">Checklist Main</h1>
          <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;">Dear ${escapeHtml(params.customerName)},</p>
          <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;">Your Checklist Main is ready for review. Please find the summary below and use the link to return to the CHA workspace.</p>
          <div style="margin:0 0 16px 0;padding:16px;border-radius:12px;background:#f2f4f6;border:1px solid #d9e3e1;">
            ${referenceLines.map((line) => `<p style="margin:0 0 8px 0;font-size:14px;line-height:1.5;">${escapeHtml(line)}</p>`).join("")}
          </div>
          <h2 style="margin:0 0 10px 0;font-size:16px;">Checklist Summary</h2>
          <ul style="margin:0 0 20px 18px;padding:0;font-size:14px;line-height:1.6;">
            ${checklistSummaryHtml}
          </ul>
          ${params.checklistUrl
            ? `<p style="margin:0 0 20px 0;"><a href="${escapeHtml(params.checklistUrl)}" style="display:inline-block;background:#F9D972;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:12px;font-size:14px;">Open CHA Checklist</a></p>`
            : ""}
          <p style="margin:0;font-size:14px;line-height:1.6;">Regards,<br />${COMPANY_NAME}</p>
        </div>
      </div>
    </div>
  `.trim();

  const text = [
    `Dear ${params.customerName},`,
    "",
    "Your Checklist Main is ready for review.",
    "",
    ...referenceLines,
    "",
    "Checklist Summary",
    checklistSummaryText,
    params.checklistUrl ? "" : null,
    params.checklistUrl ? `Open CHA Checklist: ${params.checklistUrl}` : null,
    "",
    `Regards,`,
    COMPANY_NAME,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  return { html, text };
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function parseChecklistMainQueueMetadata(value: Prisma.JsonValue | null): ChecklistMainQueueMetadata | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  if (
    candidate.module !== "CHA" ||
    candidate.emailType !== CHA_CHECKLIST_MAIN_EMAIL_TYPE ||
    typeof candidate.automationKey !== "string" ||
    typeof candidate.source !== "string" ||
    typeof candidate.checklistId !== "string" ||
    typeof candidate.fileVersionId !== "string" ||
    typeof candidate.jobId !== "string" ||
    typeof candidate.customerId !== "string" ||
    typeof candidate.sentById !== "string" ||
    typeof candidate.approvalVisibleAt !== "string" ||
    typeof candidate.attachmentFileName !== "string" ||
    !Array.isArray(candidate.recipients)
  ) {
    return null;
  }

  return {
    module: "CHA",
    emailType: CHA_CHECKLIST_MAIN_EMAIL_TYPE,
    automationKey: candidate.automationKey,
    source: candidate.source,
    checklistId: candidate.checklistId,
    fileVersionId: candidate.fileVersionId,
    jobId: candidate.jobId,
    customerId: candidate.customerId,
    customerReference: typeof candidate.customerReference === "string" ? candidate.customerReference : null,
    sentById: candidate.sentById,
    recipients: candidate.recipients.filter((recipient): recipient is string => typeof recipient === "string"),
    recipientName: typeof candidate.recipientName === "string" ? candidate.recipientName : null,
    approvalVisibleAt: candidate.approvalVisibleAt,
    attachmentFileKey: null,
    attachmentFileName: candidate.attachmentFileName,
  };
}

export async function queueChecklistMainCustomerEmail(
  params: QueueChecklistMainCustomerEmailParams,
): Promise<QueueChecklistMainCustomerEmailResult> {
  const automationKey = buildChecklistMainAutomationKey(params.checklistId, params.fileVersionId);
  const source = buildChecklistMainMailLogSource(automationKey);
  const { html, text } = buildChecklistMainEmailContent({
    customerName: params.customerName,
    jobNumber: params.jobNumber,
    customerReference: params.customerReference,
    checklistVersionLabel: params.checklistVersionLabel,
    checklistSummary: params.checklistSummary,
    checklistUrl: params.checklistUrl,
  });

  const metadata: ChecklistMainQueueMetadata = {
    module: "CHA",
    emailType: CHA_CHECKLIST_MAIN_EMAIL_TYPE,
    automationKey,
    source,
    checklistId: params.checklistId,
    fileVersionId: params.fileVersionId,
    jobId: params.jobId,
    customerId: params.customerId,
    customerReference: params.customerReference ?? null,
    sentById: params.actorId,
    recipients: [params.recipientEmail],
    recipientName: params.recipientName ?? null,
    approvalVisibleAt: params.approvalVisibleAt.toISOString(),
    attachmentFileKey: null,
    attachmentFileName: params.checklistFileName,
  };

  try {
    const queuedEmail = await db.emailQueue.create({
      data: {
        to: params.recipientEmail,
        subject: buildChecklistMainSubject(params.jobNumber),
        html,
        text,
        automationKey,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });

    return {
      queued: true,
      duplicate: false,
      queueId: queuedEmail.id,
      automationKey,
    };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        queued: false,
        duplicate: true,
        queueId: null,
        automationKey,
      };
    }

    throw error;
  }
}

export async function finalizeChecklistMainCustomerEmail(queueItem: {
  id: string;
  subject: string;
  html: string;
  text: string | null;
  metadata: Prisma.JsonValue | null;
}) {
  const metadata = parseChecklistMainQueueMetadata(queueItem.metadata);
  if (!metadata) {
    return false;
  }

  const sentAt = await getNow();
  const approvalVisibleAt = new Date(metadata.approvalVisibleAt);

  await db.$transaction(async (tx) => {
    const existingMailLog = await tx.chaChecklistMailLog.findFirst({
      where: {
        checklistId: metadata.checklistId,
        fileVersionId: metadata.fileVersionId,
        source: metadata.source,
      },
      select: { id: true },
    });

    await tx.chaChecklist.update({
      where: { id: metadata.checklistId },
      data: {
        customerApprovalAttempted: true,
        customerApprovalVisibleAt: approvalVisibleAt,
        updatedById: metadata.sentById,
      },
    });

    if (!existingMailLog) {
      await tx.chaChecklistMailLog.create({
        data: {
          checklistId: metadata.checklistId,
          fileVersionId: metadata.fileVersionId,
          sentById: metadata.sentById,
          recipients: metadata.recipients,
          subject: queueItem.subject,
          body: queueItem.html,
          attachmentFileKey: null,
          attachmentFileName: metadata.attachmentFileName,
          sentAt,
          approvalVisibleAt,
          source: metadata.source,
        },
      });
    }
  });

  return true;
}
