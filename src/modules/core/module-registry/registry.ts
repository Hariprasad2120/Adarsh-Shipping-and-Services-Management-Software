/**
 * Stage 2 — enterprise platform: the module registry.
 *
 * One `ModuleManifest` per deployable capability. Kept consistent with the
 * legacy id/label/route tables in `core/organisation/module-config.ts` — a
 * parity test (`__tests__/registry.test.ts`) fails the build if they diverge,
 * so this file is the place to add a new module.
 *
 * `dependsOn` is populated only where a dependency is verified (code imports or
 * a hard runtime requirement). Unverified relationships are left empty rather
 * than guessed — a wrong entry would silently enable extra modules.
 */

import type { ModuleManifest } from "./types";

export const MODULE_REGISTRY: readonly ModuleManifest[] = [
  // ── Core platform — always enabled ────────────────────────────────────────
  {
    id: "dashboard",
    label: "Dashboard",
    description: "Landing workspace and cross-module widgets.",
    version: "1.0.0",
    kind: "core",
    dependsOn: [],
    routePrefixes: ["/dashboard"],
    permissionGroups: [],
  },
  {
    id: "todo",
    label: "To-do",
    description: "Personal and assigned task lists.",
    version: "1.0.0",
    kind: "core",
    dependsOn: [],
    routePrefixes: ["/todo"],
    permissionGroups: [],
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "In-app notification centre and activity feed.",
    version: "1.0.0",
    kind: "core",
    dependsOn: [],
    routePrefixes: ["/notifications"],
    permissionGroups: [],
  },
  {
    id: "admin",
    label: "Administration",
    description: "Organisation settings, users, roles, security and module control.",
    version: "1.0.0",
    kind: "core",
    dependsOn: [],
    routePrefixes: ["/admin"],
    permissionGroups: ["Admin"],
    capabilities: ["identity", "rbac", "org-settings"],
  },

  // ── Business modules — enabled per organisation ───────────────────────────
  {
    id: "product-catalogue",
    label: "Product Catalogue",
    description: "Interactive catalogue and technical manual pages.",
    version: "1.0.0",
    kind: "business",
    dependsOn: [],
    routePrefixes: ["/product-catalogue"],
    permissionGroups: [],
  },
  {
    id: "hrms",
    label: "HRMS",
    description: "Employees, onboarding, letters, and people operations.",
    version: "1.0.0",
    kind: "business",
    dependsOn: [],
    routePrefixes: ["/hrms"],
    permissionGroups: ["HRMS"],
    capabilities: ["employees", "people-directory"],
  },
  {
    id: "payroll",
    label: "Payroll",
    description:
      "Standalone payroll operations, pay runs, compliance, payments, and payroll reporting.",
    version: "1.0.0",
    kind: "business",
    // Verified: src/modules/payroll imports from @/modules/hrms in 32 files.
    dependsOn: ["hrms"],
    routePrefixes: ["/payroll"],
    permissionGroups: ["Payroll"],
  },
  {
    id: "attendance",
    label: "Attendance",
    description: "Punching, leaves, OT, timesheets, and attendance reports.",
    version: "1.0.0",
    kind: "business",
    dependsOn: [],
    routePrefixes: ["/attendance"],
    permissionGroups: ["Attendance"],
  },
  {
    id: "ams",
    label: "AMS",
    description: "Appraisals, cycles, criteria, increments, and performance workflows.",
    version: "1.0.0",
    kind: "business",
    dependsOn: [],
    routePrefixes: ["/ams"],
    permissionGroups: ["AMS"],
  },
  {
    id: "lms",
    label: "LMS",
    description: "Courses, learning progress, assignments, and reporting.",
    version: "1.0.0",
    kind: "business",
    dependsOn: [],
    routePrefixes: ["/lms"],
    permissionGroups: ["LMS"],
  },
  {
    id: "crm",
    label: "CRM",
    description: "Sales, pipeline, leads, quotes, products, and customer workspaces.",
    version: "1.0.0",
    kind: "business",
    dependsOn: [],
    routePrefixes: ["/crm"],
    permissionGroups: ["CRM"],
  },
  {
    id: "freight-forwarding",
    label: "Freight Forwarding",
    description: "Shipment planning, forwarding operations, and freight execution workspace.",
    version: "1.0.0",
    kind: "business",
    dependsOn: [],
    routePrefixes: ["/freight-forwarding"],
    permissionGroups: ["Freight Forwarding"],
  },
  {
    id: "communication",
    label: "Communication",
    description: "Mail, chat, calendar, meetings, files, docs, and forms.",
    version: "1.0.0",
    kind: "business",
    dependsOn: [],
    routePrefixes: ["/communication"],
    permissionGroups: ["Communication"],
  },
  {
    id: "expense",
    label: "Expense",
    description: "Expense workspace access from the primary navigation.",
    version: "1.0.0",
    kind: "business",
    dependsOn: [],
    routePrefixes: ["/expense"],
    permissionGroups: ["Expense"],
  },
  {
    id: "cha",
    label: "CHA",
    description: "Custom house agent jobs, approvals, expenses, reports, and settings.",
    version: "1.0.0",
    kind: "business",
    dependsOn: [],
    routePrefixes: ["/cha"],
    permissionGroups: ["CHA"],
    features: [
      {
        id: "cha-labs",
        label: "CHA Labs",
        description:
          "Experimental CHA lab routes such as the import job creation workspace.",
        routePrefixes: ["/cha/labs/import-job-creation"],
      },
    ],
  },
  {
    id: "accounting",
    label: "Accounting",
    description: "Ledgers, journals, invoices, payment entries, and reports.",
    version: "1.0.0",
    kind: "business",
    dependsOn: [],
    routePrefixes: ["/accounting"],
    permissionGroups: ["Accounting"],
    capabilities: ["ledger", "legal-entities", "numbering", "approvals", "currencies"],
  },
  {
    id: "recruit",
    label: "Recruit",
    description: "Employer and job-seeker recruiting workspaces.",
    version: "1.0.0",
    kind: "business",
    dependsOn: [],
    // Nested under the HRMS prefix in the legacy route table.
    routePrefixes: ["/hrms/recruit"],
    permissionGroups: ["Recruit"],
  },
] as const;
