"use client";

import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { FilterMenu } from "@/components/ui/filter-menu";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { Input } from "@/components/ui/input";

type Branch = {
  id: string;
  name: string;
};

type Department = {
  id: string;
  name: string;
};

type Role = {
  id: string;
  name: string;
};

type DirectoryFilterDraft = {
  active: string;
  branchId: string;
  departmentId: string;
  roleId: string;
  search: string;
};

function buildUrl(pathname: string, params: URLSearchParams) {
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function currentFilterDraft(
  sp: ReturnType<typeof useSearchParams>,
): DirectoryFilterDraft {
  return {
    search: sp.get("search") ?? "",
    branchId: sp.get("branchId") ?? "",
    departmentId: sp.get("departmentId") ?? "",
    roleId: sp.get("roleId") ?? "",
    active: sp.get("active") ?? "true",
  };
}

function filterCount(draft: DirectoryFilterDraft) {
  let count = 0;

  if (draft.search.trim()) count += 1;
  if (draft.branchId) count += 1;
  if (draft.departmentId) count += 1;
  if (draft.roleId) count += 1;
  if (draft.active !== "true") count += 1;

  return count;
}

export function EmployeeDirectoryActions({
  org,
  roles,
}: {
  org: {
    branches: Branch[];
    departments: Department[];
  } | null;
  roles: Role[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const currentDraft = useMemo(() => currentFilterDraft(sp), [sp]);
  const [draft, setDraft] = useState<DirectoryFilterDraft>(currentDraft);

  const activeCount = filterCount(currentDraft);

  function updateDraft<K extends keyof DirectoryFilterDraft>(
    key: K,
    value: DirectoryFilterDraft[K],
  ) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function applyFilters() {
    const params = new URLSearchParams(sp.toString());

    if (draft.search.trim()) {
      params.set("search", draft.search.trim());
    } else {
      params.delete("search");
    }

    if (draft.branchId) {
      params.set("branchId", draft.branchId);
    } else {
      params.delete("branchId");
    }

    if (draft.departmentId) {
      params.set("departmentId", draft.departmentId);
    } else {
      params.delete("departmentId");
    }

    if (draft.roleId) {
      params.set("roleId", draft.roleId);
    } else {
      params.delete("roleId");
    }

    if (draft.active && draft.active !== "true") {
      params.set("active", draft.active);
    } else {
      params.delete("active");
    }

    startTransition(() => {
      router.push(buildUrl(pathname, params));
    });

    setOpen(false);
  }

  function clearFilters() {
    const params = new URLSearchParams(sp.toString());

    ["search", "branchId", "departmentId", "roleId", "active"].forEach((key) =>
      params.delete(key),
    );

    setDraft({
      search: "",
      branchId: "",
      departmentId: "",
      roleId: "",
      active: "true",
    });

    startTransition(() => {
      router.push(buildUrl(pathname, params));
    });

    setOpen(false);
  }

  return (
    <div className="flex items-center gap-3">
      <FilterMenu
        activeCount={activeCount}
        ariaLabel="Open employee filters"
        contentClassName="w-[360px]"
        open={open}
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
            setDraft(currentDraft);
          }

          setOpen(nextOpen);
        }}
        title="Filter employees"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />

            <Input
              value={draft.search}
              onChange={(event) => updateDraft("search", event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applyFilters();
                }
              }}
              placeholder="Name / Email"
              className="h-10 pl-9"
            />
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-on-surface-variant">
                Organisation
              </p>

              <div className="grid gap-3">
                <DropdownSelect
                  ariaLabel="Location"
                  onValueChange={(value) => updateDraft("branchId", value)}
                  options={[
                    {
                      value: "",
                      label: "All branches",
                    },
                    ...(org?.branches.map((branch) => ({
                      value: branch.id,
                      label: branch.name,
                    })) ?? []),
                  ]}
                  placeholder="Location"
                  triggerClassName="h-10 py-2 text-sm"
                  value={draft.branchId}
                />

                <DropdownSelect
                  ariaLabel="Department"
                  onValueChange={(value) => updateDraft("departmentId", value)}
                  options={[
                    {
                      value: "",
                      label: "All departments",
                    },
                    ...(org?.departments.map((department) => ({
                      value: department.id,
                      label: department.name,
                    })) ?? []),
                  ]}
                  placeholder="Department"
                  triggerClassName="h-10 py-2 text-sm"
                  value={draft.departmentId}
                />
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-on-surface-variant">
                Access
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <DropdownSelect
                  ariaLabel="Role"
                  onValueChange={(value) => updateDraft("roleId", value)}
                  options={[
                    {
                      value: "",
                      label: "All roles",
                    },
                    ...roles.map((role) => ({
                      value: role.id,
                      label: role.name,
                    })),
                  ]}
                  placeholder="Role"
                  triggerClassName="h-10 py-2 text-sm"
                  value={draft.roleId}
                />

                <DropdownSelect
                  ariaLabel="Status"
                  onValueChange={(value) => updateDraft("active", value)}
                  options={[
                    {
                      value: "true",
                      label: "Active",
                    },
                    {
                      value: "false",
                      label: "Exited",
                    },
                  ]}
                  placeholder="Status"
                  triggerClassName="h-10 py-2 text-sm"
                  value={draft.active}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-xl border border-outline-variant/40 px-3 py-2 text-sm text-on-surface-variant transition hover:border-[#00cec4]/45 hover:text-on-surface"
            >
              Clear
            </button>

            <button
              type="button"
              onClick={applyFilters}
              className="rounded-xl bg-[#00cec4] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#00b5ad]"
            >
              Apply filters
            </button>
          </div>
        </div>
      </FilterMenu>

      <Link
        href="/hrms/employees/new"
        className="inline-flex items-center gap-2 rounded-lg bg-[#00cec4] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#00b5ad]"
      >
        <Plus className="h-4 w-4" />
        Onboard Employee
      </Link>
    </div>
  );
}