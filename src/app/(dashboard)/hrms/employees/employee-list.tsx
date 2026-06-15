import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { toDisplayTitleCase } from "@/lib/text-case";
import { Badge } from "@/components/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type UserRoleName =
  | "Director"
  | "Admin"
  | "Management"
  | "Manager"
  | "TL"
  | "HR"
  | "Employee";

type User = {
  id: string;
  name: string;
  email: string;
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
  employmentRecord: {
    joinDate?: string | Date | null;
    ctc?: number | null;
    payrollMeta?: {
      employeeNumber?: string;
    } | null;
  } | null;
};

const ROLE_GROUPS = [
  {
    key: "Director",
    label: "Directors",
    roles: ["Director"],
    badgeClass: "border-cyan-200 bg-cyan-50 text-cyan-700",
  },
  {
    key: "Admin",
    label: "Admins",
    roles: ["Admin"],
    badgeClass: "border-cyan-200 bg-cyan-50 text-cyan-700",
  },
  {
    key: "Management",
    label: "Management",
    roles: ["Management"],
    badgeClass: "border-cyan-200 bg-cyan-50 text-cyan-700",
  },
  {
    key: "Manager",
    label: "Managers",
    roles: ["Manager"],
    badgeClass: "border-cyan-200 bg-cyan-50 text-cyan-700",
  },
  {
    key: "TL",
    label: "Team Leads",
    roles: ["TL"],
    badgeClass: "border-cyan-200 bg-cyan-50 text-cyan-700",
  },
  {
    key: "HR",
    label: "HR",
    roles: ["HR"],
    badgeClass: "border-cyan-200 bg-cyan-50 text-cyan-700",
  },
  {
    key: "Employee",
    label: "Employees",
    roles: ["Employee"],
    badgeClass: "border-slate-200 bg-slate-50 text-slate-700",
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
  "px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-on-surface-variant";

function employeeNumberFor(user: User) {
  return user.employmentRecord?.payrollMeta?.employeeNumber?.trim() || "-";
}

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-IN");
}

function formatCurrency(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "-";

  return `Rs ${Number(value).toLocaleString("en-IN")}`;
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
    [...roleNames].sort((left, right) => rankForRole(left) - rankForRole(right))[0] ??
    "Employee"
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
      return "border-cyan-200 bg-cyan-50 text-cyan-700";

    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
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

function SectionTable({ users }: { users: User[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="border-b border-outline-variant/40 bg-surface-container-low text-on-surface">
          <tr>
            <th className={`${HEADER_CELL_CLASS} text-left`}>EMP ID</th>
            <th className={`${HEADER_CELL_CLASS} text-left`}>Name</th>
            <th className={`${HEADER_CELL_CLASS} text-left`}>Role</th>
            <th className={`${HEADER_CELL_CLASS} text-left`}>Department</th>
            <th className={`${HEADER_CELL_CLASS} text-left`}>Location</th>
            <th className={`${HEADER_CELL_CLASS} text-left`}>Joining</th>
            <th className={`${HEADER_CELL_CLASS} text-left`}>Gross/yr</th>
            <th className={`${HEADER_CELL_CLASS} text-right`}></th>
          </tr>
        </thead>

        <tbody className="divide-y divide-outline-variant/30">
          {users.map((user) => (
            <tr
              key={user.id}
              className="group transition-colors hover:bg-surface-container-low/80"
            >
              <td className="ds-numeric px-5 py-3 text-sm text-on-surface-variant">
                <Link href={`/hrms/employees/${user.id}`} className="block">
                  {employeeNumberFor(user)}
                </Link>
              </td>

              <td className="px-5 py-3">
                <Link
                  href={`/hrms/employees/${user.id}`}
                  className="flex min-w-0 items-center gap-3"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#00cec4]/15 text-xs text-[#008b85]">
                    {initialsFor(user.name)}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-base font-normal text-on-surface">
                      {user.name}
                    </p>

                    <p className="truncate text-xs text-on-surface-variant">
                      {user.email}
                    </p>
                  </div>
                </Link>
              </td>

              <td className="px-5 py-3">
                <div className="flex flex-wrap gap-2">
                  {user.roles.length === 0 ? (
                    <span className="text-sm text-on-surface-variant">-</span>
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

              <td className="px-5 py-3 text-sm text-on-surface-variant">
                {toDisplayTitleCase(user.department?.name ?? user.designation)}
              </td>

              <td className="px-5 py-3 text-sm text-on-surface-variant">
                {toDisplayTitleCase(user.branch?.name)}
              </td>

              <td className="ds-numeric px-5 py-3 text-sm text-on-surface-variant">
                {formatDate(user.employmentRecord?.joinDate)}
              </td>

              <td className="ds-numeric px-5 py-3 text-sm text-on-surface-variant">
                {formatCurrency(user.employmentRecord?.ctc)}
              </td>

              <td className="px-5 py-3 text-right">
                <Link
                  href={`/hrms/employees/${user.id}`}
                  className="inline-flex text-outline-variant transition-colors group-hover:text-[#00b5ad]"
                >
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EmployeeList({ users }: { users: User[] }) {
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
        <Card className="rounded-[28px] border-slate-200 shadow-sm dark:border-[#00cec4]/25">
          <CardContent className="py-10 text-center text-sm text-slate-500">
            No employees found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-7">
          {groupedUsers.map((section) => (
            <Card
              key={section.key}
              className="overflow-hidden rounded-[30px] border-slate-200 shadow-[0_8px_24px_rgba(15,23,42,0.08)] dark:border-[#00cec4]/25"
            >
              <CardHeader className="bg-surface px-5 pb-4 pt-5">
                <CardTitle className="w-full text-lg font-medium uppercase tracking-[0.12em] text-slate-700">
                  {section.label}

                  <span className="ml-3 text-sm font-normal tracking-normal text-slate-400">
                    ({section.users.length})
                  </span>
                </CardTitle>
              </CardHeader>

              <CardContent className="!space-y-0 !p-0">
                <SectionTable users={section.users} />
              </CardContent>
            </Card>
          ))}

          {uncategorizedUsers.length > 0 ? (
            <Card className="overflow-hidden rounded-[30px] border-slate-200 shadow-[0_8px_24px_rgba(15,23,42,0.08)] dark:border-[#00cec4]/25">
              <CardHeader className="bg-surface px-5 pb-4 pt-5">
                <CardTitle className="w-full text-lg font-medium uppercase tracking-[0.12em] text-slate-700">
                  Other Roles

                  <span className="ml-3 text-sm font-normal tracking-normal text-slate-400">
                    ({uncategorizedUsers.length})
                  </span>
                </CardTitle>
              </CardHeader>

              <CardContent className="!space-y-0 !p-0">
                <SectionTable users={uncategorizedUsers} />
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}