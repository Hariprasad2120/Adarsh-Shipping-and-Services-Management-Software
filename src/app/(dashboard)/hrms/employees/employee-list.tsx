import { PeopleControlTable as MnxTable } from "@/modules/people/components/people-controls";
import Image from "next/image";
import { toDisplayTitleCase } from "@/lib/text-case";
import {
  Badge,
  DataTablePrimaryLinkCell,
} from "@/modules/people/components/people-data-table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmployeeAccountActions } from "./employee-account-actions";

type UserRoleName =
  "Director" | "Admin" | "Management" | "Manager" | "TL" | "HR" | "Employee";

type User = {
  id: string;
  name: string;
  email: string;
  employeeNumber: number | null;
  photo: string | null;
  designation: string | null;
  active: boolean;
  branch: {
    name: string;
  } | null;
  department: {
    name: string;
  } | null;
  roles: {
    role: {
      name: string;
    };
  }[];
  employeeInvitations: {
    consumedAt: string | Date | null;
    revokedAt: string | Date | null;
    expiresAt: string | Date;
    deliveryStatus: string;
  }[];
  employmentRecord: {
    joinDate?: string | Date | null;
    exitDate?: string | Date | null;
    ctc?: number | null;
    payrollMeta?: {
      employeeNumber?: string;
      rawSheets?: {
        employee?: {
          ["Employee Status"]?: string | null;
        } | null;
      };
    } | null;
  } | null;
};

const ROLE_GROUPS = [
  {
    key: "Director",
    label: "Directors",
    roles: ["Director"],
    badgeClass:
      "border-[var(--mnx-info)] bg-[var(--mnx-info-bg)] text-[var(--mnx-info)]",
  },
  {
    key: "Admin",
    label: "Admins",
    roles: ["Admin"],
    badgeClass:
      "border-[var(--mnx-info)] bg-[var(--mnx-info-bg)] text-[var(--mnx-info)]",
  },
  {
    key: "Management",
    label: "Management",
    roles: ["Management"],
    badgeClass:
      "border-[var(--mnx-info)] bg-[var(--mnx-info-bg)] text-[var(--mnx-info)]",
  },
  {
    key: "Manager",
    label: "Managers",
    roles: ["Manager"],
    badgeClass:
      "border-[var(--mnx-info)] bg-[var(--mnx-info-bg)] text-[var(--mnx-info)]",
  },
  {
    key: "TL",
    label: "Team Leads",
    roles: ["TL"],
    badgeClass:
      "border-[var(--mnx-info)] bg-[var(--mnx-info-bg)] text-[var(--mnx-info)]",
  },
  {
    key: "HR",
    label: "HR",
    roles: ["HR"],
    badgeClass:
      "border-[var(--mnx-info)] bg-[var(--mnx-info-bg)] text-[var(--mnx-info)]",
  },
  {
    key: "Employee",
    label: "Employees",
    roles: ["Employee"],
    badgeClass: "border-mono-border bg-mono-soft text-[var(--mnx-text)]",
  },
] as const;

const GROUP_ORDER: UserRoleName[] = [
  "Director",
  "Admin",
  "Management",
  "Manager",
  "TL",
  "HR",
  "Employee",
];

const HEADER_CELL_CLASS =
  "px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-mono-muted";

function employeeNumberFor(user: User) {
  return (
    user.employeeNumber?.toString() ||
    user.employmentRecord?.payrollMeta?.employeeNumber?.trim() ||
    "-"
  );
}

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-IN");
}

function rankForRole(roleName: string) {
  const index = GROUP_ORDER.indexOf(roleName as UserRoleName);

  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function sortByEmployeeNumber(users: User[]) {
  return [...users].sort((left, right) => {
    const leftEmp = employeeNumberFor(left);
    const rightEmp = employeeNumberFor(right);

    const leftNum = Number(leftEmp);
    const rightNum = Number(rightEmp);

    if (
      Number.isFinite(leftNum) &&
      Number.isFinite(rightNum) &&
      leftNum !== rightNum
    ) {
      return leftNum - rightNum;
    }

    if (leftEmp !== rightEmp) {
      return leftEmp.localeCompare(rightEmp);
    }

    return left.name.localeCompare(right.name);
  });
}

function primaryRoleFor(user: User) {
  const roleNames = user.roles.map((entry) => entry.role.name);

  return (
    [...roleNames].sort(
      (left, right) => rankForRole(left) - rankForRole(right),
    )[0] ?? "Employee"
  );
}

function roleBadgeClass(roleName: string) {
  switch (roleName) {
    case "Director":
    case "Admin":
    case "Management":
    case "Manager":
    case "TL":
    case "HR":
      return "border-[var(--mnx-info)] bg-[var(--mnx-info-bg)] text-[var(--mnx-info)]";

    default:
      return "border-mono-border bg-mono-soft text-[var(--mnx-text)]";
  }
}

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  return (
    parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

function employeeStatusFor(user: User) {
  if (user.employmentRecord?.exitDate) return "Exited";
  return (
    user.employmentRecord?.payrollMeta?.rawSheets?.employee?.[
      "Employee Status"
    ]?.trim() || "Active"
  );
}

function accountStatusFor(user: User) {
  if (user.active) {
    return {
      label: "Login Enabled",
      className:
        "border-[var(--mnx-success)] bg-[var(--mnx-success-bg)] text-[var(--mnx-success)]",
    };
  }

  const invitation = user.employeeInvitations[0];
  if (!invitation) {
    return {
      label: "Login Disabled",
      className:
        "border-[var(--mnx-danger)] bg-[var(--mnx-danger-bg)] text-[var(--mnx-danger)]",
    };
  }
  if (invitation.deliveryStatus === "FAILED") {
    return {
      label: "Invite Delivery Failed",
      className:
        "border-[var(--mnx-danger)] bg-[var(--mnx-danger-bg)] text-[var(--mnx-danger)]",
    };
  }
  if (
    invitation.revokedAt ||
    (!invitation.consumedAt &&
      new Date(invitation.expiresAt).getTime() <= Date.now())
  ) {
    return {
      label: "Invite Expired",
      className:
        "border-[var(--mnx-warning)] bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)]",
    };
  }

  return {
    label: "Invited",
    className:
      "border-[var(--mnx-info)] bg-[var(--mnx-info-bg)] text-[var(--mnx-info)]",
  };
}

function SectionTable({
  currentUserId,
  users,
}: {
  currentUserId: string;
  users: User[];
}) {
  return (
    <MnxTable className="w-full min-w-[1280px] table-fixed text-sm">
        <colgroup>
          <col className="w-[22%]" />
          <col className="w-[10%]" />
          <col className="w-[11%]" />
          <col className="w-[11%]" />
          <col className="w-[9%]" />
          <col className="w-[10%]" />
          <col className="w-[11%]" />
          <col className="w-[7%]" />
          <col className="w-[9%]" />
        </colgroup>
        <thead className="border-b border-mono-border/40 bg-mono-soft text-mono-text">
          <tr>
            <th className={`${HEADER_CELL_CLASS} text-left`}>
              Basic Information
            </th>
            <th className={`${HEADER_CELL_CLASS} text-left`}>Date of Joining</th>
            <th className={`${HEADER_CELL_CLASS} text-left`}>Roles</th>
            <th className={`${HEADER_CELL_CLASS} text-left`}>Department</th>
            <th className={`${HEADER_CELL_CLASS} text-left`}>Location</th>
            <th className={`${HEADER_CELL_CLASS} text-left`}>
              Employee Status
            </th>
            <th className={`${HEADER_CELL_CLASS} text-left`}>
              Account Status
            </th>
            <th className={`${HEADER_CELL_CLASS} text-left`}>Gross/yr</th>
            <th className={`${HEADER_CELL_CLASS} text-right`}>Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-outline-variant/30">
          {users.map((user) => {
            const accountStatus = accountStatusFor(user);

            return (
            <tr
              key={user.id}
              className="group transition-colors hover:bg-mono-soft/80"
            >
              <DataTablePrimaryLinkCell
                href={`/hrms/employees/${user.id}`}
                className="px-0 py-0"
                linkClassName="min-w-0 gap-3 py-3.5"
              >
                <div className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--mnx-accent)]/15 text-xs font-medium text-[var(--mnx-accent-text)]">
                  {user.photo ? (
                    <Image
                      alt=""
                      className="object-cover"
                      fill
                      sizes="44px"
                      src={user.photo}
                      unoptimized
                    />
                  ) : (
                    initialsFor(user.name)
                  )}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-mono-text">
                    <span className="mnx-numeric text-mono-muted">
                      {employeeNumberFor(user)}
                    </span>
                    <span aria-hidden="true"> · </span>
                    {toDisplayTitleCase(user.name)}
                  </p>

                  <p className="mt-1 truncate text-xs text-mono-muted">
                    {user.email}
                  </p>
                </div>
              </DataTablePrimaryLinkCell>

              <td className="mnx-numeric px-5 py-3 text-sm text-mono-muted">
                {formatDate(user.employmentRecord?.joinDate)}
              </td>

              <td className="px-5 py-3">
                <div className="flex flex-wrap gap-2">
                  {user.roles.length === 0 ? (
                    <span className="text-sm text-mono-muted">-</span>
                  ) : (
                    user.roles.map((entry) => (
                      <Badge
                        key={`${user.id}-${entry.role.name}`}
                        className={`rounded-md border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${roleBadgeClass(
                          entry.role.name,
                        )}`}
                      >
                        {entry.role.name}
                      </Badge>
                    ))
                  )}
                </div>
              </td>

              <td className="px-5 py-3 text-sm text-mono-muted">
                {toDisplayTitleCase(user.department?.name ?? user.designation)}
              </td>

              <td className="px-5 py-3 text-sm text-mono-muted">
                {toDisplayTitleCase(user.branch?.name)}
              </td>

              <td className="px-5 py-3">
                <Badge
                  className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold ${
                    employeeStatusFor(user).toLowerCase() === "active"
                      ? "border-[var(--mnx-success)] bg-[var(--mnx-success-bg)] text-[var(--mnx-success)]"
                      : "border-[var(--mnx-warning)] bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)]"
                  }`}
                >
                  {employeeStatusFor(user)}
                </Badge>
              </td>

              <td className="px-5 py-3">
                <Badge
                  className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold ${accountStatus.className}`}
                >
                  {accountStatus.label}
                </Badge>
              </td>

              <td className="mnx-numeric px-5 py-3 text-sm text-mono-muted">
                {user.employmentRecord?.ctc == null
                  ? "-"
                  : `Rs ${Number(user.employmentRecord.ctc).toLocaleString(
                      "en-IN",
                    )}`}
              </td>

              <td className="px-5 py-3 text-right">
                <EmployeeAccountActions
                  active={user.active}
                  employeeId={user.id}
                  employeeName={user.name}
                  invitationPending={
                    !user.active && user.employeeInvitations.length > 0
                  }
                  isCurrentUser={user.id === currentUserId}
                />
              </td>
            </tr>
            );
          })}
        </tbody>
      </MnxTable>
  );
}

export function EmployeeList({
  currentUserId,
  users,
}: {
  currentUserId: string;
  users: User[];
}) {
  const groupedUsers = ROLE_GROUPS.map((section) => {
    const sectionUsers = sortByEmployeeNumber(
      users.filter((user) => primaryRoleFor(user) === section.key),
    );

    return {
      ...section,
      users: sectionUsers,
    };
  }).filter((section) => section.users.length > 0);

  const uncategorizedUsers = sortByEmployeeNumber(
    users.filter(
      (user) =>
        !ROLE_GROUPS.some((section) => primaryRoleFor(user) === section.key),
    ),
  );

  return (
    <div className="space-y-6">
      {users.length === 0 ? (
        <Card className="w-full border-mono-border shadow-sm dark:border-[var(--mnx-accent)]/25">
          <CardContent className="py-10 text-center text-sm text-mono-muted">
            No employees found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-7">
          {groupedUsers.map((section) => (
            <Card
              key={section.key}
              className="w-full overflow-hidden border-mono-border shadow-ambient dark:border-[var(--mnx-accent)]/25"
            >
              <CardHeader className="bg-mono-card px-5 pb-4 pt-5">
                <CardTitle className="w-full text-lg font-medium uppercase tracking-[0.12em] text-[var(--mnx-text)]">
                  {section.label}

                  <span className="ml-3 text-sm font-normal tracking-normal text-[var(--mnx-muted)]">
                    ({section.users.length})
                  </span>
                </CardTitle>
              </CardHeader>

              <CardContent className="!space-y-0 !p-0">
                <SectionTable
                  currentUserId={currentUserId}
                  users={section.users}
                />
              </CardContent>
            </Card>
          ))}

          {uncategorizedUsers.length > 0 ? (
            <Card className="w-full overflow-hidden border-mono-border shadow-ambient dark:border-[var(--mnx-accent)]/25">
              <CardHeader className="bg-mono-card px-5 pb-4 pt-5">
                <CardTitle className="w-full text-lg font-medium uppercase tracking-[0.12em] text-[var(--mnx-text)]">
                  Other Roles
                  <span className="ml-3 text-sm font-normal tracking-normal text-[var(--mnx-muted)]">
                    ({uncategorizedUsers.length})
                  </span>
                </CardTitle>
              </CardHeader>

              <CardContent className="!space-y-0 !p-0">
                <SectionTable
                  currentUserId={currentUserId}
                  users={uncategorizedUsers}
                />
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}
