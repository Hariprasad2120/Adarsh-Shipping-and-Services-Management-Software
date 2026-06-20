"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { getNow } from "@/lib/clock";
import { createCommunicationAuditLog } from "./communication-audit.service";
import nodemailer from "nodemailer";

export async function listMailThreads(
  userId: string,
  orgId: string,
  folder: "inbox" | "sent" | "starred" | "trash" | "archive" | "draft",
  page = 1,
  limit = 25,
  search?: string
) {
  await requirePermission(userId, "communication.mail.access");
  const skip = (page - 1) * limit;

  // Build filter based on label folder name
  const whereClause: any = {
    orgId,
    labels: { some: { userId, name: folder.toUpperCase() } },
  };

  if (search) {
    whereClause.OR = [
      { subject: { contains: search, mode: "insensitive" } },
      { messages: { some: { bodyText: { contains: search, mode: "insensitive" } } } },
      { messages: { some: { from: { contains: search, mode: "insensitive" } } } },
    ];
  }

  const [threads, total] = await Promise.all([
    db.mailThread.findMany({
      where: whereClause,
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            from: true,
            createdAt: true,
            bodyText: true,
            status: true,
          },
        },
      },
    }),
    db.mailThread.count({ where: whereClause }),
  ]);

  return { threads, total, page };
}

export async function getMailThread(userId: string, orgId: string, threadId: string) {
  await requirePermission(userId, "communication.mail.access");

  return db.mailThread.findUniqueOrThrow({
    where: { id: threadId, orgId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          attachments: true,
        },
      },
      labels: {
        where: { userId },
      },
    },
  });
}

export async function getCommunicationProfile(userId: string, orgId: string) {
  let profile = await db.communicationProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    profile = await db.communicationProfile.create({
      data: {
        userId,
        orgId,
        emailSignature: "",
        emailSignatureEnabled: false,
      },
    });
  }

  return profile;
}

export async function updateCommunicationProfile(
  userId: string,
  orgId: string,
  data: { emailSignature?: string; emailSignatureEnabled?: boolean }
) {
  return db.communicationProfile.upsert({
    where: { userId },
    update: data,
    create: {
      userId,
      orgId,
      emailSignature: data.emailSignature || "",
      emailSignatureEnabled: data.emailSignatureEnabled ?? false,
    },
  });
}

export async function sendMailMessage(
  userId: string,
  orgId: string,
  data: {
    mailAccountId: string;
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    bodyHtml: string;
    bodyText?: string;
    threadId?: string;
    linkedRecordType?: string; // CRM_LEAD, etc.
    linkedRecordId?: string;
    attachments?: { fileKey: string; fileName: string; fileSize: number; mimeType: string }[];
  }
) {
  await requirePermission(userId, "communication.mail.send");

  const account = await db.mailAccount.findUniqueOrThrow({
    where: { id: data.mailAccountId, orgId },
  });

  const now = await getNow();

  // Create message and thread inside a transaction
  const msg = await db.$transaction(async (tx) => {
    let threadId = data.threadId;

    if (!threadId) {
      const thread = await tx.mailThread.create({
        data: {
          orgId,
          subject: data.subject,
        },
      });
      threadId = thread.id;

      // Apply initial labels
      await tx.mailLabel.createMany({
        data: [
          { orgId, userId, name: "SENT" },
          { orgId, userId, name: "INBOX" }, // Simple simulation: apply inbox to creator too for visibility
        ],
      });

      // Connect labels to thread
      const labels = await tx.mailLabel.findMany({
        where: { userId, orgId, name: { in: ["SENT", "INBOX"] } },
      });
      await tx.mailThread.update({
        where: { id: threadId },
        data: {
          labels: {
            connect: labels.map((l) => ({ id: l.id })),
          },
        },
      });
    }

    const createdMsg = await tx.mailMessage.create({
      data: {
        orgId,
        threadId,
        mailAccountId: data.mailAccountId,
        from: account.email,
        to: data.to.join(", "),
        cc: data.cc?.join(", "),
        bcc: data.bcc?.join(", "),
        subject: data.subject,
        bodyHtml: data.bodyHtml,
        bodyText: data.bodyText || data.bodyHtml.replace(/<[^>]*>/g, ""),
        isIncoming: false,
        status: "PENDING",
        linkedRecordType: data.linkedRecordType,
        linkedRecordId: data.linkedRecordId,
      },
    });

    if (data.attachments && data.attachments.length > 0) {
      await tx.mailAttachment.createMany({
        data: data.attachments.map((a) => ({
          orgId,
          mailMessageId: createdMsg.id,
          fileKey: a.fileKey,
          fileName: a.fileName,
          fileSize: a.fileSize,
          mimeType: a.mimeType,
        })),
      });
    }

    // Update thread timestamp
    await tx.mailThread.update({
      where: { id: threadId },
      data: { updatedAt: now },
    });

    return createdMsg;
  });

  // Attempt to dispatch via Gmail REST API if Google account
  if (account.provider === "GOOGLE" && account.accessToken) {
    try {
      const { refreshGoogleToken } = require("./gmail-sync.service");
      let token = account.accessToken;
      if (account.tokenExpiresAt && account.tokenExpiresAt.getTime() - now.getTime() < 120000) {
        const refreshedToken = await refreshGoogleToken(account.id, orgId);
        if (refreshedToken) token = refreshedToken;
      }

      const MailComposer = require("nodemailer/lib/mail-composer");
      const mailComposer = new MailComposer({
        from: `"${account.name}" <${account.email}>`,
        to: data.to.join(", "),
        cc: data.cc?.join(", "),
        bcc: data.bcc?.join(", "),
        subject: data.subject,
        html: data.bodyHtml,
        text: data.bodyText || data.bodyHtml.replace(/<[^>]*>/g, ""),
        attachments: data.attachments?.map((a) => ({
          filename: a.fileName,
          path: `uploads/communication/${a.fileKey}`,
        })),
      });

      const messageBuffer = await mailComposer.compile().build();
      const raw = messageBuffer.toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw }),
      });

      if (!res.ok) {
        const errDetails = await res.json();
        throw new Error(`Gmail API failed: ${errDetails.error?.message || res.statusText}`);
      }

      await db.mailMessage.update({
        where: { id: msg.id },
        data: { status: "SENT", readAt: now },
      });
    } catch (err: any) {
      console.error("[Google Mail send failed]", err);
      await db.mailMessage.update({
        where: { id: msg.id },
        data: { status: "FAILED", attempts: 1 },
      });
      throw err;
    }
  } else if (account.smtpHost && account.smtpUser && account.smtpPasswordHash) {
    try {
      const transporter = nodemailer.createTransport({
        host: account.smtpHost,
        port: account.smtpPort || 587,
        secure: account.smtpPort === 465,
        auth: {
          user: account.smtpUser,
          pass: Buffer.from(account.smtpPasswordHash, "base64").toString("utf-8"), // Decrypt base64 placeholder
        },
      });

      await transporter.sendMail({
        from: `"${account.name}" <${account.email}>`,
        to: data.to,
        cc: data.cc,
        bcc: data.bcc,
        subject: data.subject,
        html: data.bodyHtml,
        text: data.bodyText || data.bodyHtml.replace(/<[^>]*>/g, ""),
      });

      await db.mailMessage.update({
        where: { id: msg.id },
        data: { status: "SENT", readAt: now },
      });
    } catch (err: any) {
      console.error("[SMTP dispatch failed]", err);
      await db.mailMessage.update({
        where: { id: msg.id },
        data: { status: "FAILED", attempts: 1 },
      });
    }
  } else {
    // If not SMTP configured, just mark as sent (Internal email)
    await db.mailMessage.update({
      where: { id: msg.id },
      data: { status: "SENT", readAt: now },
    });
  }

  await createCommunicationAuditLog(orgId, userId, "SEND_EMAIL", {
    messageId: msg.id,
    subject: data.subject,
  });

  return msg;
}

export async function listMailAccounts(userId: string, orgId: string) {
  await requirePermission(userId, "communication.mail.access");

  return db.mailAccount.findMany({
    where: {
      orgId,
      OR: [
        { userId },
        { isShared: true },
      ],
    },
    orderBy: { email: "asc" },
  });
}

export async function saveMailAccount(
  userId: string,
  orgId: string,
  data: {
    name: string;
    email: string;
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPassword?: string;
    imapHost?: string;
    imapPort?: number;
    imapUser?: string;
    imapPassword?: string;
    isShared?: boolean;
  }
) {
  await requirePermission(userId, "communication.mail.access");

  const smtpPasswordHash = data.smtpPassword
    ? Buffer.from(data.smtpPassword).toString("base64")
    : undefined;
  const imapPasswordHash = data.imapPassword
    ? Buffer.from(data.imapPassword).toString("base64")
    : undefined;

  return db.mailAccount.create({
    data: {
      orgId,
      userId: data.isShared ? null : userId,
      name: data.name,
      email: data.email,
      smtpHost: data.smtpHost,
      smtpPort: data.smtpPort,
      smtpUser: data.smtpUser,
      smtpPasswordHash,
      imapHost: data.imapHost,
      imapPort: data.imapPort,
      imapUser: data.imapUser,
      imapPasswordHash,
      isShared: data.isShared ?? false,
    },
  });
}
