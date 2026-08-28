"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  AlertTriangle,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  ClipboardCheck,
  Clock3,
  FileText,
  Fingerprint,
  FolderKanban,
  Gauge,
  HandCoins,
  HelpCircle,
  IdCard,
  LoaderCircle,
  MapPinned,
  Network,
  Plane,
  ReceiptIndianRupee,
  Settings2,
  ShieldCheck,
  UserRoundPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import type {
  HTMLAttributes,
  ReactNode,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";
import {
  WorkspaceAction,
  WorkspaceBadge,
  WorkspaceEmptyTableRow,
  WorkspaceField,
  WorkspaceInput,
  WorkspacePage,
  WorkspacePageHeader,
  WorkspacePanel,
  WorkspacePanelHeader,
  WorkspaceSelect,
  WorkspaceState,
  WorkspaceTextarea,
} from "@/components/layout/workspace";

type PeopleRouteMeta = {
  eyebrow: string;
  title: string;
  description: string;
  icon?: LucideIcon;
};

const exactRouteMeta: Record<string, PeopleRouteMeta> = {
  "/hrms": {
    eyebrow: "People operations",
    title: "HRMS",
    description: "Employees, hiring, payroll, and people services.",
  },
  "/hrms/approvals": {
    eyebrow: "Workflow",
    title: "Approvals",
    description: "Review employee and people-service requests.",
    icon: ClipboardCheck,
  },
  "/hrms/employees": {
    eyebrow: "People directory",
    title: "Employees",
    description: "Find employee records and reporting lines.",
    icon: IdCard,
  },
  "/hrms/employees/new": {
    eyebrow: "People directory",
    title: "Onboard employee",
    description: "Create a new employee record.",
    icon: UserRoundPlus,
  },
  "/hrms/files": {
    eyebrow: "Documents",
    title: "HR document drive",
    description: "Access employee and company files.",
    icon: FolderKanban,
  },
  "/hrms/helpdesk": {
    eyebrow: "People services",
    title: "HR and IT service desk",
    description: "Track HR and IT support requests.",
    icon: HelpCircle,
  },
  "/hrms/incentives": {
    eyebrow: "Compensation operations",
    title: "Incentive approvals",
    description: "Review incentive claims and payout status.",
    icon: BadgeCheck,
  },
  "/hrms/letters": {
    eyebrow: "Documents",
    title: "Employee letters",
    description: "Create and issue employee letters.",
    icon: FileText,
  },
  "/hrms/onboarding": {
    eyebrow: "Employee lifecycle",
    title: "Onboarding",
    description: "Track new-joiner onboarding tasks.",
    icon: UserRoundPlus,
  },
  "/hrms/on-duty-admin": {
    eyebrow: "Attendance workflow",
    title: "On-duty control room",
    description: "Manage field-duty requests, live trips, and claims.",
    icon: MapPinned,
  },
  "/hrms/org-structure": {
    eyebrow: "Organisation",
    title: "Organisation structure",
    description: "Manage branches, departments, and hierarchy.",
    icon: Network,
  },
  "/hrms/ownership": {
    eyebrow: "Organisation",
    title: "Ownership and reporting",
    description: "Manage owners, managers, and reporting lines.",
    icon: Building2,
  },
  "/hrms/payroll": {
    eyebrow: "Compensation",
    title: "Payroll operations",
    description: "Review payroll inputs and runs.",
    icon: ReceiptIndianRupee,
  },
  "/hrms/reimbursement": {
    eyebrow: "Employee finance",
    title: "Reimbursements",
    description: "Review employee expense claims.",
    icon: HandCoins,
  },
  "/hrms/salary-revisions": {
    eyebrow: "Compensation",
    title: "Salary revisions",
    description: "Track compensation changes.",
    icon: ReceiptIndianRupee,
  },
  "/hrms/salary-structure": {
    eyebrow: "Compensation",
    title: "Salary structure",
    description: "Manage earnings, deductions, and statutory values.",
    icon: ReceiptIndianRupee,
  },
  "/hrms/settings": {
    eyebrow: "Configuration",
    title: "HRMS settings",
    description: "Manage HRMS settings and availability.",
    icon: Settings2,
  },
  "/hrms/tasks": {
    eyebrow: "People services",
    title: "Task checklists",
    description: "Track recurring and employee HR tasks.",
    icon: ClipboardCheck,
  },
  "/hrms/tracking": {
    eyebrow: "Workforce location",
    title: "GPS tracking",
    description: "Review workforce location activity.",
    icon: MapPinned,
  },
  "/hrms/travel": {
    eyebrow: "Employee services",
    title: "Travel and expenses",
    description: "Manage travel requests and expenses.",
    icon: Plane,
  },
  "/hrms/users": {
    eyebrow: "Access control",
    title: "Employee user control",
    description: "Manage employee sign-in access.",
    icon: ShieldCheck,
  },
  "/hrms/work-reports": {
    eyebrow: "Workforce reporting",
    title: "Work reports",
    description: "Review daily work submissions.",
    icon: FileText,
  },
  "/hrms/recruit": {
    eyebrow: "Talent acquisition",
    title: "Recruitment",
    description: "Manage hiring and internal career flows.",
    icon: BriefcaseBusiness,
  },
  "/hrms/recruit/audit": {
    eyebrow: "Talent acquisition",
    title: "Recruitment audit",
    description: "Review recruitment activity and audits.",
    icon: ShieldCheck,
  },
  "/hrms/recruit/employer": {
    eyebrow: "Employer workspace",
    title: "Hiring dashboard",
    description: "Track jobs, applications, and progress.",
    icon: Gauge,
  },
  "/hrms/recruit/employer/applications": {
    eyebrow: "Employer workspace",
    title: "Applications",
    description: "Review applications and decisions.",
    icon: ClipboardCheck,
  },
  "/hrms/recruit/employer/candidates": {
    eyebrow: "Employer workspace",
    title: "Candidates",
    description: "Maintain the candidate pipeline and private hiring records.",
    icon: Users,
  },
  "/hrms/recruit/employer/candidates/new": {
    eyebrow: "Employer workspace",
    title: "Add candidate",
    description: "Create a candidate record for a controlled hiring workflow.",
    icon: UserRoundPlus,
  },
  "/hrms/recruit/employer/jobs": {
    eyebrow: "Employer workspace",
    title: "Job openings",
    description: "Manage openings and hiring owners.",
    icon: BriefcaseBusiness,
  },
  "/hrms/recruit/employer/jobs/new": {
    eyebrow: "Employer workspace",
    title: "Create job opening",
    description: "Create a new job opening.",
    icon: BriefcaseBusiness,
  },
  "/hrms/recruit/career": {
    eyebrow: "Private career workspace",
    title: "Career dashboard",
    description: "Explore internal roles and applications.",
    icon: BriefcaseBusiness,
  },
  "/hrms/recruit/career/applications": {
    eyebrow: "Private career workspace",
    title: "My applications",
    description: "Track your application progress.",
    icon: ClipboardCheck,
  },
  "/hrms/recruit/career/assistant": {
    eyebrow: "Private career workspace",
    title: "Career assistant",
    description: "Prepare for internal opportunities.",
    icon: BadgeCheck,
  },
  "/hrms/recruit/career/jobs": {
    eyebrow: "Private career workspace",
    title: "Available jobs",
    description: "Browse internal openings.",
    icon: BriefcaseBusiness,
  },
  "/hrms/recruit/career/profile": {
    eyebrow: "Private career workspace",
    title: "Career profile",
    description: "Manage skills and career preferences.",
    icon: IdCard,
  },
  "/hrms/recruit/career/resumes": {
    eyebrow: "Private career workspace",
    title: "Resumes",
    description: "Manage resume versions.",
    icon: FileText,
  },
  "/hrms/recruit/settings": {
    eyebrow: "Talent acquisition",
    title: "Recruitment settings",
    description: "Manage hiring and privacy settings.",
    icon: Settings2,
  },
  "/attendance": {
    eyebrow: "Workforce time",
    title: "Attendance",
    description: "Time, leave, overtime, and shifts.",
    icon: CalendarClock,
  },
  "/attendance/biometric-sync": {
    eyebrow: "Attendance integration",
    title: "Biometric sync",
    description: "Sync device records and resolve imports.",
    icon: Fingerprint,
  },
  "/attendance/leaves": {
    eyebrow: "Leave workflow",
    title: "Leave management",
    description: "Review leave balances and requests.",
    icon: CalendarClock,
  },
  "/attendance/ot": {
    eyebrow: "Attendance operations",
    title: "Overtime and shifts",
    description: "Manage overtime, calendars, and shifts.",
    icon: Clock3,
  },
  "/attendance/punch": {
    eyebrow: "Attendance operations",
    title: "Punch clock",
    description: "Record attendance punches.",
    icon: Clock3,
  },
  "/attendance/reports": {
    eyebrow: "Attendance reporting",
    title: "Monthly attendance report",
    description: "Review monthly attendance totals.",
    icon: FileText,
  },
  "/attendance/settings": {
    eyebrow: "Attendance configuration",
    title: "Attendance settings",
    description: "Manage attendance settings and policies.",
    icon: Settings2,
  },
  "/attendance/timesheets": {
    eyebrow: "Workforce time",
    title: "Timesheets",
    description: "Submit and review timesheets.",
    icon: CalendarClock,
  },
};

function normalizePathname(pathname: string | null) {
  if (!pathname) return "/";
  const normalized = pathname.replace(/\/+$/, "");
  return normalized || "/";
}

export function getPeopleRouteMeta(pathname: string | null): PeopleRouteMeta {
  const path = normalizePathname(pathname);
  const exact = exactRouteMeta[path];
  if (exact) return exact;

  if (/^\/hrms\/employees\/[^/]+$/.test(path)) {
    return {
      eyebrow: "People directory",
      title: "Employee profile",
      description: "Review employment and reporting details.",
      icon: IdCard,
    };
  }

  if (/^\/hrms\/letters\/view\/[^/]+$/.test(path)) {
    return {
      eyebrow: "Controlled document",
      title: "Employee letter",
      description: "Review the issued document and its audit details.",
      icon: FileText,
    };
  }

  return path.startsWith("/attendance")
    ? exactRouteMeta["/attendance"]
    : exactRouteMeta["/hrms"];
}

export function PeopleWorkspaceFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const meta = getPeopleRouteMeta(pathname);
  const Icon = meta.icon;
  const normalizedPath = normalizePathname(pathname);
  const hideFrameHeader = normalizedPath === "/hrms/letters";
  const workspaceRoute =
    normalizedPath === "/hrms/work-reports" ? "work-reports" : undefined;

  return (
    <WorkspacePage
      className="mnx-people-page"
      data-people-route={workspaceRoute}
      data-people-workspace="true"
    >
      {hideFrameHeader ? null : (
        <WorkspacePageHeader
          className="mnx-people-page-header"
          eyebrow={meta.eyebrow}
          title={meta.title}
          description={meta.description}
          icon={Icon ? <Icon aria-hidden="true" /> : undefined}
        />
      )}
      <div className="mnx-people-content">{children}</div>
    </WorkspacePage>
  );
}

export function PeopleSummaryGrid({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <section className={cn("mnx-people-summary-grid", className)} {...props} />
  );
}

export type SemanticHue =
  | "primary"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "violet"
  | "orange"
  | "teal";

export function PeopleSummary({
  detail,
  hue,
  icon,
  label,
  value,
}: {
  detail?: ReactNode;
  /** Optional semantic colour. When set, overrides the KPI-strip rotation. */
  hue?: SemanticHue;
  icon?: ReactNode;
  label: ReactNode;
  value: ReactNode;
}) {
  return (
    <article className="mnx-people-summary" data-hue={hue}>
      <div className="mnx-people-summary-heading">
        {icon ? <span>{icon}</span> : null}
        <p>{label}</p>
      </div>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </article>
  );
}

export function PeopleSection({
  className,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <WorkspacePanel
      className={cn("mnx-people-section", className)}
      {...props}
    />
  );
}

export function PeopleSectionHeader({
  actions,
  description,
  eyebrow,
  title,
}: {
  actions?: ReactNode;
  description?: ReactNode;
  eyebrow?: string;
  title: ReactNode;
}) {
  return (
    <WorkspacePanelHeader
      className="mnx-people-section-header"
      eyebrow={eyebrow}
      title={title}
      description={description}
      actions={actions}
    />
  );
}

export function PeopleActionLink({
  children,
  className,
  href,
}: {
  children: ReactNode;
  className?: string;
  href: string;
}) {
  return (
    <ButtonLink className={className} href={href} variant="inverse">
      {children}
    </ButtonLink>
  );
}

export function PeopleRecordLink({
  children,
  href,
}: {
  children: ReactNode;
  href: string;
}) {
  return (
    <Link className="mnx-people-record-link" href={href}>
      {children}
    </Link>
  );
}

export function PeopleLinkGrid({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mnx-people-link-grid", className)} {...props} />;
}

export function PeopleLinkCard({
  description,
  href,
  icon,
  title,
}: {
  description: ReactNode;
  href: string;
  icon?: ReactNode;
  title: ReactNode;
}) {
  return (
    <Link className="mnx-people-link-card" href={href}>
      <span className="mnx-people-link-icon">
        {icon ?? <ArrowRight aria-hidden="true" />}
      </span>
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <ArrowRight className="mnx-people-link-arrow" aria-hidden="true" />
    </Link>
  );
}

export function PeopleTable({
  children,
  className,
  tableClassName,
  ...props
}: TableHTMLAttributes<HTMLTableElement> & {
  tableClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("mnx-people-table-shell", className)}>
      <div className="mnx-table-wrap">
        <table className={cn("mnx-workspace-table", tableClassName)} {...props}>
          {children}
        </table>
      </div>
    </div>
  );
}

export function PeopleTableHeader(
  props: HTMLAttributes<HTMLTableSectionElement>,
) {
  return <thead {...props} />;
}

export function PeopleTableBody(
  props: HTMLAttributes<HTMLTableSectionElement>,
) {
  return <tbody {...props} />;
}

export function PeopleTableRow({
  className,
  ...props
}: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("mnx-people-table-row", className)} {...props} />;
}

export function PeopleTableHead({
  className,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn("mnx-people-table-head", className)} {...props} />;
}

export function PeopleTableCell({
  className,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("mnx-people-table-cell", className)} {...props} />;
}

export function PeopleTableEmpty({
  colSpan,
  message,
}: {
  colSpan: number;
  message: ReactNode;
}) {
  return (
    <WorkspaceEmptyTableRow colSpan={colSpan}>{message}</WorkspaceEmptyTableRow>
  );
}

export function PeoplePerson({
  name,
  secondary,
}: {
  name: string;
  secondary?: ReactNode;
}) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?";

  return (
    <span className="mnx-people-person">
      <span aria-hidden="true">{initials}</span>
      <span>
        <strong>{name}</strong>
        {secondary ? <small>{secondary}</small> : null}
      </span>
    </span>
  );
}

export function PeopleTableToolbar({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mnx-people-toolbar", className)} {...props} />;
}

export function PeopleLoadingState({
  description = "Loading the latest people-operation data.",
}: {
  description?: string;
}) {
  return (
    <WorkspaceState
      variant="loading"
      eyebrow="People operations"
      title="Loading workspace"
      description={description}
      icon={<LoaderCircle className="mnx-state-spinner" aria-hidden="true" />}
    />
  );
}

export function PeopleErrorState({
  description,
  onRetry,
}: {
  description: string;
  onRetry?: () => void;
}) {
  return (
    <WorkspaceState
      variant="danger"
      eyebrow="People operations"
      title="This workspace could not be loaded"
      description={description}
      icon={<AlertTriangle aria-hidden="true" />}
      action={
        onRetry ? (
          <WorkspaceAction onClick={onRetry}>Try again</WorkspaceAction>
        ) : null
      }
    />
  );
}

export function PeopleNotice({
  action,
  description,
  eyebrow,
  icon,
  title,
}: {
  action?: ReactNode;
  description: ReactNode;
  eyebrow: string;
  icon: ReactNode;
  title: ReactNode;
}) {
  return (
    <WorkspaceState
      action={action}
      description={description}
      eyebrow={eyebrow}
      icon={icon}
      title={title}
      variant="empty"
    />
  );
}

export {
  WorkspaceAction as PeopleAction,
  WorkspaceBadge as PeopleStatus,
  WorkspaceField as PeopleField,
  WorkspaceInput as PeopleInput,
  WorkspaceSelect as PeopleSelect,
  WorkspaceTextarea as PeopleTextarea,
};
