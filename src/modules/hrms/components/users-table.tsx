"use client";

import React, {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import {
  CheckCircle2,
  KeyRound,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  UserCog,
  UserX2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";
import {
  OperationalDataTable,
  OperationalDataTableFooter,
  OperationalDataTableHeader,
  OperationalDataTableWrap,
  OperationalFilterGroup,
  OperationalFilterOption,
  OperationalTable,
  OperationalTableCell,
  OperationalTableEmpty,
  OperationalTableHead,
  OperationalVisibleRecords,
} from "@/components/data-display/operational-data-table";
import {
  WorkspaceAction,
  WorkspaceAlert,
  WorkspaceBadge,
  WorkspaceField,
  WorkspaceMetric,
  WorkspaceSectionHeading,
  WorkspaceSelect,
} from "@/components/layout/workspace";
import {
  PeopleControlInput,
  PeopleErrorState,
  PeopleLoadingState,
  PeoplePerson,
  PeopleSection,
  PeopleSectionHeader,
  PeopleTableToolbar,
} from "@/modules/people/components";

interface UsersTableProps {
  onFetchUsers: () => Promise<UserRecord[]>;
  onBulkAccountStatus: (
    userIds: string[],
    status: "LOGIN_ENABLED" | "LOGIN_DISABLED",
  ) => Promise<{ ok?: boolean; data?: { updated?: number }; error?: { message?: string } }>;
}

type UserRecord = {
  id: string;
  name: string;
  email: string;
  employeeNumber?: number | null;
  designation?: string | null;
  active: boolean;
  activatedAt?: string | Date | null;
  branch?: { id: string; name: string } | null;
  department?: { id: string; name: string } | null;
  division?: { id: string; name: string } | null;
  manager?: { id: string; name: string } | null;
  roles: { role: { name: string } }[];
  employmentRecord?: {
    joinDate?: string | Date | null;
    exitDate?: string | Date | null;
    ctc?: number | null;
    payrollMeta?: {
      employeeNumber?: string | null;
      rawSheets?: {
        employee?: {
          ["Employee Status"]?: string | null;
        } | null;
      } | null;
    } | null;
  } | null;
  employeeInvitations: {
    consumedAt: string | Date | null;
    revokedAt: string | Date | null;
    expiresAt: string | Date;
    deliveryStatus: string;
  }[];
};

type AccessSegment =
  | "all"
  | "enabled"
  | "invited"
  | "disabled"
  | "exceptions"
  | "privileged";

type EmploymentFilter = "all" | "active" | "exited";

type AccessStateKey =
  | "enabled"
  | "disabled"
  | "invited"
  | "invite-failed"
  | "invite-expired";

const ACCESS_SEGMENTS: Array<{
  key: AccessSegment;
  label: string;
  description: string;
}> = [
  {
    key: "all",
    label: "All employees",
    description: "Full employee credential directory",
  },
  {
    key: "enabled",
    label: "Login enabled",
    description: "Employees with active sign-in capability",
  },
  {
    key: "invited",
    label: "Pending activation",
    description: "Invited employees waiting to activate access",
  },
  {
    key: "disabled",
    label: "Disabled",
    description: "Employees without login capability",
  },
  {
    key: "exceptions",
    label: "Needs attention",
    description: "Invite, access, or profile mismatches to review",
  },
  {
    key: "privileged",
    label: "Privileged access",
    description: "Admin, management, HR, and supervisory accounts",
  },
];

const PRIVILEGED_ROLES = new Set([
  "Admin",
  "Director",
  "Management",
  "Manager",
  "TL",
  "HR",
]);

function normalizeText(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function employeeNumberFor(user: UserRecord) {
  return (
    user.employeeNumber?.toString() ||
    user.employmentRecord?.payrollMeta?.employeeNumber?.trim() ||
    "Unassigned"
  );
}

function employmentStatusFor(user: UserRecord) {
  if (user.employmentRecord?.exitDate) return "Exited";

  return (
    user.employmentRecord?.payrollMeta?.rawSheets?.employee?.[
      "Employee Status"
    ]?.trim() || "Active"
  );
}

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "Not recorded";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function latestInvitation(user: UserRecord) {
  return user.employeeInvitations[0] ?? null;
}

function roleNamesFor(user: UserRecord) {
  return user.roles.map((entry) => entry.role.name);
}

function hasPrivilegedAccess(user: UserRecord) {
  return roleNamesFor(user).some((role) => PRIVILEGED_ROLES.has(role));
}

function accessStateFor(user: UserRecord) {
  if (user.active) {
    return {
      key: "enabled" as AccessStateKey,
      label: "Login enabled",
      detail: "Employee can access Monolith now.",
      badgeVariant: "success" as const,
    };
  }

  const invitation = latestInvitation(user);

  if (!invitation) {
    return {
      key: "disabled" as AccessStateKey,
      label: "Login disabled",
      detail: "No active invitation is attached.",
      badgeVariant: "danger" as const,
    };
  }

  if (invitation.deliveryStatus === "FAILED") {
    return {
      key: "invite-failed" as AccessStateKey,
      label: "Invite delivery failed",
      detail: "Invitation exists but delivery did not complete.",
      badgeVariant: "danger" as const,
    };
  }

  if (
    invitation.revokedAt ||
    (!invitation.consumedAt &&
      new Date(invitation.expiresAt).getTime() <= Date.now())
  ) {
    return {
      key: "invite-expired" as AccessStateKey,
      label: "Invite expired",
      detail: "Activation link is no longer usable.",
      badgeVariant: "warning" as const,
    };
  }

  return {
    key: "invited" as AccessStateKey,
    label: "Pending activation",
    detail: `Invite valid until ${formatDate(invitation.expiresAt)}.`,
    badgeVariant: "accent" as const,
  };
}

function accessExceptionsFor(user: UserRecord) {
  const exceptions: string[] = [];
  const accessState = accessStateFor(user);

  if (accessState.key === "invite-failed") {
    exceptions.push("Invitation delivery failed");
  }
  if (accessState.key === "invite-expired") {
    exceptions.push("Invitation needs re-issue");
  }
  if (user.active && user.employmentRecord?.exitDate) {
    exceptions.push("Exited employee still has active login");
  }
  if (roleNamesFor(user).length === 0) {
    exceptions.push("No role assigned");
  }
  if (!user.department?.name) {
    exceptions.push("Department missing");
  }
  if (hasPrivilegedAccess(user) && !user.manager?.name) {
    exceptions.push("Manager chain missing");
  }

  return exceptions;
}

function matchesSegment(user: UserRecord, segment: AccessSegment) {
  const accessState = accessStateFor(user);
  const exceptions = accessExceptionsFor(user);

  switch (segment) {
    case "enabled":
      return accessState.key === "enabled";
    case "invited":
      return accessState.key === "invited";
    case "disabled":
      return accessState.key === "disabled";
    case "exceptions":
      return exceptions.length > 0;
    case "privileged":
      return hasPrivilegedAccess(user);
    case "all":
    default:
      return true;
  }
}

function statusToneForEmployment(user: UserRecord) {
  return employmentStatusFor(user).toLowerCase() === "active"
    ? "success"
    : "warning";
}

export function UsersTable({
  onFetchUsers,
  onBulkAccountStatus,
}: UsersTableProps) {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState<AccessSegment>("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [employmentFilter, setEmploymentFilter] =
    useState<EmploymentFilter>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [rowActionUserId, setRowActionUserId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    startTransition(() => {
      setLoading(true);
      setError(null);
    });

    try {
      const list = await onFetchUsers();
      startTransition(() => {
        setUsers(list);
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load employee access data";
      startTransition(() => {
        setError(message);
      });
      toast.error("Failed to load employee access data");
    } finally {
      startTransition(() => {
        setLoading(false);
      });
    }
  }, [onFetchUsers]);

  useEffect(() => {
    let active = true;

    async function initialize() {
      startTransition(() => {
        setLoading(true);
        setError(null);
      });

      try {
        const list = await onFetchUsers();
        if (!active) return;
        startTransition(() => {
          setUsers(list);
          setLoading(false);
        });
      } catch (err) {
        if (!active) return;
        const message =
          err instanceof Error
            ? err.message
            : "Failed to load employee access data";
        startTransition(() => {
          setError(message);
          setLoading(false);
        });
        toast.error("Failed to load employee access data");
      }
    }

    void initialize();

    return () => {
      active = false;
    };
  }, [onFetchUsers]);

  const departments = useMemo(() => {
    return Array.from(
      new Set(
        users
          .map((user) => user.department?.name?.trim())
          .filter((value): value is string => Boolean(value)),
      ),
    ).sort((left, right) => left.localeCompare(right));
  }, [users]);

  const roles = useMemo(() => {
    return Array.from(
      new Set(
        users.flatMap((user) =>
          roleNamesFor(user).filter((role) => role.trim().length > 0),
        ),
      ),
    ).sort((left, right) => left.localeCompare(right));
  }, [users]);

  const filteredUsers = useMemo(() => {
    const query = normalizeText(search);

    return users.filter((user) => {
      const searchMatches =
        query.length === 0 ||
        [
          user.name,
          user.email,
          user.designation,
          user.department?.name,
          user.branch?.name,
          user.manager?.name,
          employeeNumberFor(user),
          ...roleNamesFor(user),
        ].some((value) => normalizeText(value).includes(query));

      const segmentMatches = matchesSegment(user, segment);
      const departmentMatches =
        departmentFilter === "all" || user.department?.name === departmentFilter;
      const roleMatches =
        roleFilter === "all" || roleNamesFor(user).includes(roleFilter);
      const employmentMatches =
        employmentFilter === "all" ||
        (employmentFilter === "active" && !user.employmentRecord?.exitDate) ||
        (employmentFilter === "exited" && Boolean(user.employmentRecord?.exitDate));

      return (
        searchMatches &&
        segmentMatches &&
        departmentMatches &&
        roleMatches &&
        employmentMatches
      );
    });
  }, [
    departmentFilter,
    employmentFilter,
    roleFilter,
    search,
    segment,
    users,
  ]);

  const selectedVisibleUsers = filteredUsers.filter((user) =>
    selectedIds.includes(user.id),
  );

  const metrics = useMemo(() => {
    const enabled = users.filter((user) => accessStateFor(user).key === "enabled");
    const invited = users.filter((user) => accessStateFor(user).key === "invited");
    const exceptions = users.filter((user) => accessExceptionsFor(user).length > 0);
    const privileged = users.filter((user) => hasPrivilegedAccess(user));

    return {
      total: users.length,
      enabled: enabled.length,
      invited: invited.length,
      exceptions: exceptions.length,
      privileged: privileged.length,
    };
  }, [users]);

  const selectedAllVisible =
    filteredUsers.length > 0 &&
    filteredUsers.every((user) => selectedIds.includes(user.id));

  const activeSegmentMeta =
    ACCESS_SEGMENTS.find((entry) => entry.key === segment) ?? ACCESS_SEGMENTS[0];

  async function handleBulkAction(
    status: "LOGIN_ENABLED" | "LOGIN_DISABLED",
    userIds = selectedIds,
  ) {
    if (userIds.length === 0) {
      toast.error("Select at least one employee before running a bulk action.");
      return;
    }

    setActionLoading(true);

    try {
      const result = await onBulkAccountStatus(userIds, status);
      if (!result.ok) {
        throw new Error(result.error?.message ?? "Unable to update login access");
      }

      toast.success(
        `${result.data?.updated ?? userIds.length} employee account${userIds.length > 1 ? "s were" : " was"} updated.`,
      );
      setSelectedIds([]);
      await loadData();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Unable to update login access",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSingleAction(
    user: UserRecord,
    status: "LOGIN_ENABLED" | "LOGIN_DISABLED",
  ) {
    setRowActionUserId(user.id);

    try {
      const result = await onBulkAccountStatus([user.id], status);
      if (!result.ok) {
        throw new Error(result.error?.message ?? "Unable to update login access");
      }

      toast.success(
        `${user.name} login ${status === "LOGIN_ENABLED" ? "enabled" : "disabled"}.`,
      );
      await loadData();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Unable to update login access",
      );
    } finally {
      setRowActionUserId(null);
    }
  }

  if (loading && users.length === 0) {
    return (
      <PeopleLoadingState description="Loading employee credentials, invite posture, and access controls." />
    );
  }

  if (error && users.length === 0) {
    return <PeopleErrorState description={error} onRetry={() => void loadData()} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <WorkspaceSectionHeading
        index="01"
        title="Access posture"
        description="Monitor who can sign in, which accounts are still pending activation, and where employee-access cleanup is required."
        badge={
          metrics.exceptions > 0 ? (
            <WorkspaceBadge variant="warning">
              {metrics.exceptions} attention item{metrics.exceptions === 1 ? "" : "s"}
            </WorkspaceBadge>
          ) : (
            <WorkspaceBadge variant="success">No active exceptions</WorkspaceBadge>
          )
        }
      />

      <div className="mnx-workspace-metrics">
        <WorkspaceMetric
          icon={<UserCog aria-hidden="true" />}
          label="Employee directory"
          value={metrics.total}
          detail="Employees with credential records in this workspace."
        />
        <WorkspaceMetric
          icon={<ShieldCheck aria-hidden="true" />}
          label="Login enabled"
          value={metrics.enabled}
          detail="Accounts able to sign in right now."
        />
        <WorkspaceMetric
          icon={<KeyRound aria-hidden="true" />}
          label="Pending activation"
          value={metrics.invited}
          detail="Invites sent but not yet accepted."
        />
        <WorkspaceMetric
          icon={<ShieldAlert aria-hidden="true" />}
          label="Access exceptions"
          value={metrics.exceptions}
          detail="Invite failures, expired access, or profile mismatches."
        />
        <WorkspaceMetric
          icon={<CheckCircle2 aria-hidden="true" />}
          label="Privileged accounts"
          value={metrics.privileged}
          detail="Admin, HR, management, and supervisory users."
        />
      </div>

      {metrics.exceptions > 0 ? (
        <WorkspaceAlert variant="warning">
          <strong>Cleanup recommended.</strong> Focus the <em>Needs attention</em>{" "}
          segment to review expired invites, failed invite delivery, exited users
          with active access, and privileged accounts missing reporting context.
        </WorkspaceAlert>
      ) : null}

      <WorkspaceSectionHeading
        index="02"
        title="Directory and controls"
        description="Use segment filters and row-level controls to manage employee sign-in without breaking the linked HR record."
        actions={
          <WorkspaceAction
            size="compact"
            variant="outline"
            onClick={() => void loadData()}
            disabled={loading}
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Refresh directory
          </WorkspaceAction>
        }
      />

      <PeopleSection>
        <PeopleSectionHeader
          eyebrow="Access governance"
          title="Employee access register"
          description="A tighter ERP-style control surface for login enablement, invite posture, organisational placement, and privileged-access review."
        />

        <PeopleTableToolbar>
          <div className="flex flex-1 flex-col gap-3">
            <OperationalFilterGroup>
              {ACCESS_SEGMENTS.map((entry) => (
                <OperationalFilterOption
                  key={entry.key}
                  active={segment === entry.key}
                  onClick={() => setSegment(entry.key)}
                >
                  <span>{entry.label}</span>
                </OperationalFilterOption>
              ))}
            </OperationalFilterGroup>

            <p className="text-sm text-mono-muted">
              <strong className="text-mono-text">{activeSegmentMeta.label}:</strong>{" "}
              {activeSegmentMeta.description}
            </p>
          </div>

          <OperationalVisibleRecords
            total={users.length}
            visible={filteredUsers.length}
            label="Employees in current view"
          />
        </PeopleTableToolbar>

        <OperationalDataTable>
          <OperationalDataTableHeader
            hideIdentity
            actions={
              selectedIds.length > 0 ? (
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <WorkspaceBadge variant="accent">
                    {selectedIds.length} selected
                  </WorkspaceBadge>
                  <WorkspaceAction
                    size="compact"
                    variant="accent"
                    disabled={actionLoading}
                    onClick={() => void handleBulkAction("LOGIN_ENABLED")}
                  >
                    Enable login
                  </WorkspaceAction>
                  <WorkspaceAction
                    size="compact"
                    variant="destructive"
                    disabled={actionLoading}
                    onClick={() => void handleBulkAction("LOGIN_DISABLED")}
                  >
                    Disable login
                  </WorkspaceAction>
                </div>
              ) : null
            }
          >
            <p>
              Search by employee, email, department, location, role, manager, or
              employee number, then run controlled access changes from the same
              workspace.
            </p>
          </OperationalDataTableHeader>

          <PeopleTableToolbar className="border-b-0">
            <div className="grid flex-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <WorkspaceField label="Search directory">
                <PeopleControlInput
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search employee, role, manager, or email"
                />
              </WorkspaceField>

              <WorkspaceField label="Department">
                <WorkspaceSelect
                  value={departmentFilter}
                  onChange={(event) => setDepartmentFilter(event.target.value)}
                >
                  <option value="all">All departments</option>
                  {departments.map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </WorkspaceSelect>
              </WorkspaceField>

              <WorkspaceField label="Role">
                <WorkspaceSelect
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value)}
                >
                  <option value="all">All roles</option>
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </WorkspaceSelect>
              </WorkspaceField>

              <WorkspaceField label="Employment state">
                <WorkspaceSelect
                  value={employmentFilter}
                  onChange={(event) =>
                    setEmploymentFilter(event.target.value as EmploymentFilter)
                  }
                >
                  <option value="all">All employees</option>
                  <option value="active">Active employment</option>
                  <option value="exited">Exited employees</option>
                </WorkspaceSelect>
              </WorkspaceField>
            </div>
          </PeopleTableToolbar>

          <OperationalDataTableWrap>
            <OperationalTable className="min-w-[1180px]">
              <thead>
                <tr>
                  <OperationalTableHead className="w-14">
                    <PeopleControlInput
                      type="checkbox"
                      aria-label="Select all visible employees"
                      checked={selectedAllVisible}
                      onChange={(event) =>
                        setSelectedIds(
                          event.target.checked
                            ? filteredUsers.map((user) => user.id)
                            : [],
                        )
                      }
                    />
                  </OperationalTableHead>
                  <OperationalTableHead>Employee</OperationalTableHead>
                  <OperationalTableHead>Access posture</OperationalTableHead>
                  <OperationalTableHead>Organisation context</OperationalTableHead>
                  <OperationalTableHead>Roles and lifecycle</OperationalTableHead>
                  <OperationalTableHead className="text-right">
                    Actions
                  </OperationalTableHead>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.length === 0 ? (
                  <OperationalTableEmpty colSpan={6}>
                    No employees match the current search and governance filters.
                  </OperationalTableEmpty>
                ) : (
                  filteredUsers.map((user) => {
                    const accessState = accessStateFor(user);
                    const exceptions = accessExceptionsFor(user);
                    const roleNames = roleNamesFor(user);
                    const isSelected = selectedIds.includes(user.id);
                    const isRowLoading = rowActionUserId === user.id;

                    return (
                      <tr
                        key={user.id}
                        className={cn(
                          isSelected ? "bg-[var(--mnx-info-bg)]/35" : null,
                        )}
                      >
                        <OperationalTableCell>
                          <PeopleControlInput
                            type="checkbox"
                            aria-label={`Select ${user.name}`}
                            checked={isSelected}
                            onChange={(event) =>
                              setSelectedIds((current) =>
                                event.target.checked
                                  ? [...new Set([...current, user.id])]
                                  : current.filter((id) => id !== user.id),
                              )
                            }
                          />
                        </OperationalTableCell>

                        <OperationalTableCell>
                          <div className="flex min-w-0 flex-col gap-2">
                            <PeoplePerson
                              name={user.name}
                              secondary={`${employeeNumberFor(user)} · ${user.email}`}
                            />
                            <div className="flex flex-wrap gap-2">
                              {user.designation ? (
                                <WorkspaceBadge variant="neutral">
                                  {user.designation}
                                </WorkspaceBadge>
                              ) : null}
                              {hasPrivilegedAccess(user) ? (
                                <WorkspaceBadge variant="accent">
                                  Privileged access
                                </WorkspaceBadge>
                              ) : null}
                            </div>
                          </div>
                        </OperationalTableCell>

                        <OperationalTableCell>
                          <div className="flex min-w-0 flex-col gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <WorkspaceBadge variant={accessState.badgeVariant}>
                                {accessState.label}
                              </WorkspaceBadge>
                              {user.active && user.activatedAt ? (
                                <span className="text-xs text-mono-muted">
                                  Activated
                                </span>
                              ) : null}
                            </div>
                            <small>{accessState.detail}</small>
                            {exceptions.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {exceptions.slice(0, 2).map((item) => (
                                  <WorkspaceBadge key={item} variant="warning">
                                    {item}
                                  </WorkspaceBadge>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </OperationalTableCell>

                        <OperationalTableCell>
                          <div className="flex min-w-0 flex-col gap-1">
                            <strong className="text-sm text-mono-text">
                              {user.department?.name ?? "Department not assigned"}
                            </strong>
                            <small>
                              {user.branch?.name ?? "Location not assigned"}
                            </small>
                            <small>
                              Reports to {user.manager?.name ?? "Manager not assigned"}
                            </small>
                          </div>
                        </OperationalTableCell>

                        <OperationalTableCell>
                          <div className="flex min-w-0 flex-col gap-2">
                            <div className="flex flex-wrap gap-2">
                              {roleNames.length > 0 ? (
                                roleNames.map((role) => (
                                  <WorkspaceBadge
                                    key={`${user.id}-${role}`}
                                    variant={
                                      PRIVILEGED_ROLES.has(role)
                                        ? "accent"
                                        : "neutral"
                                    }
                                  >
                                    {role}
                                  </WorkspaceBadge>
                                ))
                              ) : (
                                <WorkspaceBadge variant="warning">
                                  No role assigned
                                </WorkspaceBadge>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-mono-muted">
                              <span>Joined {formatDate(user.employmentRecord?.joinDate)}</span>
                              <span>
                                Employment:{" "}
                                <WorkspaceBadge
                                  variant={statusToneForEmployment(user)}
                                  className="align-middle"
                                >
                                  {employmentStatusFor(user)}
                                </WorkspaceBadge>
                              </span>
                            </div>
                          </div>
                        </OperationalTableCell>

                        <OperationalTableCell className="text-right">
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            {user.active ? (
                              <WorkspaceAction
                                size="compact"
                                variant="destructive"
                                disabled={actionLoading || isRowLoading}
                                onClick={() =>
                                  void handleSingleAction(user, "LOGIN_DISABLED")
                                }
                              >
                                <UserX2 className="size-4" aria-hidden="true" />
                                Disable
                              </WorkspaceAction>
                            ) : (
                              <WorkspaceAction
                                size="compact"
                                variant="accent"
                                disabled={actionLoading || isRowLoading}
                                onClick={() =>
                                  void handleSingleAction(user, "LOGIN_ENABLED")
                                }
                              >
                                <ShieldCheck
                                  className="size-4"
                                  aria-hidden="true"
                                />
                                Enable
                              </WorkspaceAction>
                            )}

                            <ButtonLink
                              href={`/hrms/employees/${user.id}`}
                              variant="outline"
                              size="sm"
                            >
                              Open profile
                            </ButtonLink>

                            {exceptions.length > 0 ? (
                              <Link
                                className="text-xs font-medium text-[var(--mnx-accent-text)] underline-offset-4 hover:underline"
                                href={`/hrms/employees/${user.id}`}
                              >
                                Resolve issue
                              </Link>
                            ) : null}
                          </div>
                        </OperationalTableCell>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </OperationalTable>
          </OperationalDataTableWrap>

          <OperationalDataTableFooter
            summary={`${filteredUsers.length} of ${users.length} employees in the current governance view`}
          >
            {selectedVisibleUsers.length > 0 ? (
              <span className="text-xs text-mono-muted">
                {selectedVisibleUsers.length} selected in the visible result set
              </span>
            ) : null}
          </OperationalDataTableFooter>
        </OperationalDataTable>
      </PeopleSection>
    </div>
  );
}
