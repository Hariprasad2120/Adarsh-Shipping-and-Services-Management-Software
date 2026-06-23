import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getThread, getAttachment } from "@/lib/google-gmail-client";
import { uploadFile } from "@/lib/google-drive-client";
import { provisionJobWorkspace } from "@/lib/workspace-provisioning";

// GET /api/communication/mail/link - List active jobs for linking
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const jobs = await db.chaJob.findMany({
      where: {
        orgId: session.user.orgId!,
        status: "ACTIVE"
      },
      select: {
        id: true,
        jobNumber: true,
        title: true
      },
      orderBy: {
        jobNumber: "desc"
      }
    });

    return NextResponse.json({ jobs });
  } catch (err: any) {
    console.error("[MailLinkAPI] Error listing jobs:", err);
    return NextResponse.json({ error: err.message || "Failed to list jobs" }, { status: 500 });
  }
}

// POST /api/communication/mail/link - Link thread and upload attachments
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { threadId, jobId, category, subject } = body;

    if (!threadId || !jobId || !category) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Fetch or provision Job Workspace Profile
    let profile = await db.jobWorkspaceProfile.findUnique({
      where: { jobId }
    });

    if (!profile || profile.provisioningStatus !== "success") {
      try {
        await provisionJobWorkspace(jobId);
        profile = await db.jobWorkspaceProfile.findUnique({
          where: { jobId }
        });
      } catch (provErr: any) {
        console.error("[MailLinkAPI] Idempotent workspace provisioning failed:", provErr);
        return NextResponse.json({ error: `Job workspace provisioning failed: ${provErr.message}` }, { status: 500 });
      }
    }

    if (!profile || !profile.rootFolderId) {
      return NextResponse.json({ error: "Root folder for job workspace is missing" }, { status: 400 });
    }

    const categoryFolders = (profile.categoryFolders as Record<string, string>) || {};
    const targetFolderId = categoryFolders[category] || profile.rootFolderId;

    // 2. Fetch Thread details
    const thread = await getThread(session.user.id, threadId);

    // 3. Construct a Markdown log file of the email thread
    let emailContent = `# Email Thread: ${thread.subject}\n`;
    emailContent += `*Linked to Monolith Job ID:* \`${jobId}\`\n`;
    emailContent += `*Linked by:* ${session.user.name} (${session.user.email}) on ${new Date().toLocaleString("en-IN")}\n`;
    emailContent += `*Google Thread ID:* \`${threadId}\`\n\n`;
    emailContent += `--- \n\n`;

    for (const msg of thread.messages) {
      emailContent += `### Message Details\n`;
      emailContent += `- **From:** ${msg.from}\n`;
      emailContent += `- **To:** ${msg.to}\n`;
      if (msg.cc) emailContent += `- **Cc:** ${msg.cc}\n`;
      emailContent += `- **Date:** ${msg.date}\n\n`;
      emailContent += `${msg.bodyText || msg.snippet}\n\n`;
      emailContent += `--- \n\n`;
    }

    // 4. Save the email thread to Google Drive
    const cleanSubject = (subject || thread.subject || "Untitled").replace(/[^a-zA-Z0-9 -]/g, "").slice(0, 50).trim();
    const threadFileName = `Email Thread - ${cleanSubject || "thread"}.md`;

    const emailFile = await uploadFile({
      name: threadFileName,
      mimeType: "text/markdown",
      parentFolderId: targetFolderId,
      fileBuffer: Buffer.from(emailContent, "utf-8")
    });

    // 5. Download and upload message attachments if present
    const uploadedAttachments: { name: string; url: string }[] = [];
    for (const msg of thread.messages) {
      if (msg.attachments && msg.attachments.length > 0) {
        for (const att of msg.attachments) {
          try {
            const fileBuffer = await getAttachment({
              userId: session.user.id,
              messageId: msg.id,
              attachmentId: att.id
            });

            const uploadedAtt = await uploadFile({
              name: att.name,
              mimeType: att.mimeType,
              parentFolderId: targetFolderId,
              fileBuffer
            });

            uploadedAttachments.push({
              name: att.name,
              url: uploadedAtt.webViewLink
            });
          } catch (attErr: any) {
            console.error(`[MailLinkAPI] Failed to upload attachment ${att.name} for message ${msg.id}:`, attErr);
          }
        }
      }
    }

    // 6. Create Audit Log Entry
    await db.communicationAuditEvent.create({
      data: {
        orgId: session.user.orgId!,
        userId: session.user.id,
        action: "LINK_EMAIL",
        details: `Linked email thread '${thread.subject}' to job ID: ${jobId}. Created summary file: ${threadFileName}. Saved ${uploadedAttachments.length} attachments.`
      }
    });

    return NextResponse.json({
      success: true,
      fileId: emailFile.id,
      webViewLink: emailFile.webViewLink,
      attachments: uploadedAttachments
    });

  } catch (err: any) {
    console.error("[MailLinkAPI] Link POST error:", err);
    return NextResponse.json({ error: err.message || "Failed to link email thread" }, { status: 500 });
  }
}
