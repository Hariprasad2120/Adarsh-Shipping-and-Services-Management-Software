import Link from "next/link";
import {
  AlertTriangle,
  Inbox,
  LoaderCircle,
  LockKeyhole,
} from "lucide-react";
import { WorkspaceState } from "./workspace";

interface WorkspaceStateAction {
  href: string;
  label: string;
}

interface SharedWorkspaceStateProps {
  action?: WorkspaceStateAction;
  description: React.ReactNode;
  title: React.ReactNode;
}

function StateAction({ action }: { action?: WorkspaceStateAction }) {
  if (!action) return null;
  return (
    <Link className="mnx-button mnx-button-primary" href={action.href}>
      {action.label}
    </Link>
  );
}

export function WorkspacePermissionState({
  action,
  description,
  title,
}: SharedWorkspaceStateProps) {
  return (
    <WorkspaceState
      variant="permission"
      eyebrow="Permission required"
      icon={<LockKeyhole size={25} aria-hidden="true" />}
      title={title}
      description={description}
      action={<StateAction action={action} />}
    />
  );
}

export function WorkspaceEmptyState({
  action,
  description,
  title,
}: SharedWorkspaceStateProps) {
  return (
    <WorkspaceState
      variant="empty"
      eyebrow="Nothing here yet"
      icon={<Inbox size={25} aria-hidden="true" />}
      title={title}
      description={description}
      action={<StateAction action={action} />}
    />
  );
}

export function WorkspaceLoadingState({
  description,
  title,
}: Omit<SharedWorkspaceStateProps, "action">) {
  return (
    <WorkspaceState
      variant="loading"
      eyebrow="Loading workspace"
      icon={<LoaderCircle size={25} aria-hidden="true" />}
      title={title}
      description={description}
      aria-live="polite"
      aria-busy="true"
    />
  );
}

export function WorkspaceErrorState({
  action,
  description,
  title,
}: SharedWorkspaceStateProps) {
  return (
    <WorkspaceState
      variant="danger"
      eyebrow="Workspace unavailable"
      icon={<AlertTriangle size={25} aria-hidden="true" />}
      title={title}
      description={description}
      action={<StateAction action={action} />}
      role="alert"
    />
  );
}
