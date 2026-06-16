import type { CarbonIconType } from "@carbon/icons-react";
import {
  Analytics,
  Calendar,
  Dashboard,
  DocumentAdd,
  Folder,
  Group,
  Notification,
  Report,
  Security,
  Settings,
  Task,
  UserAvatar,
  UserMultiple,
  View,
} from "@carbon/icons-react";
import type { Caps } from "@/lib/rbac";

export type SecondaryNavItem = {
  href: string;
  label: string;
  icon: CarbonIconType;
  permission?: string | string[];
  hideFor?: string;
  matchPaths?: string[];
};

export type PrimaryNavSection = {
  id: string;
  href: string;
  label: string;
  icon: CarbonIconType;
  alwaysVisible?: boolean;
  permission?: string | string[];
  hideFor?: string;
  matchPaths?: string[];
  items: SecondaryNavItem[];
};

export const NAV_SECTIONS: PrimaryNavSection[] = [
  {
    id: "dashboard",
    href: "/dashboard",
    label: "Dashboard",
    icon: Dashboard,
    alwaysVisible: true,
    matchPaths: ["/dashboard"],
    items: [{ href: "/dashboard", label: "Overview", icon: View, matchPaths: ["/dashboard"] }],
  },
  {
    id: "todo",
    href: "/todo",
    label: "To-Do",
    icon: Task,
    alwaysVisible: true,
    matchPaths: ["/todo"],
    items: [{ href: "/todo", label: "Tasks", icon: Task, matchPaths: ["/todo"] }],
  },
  {
    id: "notifications",
    href: "/notifications",
    label: "Notifications",
    icon: Notification,
    alwaysVisible: true,
    matchPaths: ["/notifications"],
    items: [{ href: "/notifications", label: "Notification Center", icon: Notification, matchPaths: ["/notifications"] }],
  },
  {
    id: "hrms",
    href: "/hrms",
    label: "HRMS",
    icon: UserMultiple,
    permission: "hrms.employee.read",
    matchPaths: ["/hrms"],
    items: [
      {
        href: "/hrms/peopleplus",
        label: "PeoplePlus Portal",
        icon: UserMultiple,
        permission: "hrms.peopleplus.read",
        matchPaths: ["/hrms/peopleplus"],
      },
      {
        href: "/hrms/employees",
        label: "Employees",
        icon: Group,
        permission: "hrms.employee.read",
        matchPaths: ["/hrms/employees"],
      },
      {
        href: "/hrms/employees/new",
        label: "Onboard Employee",
        icon: DocumentAdd,
        permission: "hrms.employee.create",
        matchPaths: ["/hrms/employees/new"],
      },
      {
        href: "/hrms/ownership",
        label: "Ownership",
        icon: UserMultiple,
        permission: "hrms.employee.create",
        matchPaths: ["/hrms/ownership"],
      },
      {
        href: "/hrms/salary-structure",
        label: "Salary Structure",
        icon: Analytics,
        permission: "hrms.employee.create",
        matchPaths: ["/hrms/salary-structure"],
      },
      {
        href: "/hrms/salary-revisions",
        label: "Salary Revisions",
        icon: Report,
        permission: "hrms.employee.read",
        matchPaths: ["/hrms/salary-revisions"],
      },
    ],
  },
  {
    id: "attendance",
    href: "/attendance",
    label: "Attendance",
    icon: Calendar,
    permission: "attendance.punch.self",
    matchPaths: ["/attendance"],
    items: [
      {
        href: "/attendance/punch",
        label: "My Attendance",
        icon: Task,
        permission: "attendance.punch.self",
        matchPaths: ["/attendance/punch"],
      },
      {
        href: "/attendance/leaves",
        label: "Leaves",
        icon: Report,
        permission: "attendance.leave.request",
        matchPaths: ["/attendance/leaves"],
      },
      {
        href: "/attendance/ot",
        label: "OT Management",
        icon: Settings,
        permission: "attendance.punch.manage",
        matchPaths: ["/attendance/ot"],
      },
      {
        href: "/attendance/biometric-sync",
        label: "Biometric Sync",
        icon: Security,
        permission: "attendance.punch.manage",
        matchPaths: ["/attendance/biometric-sync"],
      },
      {
        href: "/attendance/reports",
        label: "Reports",
        icon: Analytics,
        permission: "attendance.reports.view",
        matchPaths: ["/attendance/reports"],
      },
    ],
  },
  {
    id: "ams",
    href: "/ams",
    label: "AMS",
    icon: Folder,
    matchPaths: ["/ams"],
    items: [
      {
        href: "/ams/appraisals",
        label: "Appraisals",
        icon: Folder,
        permission: "ams.appraisal.assign_reviewers",
        matchPaths: ["/ams/appraisals"],
      },
      {
        href: "/ams/my-reviews",
        label: "My Reviews",
        icon: Task,
        permission: "ams.appraisal.review",
        hideFor: "admin.org.manage",
        matchPaths: ["/ams/my-reviews"],
      },
      {
        href: "/ams/my-appraisal",
        label: "My Appraisal",
        icon: UserAvatar,
        hideFor: "admin.org.manage",
        matchPaths: ["/ams/my-appraisal"],
      },
      {
        href: "/ams/cycles",
        label: "All Cycles",
        icon: Calendar,
        permission: "ams.cycle.manage",
        matchPaths: ["/ams/cycles"],
      },
      {
        href: "/ams/criteria",
        label: "Criteria Questions",
        icon: Settings,
        permission: "ams.criteria.manage",
        matchPaths: ["/ams/criteria"],
      },
      {
        href: "/ams/slabs",
        label: "Increment Slabs",
        icon: Analytics,
        permission: "ams.cycle.manage",
        matchPaths: ["/ams/slabs"],
      },
      {
        href: "/ams/extensions",
        label: "Extensions",
        icon: DocumentAdd,
        permission: "ams.appraisal.assign_reviewers",
        matchPaths: ["/ams/extensions"],
      },
      {
        href: "/ams/kpi",
        label: "Department KPI",
        icon: Report,
        permission: "ams.cycle.manage",
        matchPaths: ["/ams/kpi"],
      },
      {
        href: "/ams/history",
        label: "History",
        icon: View,
        matchPaths: ["/ams/history"],
      },
    ],
  },
  {
    id: "crm",
    href: "/crm/dashboard",
    label: "CRM",
    icon: Analytics,
    permission: "crm.access",
    matchPaths: ["/crm"],
    items: [
      {
        href: "/crm/dashboard",
        label: "Dashboard",
        icon: View,
        permission: "crm.access",
        matchPaths: ["/crm/dashboard"],
      },
      {
        href: "/crm/leads",
        label: "Leads",
        icon: UserAvatar,
        permission: "crm.lead.read",
        matchPaths: ["/crm/leads"],
      },
      {
        href: "/crm/contacts",
        label: "Contacts",
        icon: Group,
        permission: "crm.contact.manage",
        matchPaths: ["/crm/contacts"],
      },
      {
        href: "/crm/accounts",
        label: "Accounts",
        icon: Group,
        permission: "crm.account.manage",
        matchPaths: ["/crm/accounts"],
      },
      {
        href: "/crm/deals",
        label: "Deals Pipeline",
        icon: Analytics,
        permission: "crm.deal.manage",
        matchPaths: ["/crm/deals"],
      },
      {
        href: "/crm/forecasts",
        label: "Forecasts",
        icon: Analytics,
        permission: "crm.deal.manage",
        matchPaths: ["/crm/forecasts"],
      },
      {
        href: "/crm/documents",
        label: "Documents",
        icon: Folder,
        permission: "crm.access",
        matchPaths: ["/crm/documents"],
      },
      {
        href: "/crm/campaigns",
        label: "Campaigns",
        icon: Notification,
        permission: "crm.access",
        matchPaths: ["/crm/campaigns"],
      },
      {
        href: "/crm/tasks",
        label: "Tasks",
        icon: Task,
        permission: "crm.activity.manage",
        matchPaths: ["/crm/tasks"],
      },
      {
        href: "/crm/events",
        label: "Events",
        icon: Calendar,
        permission: "crm.activity.manage",
        matchPaths: ["/crm/events"],
      },
      {
        href: "/crm/calls",
        label: "Calls",
        icon: Report,
        permission: "crm.activity.manage",
        matchPaths: ["/crm/calls"],
      },
      {
        href: "/crm/products",
        label: "Products & Services",
        icon: Folder,
        permission: "crm.access",
        matchPaths: ["/crm/products"],
      },
      {
        href: "/crm/price-books",
        label: "Price Books",
        icon: Folder,
        permission: "crm.access",
        matchPaths: ["/crm/price-books"],
      },
      {
        href: "/crm/quotes",
        label: "Quotes",
        icon: DocumentAdd,
        permission: "crm.invoice.manage",
        matchPaths: ["/crm/quotes"],
      },
      {
        href: "/crm/sales-orders",
        label: "Sales Orders",
        icon: DocumentAdd,
        permission: "crm.invoice.manage",
        matchPaths: ["/crm/sales-orders"],
      },
      {
        href: "/crm/purchase-orders",
        label: "Purchase Orders",
        icon: DocumentAdd,
        permission: "crm.invoice.manage",
        matchPaths: ["/crm/purchase-orders"],
      },
      {
        href: "/crm/invoices",
        label: "Invoices & Sales",
        icon: DocumentAdd,
        permission: "crm.invoice.manage",
        matchPaths: ["/crm/invoices"],
      },
      {
        href: "/crm/vendors",
        label: "Vendors",
        icon: Group,
        permission: "crm.vendor.manage",
        matchPaths: ["/crm/vendors"],
      },
      {
        href: "/crm/tickets",
        label: "Support Cases",
        icon: Notification,
        permission: "crm.access",
        matchPaths: ["/crm/tickets"],
      },
      {
        href: "/crm/solutions",
        label: "Solutions",
        icon: Settings,
        permission: "crm.access",
        matchPaths: ["/crm/solutions"],
      },
      {
        href: "/crm/sales-inbox",
        label: "Sales Inbox",
        icon: Notification,
        permission: "crm.access",
        matchPaths: ["/crm/sales-inbox"],
      },
      {
        href: "/crm/social",
        label: "Social Log",
        icon: Group,
        permission: "crm.access",
        matchPaths: ["/crm/social"],
      },
      {
        href: "/crm/visits",
        label: "Visits",
        icon: Calendar,
        permission: "crm.access",
        matchPaths: ["/crm/visits"],
      },
      {
        href: "/crm/services",
        label: "Services",
        icon: Settings,
        permission: "crm.access",
        matchPaths: ["/crm/services"],
      },
      {
        href: "/crm/projects",
        label: "Projects",
        icon: Task,
        permission: "crm.project.manage",
        matchPaths: ["/crm/projects"],
      },
      {
        href: "/crm/voc",
        label: "Feedback (VoC)",
        icon: Report,
        permission: "crm.access",
        matchPaths: ["/crm/voc"],
      },
      {
        href: "/crm/lead-sources",
        label: "Lead Sources",
        icon: Settings,
        permission: "crm.leadSource.read",
        matchPaths: ["/crm/lead-sources"],
      },
    ],
  },
  {
    id: "admin",
    href: "/admin",
    label: "Admin",
    icon: Security,
    permission: "admin.org.manage",
    matchPaths: ["/admin"],
    items: [
      {
        href: "/admin/org-structure",
        label: "Organisation Structure",
        icon: Group,
        permission: "admin.org.manage",
        matchPaths: ["/admin/org-structure"],
      },
      {
        href: "/admin/roles",
        label: "Roles & Permissions",
        icon: UserMultiple,
        permission: "admin.org.manage",
        matchPaths: ["/admin/roles"],
      },
      {
        href: "/admin/settings",
        label: "Appraisal Settings",
        icon: Settings,
        permission: "admin.org.manage",
        matchPaths: ["/admin/settings"],
      },
      {
        href: "/admin/passkeys",
        label: "Passkey Resets",
        icon: Security,
        permission: "admin.org.manage",
        matchPaths: ["/admin/passkeys"],
      },
      {
        href: "/admin/sessions",
        label: "Session Monitor",
        icon: View,
        permission: "admin.org.manage",
        matchPaths: ["/admin/sessions"],
      },
      {
        href: "/admin/data-tools",
        label: "Data Tools",
        icon: Report,
        permission: "admin.org.manage",
        matchPaths: ["/admin/data-tools"],
      },
      {
        href: "/admin/simulation",
        label: "Simulation",
        icon: Notification,
        permission: "admin.org.manage",
        matchPaths: ["/admin/simulation"],
      },
      {
        href: "/admin/notifications",
        label: "Notifications",
        icon: Notification,
        permission: "admin.org.manage",
        matchPaths: ["/admin/notifications"],
      },
    ],
  },
];

export function isVisible(caps: Caps, permission?: string | string[], hideFor?: string) {
  if (hideFor && caps[hideFor]) return false;
  if (!permission) return true;
  if (Array.isArray(permission)) return permission.some((key) => caps[key]);
  return Boolean(caps[permission]);
}

export function matchesPath(pathname: string, href: string, matchPaths?: string[]) {
  const paths = matchPaths && matchPaths.length > 0 ? matchPaths : [href];
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function getActiveItemHref(pathname: string, items: SecondaryNavItem[]) {
  const rankedMatches = items
    .flatMap((item) => {
      const paths = item.matchPaths && item.matchPaths.length > 0 ? item.matchPaths : [item.href];
      return paths
        .filter((path) => pathname === path || pathname.startsWith(`${path}/`))
        .map((path) => ({ href: item.href, weight: path.length }));
    })
    .sort((left, right) => right.weight - left.weight);

  return rankedMatches[0]?.href ?? null;
}

export function getVisibleSections(caps: Caps) {
  return NAV_SECTIONS.map((section) => {
    const visibleItems = section.items.filter((item) => isVisible(caps, item.permission, item.hideFor));
    return { ...section, items: visibleItems };
  }).filter((section) => {
    const canSeeSection = isVisible(caps, section.permission, section.hideFor);
    if (section.alwaysVisible) return true;
    return section.items.length > 0 || Boolean(section.permission && canSeeSection);
  });
}

export function getVisibleSectionById(caps: Caps, id: string) {
  return getVisibleSections(caps).find((section) => section.id === id) ?? null;
}
