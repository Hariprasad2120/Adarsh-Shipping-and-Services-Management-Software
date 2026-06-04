"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  AvatarCell,
  Badge,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableEmpty,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/data-table";
import { DropdownSelect } from "@/components/ui/dropdown-select";

type User = {
  id: string;
  name: string;
  email: string;
  designation: string | null;
  active: boolean;
  branch: { name: string } | null;
  department: { name: string } | null;
  roles: { role: { name: string } }[];
};
type Branch = { id: string; name: string };
type Department = { id: string; name: string };
type Role = { id: string; name: string };

export function EmployeeList({
  users,
  org,
  roles,
}: {
  users: User[];
  org: { branches: Branch[]; departments: Department[] } | null;
  roles: Role[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [, startTransition] = useTransition();

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 rounded-xl border border-gray-200 bg-white p-4">
        <input
          defaultValue={sp.get("search") ?? ""}
          onChange={(e) => setFilter("search", e.target.value)}
          placeholder="Search name / email..."
          className="min-w-40 flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <DropdownSelect
          ariaLabel="Branch"
          onValueChange={(value) => setFilter("branchId", value)}
          options={[
            { value: "", label: "All branches" },
            ...(org?.branches.map((branch) => ({ value: branch.id, label: branch.name })) ?? []),
          ]}
          triggerClassName="min-w-44 py-1.5"
          value={sp.get("branchId") ?? ""}
        />
        <DropdownSelect
          ariaLabel="Department"
          onValueChange={(value) => setFilter("departmentId", value)}
          options={[
            { value: "", label: "All departments" },
            ...(org?.departments.map((department) => ({ value: department.id, label: department.name })) ?? []),
          ]}
          triggerClassName="min-w-48 py-1.5"
          value={sp.get("departmentId") ?? ""}
        />
        <DropdownSelect
          ariaLabel="Role"
          onValueChange={(value) => setFilter("roleId", value)}
          options={[
            { value: "", label: "All roles" },
            ...roles.map((role) => ({ value: role.id, label: role.name })),
          ]}
          triggerClassName="min-w-40 py-1.5"
          value={sp.get("roleId") ?? ""}
        />
        <DropdownSelect
          ariaLabel="Status"
          onValueChange={(value) => setFilter("active", value)}
          options={[
            { value: "true", label: "Active" },
            { value: "false", label: "Inactive" },
          ]}
          triggerClassName="min-w-36 py-1.5"
          value={sp.get("active") ?? "true"}
        />
      </div>

      <DataTable>
        <DataTableHeader>
          <tr>
            {["Name", "Designation", "Branch", "Department", "Roles", ""].map((h) => (
              <DataTableHead key={h}>{h}</DataTableHead>
            ))}
          </tr>
        </DataTableHeader>
        <DataTableBody>
          {users.length === 0 ? (
            <DataTableEmpty colSpan={6} message="No employees found." />
          ) : (
            users.map((u) => (
              <DataTableRow key={u.id}>
                <DataTableCell>
                  <AvatarCell name={u.name} secondary={u.email} title={`${u.name} (${u.email})`} />
                </DataTableCell>
                <DataTableCell className="text-gray-500">{u.designation ?? "-"}</DataTableCell>
                <DataTableCell className="text-gray-500">{u.branch?.name ?? "-"}</DataTableCell>
                <DataTableCell className="text-gray-500">{u.department?.name ?? "-"}</DataTableCell>
                <DataTableCell>
                  <div className="flex flex-wrap gap-1">
                    {u.roles.length === 0 ? (
                      <span className="text-gray-400">-</span>
                    ) : (
                      u.roles.map((r) => (
                        <Badge key={r.role.name} className="bg-indigo-50 text-indigo-700">
                          {r.role.name}
                        </Badge>
                      ))
                    )}
                  </div>
                </DataTableCell>
                <DataTableCell className="text-right">
                  <Link href={`/hrms/employees/${u.id}`} className="text-xs text-indigo-600 hover:underline">
                    View →
                  </Link>
                </DataTableCell>
              </DataTableRow>
            ))
          )}
        </DataTableBody>
      </DataTable>
    </div>
  );
}
