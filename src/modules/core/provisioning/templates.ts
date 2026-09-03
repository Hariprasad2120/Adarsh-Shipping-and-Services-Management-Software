/**
 * Stage 2 — enterprise platform: built-in organisation templates.
 *
 * These are neutral starting points, not industry lock-in. Regional values are
 * the platform-neutral defaults (UTC / en-US / USD / January fiscal start); the
 * installer sets the real country/currency/fiscal during setup.
 */

import type { OrganisationTemplate } from "./types";

const GENERIC_ROLES = [
  { name: "Owner", isSystem: true, permissionKeys: ["admin.org.manage", "admin.users.manage", "admin.roles.manage", "admin.modules.manage"] },
  { name: "Administrator", isSystem: true, permissionKeys: ["admin.users.manage", "admin.roles.manage"] },
  { name: "Manager", isSystem: false },
  { name: "Employee", isSystem: false },
  { name: "Read Only", isSystem: false },
];

export const GENERIC_SME_TEMPLATE: OrganisationTemplate = {
  id: "generic-sme",
  name: "Generic SME",
  version: "1.0.0",
  description:
    "A small organisation: core platform plus a light business footprint. No advanced structure or approval chains.",
  modules: ["hrms", "attendance", "crm"],
  regional: {
    timezone: "UTC",
    locale: "en-US",
    baseCurrency: "USD",
    dateFormat: "yyyy-MM-dd",
    fiscalYearStartMonth: 1,
  },
  legalEntity: { entityType: "company" },
  roles: GENERIC_ROLES,
  numberingSequences: [
    { moduleId: "crm", docType: "invoice", prefix: "INV-{FY}-", padding: 5, resetPolicy: "ANNUALLY" },
  ],
};

export const ENTERPRISE_TEMPLATE: OrganisationTemplate = {
  id: "enterprise",
  name: "Enterprise",
  version: "1.0.0",
  description:
    "A larger organisation: full module set, separation-of-duties approval chains on financial and identity changes, fiscal-year numbering.",
  modules: ["hrms", "payroll", "attendance", "ams", "crm", "accounting", "communication", "expense"],
  regional: {
    timezone: "UTC",
    locale: "en-US",
    baseCurrency: "USD",
    dateFormat: "yyyy-MM-dd",
    fiscalYearStartMonth: 1,
  },
  legalEntity: { entityType: "private_limited" },
  roles: [
    ...GENERIC_ROLES,
    { name: "Finance Approver", isSystem: false, permissionKeys: ["accounting.payment.approve"] },
    { name: "HR Approver", isSystem: false, permissionKeys: ["hrms.employee.edit"] },
  ],
  approvalPolicies: [
    {
      subjectType: "accounting.payment",
      name: "Two-level payment approval",
      requireDistinctApprover: true,
      steps: [
        { level: 1, approverMode: "PERMISSION", permissionKey: "accounting.payment.approve" },
        { level: 2, approverMode: "PERMISSION", permissionKey: "admin.org.manage" },
      ],
    },
    {
      subjectType: "core.user_role.change",
      name: "Role-change checker",
      requireDistinctApprover: true,
      steps: [{ level: 1, approverMode: "PERMISSION", permissionKey: "admin.roles.manage" }],
    },
  ],
  numberingSequences: [
    { moduleId: "accounting", docType: "journal", prefix: "JV-{FY}-", padding: 6, resetPolicy: "ANNUALLY" },
    { moduleId: "accounting", docType: "payment", prefix: "PAY-{FY}-", padding: 6, resetPolicy: "ANNUALLY" },
    { moduleId: "crm", docType: "invoice", prefix: "INV-{FY}-", padding: 6, resetPolicy: "ANNUALLY" },
  ],
};

export const BUILTIN_TEMPLATES: readonly OrganisationTemplate[] = [
  GENERIC_SME_TEMPLATE,
  ENTERPRISE_TEMPLATE,
];
