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
    title: "HRMS command centre",
    description:
      "Employees, organisation, payroll, hiring, requests, and workforce services in one operational workspace.",
  },
  "/hrms/approvals": {
    eyebrow: "Workflow",
    title: "Approvals central",
    description:
      "Review and action employee, attendance, travel, reimbursement, and people-service requests.",
    icon: ClipboardCheck,
  },
  "/hrms/employees": {
    eyebrow: "People directory",
    title: "Employees",
    description:
      "Find employee records, reporting relationships, organisation assignments, and access details.",
    icon: IdCard,
  },
  "/hrms/employees/new": {
    eyebrow: "People directory",
    title: "Onboard employee",
    description:
      "Create the employee record, organisation placement, employment details, and initial access.",
    icon: UserRoundPlus,
  },
  "/hrms/files": {
    eyebrow: "Documents",
    title: "HR document drive",
    description:
      "Use private employee folders, controlled reporting folders, and organisation-wide company files backed by the Shared Drive.",
    icon: FolderKanban,
  },
  "/hrms/helpdesk": {
    eyebrow: "People services",
    title: "HR help desk",
    description:
      "Raise and track confidential HR questions through the shared service workflow.",
    icon: HelpCircle,
  },
  "/hrms/incentives": {
    eyebrow: "Compensation operations",
    title: "Incentive working",
    description:
      "Review CRM-submitted incentive entries and process approval, rejection, and payout decisions.",
    icon: BadgeCheck,
  },
  "/hrms/letters": {
    eyebrow: "Documents",
    title: "Employee letters",
    description:
      "Generate, review, and issue controlled employee correspondence.",
    icon: FileText,
  },
  "/hrms/onboarding": {
    eyebrow: "Employee lifecycle",
    title: "Onboarding",
    description:
      "Coordinate new-joiner checklists, owners, due dates, and completion.",
    icon: UserRoundPlus,
  },
  "/hrms/on-duty-admin": {
    eyebrow: "Attendance workflow",
    title: "On-duty administration",
    description:
      "Review field-duty requests and preserve the employee attendance trail.",
    icon: MapPinned,
  },
  "/hrms/org-structure": {
    eyebrow: "Organisation",
    title: "Organisation structure",
    description:
      "Maintain branches, departments, divisions, and their operational hierarchy.",
    icon: Network,
  },
  "/hrms/ownership": {
    eyebrow: "Organisation",
    title: "Ownership and reporting",
    description:
      "Assign organisational owners, managers, team leads, and employee reporting lines.",
    icon: Building2,
  },
  "/hrms/payroll": {
    eyebrow: "Compensation",
    title: "Payroll batches",
    description:
      "Prepare payroll periods, validate employee pay, and monitor processing outcomes.",
    icon: ReceiptIndianRupee,
  },
  "/hrms/reimbursement": {
    eyebrow: "Employee finance",
    title: "Reimbursements",
    description:
      "Review employee expense claims, supporting records, and approval decisions.",
    icon: HandCoins,
  },
  "/hrms/salary-revisions": {
    eyebrow: "Compensation",
    title: "Salary revisions",
    description:
      "Review current compensation and maintain an auditable revision history.",
    icon: ReceiptIndianRupee,
  },
  "/hrms/salary-structure": {
    eyebrow: "Compensation",
    title: "Salary structure",
    description:
      "Configure employee earnings, deductions, statutory values, and payroll metadata.",
    icon: ReceiptIndianRupee,
  },
  "/hrms/settings": {
    eyebrow: "Configuration",
    title: "HRMS settings",
    description:
      "Control people-service availability and organisation-wide HRMS behavior.",
    icon: Settings2,
  },
  "/hrms/tasks": {
    eyebrow: "People services",
    title: "Task checklists",
    description:
      "Coordinate recurring and employee-specific HR work with clear ownership.",
    icon: ClipboardCheck,
  },
  "/hrms/tracking": {
    eyebrow: "Workforce location",
    title: "GPS tracking",
    description:
      "Review authorised workforce location activity, visits, and field movement.",
    icon: MapPinned,
  },
  "/hrms/travel": {
    eyebrow: "Employee services",
    title: "Travel and expenses",
    description:
      "Manage employee travel requests, itineraries, expenses, and approvals.",
    icon: Plane,
  },
  "/hrms/users": {
    eyebrow: "Access control",
    title: "Employee user control",
    description:
      "Enable or suspend employee sign-in while preserving the underlying employee record.",
    icon: ShieldCheck,
  },
  "/hrms/work-reports": {
    eyebrow: "Workforce reporting",
    title: "Work reports",
    description:
      "Review daily work submissions, progress, and manager feedback.",
    icon: FileText,
  },
  "/hrms/recruit": {
    eyebrow: "Talent acquisition",
    title: "Recruitment",
    description:
      "Run employer hiring workflows and employee career experiences from a private workspace.",
    icon: BriefcaseBusiness,
  },
  "/hrms/recruit/audit": {
    eyebrow: "Talent acquisition",
    title: "Recruitment audit",
    description:
      "Inspect security and workflow events across recruitment activity.",
    icon: ShieldCheck,
  },
  "/hrms/recruit/employer": {
    eyebrow: "Employer workspace",
    title: "Hiring dashboard",
    description:
      "Track active jobs, applications, candidates, and hiring progress.",
    icon: Gauge,
  },
  "/hrms/recruit/employer/applications": {
    eyebrow: "Employer workspace",
    title: "Applications",
    description:
      "Review applications, screening stages, and candidate decisions.",
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
    description:
      "Manage openings, publishing state, hiring owners, and application flow.",
    icon: BriefcaseBusiness,
  },
  "/hrms/recruit/employer/jobs/new": {
    eyebrow: "Employer workspace",
    title: "Create job opening",
    description:
      "Define a role, hiring requirements, visibility, and application window.",
    icon: BriefcaseBusiness,
  },
  "/hrms/recruit/career": {
    eyebrow: "Private career workspace",
    title: "Career dashboard",
    description:
      "Explore internal opportunities and manage private applications and career records.",
    icon: BriefcaseBusiness,
  },
  "/hrms/recruit/career/applications": {
    eyebrow: "Private career workspace",
    title: "My applications",
    description:
      "Track application progress and withdraw eligible submissions.",
    icon: ClipboardCheck,
  },
  "/hrms/recruit/career/assistant": {
    eyebrow: "Private career workspace",
    title: "Career assistant",
    description:
      "Use role and profile context to prepare for internal opportunities.",
    icon: BadgeCheck,
  },
  "/hrms/recruit/career/jobs": {
    eyebrow: "Private career workspace",
    title: "Available jobs",
    description:
      "Browse published internal openings and start a private application.",
    icon: BriefcaseBusiness,
  },
  "/hrms/recruit/career/profile": {
    eyebrow: "Private career workspace",
    title: "Career profile",
    description:
      "Maintain private skills, preferences, experience, and readiness information.",
    icon: IdCard,
  },
  "/hrms/recruit/career/resumes": {
    eyebrow: "Private career workspace",
    title: "Resumes",
    description:
      "Maintain private resume versions used for internal applications.",
    icon: FileText,
  },
  "/hrms/recruit/settings": {
    eyebrow: "Talent acquisition",
    title: "Recruitment settings",
    description:
      "Configure hiring policies, privacy controls, retention, and career-workspace behavior.",
    icon: Settings2,
  },
  "/attendance": {
    eyebrow: "Workforce time",
    title: "Attendance command centre",
    description:
      "Punches, leave, overtime, shifts, biometric sync, and monthly workforce reporting.",
    icon: CalendarClock,
  },
  "/attendance/biometric-sync": {
    eyebrow: "Attendance integration",
    title: "Biometric sync",
    description:
      "Synchronise attendance-device records, inspect mappings, and resolve import exceptions.",
    icon: Fingerprint,
  },
  "/attendance/leaves": {
    eyebrow: "Leave workflow",
    title: "Leave management",
    description:
      "Submit leave, review balances, and action requests within the employee permission model.",
    icon: CalendarClock,
  },
  "/attendance/ot": {
    eyebrow: "Attendance operations",
    title: "Overtime and shifts",
    description:
      "Review overtime, working calendars, shifts, LOP, holidays, imports, and monthly processing.",
    icon: Clock3,
  },
  "/attendance/punch": {
    eyebrow: "Attendance operations",
    title: "Punch clock",
    description:
      "Record authorised attendance with biometric and GPS-aware operational context.",
    icon: Clock3,
  },
  "/attendance/reports": {
    eyebrow: "Attendance reporting",
    title: "Monthly attendance report",
    description:
      "Review employee presence totals for a selected payroll month.",
    icon: FileText,
  },
  "/attendance/settings": {
    eyebrow: "Attendance configuration",
    title: "Attendance settings",
    description:
      "Review attendance policy controls, processing workspaces, and integration touchpoints.",
    icon: Settings2,
  },
  "/attendance/timesheets": {
    eyebrow: "Workforce time",
    title: "Timesheets",
    description:
      "Weekly submission and approval will live in this operational workspace.",
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
      description:
        "Review employment, organisation, contact, reporting, and compensation records.",
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

  return (
    <WorkspacePage className="mnx-people-page" data-people-workspace="true">
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

export function PeopleSummary({
  detail,
  icon,
  label,
  value,
}: {
  detail?: ReactNode;
  icon?: ReactNode;
  label: ReactNode;
  value: ReactNode;
}) {
  return (
    <article className="mnx-people-summary">
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
