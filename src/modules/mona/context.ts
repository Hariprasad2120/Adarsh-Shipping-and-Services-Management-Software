import { getPathLabel, segmentToLabel } from "@/lib/route-labels";
import {
  getAccount,
  getContact,
  getDeal,
  getInvoice,
  getLead,
} from "@/modules/crm/service";
import type {
  MonaContext,
  MonaContextEntity,
  MonaContextInput,
  MonaRouteContext,
  MonaWorkspaceContext,
} from "./types";

const MODULE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  hrms: "HRMS",
  attendance: "Attendance",
  ams: "Appraisal Management",
  lms: "Learning Management",
  crm: "CRM",
  "freight-forwarding": "Freight Forwarding",
  cha: "CHA",
  accounting: "Accounting",
  todo: "To-Do",
  notifications: "Notifications",
  admin: "Admin",
  "google-chat": "Google Chat",
};

const PERMISSION_MODULE_LABELS: Record<string, string> = {
  hrms: "HRMS",
  attendance: "Attendance",
  ams: "Appraisal Management",
  lms: "Learning Management",
  crm: "CRM",
  cha: "CHA",
  accounting: "Accounting",
  admin: "Admin",
};

type RouteEntityPattern = {
  pattern: RegExp;
  kind: MonaContextEntity["kind"];
  permission: string;
};

const ROUTE_ENTITY_PATTERNS: RouteEntityPattern[] = [
  { pattern: /^\/crm\/leads\/([^/]+)$/, kind: "crm_lead", permission: "crm.lead.read" },
  { pattern: /^\/crm\/enquiries\/([^/]+)$/, kind: "crm_lead", permission: "crm.lead.read" },
  { pattern: /^\/crm\/freight-forwarding\/([^/]+)$/, kind: "crm_lead", permission: "crm.lead.read" },
  { pattern: /^\/crm\/customs-clearance\/([^/]+)$/, kind: "crm_lead", permission: "crm.lead.read" },
  { pattern: /^\/crm\/deals\/([^/]+)$/, kind: "crm_deal", permission: "crm.deal.manage" },
  { pattern: /^\/crm\/contacts\/([^/]+)$/, kind: "crm_contact", permission: "crm.contact.read" },
  { pattern: /^\/crm\/customers\/([^/]+)$/, kind: "crm_account", permission: "crm.customer.read" },
  { pattern: /^\/accounting\/invoices-sales\/([^/]+)$/, kind: "crm_invoice", permission: "accounting.invoice.read" },
];

export async function buildMonaContext(input: MonaContextInput): Promise<MonaContext> {
  const currentPath = normalizePath(input.currentPath);
  const route = buildRouteContext(currentPath, input.channel);
  const workspace = buildWorkspaceContext(input.permissions, input.isAdmin);
  const entity = await buildEntityContext({
    currentPath,
    orgId: input.orgId,
    permissions: input.permissions,
  });

  return {
    userId: input.userId,
    userName: input.userName,
    orgId: input.orgId,
    currentPath,
    permissions: input.permissions,
    isAdmin: input.isAdmin,
    route,
    workspace,
    entity,
  };
}

function normalizePath(path: string | undefined): string {
  if (!path) return "/dashboard";
  const trimmed = path.trim();
  if (!trimmed) return "/dashboard";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function buildRouteContext(currentPath: string, channel: MonaContextInput["channel"]): MonaRouteContext {
  const segments = currentPath.split("/").filter(Boolean);
  const routeLabel = getPathLabel(currentPath);
  const moduleId = segments[0] ?? "dashboard";
  const moduleLabel = MODULE_LABELS[moduleId] ?? segmentToLabel(moduleId);
  const breadcrumbs = buildBreadcrumbs(currentPath, segments);
  const view = inferRouteView(currentPath, segments);

  return {
    channel,
    path: currentPath,
    moduleId,
    moduleLabel,
    pageLabel: routeLabel ?? breadcrumbs.at(-1) ?? moduleLabel,
    pageSummary: describeRoute(currentPath, routeLabel, moduleLabel, view, segments),
    breadcrumbs,
    view,
    routeKey: buildRouteKey(segments),
  };
}

function buildBreadcrumbs(currentPath: string, segments: string[]): string[] {
  if (currentPath === "/dashboard" || segments.length === 0) {
    return ["Dashboard"];
  }

  const breadcrumbs: string[] = [];
  for (let index = 0; index < segments.length; index += 1) {
    const partialPath = `/${segments.slice(0, index + 1).join("/")}`;
    breadcrumbs.push(getPathLabel(partialPath) ?? segmentToLabel(segments[index]!));
  }
  return breadcrumbs;
}

function inferRouteView(currentPath: string, segments: string[]): MonaRouteContext["view"] {
  if (currentPath === "/dashboard" || segments.length === 0) return "dashboard";
  const lastSegment = segments.at(-1) ?? "";
  if (lastSegment === "new") return "create";
  if (lastSegment === "edit") return "edit";
  if (lastSegment === "settings") return "settings";
  if (currentPath.startsWith("/google-chat")) return "workspace";
  if (looksLikeEntityId(lastSegment)) return "detail";
  return "list";
}

function buildRouteKey(segments: string[]): string {
  if (segments.length === 0) return "dashboard";
  return segments
    .map((segment) => (looksLikeEntityId(segment) ? "[entity]" : segment))
    .join("/");
}

function describeRoute(
  currentPath: string,
  routeLabel: string | null,
  moduleLabel: string,
  view: MonaRouteContext["view"],
  segments: string[],
): string {
  if (currentPath === "/dashboard" || segments.length === 0) {
    return "The user is on the main dashboard overview.";
  }

  if (currentPath.startsWith("/google-chat")) {
    return "The user is interacting from the Google Chat channel instead of the web dashboard.";
  }

  const label = routeLabel ?? segmentToLabel(segments.at(-1) ?? moduleLabel);

  switch (view) {
    case "create":
      return `The user is creating a new record in ${moduleLabel}, specifically on ${label}.`;
    case "edit":
      return `The user is editing an existing record in ${moduleLabel}.`;
    case "settings":
      return `The user is in configuration for ${moduleLabel}, on ${label}.`;
    case "detail":
      return `The user is viewing a detail page in ${moduleLabel}, centered on ${label}.`;
    case "workspace":
      return `The user is working from the ${moduleLabel} integration context.`;
    default:
      return `The user is browsing ${moduleLabel}, currently on ${label}.`;
  }
}

function buildWorkspaceContext(permissions: string[], isAdmin: boolean): MonaWorkspaceContext {
  const accessibleModules = Array.from(
    new Set(
      permissions
        .map((permission) => permission.split(".")[0] ?? "")
        .map((moduleId) => PERMISSION_MODULE_LABELS[moduleId])
        .filter((moduleLabel): moduleLabel is string => Boolean(moduleLabel)),
    ),
  ).sort((left, right) => left.localeCompare(right));

  return {
    permissionCount: permissions.length,
    accessibleModules,
    roleSummary: isAdmin
      ? "Administrator with broad cross-module access."
      : accessibleModules.length > 0
        ? `Role-based access across ${accessibleModules.join(", ")}.`
        : "Minimal workspace access focused on self-service tasks.",
  };
}

async function buildEntityContext(params: {
  currentPath: string;
  orgId?: string;
  permissions: string[];
}): Promise<MonaContextEntity | null> {
  const orgId = params.orgId;
  if (!orgId) return null;

  for (const candidate of ROUTE_ENTITY_PATTERNS) {
    const match = params.currentPath.match(candidate.pattern);
    if (!match) continue;
    if (!params.permissions.includes(candidate.permission)) return null;

    const entityId = match[1];
    switch (candidate.kind) {
      case "crm_lead":
        return buildLeadContext(orgId, entityId);
      case "crm_deal":
        return buildDealContext(orgId, entityId);
      case "crm_contact":
        return buildContactContext(orgId, entityId);
      case "crm_account":
        return buildAccountContext(orgId, entityId);
      case "crm_invoice":
        return buildInvoiceContext(orgId, entityId);
      default:
        return null;
    }
  }

  return null;
}

async function buildLeadContext(orgId: string, leadId: string): Promise<MonaContextEntity | null> {
  const lead = await getLead(orgId, leadId);
  if (!lead) return null;

  const leadName = [lead.firstName, lead.lastName].filter(Boolean).join(" ").trim() || "Unnamed lead";
  const serviceTypes = Array.isArray(lead.serviceEnquiries)
    ? Array.from(new Set(lead.serviceEnquiries.map((entry) => entry.serviceType).filter(Boolean)))
    : [];

  return {
    kind: "crm_lead",
    label: leadName,
    summary: `${leadName} from ${lead.company || "an unspecified company"} is currently ${lead.status.toLowerCase()}.`,
    metadata: {
      company: lead.company || null,
      status: lead.status,
      source: lead.source || null,
      ownerName: lead.owner?.name || null,
      enquiryRef: lead.enquiryRef || null,
      serviceTypes,
    },
  };
}

async function buildDealContext(orgId: string, dealId: string): Promise<MonaContextEntity | null> {
  const deal = await getDeal(orgId, dealId);
  if (!deal) return null;

  return {
    kind: "crm_deal",
    label: deal.name,
    summary: `${deal.name} is in the ${deal.stage} stage${deal.account?.name ? ` for ${deal.account.name}` : ""}.`,
    metadata: {
      stage: deal.stage,
      amount: deal.amount ?? null,
      expectedCloseDate: deal.expectedCloseDate?.toISOString().split("T")[0] ?? null,
      accountName: deal.account?.name || null,
      ownerName: deal.owner?.name || null,
    },
  };
}

async function buildContactContext(orgId: string, contactId: string): Promise<MonaContextEntity | null> {
  const contact = await getContact(orgId, contactId);
  if (!contact) return null;

  const contactName =
    [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim() || "Unnamed contact";

  return {
    kind: "crm_contact",
    label: contactName,
    summary: `${contactName} is a CRM contact${contact.account?.name ? ` linked to ${contact.account.name}` : ""}.`,
    metadata: {
      accountName: contact.account?.name || null,
      ownerName: contact.owner?.name || null,
      designation: contact.designation || null,
    },
  };
}

async function buildAccountContext(orgId: string, accountId: string): Promise<MonaContextEntity | null> {
  const account = await getAccount(orgId, accountId);
  if (!account) return null;

  return {
    kind: "crm_account",
    label: account.name,
    summary: `${account.name} is a customer account with ${account.contacts.length} contact(s) and ${account.deals.length} linked deal(s).`,
    metadata: {
      ownerName: account.owner?.name || null,
      customerSubType: account.customerSubType || null,
      contactCount: account.contacts.length,
      dealCount: account.deals.length,
      projectCount: account.projects.length,
    },
  };
}

async function buildInvoiceContext(orgId: string, invoiceId: string): Promise<MonaContextEntity | null> {
  const invoice = await getInvoice(orgId, invoiceId);
  if (!invoice) return null;

  return {
    kind: "crm_invoice",
    label: invoice.invoiceNumber || "Unnumbered invoice",
    summary: `${invoice.invoiceNumber || "This invoice"} is a ${invoice.type.toLowerCase()} document for ${invoice.account?.name || "an account"}.`,
    metadata: {
      type: invoice.type,
      status: invoice.status,
      total: invoice.total ?? null,
      accountName: invoice.account?.name || null,
      ownerName: invoice.owner?.name || null,
    },
  };
}

function looksLikeEntityId(segment: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(segment) || /^[0-9a-z]{16,}$/i.test(segment);
}
