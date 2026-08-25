import type { CarbonIconType } from "@carbon/icons-react";
import {
  Analytics,
  Calendar,
  Dashboard,
  DocumentAdd,
  Education,
  Group,
  Map,
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
const Folder = FolderIcon as unknown as CarbonIconType;
import type { Caps } from "@/lib/rbac";
import { isNavSectionEnabled } from "@/lib/app-edition";
import { ACCOUNTING_WORKSPACE_CATALOG } from "@/modules/accounting/workspace-catalog";
import {
  isFeatureEnabled,
  isSectionEnabled,
} from "@/modules/core/organisation/module-config";

export type SecondaryNavItem = {
  href: string;
  label: string;
  icon: CarbonIconType;
  sectionLabel?: string;
  description?: string;
  permission?: string | string[];
  hideFor?: string;
  featureId?: string;
  matchPaths?: string[];
  searchAliases?: string[];
};

export type PrimaryNavSection = {
  id: string;
  href: string;
  label: string;
  icon: CarbonIconType;
  alwaysVisible?: boolean;
  description?: string;
  permission?: string | string[];
  hideFor?: string;
  matchPaths?: string[];
  searchAliases?: string[];
  items: SecondaryNavItem[];
};

export type SearchCommandEntry = {
  id: string;
  href: string;
  label: string;
  description: string;
  icon: CarbonIconType;
  kind: "workspace" | "page";
  sectionId: string;
  sectionLabel: string;
  searchText: string;
};

export const NAV_SECTIONS: PrimaryNavSection[] = [
  {
    id: "dashboard",
    href: "/dashboard",
    label: "Dashboard",
    icon: Dashboard,
    alwaysVisible: true,
    description: "Open the shared Monolith dashboard and module command center.",
    searchAliases: ["home", "overview", "control center", "command center"],
    matchPaths: ["/dashboard"],
    items: [],
  },
  {
    id: "product-catalogue",
    href: "/product-catalogue",
    label: "Product Catalogue",
    icon: Report,
    alwaysVisible: true,
    description: "Browse Monolith capabilities, product flows, and operating models.",
    searchAliases: ["products", "catalog", "catalogue", "features"],
    matchPaths: ["/product-catalogue"],
    items: [],
  },
  {
    id: "todo",
    href: "/todo",
    label: "To-Do",
    icon: Task,
    alwaysVisible: true,
    description: "Track personal action items, tasks, and execution queues.",
    searchAliases: ["tasks", "task list", "todo", "follow up"],
    matchPaths: ["/todo"],
    items: [{ href: "/todo", label: "Tasks", icon: Task, matchPaths: ["/todo"] }],
  },
  {
    id: "notifications",
    href: "/notifications",
    label: "Notifications",
    icon: Notification,
    alwaysVisible: true,
    description: "Review alerts, updates, and cross-workspace activity.",
    searchAliases: ["alerts", "inbox", "updates"],
    matchPaths: ["/notifications"],
    items: [{ href: "/notifications", label: "Notification Center", icon: Notification, matchPaths: ["/notifications"] }],
  },
  {
    id: "hrms",
    href: "/hrms",
    label: "HRMS",
    icon: UserMultiple,
    description: "Manage employees, onboarding, approvals, letters, and HR operations.",
    searchAliases: ["people", "human resources", "employee management", "hr"],
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
      "hrms.tracking.admin",
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
        href: "/hrms/incentives",
        label: "Incentive Working",
        icon: Analytics,
        sectionLabel: "Incentive",
        permission: "hrms.salary.read",
        matchPaths: ["/hrms/incentives"],
      },
      {
        href: "/hrms/tracking",
        label: "Employee Tracking",
        icon: Analytics,
        matchPaths: ["/hrms/tracking"],
      },
      {
        href: "/hrms/location-tracking",
        label: "Location & Field Tracking",
        icon: Map,
        permission: "hrms.tracking.admin",
        matchPaths: ["/hrms/location-tracking"],
      },
      {
        href: "/hrms/on-duty-admin",
        label: "On-Duty Management",
        icon: Calendar,
        matchPaths: ["/hrms/on-duty-admin"],
      },
      {
        href: "/hrms/reimbursement",
        label: "Fuel Reimbursement",
        icon: Report,
        matchPaths: ["/hrms/reimbursement"],
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
    id: "payroll",
    href: "/payroll",
    label: "Payroll",
    icon: Analytics,
    description: "Run payroll, monitor employee compensation inputs, manage compliance, and hand approved payroll into Accounting.",
    searchAliases: ["salary", "pay runs", "payslips", "payroll compliance", "net pay"],
    permission: [
      "hrms.salary.read",
      "hrms.salary.manage",
      "accounting.integration.post",
      "accounting.post",
    ],
    matchPaths: ["/payroll"],
    items: [
      {
        href: "/payroll",
        label: "Dashboard",
        icon: Dashboard,
        matchPaths: ["/payroll"],
      },
      {
        href: "/payroll/employees",
        label: "Employees",
        icon: Group,
        matchPaths: ["/payroll/employees", "/payroll/compensation", "/payroll/payslips"],
      },
      {
        href: "/payroll/pay-runs",
        label: "Pay Runs",
        icon: Time,
        matchPaths: ["/payroll/pay-runs", "/payroll/inputs", "/payroll/payments"],
      },
      {
        href: "/payroll/approvals",
        label: "Approvals",
        icon: Notification,
        matchPaths: ["/payroll/approvals"],
      },
      {
        href: "/payroll/loans",
        label: "Loans",
        icon: Report,
        matchPaths: ["/payroll/loans"],
      },
      {
        href: "/payroll/taxes-and-forms",
        label: "Taxes & Forms",
        icon: Security,
        matchPaths: ["/payroll/taxes-and-forms", "/payroll/compliance"],
      },
      {
        href: "/payroll/reports",
        label: "Reports",
        icon: Report,
        matchPaths: ["/payroll/reports"],
      },
      {
        href: "/payroll/settings",
        label: "Settings",
        icon: Settings,
        matchPaths: ["/payroll/settings"],
      },
    ],
  },
  {
    id: "attendance",
    href: "/attendance",
    label: "Attendance",
    icon: Calendar,
    description: "Handle punches, leaves, overtime, timesheets, and attendance reporting.",
    searchAliases: ["leave", "leaves", "timesheet", "overtime", "punch"],
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
      {
        href: "/attendance/settings",
        label: "Settings",
        icon: Settings,
        permission: "attendance.punch.manage",
        matchPaths: ["/attendance/settings"],
      },
    ],
  },
  {
    id: "ams",
    href: "/ams",
    label: "AMS",
    icon: Folder,
    description: "Run appraisals, cycles, criteria, KPI tracking, and performance reviews.",
    searchAliases: ["appraisal", "performance review", "okr", "kpi"],
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
      {
        href: "/ams/settings",
        label: "Settings",
        icon: Settings,
        permission: [
          "ams.appraisal.assign_reviewers",
          "ams.cycle.manage",
          "ams.criteria.manage",
        ],
        matchPaths: ["/ams/settings"],
      },
    ],
  },
  {
    id: "lms",
    href: "/lms",
    label: "LMS",
    icon: Education,
    description: "Manage learning content, assignments, courses, and reports.",
    searchAliases: ["learning", "training", "courses"],
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
      {
        href: "/lms/settings",
        label: "Settings",
        icon: Settings,
        matchPaths: ["/lms/settings"],
      },
    ],
  },
  {
    id: "crm",
    href: "/crm/dashboard",
    label: "CRM",
    icon: Analytics,
    description: "Manage leads, enquiries, customers, deals, quotes, tickets, and projects.",
    searchAliases: ["sales", "customer", "pipeline", "quotes", "tickets"],
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
        href: "/crm/freight-forwarding",
        label: "Freight Forwarding",
        icon: Folder,
        permission: "crm.lead.read",
        matchPaths: ["/crm/freight-forwarding"],
      },
      {
        href: "/crm/customs-clearance",
        label: "Customs Clearance",
        icon: Folder,
        permission: "crm.lead.read",
        matchPaths: ["/crm/customs-clearance"],
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
        href: "/crm/masters",
        label: "Masters",
        icon: Settings,
        permission: "crm.access",
        matchPaths: ["/crm/masters"],
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
        href: "/crm/incentives",
        label: "Incentives",
        icon: Analytics,
        permission: "crm.access",
        matchPaths: ["/crm/incentives"],
      },
      {
        href: "/crm/lead-sources",
        label: "Lead Sources",
        icon: Settings,
        permission: "crm.leadSource.read",
        matchPaths: ["/crm/lead-sources"],
      },
      {
        href: "/crm/settings",
        label: "Settings",
        icon: Settings,
        permission: "crm.access",
        matchPaths: ["/crm/settings"],
      },
    ],
  },
  {
    id: "freight-forwarding",
    href: "/freight-forwarding",
    label: "Freight Forwarding",
    icon: Folder,
    description: "Handle freight workflows, MBL/HBL records, and shipment processing.",
    searchAliases: ["shipment", "logistics", "forwarding", "mbl", "hbl"],
    matchPaths: ["/freight-forwarding"],
    items: [
      {
        href: "/freight-forwarding",
        label: "Workspace Home",
        icon: Dashboard,
        matchPaths: ["/freight-forwarding"],
      },
      {
        href: "/freight-forwarding/process",
        label: "Process",
        icon: Task,
        matchPaths: ["/freight-forwarding/process"],
      },
      {
        href: "/freight-forwarding/mbl",
        label: "MBL",
        icon: Task,
        matchPaths: ["/freight-forwarding/mbl"],
      },
      {
        href: "/freight-forwarding/hbl",
        label: "HBL",
        icon: Task,
        matchPaths: ["/freight-forwarding/hbl"],
      },
      {
        href: "/freight-forwarding/settings",
        label: "Settings",
        icon: Settings,
        matchPaths: ["/freight-forwarding/settings"],
      },
    ],
  },

  {
    id: "expense",
    href: "/expense",
    label: "Expense",
    icon: Report,
    alwaysVisible: true,
    description: "Review expense operations and related operational controls.",
    searchAliases: ["expenses", "claims", "spend"],
    matchPaths: ["/expense"],
    items: [],
  },
  {
    id: "cha",
    href: "/cha",
    label: "CHA",
    icon: Report,
    description: "Operate customs house agent workflows, jobs, expenses, and approvals.",
    searchAliases: ["customs", "clearance", "job filing", "cha"],
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
        href: "/cha/process",
        label: "Process",
        icon: Task,
        permission: "cha.job.read",
        matchPaths: ["/cha/process"],
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
        href: "/cha/customers",
        label: "Customers",
        icon: UserMultiple,
        permission: "cha.customer.read",
        matchPaths: ["/cha/customers"],
      },
      {
        href: "/cha/settings",
        label: "Settings",
        icon: Settings,
        permission: "cha.settings.manage",
        matchPaths: ["/cha/settings"],
      },
      {
        href: "/cha/labs/import-job-creation",
        label: "Labs",
        icon: Search,
        permission: "cha.access",
        featureId: "cha-labs",
        matchPaths: ["/cha/labs/import-job-creation"],
      },
    ],
  },
  {
    id: "accounting",
    href: "/accounting",
    label: "Accounting",
    icon: Analytics,
    description: "Run accounting operations, ledgers, journals, banking, approvals, and reports.",
    searchAliases: ["finance", "ledger", "journal", "banking", "invoices"],
    permission: [
      "accounting.dashboard.view",
      "accounting.document.read",
      "accounting.document.approve",
      "accounting.payment.read",
      "accounting.payment.approve",
      "accounting.ledger.read",
      "accounting.journal.read",
      "accounting.audit.read",
      "accounting.account.read",
      "accounting.reports.view",
      "accounting.sales-invoice.prepare",
      "accounting.purchase-invoice.prepare",
      "accounting.receipt.prepare",
      "accounting.payment.prepare",
      "accounting.payment.allocate",
      "accounting.credit-note.prepare",
      "accounting.debit-note.prepare",
      "accounting.recurring-template.admin",
      "accounting.recurring-occurrence.process",
      "accounting.depreciation.integrate",
      "accounting.partner-transaction.prepare",
      "accounting.integration.manual-review",
      "accounting.outbox.retry",
      "accounting.outbox.manual-review",
      "accounting.capability-policy.read",
      "accounting.capability-policy.manage",
      "accounting.capability-policy.approve",
      "accounting.settings.manage",
      "accounting.period_lock.request",
      "accounting.exchange_rate.maintain",
      "accounting.number_series.admin",
      "accounting.approval_policy.admin",
      "accounting.rounding_policy.admin",
      "crm.invoice.manage",
    ],
    matchPaths: ["/accounting"],
    items: ACCOUNTING_WORKSPACE_CATALOG,
  },
  {
    id: "recruit",
    href: "/hrms/recruit",
    label: "Recruit",
    icon: Search,
    description: "Manage hiring, applications, candidates, and job-seeker workflows.",
    searchAliases: ["recruitment", "careers", "jobs", "candidates", "hiring"],
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
    id: "communication",
    href: "/communication",
    label: "Communication",
    icon: Group,
    alwaysVisible: true,
    description: "Access mail, chat, meetings, job spaces, drive, and calendar tools.",
    searchAliases: ["mail", "chat", "calendar", "meetings", "drive"],
    matchPaths: ["/communication"],
    items: [
      {
        href: "/communication",
        label: "Workspace Home",
        icon: Dashboard,
        matchPaths: ["/communication"],
      },
      {
        href: "/communication/mail",
        label: "Mail",
        icon: Notification,
        matchPaths: ["/communication/mail"],
      },
      {
        href: "/communication/chat",
        label: "Chat",
        icon: UserMultiple,
        matchPaths: ["/communication/chat"],
      },
      {
        href: "/communication/job-spaces",
        label: "Job Spaces",
        icon: Group,
        matchPaths: ["/communication/job-spaces"],
      },
      {
        href: "/communication/meetings",
        label: "Meetings",
        icon: Time,
        matchPaths: ["/communication/meetings"],
      },
      {
        href: "/communication/calendar",
        label: "Calendar",
        icon: Calendar,
        matchPaths: ["/communication/calendar"],
      },
      {
        href: "/communication/drive",
        label: "Job Drive",
        icon: Folder,
        matchPaths: ["/communication/drive"],
      },
      {
        href: "/communication/search",
        label: "Search",
        icon: Search,
        matchPaths: ["/communication/search"],
      },
      {
        href: "/communication/settings",
        label: "Settings",
        icon: Settings,
        matchPaths: ["/communication/settings"],
      },
    ],
  },
  {
    id: "admin",
    href: "/admin",
    label: "Admin",
    icon: Security,
    description: "Manage roles, sessions, settings, notifications, and platform controls.",
    searchAliases: ["administration", "settings", "roles", "permissions", "system"],
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
        href: "/admin/design-system",
        label: "Design System",
        icon: View,
        permission: "admin.org.manage",
        matchPaths: ["/admin/design-system"],
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

export function getVisibleSections(
  caps: Caps,
  enabledSectionIds?: Iterable<string>,
  enabledFeatureIds?: Iterable<string>,
) {
  return NAV_SECTIONS.map((section) => {
    const visibleItems = section.items.filter(
      (item) =>
        isVisible(caps, item.permission, item.hideFor) &&
        isFeatureEnabled(item.featureId, enabledFeatureIds),
    );
    return { ...section, items: visibleItems };
  }).filter((section) => {
    if (!isNavSectionEnabled(section.id)) return false;
    if (!isSectionEnabled(section.id, enabledSectionIds)) return false;
    const canSeeSection = isVisible(caps, section.permission, section.hideFor);
    if (section.alwaysVisible) return true;
    return section.items.length > 0 || Boolean(section.permission && canSeeSection);
  });
}

export function getVisibleSectionById(
  caps: Caps,
  id: string,
  enabledSectionIds?: Iterable<string>,
  enabledFeatureIds?: Iterable<string>,
) {
  return (
    getVisibleSections(caps, enabledSectionIds, enabledFeatureIds).find(
      (section) => section.id === id,
    ) ?? null
  );
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function buildSearchText(parts: Array<string | undefined>) {
  return normalizeSearchText(parts.filter(Boolean).join(" "));
}

export function getSearchCommandEntries(
  caps: Caps,
  enabledSectionIds?: Iterable<string>,
  enabledFeatureIds?: Iterable<string>,
) {
  const visibleSections = getVisibleSections(caps, enabledSectionIds, enabledFeatureIds);

  return visibleSections.flatMap((section) => {
    const workspaceEntry: SearchCommandEntry = {
      id: `workspace:${section.id}`,
      href: section.href,
      label: section.label,
      description:
        section.description ??
        (section.items.length > 0
          ? `${section.items.length} role-visible page${section.items.length === 1 ? "" : "s"}`
          : "Open workspace"),
      icon: section.icon,
      kind: "workspace",
      sectionId: section.id,
      sectionLabel: section.label,
      searchText: buildSearchText([
        section.label,
        section.description,
        ...(section.searchAliases ?? []),
        section.href,
      ]),
    };

    const pageEntries = section.items.map<SearchCommandEntry>((item) => ({
      id: `page:${section.id}:${item.href}`,
      href: item.href,
      label: item.label,
      description:
        item.description ??
        item.sectionLabel ??
        `${section.label} workspace`,
      icon: item.icon,
      kind: "page",
      sectionId: section.id,
      sectionLabel: section.label,
      searchText: buildSearchText([
        item.label,
        item.description,
        item.sectionLabel,
        section.label,
        section.description,
        ...(item.searchAliases ?? []),
        ...(section.searchAliases ?? []),
        item.href,
        ...(item.matchPaths ?? []),
      ]),
    }));

    return [workspaceEntry, ...pageEntries];
  });
}

export function rankSearchCommandEntries(entries: SearchCommandEntry[], query: string) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return entries;

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);

  return entries
    .map((entry) => {
      const label = normalizeSearchText(entry.label);
      const description = normalizeSearchText(entry.description);
      let score = 0;

      if (label === normalizedQuery) score += 500;
      if (label.startsWith(normalizedQuery)) score += 300;
      if (entry.href.toLowerCase() === query.trim().toLowerCase()) score += 280;

      for (const token of tokens) {
        if (label.includes(token)) score += 80;
        if (description.includes(token)) score += 32;
        if (entry.searchText.includes(token)) score += 16;
      }

      if (entry.kind === "page") score += 12;

      return { entry, score };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (left.entry.kind !== right.entry.kind) return left.entry.kind === "page" ? -1 : 1;
      return left.entry.label.localeCompare(right.entry.label);
    })
    .map((candidate) => candidate.entry);
}
