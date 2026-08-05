import {
  AlertTriangle,
  Inbox,
  LoaderCircle,
  LockKeyhole,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { WorkspaceState } from "@/components/layout/workspace";

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
    <ButtonLink href={action.href}>
      {action.label}
    </ButtonLink>
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
