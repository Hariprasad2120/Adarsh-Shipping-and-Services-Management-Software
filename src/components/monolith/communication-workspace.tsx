"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  CalendarDays,
  ExternalLink,
  FolderKanban,
  Gauge,
  HardDrive,
  LoaderCircle,
  Mail,
  MessageSquareText,
  Search,
  Settings2,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";
import * as React from "react";
import type {
  HTMLAttributes,
  ReactNode,
  TableHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";
import {
  WorkspaceAction,
  type WorkspaceActionProps,
  WorkspaceBadge,
  WorkspaceEmptyTableRow,
  WorkspaceField,
  WorkspaceMetric,
  WorkspacePage,
  WorkspacePageHeader,
  WorkspacePanel,
  WorkspacePanelHeader,
  WorkspaceSelect,
  WorkspaceState,
  WorkspaceTable,
  WorkspaceTextarea,
} from "./workspace";

type CommunicationRouteMeta = {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

const exactRouteMeta: Record<string, CommunicationRouteMeta> = {
  "/communication": {
    eyebrow: "Connected workspace",
    title: "Communication command centre",
    description:
      "Coordinate mail, conversations, meetings, calendars, job spaces, and shared files from one operational workspace.",
    icon: Gauge,
  },
  "/communication/calendar": {
    eyebrow: "Calendar",
    title: "Workspace calendar",
    description:
      "Review upcoming events, attendees, conference links, and scheduling context.",
    icon: CalendarDays,
  },
  "/communication/chat": {
    eyebrow: "Conversations",
    title: "Team chat",
    description:
      "Coordinate direct messages, team spaces, job conversations, and shared context.",
    icon: MessageSquareText,
  },
  "/communication/drive": {
    eyebrow: "Documents",
    title: "Job drive",
    description:
      "Browse and synchronise controlled Google Drive folders linked to operational jobs.",
    icon: HardDrive,
  },
  "/communication/google-chat-live-view": {
    eyebrow: "Experimental integration",
    title: "Google Chat live view",
    description:
      "Open the configured Google Chat workspace with connection diagnostics and safe fallbacks.",
    icon: ExternalLink,
  },
  "/communication/job-spaces": {
    eyebrow: "Job collaboration",
    title: "Job spaces",
    description:
      "Review and provision the shared chat and Drive workspaces attached to CHA jobs.",
    icon: FolderKanban,
  },
  "/communication/mail": {
    eyebrow: "Mail",
    title: "Workspace inbox",
    description:
      "Read, organise, reply to, and connect Google Workspace mail with operational records.",
    icon: Mail,
  },
  "/communication/meetings": {
    eyebrow: "Meetings",
    title: "Meeting workspace",
    description:
      "Schedule Google Meet sessions and review the upcoming meeting calendar.",
    icon: Video,
  },
  "/communication/search": {
    eyebrow: "Connected search",
    title: "Workspace search",
    description:
      "Find mail, Drive files, and linked job context through one permission-aware search.",
    icon: Search,
  },
  "/communication/settings": {
    eyebrow: "Configuration",
    title: "Communication settings",
    description:
      "Manage the connected Google account, notification preferences, and controlled integration features.",
    icon: Settings2,
  },
};

const navigationItems = [
  { href: "/communication", label: "Overview" },
  { href: "/communication/mail", label: "Mail" },
  { href: "/communication/chat", label: "Chat" },
  { href: "/communication/job-spaces", label: "Job spaces" },
  { href: "/communication/meetings", label: "Meetings" },
  { href: "/communication/calendar", label: "Calendar" },
  { href: "/communication/drive", label: "Drive" },
  { href: "/communication/search", label: "Search" },
  { href: "/communication/settings", label: "Settings" },
] as const;

function normalizePathname(pathname: string | null) {
  if (!pathname) return "/";
  const normalized = pathname.replace(/\/+$/, "");
  return normalized || "/";
}

export function getCommunicationRouteMeta(
  pathname: string | null,
): CommunicationRouteMeta {
  return (
    exactRouteMeta[normalizePathname(pathname)] ?? exactRouteMeta["/communication"]
  );
}

export function CommunicationWorkspaceFrame({
  children,
  showGoogleChatLiveView = false,
}: {
  children: ReactNode;
  showGoogleChatLiveView?: boolean;
}) {
  const pathname = normalizePathname(usePathname());
  const meta = getCommunicationRouteMeta(pathname);
  const Icon = meta.icon;
  const items = showGoogleChatLiveView
    ? [
        ...navigationItems.slice(0, 3),
        {
          href: "/communication/google-chat-live-view",
          label: "Live view",
        },
        ...navigationItems.slice(3),
      ]
    : navigationItems;

  return (
    <WorkspacePage
      className="mnx-communication-page"
      data-communication-workspace="true"
    >
      <WorkspacePageHeader
        className="mnx-communication-page-header"
        eyebrow={meta.eyebrow}
        title={meta.title}
        description={meta.description}
        icon={<Icon aria-hidden="true" />}
      />
      <nav className="mnx-communication-nav" aria-label="Communication workspace">
        {items.map((item) => {
          const active =
            item.href === "/communication"
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mnx-communication-content">{children}</div>
    </WorkspacePage>
  );
}

export const CommunicationButton = React.forwardRef<
  HTMLButtonElement,
  WorkspaceActionProps
>(({ variant = "secondary", ...props }, ref) => (
  <WorkspaceAction ref={ref} variant={variant} {...props} />
));

CommunicationButton.displayName = "CommunicationButton";

export const CommunicationInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
  const isChoice = type === "checkbox" || type === "radio";
  const isManaged = type === "file" || type === "hidden";
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        isChoice
          ? "mnx-choice-control"
          : isManaged
            ? "mnx-managed-input"
            : "mnx-field-control",
        className,
      )}
      {...props}
    />
  );
});

CommunicationInput.displayName = "CommunicationInput";

export const CommunicationTextarea = WorkspaceTextarea;
export const CommunicationSelect = WorkspaceSelect;
export const CommunicationField = WorkspaceField;
export const CommunicationBadge = WorkspaceBadge;

export function CommunicationPanel({
  className,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <WorkspacePanel
      className={cn("mnx-communication-panel", className)}
      {...props}
    />
  );
}

export const CommunicationPanelHeader = WorkspacePanelHeader;
export const CommunicationMetric = WorkspaceMetric;

export function CommunicationTable({
  className,
  ...props
}: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <WorkspaceTable
      className={cn("mnx-communication-table", className)}
      {...props}
    />
  );
}

export const CommunicationEmptyTableRow = WorkspaceEmptyTableRow;

export function CommunicationLoadingState({
  description = "Loading the connected communication workspace.",
}: {
  description?: string;
}) {
  return (
    <WorkspaceState
      variant="loading"
      eyebrow="Communication"
      title="Loading workspace"
      description={description}
      icon={<LoaderCircle className="mnx-state-spinner" aria-hidden="true" />}
    />
  );
}

export function CommunicationErrorState({
  description,
  onRetry,
}: {
  description: string;
  onRetry?: () => void;
}) {
  return (
    <WorkspaceState
      variant="danger"
      eyebrow="Communication"
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

export function CommunicationPermissionState({
  description,
}: {
  description: string;
}) {
  return (
    <WorkspaceState
      variant="permission"
      eyebrow="Communication"
      title="Access restricted"
      description={description}
      icon={<Users aria-hidden="true" />}
    />
  );
}
