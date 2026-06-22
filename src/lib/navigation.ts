import type { CarbonIconType } from "@carbon/icons-react";
import {
  Analytics,
  Calendar,
  Dashboard,
  DocumentAdd,
  Education,
  Group,
  Notification,
  Report,
  Security,
  Settings,
  Task,
  Time,
  UserAvatar,
  UserMultiple,
  View,
  Search,
} from "@carbon/icons-react";
import { FolderIcon } from "@/components/ui/folder-icon";
const Folder = FolderIcon as any;
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
    items: [],
  },
  {
    id: "product-catalogue",
    href: "/product-catalogue",
    label: "Product Catalogue",
    icon: Report,
    alwaysVisible: true,
    matchPaths: ["/product-catalogue"],
    items: [],
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
    permission: [
      "hrms.employee.read",
      "hrms.employee.create",
      "hrms.employee.deactivate",
      "hrms.org_structure.manage",
      "hrms.workreport.submit",
      "hrms.travel.request",
      "hrms.helpdesk.read",
      "hrms.letters.manage",
      "hrms.onboarding.manage",
      "hrms.tasks.manage",
      "hrms.approvals.manage",
      "hrms.documents.read",
      "hrms.salary.read",
      "hrms.hierarchy.manage",
      "hrms.settings.manage",
    ],
    matchPaths: ["/hrms"],
    items: [
      {
        href: "/hrms",
        label: "Dashboard",
        icon: Dashboard,
        matchPaths: ["/hrms"],
      },
      {
        href: "/hrms/employees",
        label: "Employees",
        icon: Group,
        permission: "hrms.employee.read",
        matchPaths: ["/hrms/employees"],
      },
      {
        href: "/hrms/onboarding",
        label: "Onboarding Checklists",
        icon: UserAvatar,
        matchPaths: ["/hrms/onboarding"],
      },
      {
        href: "/hrms/work-reports",
        label: "Work Reports",
        icon: Report,
        matchPaths: ["/hrms/work-reports"],
      },
      {
        href: "/hrms/tasks",
        label: "Task Checklists",
        icon: Task,
        matchPaths: ["/hrms/tasks"],
      },
      {
        href: "/hrms/approvals",
        label: "Approvals Central",
        icon: Security,
        matchPaths: ["/hrms/approvals"],
      },
      {
        href: "/hrms/travel",
        label: "Travel & Expenses",
        icon: Calendar,
        matchPaths: ["/hrms/travel"],
      },
      {
        href: "/hrms/letters",
        label: "HR Letters",
        icon: DocumentAdd,
        matchPaths: ["/hrms/letters"],
      },
      {
        href: "/hrms/files",
        label: "Document Drive",
        icon: Folder,
        matchPaths: ["/hrms/files"],
      },
      {
        href: "/hrms/helpdesk",
        label: "Help Desk",
        icon: Notification,
        matchPaths: ["/hrms/helpdesk"],
      },
      {
        href: "/hrms/employees/new",
        label: "Onboard Employee",
        icon: DocumentAdd,
        permission: "hrms.employee.create",
        matchPaths: ["/hrms/employees/new"],
      },
      {
        href: "/hrms/users",
        label: "User Control",
        icon: UserMultiple,
        permission: "hrms.employee.deactivate",
        matchPaths: ["/hrms/users"],
      },
      {
        href: "/hrms/org-structure",
        label: "Organisation Structure",
        icon: Group,
        permission: "hrms.org_structure.manage",
        matchPaths: ["/hrms/org-structure"],
      },
      {
        href: "/hrms/ownership",
        label: "Ownership",
        icon: UserMultiple,
        permission: "hrms.hierarchy.manage",
        matchPaths: ["/hrms/ownership"],
      },
      {
        href: "/hrms/salary-structure",
        label: "Salary Structure",
        icon: Analytics,
        permission: "hrms.salary.read",
        matchPaths: ["/hrms/salary-structure"],
      },
      {
        href: "/hrms/salary-revisions",
        label: "Salary Revisions",
        icon: Report,
        permission: "hrms.salary.read",
        matchPaths: ["/hrms/salary-revisions"],
      },
      {
        href: "/hrms/payroll",
        label: "Payroll Batches",
        icon: Analytics,
        matchPaths: ["/hrms/payroll"],
      },
      {
        href: "/hrms/settings",
        label: "HRMS Settings",
        icon: Settings,
        permission: "hrms.settings.manage",
        matchPaths: ["/hrms/settings"],
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
        href: "/attendance",
        label: "Dashboard",
        icon: Dashboard,
        matchPaths: ["/attendance"],
      },
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
        href: "/attendance/timesheets",
        label: "Timesheets",
        icon: Time,
        permission: ["attendance.timesheet.view", "attendance.timesheet.manage"],
        matchPaths: ["/attendance/timesheets"],
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
        href: "/ams",
        label: "Dashboard",
        icon: Dashboard,
        matchPaths: ["/ams"],
      },
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
        permission: ["ams.appraisal.review", "ams.appraisal.management_review"],
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
        href: "/ams/pms",
        label: "Performance OKRs",
        icon: Analytics,
        matchPaths: ["/ams/pms"],
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
      {
        href: "/ams/assets",
        label: "Fixed Assets",
        icon: Folder,
        permission: "ams.cycle.manage",
        matchPaths: ["/ams/assets"],
      },
    ],
  },
  {
    id: "lms",
    href: "/lms",
    label: "LMS",
    icon: Education,
    matchPaths: ["/lms"],
    items: [
      {
        href: "/lms",
        label: "Dashboard",
        icon: Dashboard,
        matchPaths: ["/lms"],
      },
      {
        href: "/lms/courses",
        label: "Courses",
        icon: Folder,
        matchPaths: ["/lms/courses"],
      },
      {
        href: "/lms/my-learning",
        label: "My Learning",
        icon: UserAvatar,
        matchPaths: ["/lms/my-learning"],
      },
      {
        href: "/lms/assignments",
        label: "Assignments",
        icon: Task,
        matchPaths: ["/lms/assignments"],
      },
      {
        href: "/lms/reports",
        label: "Reports",
        icon: Report,
        matchPaths: ["/lms/reports"],
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
        href: "/crm/enquiries",
        label: "Enquiries",
        icon: View,
        permission: "crm.lead.read",
        matchPaths: ["/crm/enquiries"],
      },
      {
        href: "/crm/contacts",
        label: "Contacts",
        icon: Group,
        permission: "crm.contact.manage",
        matchPaths: ["/crm/contacts"],
      },
      {
        href: "/crm/customers",
        label: "Customers",
        icon: Group,
        permission: "crm.account.manage",
        matchPaths: ["/crm/customers"],
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
        href: "/crm/items",
        label: "Items",
        icon: Folder,
        permission: "crm.access",
        matchPaths: ["/crm/items"],
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
        href: "/crm/approvals",
        label: "Approval Queue",
        icon: Security,
        permission: ["crm.quote.approve", "crm.invoice.approve", "crm.sales_order.approve"],
        matchPaths: ["/crm/approvals"],
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
        href: "/crm/efficiency",
        label: "Sales Efficiency",
        icon: Time,
        permission: "crm.access",
        matchPaths: ["/crm/efficiency"],
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
    id: "communication",
    href: "/communication",
    label: "Communication",
    icon: Notification,
    alwaysVisible: true,
    matchPaths: ["/communication"],
    items: [],
  },
  {
    id: "expense",
    href: "/expense",
    label: "Expense",
    icon: Report,
    alwaysVisible: true,
    matchPaths: ["/expense"],
    items: [],
  },
  {
    id: "cha",
    href: "/cha",
    label: "CHA",
    icon: Report,
    permission: "cha.access",
    matchPaths: ["/cha"],
    items: [
      {
        href: "/cha",
        label: "Dashboard",
        icon: Dashboard,
        permission: "cha.dashboard.view",
        matchPaths: ["/cha"],
      },
      {
        href: "/cha/jobs",
        label: "Jobs",
        icon: Task,
        permission: "cha.job.read",
        matchPaths: ["/cha/jobs"],
      },
      {
        href: "/cha/approvals",
        label: "Checklist Approvals",
        icon: Security,
        permission: "cha.checklist.manager_approve",
        matchPaths: ["/cha/approvals"],
      },
      {
        href: "/cha/expenses",
        label: "Expenses",
        icon: Report,
        permission: "cha.expense.manage",
        matchPaths: ["/cha/expenses"],
      },
      {
        href: "/cha/reports",
        label: "Reports",
        icon: Analytics,
        permission: "cha.audit.view",
        matchPaths: ["/cha/reports"],
      },
      {
        href: "/cha/settings",
        label: "Settings",
        icon: Settings,
        permission: "cha.settings.manage",
        matchPaths: ["/cha/settings"],
      },
    ],
  },
  {
    id: "accounting",
    href: "/accounting",
    label: "Accounting",
    icon: Analytics,
    permission: "accounting.dashboard.view",
    matchPaths: ["/accounting"],
    items: [
      {
        href: "/accounting",
        label: "Dashboard",
        icon: View,
        permission: "accounting.dashboard.view",
        matchPaths: ["/accounting"],
      },
      {
        href: "/accounting/accounts",
        label: "Chart of Accounts",
        icon: Folder,
        permission: "accounting.account.read",
        matchPaths: ["/accounting/accounts"],
      },
      {
        href: "/accounting/journal-entries",
        label: "Journal Entries",
        icon: DocumentAdd,
        permission: "accounting.journal.read",
        matchPaths: ["/accounting/journal-entries"],
      },
      {
        href: "/accounting/invoices-sales",
        label: "Invoices & Sales",
        icon: DocumentAdd,
        permission: "crm.invoice.manage",
        matchPaths: ["/accounting/invoices-sales"],
      },
      {
        href: "/accounting/sales-orders",
        label: "Sales Orders",
        icon: DocumentAdd,
        permission: "crm.invoice.manage",
        matchPaths: ["/accounting/sales-orders"],
      },
      {
        href: "/accounting/purchase-orders",
        label: "Purchase Orders",
        icon: DocumentAdd,
        permission: "crm.invoice.manage",
        matchPaths: ["/accounting/purchase-orders"],
      },
      {
        href: "/accounting/sales-invoices",
        label: "Sales Invoices",
        icon: DocumentAdd,
        permission: "accounting.invoice.read",
        matchPaths: ["/accounting/sales-invoices"],
      },
      {
        href: "/accounting/purchase-invoices",
        label: "Purchase Invoices",
        icon: DocumentAdd,
        permission: "accounting.invoice.read",
        matchPaths: ["/accounting/purchase-invoices"],
      },
      {
        href: "/accounting/payment-entries",
        label: "Payment Entries",
        icon: Time,
        permission: "accounting.payment.read",
        matchPaths: ["/accounting/payment-entries"],
      },
      {
        href: "/accounting/general-ledger",
        label: "General Ledger",
        icon: Report,
        permission: "accounting.reports.view",
        matchPaths: ["/accounting/general-ledger"],
      },
      {
        href: "/accounting/trial-balance",
        label: "Trial Balance",
        icon: Analytics,
        permission: "accounting.reports.view",
        matchPaths: ["/accounting/trial-balance"],
      },
      {
        href: "/accounting/profit-loss",
        label: "Profit & Loss",
        icon: Analytics,
        permission: "accounting.reports.view",
        matchPaths: ["/accounting/profit-loss"],
      },
      {
        href: "/accounting/balance-sheet",
        label: "Balance Sheet",
        icon: Analytics,
        permission: "accounting.reports.view",
        matchPaths: ["/accounting/balance-sheet"],
      },
      {
        href: "/accounting/items",
        label: "Items Master",
        icon: Folder,
        permission: "accounting.dashboard.view",
        matchPaths: ["/accounting/items"],
      },
      {
        href: "/accounting/settings",
        label: "Settings",
        icon: Settings,
        permission: "accounting.settings.manage",
        matchPaths: ["/accounting/settings"],
      },
    ],
  },
  {
    id: "recruit",
    href: "/hrms/recruit",
    label: "Recruit",
    icon: Search,
    permission: ["recruit.view", "recruit.jobseeker.use"],
    matchPaths: ["/hrms/recruit"],
    items: [
      {
        href: "/hrms/recruit",
        label: "Dashboard",
        icon: Dashboard,
        permission: ["recruit.view", "recruit.jobseeker.use"],
        matchPaths: ["/hrms/recruit"],
      },
      // Employer Workspace
      {
        href: "/hrms/recruit/employer",
        label: "Employer Dashboard",
        icon: Dashboard,
        permission: "recruit.dashboard.view",
        matchPaths: ["/hrms/recruit/employer"],
      },
      {
        href: "/hrms/recruit/employer/jobs",
        label: "Job Openings",
        icon: DocumentAdd,
        permission: "recruit.view",
        matchPaths: ["/hrms/recruit/employer/jobs"],
      },
      {
        href: "/hrms/recruit/employer/candidates",
        label: "Candidates",
        icon: Group,
        permission: "recruit.candidate.view",
        matchPaths: ["/hrms/recruit/employer/candidates"],
      },
      {
        href: "/hrms/recruit/employer/applications",
        label: "Applications",
        icon: Task,
        permission: "recruit.application.manage",
        matchPaths: ["/hrms/recruit/employer/applications"],
      },
      // Job Seeker Workspace
      {
        href: "/hrms/recruit/career",
        label: "Career Dashboard",
        icon: UserAvatar,
        permission: "recruit.jobseeker.use",
        matchPaths: ["/hrms/recruit/career"],
      },
      {
        href: "/hrms/recruit/career/profile",
        label: "My Career Profile",
        icon: UserAvatar,
        permission: "recruit.jobseeker.profile.manage",
        matchPaths: ["/hrms/recruit/career/profile"],
      },
      {
        href: "/hrms/recruit/career/jobs",
        label: "Job Search",
        icon: Search,
        permission: "recruit.jobseeker.jobs.search",
        matchPaths: ["/hrms/recruit/career/jobs"],
      },
      {
        href: "/hrms/recruit/career/resumes",
        label: "My Resumes",
        icon: DocumentAdd,
        permission: "recruit.jobseeker.resume.manage",
        matchPaths: ["/hrms/recruit/career/resumes"],
      },
      {
        href: "/hrms/recruit/career/applications",
        label: "My Applications",
        icon: Task,
        permission: "recruit.jobseeker.application.manage",
        matchPaths: ["/hrms/recruit/career/applications"],
      },
      {
        href: "/hrms/recruit/career/assistant",
        label: "Career Assistant",
        icon: Notification,
        permission: "recruit.jobseeker.use",
        matchPaths: ["/hrms/recruit/career/assistant"],
      },
      // Administration
      {
        href: "/hrms/recruit/settings",
        label: "Recruit Settings",
        icon: Settings,
        permission: "recruit.settings.manage",
        matchPaths: ["/hrms/recruit/settings"],
      },
      {
        href: "/hrms/recruit/audit",
        label: "Recruit Audit Log",
        icon: Security,
        permission: "recruit.audit.view",
        matchPaths: ["/hrms/recruit/audit"],
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
        href: "/admin",
        label: "Dashboard",
        icon: Dashboard,
        permission: "admin.org.manage",
        matchPaths: ["/admin"],
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
      {
        href: "/admin/google-chat",
        label: "Google Chat",
        icon: Group,
        permission: "admin.org.manage",
        matchPaths: ["/admin/google-chat"],
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
