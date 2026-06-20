"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { getNow } from "@/lib/clock";

export async function getCommunicationSettings(userId: string, orgId: string) {
  await requirePermission(userId, "communication.admin.manage");

  let setting = await db.communicationSetting.findUnique({
    where: { orgId },
  });

  if (!setting) {
    setting = await db.communicationSetting.create({
      data: {
        orgId,
        allowedDomains: "*",
        externalSharingEnabled: false,
        jitsiServerUrl: "https://meet.jit.si",
      },
    });
  }

  return setting;
}

export async function updateCommunicationSettings(
  userId: string,
  orgId: string,
  data: {
    allowedDomains?: string;
    externalSharingEnabled?: boolean;
    jitsiServerUrl?: string;
    onlyOfficeUrl?: string;
  }
) {
  await requirePermission(userId, "communication.admin.manage");

  return db.communicationSetting.upsert({
    where: { orgId },
    update: data,
    create: {
      orgId,
      allowedDomains: data.allowedDomains || "*",
      externalSharingEnabled: data.externalSharingEnabled ?? false,
      jitsiServerUrl: data.jitsiServerUrl || "https://meet.jit.si",
      onlyOfficeUrl: data.onlyOfficeUrl,
    },
  });
}

export async function listRetentionPolicies(userId: string, orgId: string) {
  await requirePermission(userId, "communication.admin.manage");

  return db.retentionPolicy.findMany({
    where: { orgId },
  });
}

export async function upsertRetentionPolicy(
  userId: string,
  orgId: string,
  targetTable: string,
  retentionDays: number
) {
  await requirePermission(userId, "communication.admin.manage");

  return db.retentionPolicy.upsert({
    where: {
      orgId_targetTable: { orgId, targetTable },
    },
    update: { retentionDays },
    create: { orgId, targetTable, retentionDays },
  });
}

export async function getDnsChecklist(userId: string, orgId: string) {
  await requirePermission(userId, "communication.admin.manage");

  // Simulating check for domains registered to the org
  // In a real environment, we'd query real DNS servers via `dns.promises.resolve` or similar node.js API
  return [
    {
      type: "MX",
      host: "@",
      value: "10 mail.monolithengine.com",
      status: "VERIFIED",
      description: "Mail Exchange record routing traffic to our mail server.",
    },
    {
      type: "SPF",
      host: "@",
      value: "v=spf1 ip4:192.0.2.0/24 include:_spf.monolithengine.com ~all",
      status: "VERIFIED",
      description: "Sender Policy Framework validates authorized mail servers.",
    },
    {
      type: "DKIM",
      host: "monolith._domainkey",
      value: "v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0...",
      status: "VERIFIED",
      description: "DomainKeys Identified Mail signs outgoing message headers.",
    },
    {
      type: "DMARC",
      host: "_dmarc",
      value: "v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc-reports@monolithengine.com",
      status: "WARNING",
      description: "Domain-based Message Authentication defines reporting rules.",
    },
  ];
}
