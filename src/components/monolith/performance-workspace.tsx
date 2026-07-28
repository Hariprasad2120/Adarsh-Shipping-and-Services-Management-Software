"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  Archive,
  Award,
  BarChart3,
  BookOpen,
  CalendarClock,
  ClipboardCheck,
  FileClock,
  FileText,
  Gauge,
  GraduationCap,
  Layers3,
  LoaderCircle,
  PackageSearch,
  Sparkles,
  Target,
  UserCheck,
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
import * as React from "react";
import { cn } from "@/lib/utils";
import {
  WorkspaceAction,
  type WorkspaceActionProps,
  WorkspaceBadge,
  WorkspaceEmptyTableRow,
  WorkspaceField,
  WorkspacePage,
  WorkspacePageHeader,
  WorkspacePanel,
  WorkspacePanelHeader,
  WorkspaceProgress,
  WorkspaceSelect,
  WorkspaceState,
  WorkspaceTextarea,
} from "./workspace";

type PerformanceRouteMeta = {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

const exactRouteMeta: Record<string, PerformanceRouteMeta> = {
  "/ams": {
    eyebrow: "Performance operations",
    title: "Appraisal command centre",
    description:
      "Coordinate appraisal cycles, employee reviews, evaluation criteria, and performance outcomes.",
    icon: Gauge,
  },
  "/ams/appraisals": {
    eyebrow: "Appraisal operations",
    title: "Appraisals",
    description:
      "Assign, monitor, and advance employee appraisals through every controlled review stage.",
    icon: ClipboardCheck,
  },
  "/ams/assets": {
    eyebrow: "Asset operations",
    title: "Asset register",
    description:
      "Track company assets, assignments, depreciation, and service history.",
    icon: PackageSearch,
  },
  "/ams/criteria": {
    eyebrow: "Appraisal configuration",
    title: "Evaluation criteria",
    description:
      "Build the question, scoring, and reviewer structure used by appraisal forms.",
    icon: FileText,
  },
  "/ams/cycles": {
    eyebrow: "Appraisal configuration",
    title: "Appraisal cycles",
    description:
      "Create and maintain the annual periods that govern employee appraisals.",
    icon: CalendarClock,
  },
  "/ams/extensions": {
    eyebrow: "Appraisal operations",
    title: "Deadline extensions",
    description:
      "Request and decide controlled extensions without losing the appraisal audit trail.",
    icon: FileClock,
  },
  "/ams/history": {
    eyebrow: "Performance reporting",
    title: "Appraisal history",
    description:
      "Review completed cycles, scores, reviewer outcomes, and historical decisions.",
    icon: Archive,
  },
  "/ams/kpi": {
    eyebrow: "Performance configuration",
    title: "Department KPI",
    description:
      "Maintain department performance templates and evaluate measurable outcomes.",
    icon: BarChart3,
  },
  "/ams/my-appraisal": {
    eyebrow: "Personal performance",
    title: "My appraisal",
    description:
      "Track your active appraisal journey and complete assigned self-assessments.",
    icon: UserCheck,
  },
  "/ams/my-reviews": {
    eyebrow: "Reviewer workspace",
    title: "My reviews",
    description:
      "Complete assigned employee reviews and keep feedback moving before its deadline.",
    icon: Users,
  },
  "/ams/pms": {
    eyebrow: "Continuous performance",
    title: "Goals and feedback",
    description:
      "Maintain goals, skills, and constructive performance feedback between appraisal cycles.",
    icon: Target,
  },
  "/ams/slabs": {
    eyebrow: "Compensation configuration",
    title: "Increment slabs",
    description:
      "Maintain the grade and score bands used by controlled appraisal hike calculations.",
    icon: Layers3,
  },
  "/lms": {
    eyebrow: "Learning operations",
    title: "Learning command centre",
    description:
      "Discover training, manage enrolment, and track progress toward course completion.",
    icon: GraduationCap,
  },
  "/lms/courses": {
    eyebrow: "Learning catalogue",
    title: "Courses",
    description:
      "Browse available training and enrol in courses relevant to your role.",
    icon: BookOpen,
  },
  "/lms/my-learning": {
    eyebrow: "Personal learning",
    title: "My learning",
    description:
      "Continue enrolled courses and keep your completion progress current.",
    icon: GraduationCap,
  },
  "/lms/assignments": {
    eyebrow: "Learning operations",
    title: "Assignments",
    description:
      "Review assigned learning work and the courses attached to your role.",
    icon: ClipboardCheck,
  },
  "/lms/reports": {
    eyebrow: "Learning reporting",
    title: "Learning reports",
    description:
      "Review enrolment, progress, and completion signals from the learning catalogue.",
    icon: BarChart3,
  },
};

function normalizePathname(pathname: string | null) {
  if (!pathname) return "/";
  const normalized = pathname.replace(/\/+$/, "");
  return normalized || "/";
}

export function getPerformanceRouteMeta(
  pathname: string | null,
): PerformanceRouteMeta {
  const path = normalizePathname(pathname);
  const exact = exactRouteMeta[path];
  if (exact) return exact;

  if (/^\/ams\/appraisals\/assign\/[^/]+$/.test(path)) {
    return {
      eyebrow: "Appraisal setup",
      title: "Assign appraisal",
      description:
        "Confirm the employee schedule, reviewer group, and appraisal context before creation.",
      icon: UserCheck,
    };
  }

  if (/^\/ams\/appraisals\/[^/]+\/management-review$/.test(path)) {
    return {
      eyebrow: "Management review",
      title: "Management calibration",
      description:
        "Review submitted evidence, calibrate scores, and record the controlled management decision.",
      icon: Award,
    };
  }

  if (/^\/ams\/appraisals\/[^/]+$/.test(path)) {
    return {
      eyebrow: "Appraisal record",
      title: "Appraisal detail",
      description:
        "Review participants, evidence, stage progress, meetings, scores, and final outcomes.",
      icon: ClipboardCheck,
    };
  }

  if (/^\/ams\/my-appraisal\/[^/]+\/self-assessment$/.test(path)) {
    return {
      eyebrow: "Personal performance",
      title: "Self-assessment",
      description:
        "Record evidence and ratings against the active appraisal criteria before submission.",
      icon: Sparkles,
    };
  }

  if (/^\/ams\/my-reviews\/[^/]+$/.test(path)) {
    return {
      eyebrow: "Reviewer workspace",
      title: "Employee review",
      description:
        "Review employee evidence, record ratings, and submit feedback within your assigned role.",
      icon: Users,
    };
  }

  if (/^\/ams\/assets\/[^/]+$/.test(path)) {
    return {
      eyebrow: "Asset record",
      title: "Asset detail",
      description:
        "Review assignment, financial, depreciation, and service information for this asset.",
      icon: PackageSearch,
    };
  }

  return path.startsWith("/lms")
    ? exactRouteMeta["/lms"]
    : exactRouteMeta["/ams"];
}

export function PerformanceWorkspaceFrame({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const meta = getPerformanceRouteMeta(pathname);
  const Icon = meta.icon;

  return (
    <WorkspacePage
      className="mnx-performance-page"
      data-performance-workspace="true"
    >
      <WorkspacePageHeader
        className="mnx-performance-page-header"
        eyebrow={meta.eyebrow}
        title={meta.title}
        description={meta.description}
        icon={<Icon aria-hidden="true" />}
      />
      <div className="mnx-performance-content">{children}</div>
    </WorkspacePage>
  );
}

export function PerformanceSummaryGrid({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={cn("mnx-performance-summary-grid", className)}
      {...props}
    />
  );
}

export function PerformanceSummary({
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
    <article className="mnx-performance-summary">
      <div className="mnx-performance-summary-heading">
        {icon ? <span>{icon}</span> : null}
        <p>{label}</p>
      </div>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </article>
  );
}

export function PerformanceSection({
  className,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <WorkspacePanel
      className={cn("mnx-performance-section", className)}
      {...props}
    />
  );
}

export function PerformanceSectionHeader({
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
      className="mnx-performance-section-header"
      eyebrow={eyebrow}
      title={title}
      description={description}
      actions={actions}
    />
  );
}

export function PerformanceCard({
  className,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <article className={cn("mnx-performance-card", className)} {...props} />
  );
}

export function PerformanceGrid({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mnx-performance-grid", className)} {...props} />;
}

export function PerformanceToolbar({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mnx-performance-toolbar", className)} {...props} />
  );
}

export function PerformanceTabs({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mnx-performance-tabs", className)}
      role="tablist"
      {...props}
    />
  );
}

export function PerformanceActionLink({
  children,
  className,
  href,
}: {
  children: ReactNode;
  className?: string;
  href: string;
}) {
  return (
    <Link
      className={cn("mnx-button mnx-button-secondary", className)}
      href={href}
    >
      {children}
    </Link>
  );
}

export function PerformanceRecordLink({
  children,
  href,
}: {
  children: ReactNode;
  href: string;
}) {
  return (
    <Link className="mnx-performance-record-link" href={href}>
      {children}
    </Link>
  );
}

export function PerformanceTable({
  children,
  className,
  tableClassName,
  ...props
}: TableHTMLAttributes<HTMLTableElement> & {
  tableClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("mnx-performance-table-shell", className)}>
      <div className="mnx-table-wrap">
        <table className={cn("mnx-workspace-table", tableClassName)} {...props}>
          {children}
        </table>
      </div>
    </div>
  );
}

export const PerformanceTableHeader = (
  props: HTMLAttributes<HTMLTableSectionElement>,
) => <thead {...props} />;

export const PerformanceTableBody = (
  props: HTMLAttributes<HTMLTableSectionElement>,
) => <tbody {...props} />;

export function PerformanceTableRow({
  className,
  ...props
}: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn("mnx-performance-table-row", className)} {...props} />
  );
}

export function PerformanceTableHead({
  className,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={cn("mnx-performance-table-head", className)} {...props} />
  );
}

export function PerformanceTableCell({
  className,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("mnx-performance-table-cell", className)} {...props} />
  );
}

export function PerformanceTableEmpty({
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

export const PerformanceControlButton = WorkspaceAction;
export const PerformanceControlInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
  const isChoice = type === "checkbox" || type === "radio";
  const isRange = type === "range";
  const isVisuallyManaged = type === "file" || type === "hidden";

  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        isChoice
          ? "mnx-choice-control"
          : isRange
            ? "mnx-range-control"
            : isVisuallyManaged
              ? "mnx-managed-input"
              : "mnx-field-control",
        className,
      )}
      {...props}
    />
  );
});

PerformanceControlInput.displayName = "PerformanceControlInput";
export const PerformanceControlSelect = WorkspaceSelect;
export const PerformanceControlTextarea = WorkspaceTextarea;
export const PerformanceField = WorkspaceField;
export const PerformanceProgress = WorkspaceProgress;
export const PerformanceStatus = WorkspaceBadge;

export function PerformanceLoadingState({
  description = "Loading the latest performance and learning data.",
}: {
  description?: string;
}) {
  return (
    <WorkspaceState
      variant="loading"
      eyebrow="Performance operations"
      title="Loading workspace"
      description={description}
      icon={<LoaderCircle className="mnx-state-spinner" aria-hidden="true" />}
    />
  );
}

export function PerformanceErrorState({
  description,
  onRetry,
}: {
  description: string;
  onRetry?: () => void;
}) {
  return (
    <WorkspaceState
      variant="danger"
      eyebrow="Performance operations"
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

export type { WorkspaceActionProps as PerformanceControlButtonProps };
