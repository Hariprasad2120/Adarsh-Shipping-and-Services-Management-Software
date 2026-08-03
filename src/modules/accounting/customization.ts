import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { z } from "zod";

const jsonText = z.string().trim().default("");

export const accountingCustomFieldTypeSchema = z.enum([
  "TEXT",
  "TEXTAREA",
  "NUMBER",
  "DATE",
  "SELECT",
  "BOOLEAN",
]);

export const accountingCustomFieldScopeSchema = z.enum([
  "CUSTOMER",
  "VENDOR",
  "ITEM",
  "SALES_INVOICE",
  "PURCHASE_INVOICE",
  "PAYMENT",
  "JOURNAL_ENTRY",
  "QUOTATION",
]);

export const accountingCustomFieldInputSchema = z.object({
  scope: accountingCustomFieldScopeSchema,
  label: z.string().trim().min(1).max(100),
  dataType: accountingCustomFieldTypeSchema.default("TEXT"),
  helpText: z.string().trim().max(240).optional().default(""),
  required: z.boolean().default(false),
  active: z.boolean().default(true),
  position: z.number().int().min(0).max(10_000).default(0),
  options: z.array(z.string().trim().min(1).max(100)).max(100).default([]),
});

export const accountingAutomationRuleInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  triggerType: z.enum([
    "DOCUMENT_APPROVED",
    "PAYMENT_APPROVED",
    "REPORT_SCHEDULED",
    "PORTAL_PUBLISHED",
    "OUTBOX_FAILED",
    "PERIOD_CLOSED",
  ]),
  targetScope: z.enum([
    "DOCUMENT",
    "PAYMENT",
    "REPORT",
    "PORTAL",
    "OUTBOX",
    "PERIOD",
  ]),
  actionType: z.enum([
    "QUEUE_EMAIL",
    "QUEUE_PORTAL_NOTIFICATION",
    "QUEUE_OUTBOX_RETRY",
    "FLAG_MANUAL_REVIEW",
    "GENERATE_REPORT_EXPORT",
  ]),
  conditionsJson: jsonText,
  configurationJson: jsonText,
  active: z.boolean().default(true),
});

export const accountingWorkspaceModuleInputSchema = z.object({
  code: z.string().trim().min(1).max(60),
  name: z.string().trim().min(1).max(100),
  routePath: z.string().trim().startsWith("/accounting/").max(200),
  description: z.string().trim().max(240).optional().default(""),
  configurationJson: jsonText,
  active: z.boolean().default(true),
});

export type AccountingCustomFieldInput = z.infer<
  typeof accountingCustomFieldInputSchema
>;
export type AccountingAutomationRuleInput = z.infer<
  typeof accountingAutomationRuleInputSchema
>;
export type AccountingWorkspaceModuleInput = z.infer<
  typeof accountingWorkspaceModuleInputSchema
>;

function fieldKey(label: string) {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return base || "field";
}

function moduleCode(code: string) {
  return code
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

function parseJsonValue(raw: string, label: string) {
  if (!raw.trim()) return undefined;
  try {
    return JSON.parse(raw) as Prisma.InputJsonValue;
  } catch {
    throw new Error(`${label} must be valid JSON`);
  }
}

export async function listAccountingCustomFieldDefinitions(
  orgId: string,
  includeInactive = true,
) {
  return db.accountingCustomFieldDefinition.findMany({
    where: { orgId, ...(includeInactive ? {} : { isActive: true }) },
    orderBy: [{ scope: "asc" }, { position: "asc" }, { label: "asc" }],
  });
}

export async function createAccountingCustomFieldDefinition(
  orgId: string,
  input: AccountingCustomFieldInput,
) {
  const stem = fieldKey(input.label);
  const existing = await db.accountingCustomFieldDefinition.findMany({
    where: { orgId, scope: input.scope, key: { startsWith: stem } },
    select: { key: true },
  });
  const keys = new Set(existing.map((row) => row.key));
  let key = stem;
  let suffix = 2;
  while (keys.has(key)) {
    key = `${stem}_${suffix}`;
    suffix += 1;
  }
  return db.accountingCustomFieldDefinition.create({
    data: {
      orgId,
      scope: input.scope,
      key,
      label: input.label,
      dataType: input.dataType,
      helpText: input.helpText || null,
      options: input.dataType === "SELECT" ? input.options : [],
      required: input.required,
      isActive: input.active,
      position: input.position,
    },
  });
}

export async function updateAccountingCustomFieldDefinition(
  orgId: string,
  id: string,
  input: AccountingCustomFieldInput,
) {
  const existing = await db.accountingCustomFieldDefinition.findFirst({
    where: { id, orgId },
    select: { id: true },
  });
  if (!existing) throw new Error("Accounting custom field not found");
  return db.accountingCustomFieldDefinition.update({
    where: { id },
    data: {
      scope: input.scope,
      label: input.label,
      dataType: input.dataType,
      helpText: input.helpText || null,
      options: input.dataType === "SELECT" ? input.options : [],
      required: input.required,
      isActive: input.active,
      position: input.position,
      rowVersion: { increment: 1 },
    },
  });
}

export async function deleteAccountingCustomFieldDefinition(
  orgId: string,
  id: string,
) {
  const result = await db.accountingCustomFieldDefinition.deleteMany({
    where: { id, orgId },
  });
  if (result.count === 0) throw new Error("Accounting custom field not found");
}

export async function listAccountingAutomationRules(
  orgId: string,
  includeInactive = true,
) {
  return db.accountingAutomationRule.findMany({
    where: { orgId, ...(includeInactive ? {} : { isActive: true }) },
    orderBy: [{ targetScope: "asc" }, { name: "asc" }],
  });
}

export async function createAccountingAutomationRule(
  orgId: string,
  input: AccountingAutomationRuleInput,
) {
  return db.accountingAutomationRule.create({
    data: {
      orgId,
      name: input.name,
      triggerType: input.triggerType,
      targetScope: input.targetScope,
      actionType: input.actionType,
      conditions: parseJsonValue(input.conditionsJson, "Conditions JSON"),
      configuration: parseJsonValue(
        input.configurationJson,
        "Configuration JSON",
      ),
      isActive: input.active,
    },
  });
}

export async function updateAccountingAutomationRule(
  orgId: string,
  id: string,
  input: AccountingAutomationRuleInput,
) {
  const existing = await db.accountingAutomationRule.findFirst({
    where: { id, orgId },
    select: { id: true },
  });
  if (!existing) throw new Error("Accounting automation rule not found");
  return db.accountingAutomationRule.update({
    where: { id },
    data: {
      name: input.name,
      triggerType: input.triggerType,
      targetScope: input.targetScope,
      actionType: input.actionType,
      conditions: parseJsonValue(input.conditionsJson, "Conditions JSON"),
      configuration: parseJsonValue(
        input.configurationJson,
        "Configuration JSON",
      ),
      isActive: input.active,
      rowVersion: { increment: 1 },
    },
  });
}

export async function deleteAccountingAutomationRule(orgId: string, id: string) {
  const result = await db.accountingAutomationRule.deleteMany({
    where: { id, orgId },
  });
  if (result.count === 0) throw new Error("Accounting automation rule not found");
}

export async function listAccountingWorkspaceModules(
  orgId: string,
  includeInactive = true,
) {
  return db.accountingWorkspaceModule.findMany({
    where: { orgId, ...(includeInactive ? {} : { isActive: true }) },
    orderBy: [{ isActive: "desc" }, { code: "asc" }],
  });
}

export async function createAccountingWorkspaceModule(
  orgId: string,
  input: AccountingWorkspaceModuleInput,
) {
  return db.accountingWorkspaceModule.create({
    data: {
      orgId,
      code: moduleCode(input.code),
      name: input.name,
      routePath: input.routePath,
      description: input.description || null,
      configuration: parseJsonValue(
        input.configurationJson,
        "Configuration JSON",
      ),
      isActive: input.active,
    },
  });
}

export async function updateAccountingWorkspaceModule(
  orgId: string,
  id: string,
  input: AccountingWorkspaceModuleInput,
) {
  const existing = await db.accountingWorkspaceModule.findFirst({
    where: { id, orgId },
    select: { id: true },
  });
  if (!existing) throw new Error("Accounting workspace module not found");
  return db.accountingWorkspaceModule.update({
    where: { id },
    data: {
      code: moduleCode(input.code),
      name: input.name,
      routePath: input.routePath,
      description: input.description || null,
      configuration: parseJsonValue(
        input.configurationJson,
        "Configuration JSON",
      ),
      isActive: input.active,
      rowVersion: { increment: 1 },
    },
  });
}

export async function deleteAccountingWorkspaceModule(orgId: string, id: string) {
  const result = await db.accountingWorkspaceModule.deleteMany({
    where: { id, orgId },
  });
  if (result.count === 0) throw new Error("Accounting workspace module not found");
}
