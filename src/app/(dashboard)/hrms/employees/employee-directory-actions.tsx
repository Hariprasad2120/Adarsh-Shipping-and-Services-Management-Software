"use client";

import { PeopleControlButton as MnxAction } from "@/components/monolith/people-controls";

import Link from "next/link";
import { Download, FileSpreadsheet, Plus, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { FilterMenu } from "@/components/monolith/filter-menu";
import { DropdownSelect } from "@/components/monolith/dropdown-select";
import { Input } from "@/components/monolith/input";
import { WorkspaceDialog } from "@/components/monolith/workspace-dialog";

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
  employeeStatus: string;
  onboardingStatus: string;
  roleId: string;
  search: string;
};

type ExportFormat = "xls" | "xlsx" | "csv" | "tsv";

const EXPORT_FORMATS: { value: ExportFormat; label: string }[] = [
  { value: "xls", label: "XLS" },
  { value: "xlsx", label: "XLSX" },
  { value: "csv", label: "CSV" },
  { value: "tsv", label: "TSV" },
];

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
    employeeStatus: sp.get("employeeStatus") ?? "",
    onboardingStatus: sp.get("onboardingStatus") ?? "",
    roleId: sp.get("roleId") ?? "",
    active: sp.get("active") ?? "all",
  };
}

function filterCount(draft: DirectoryFilterDraft) {
  let count = 0;

  if (draft.search.trim()) count += 1;
  if (draft.branchId) count += 1;
  if (draft.departmentId) count += 1;
  if (draft.employeeStatus) count += 1;
  if (draft.onboardingStatus) count += 1;
  if (draft.roleId) count += 1;
  if (draft.active !== "all") count += 1;

  return count;
}

export function EmployeeDirectoryActions({
  org,
  roles,
  totalCount,
}: {
  org: {
    branches: Branch[];
    departments: Department[];
  } | null;
  roles: Role[];
  totalCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("xlsx");
  const [exporting, setExporting] = useState(false);

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

    if (draft.employeeStatus) {
      params.set("employeeStatus", draft.employeeStatus);
    } else {
      params.delete("employeeStatus");
    }

    if (draft.onboardingStatus) {
      params.set("onboardingStatus", draft.onboardingStatus);
    } else {
      params.delete("onboardingStatus");
    }

    if (draft.active !== "all") {
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

    [
      "search",
      "branchId",
      "departmentId",
      "roleId",
      "employeeStatus",
      "onboardingStatus",
      "active",
    ].forEach((key) => params.delete(key));

    setDraft({
      search: "",
      branchId: "",
      departmentId: "",
      employeeStatus: "",
      onboardingStatus: "",
      roleId: "",
      active: "all",
    });

    startTransition(() => {
      router.push(buildUrl(pathname, params));
    });

    setOpen(false);
  }

  async function exportEmployees() {
    setExporting(true);

    try {
      const params = new URLSearchParams(sp.toString());
      params.set("format", exportFormat);

      const response = await fetch(
        `/api/hrms/employees/export?${params.toString()}`,
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: { message?: string } | string }
          | null;
        const message =
          typeof payload?.error === "string"
            ? payload.error
            : payload?.error?.message;
        throw new Error(message || "Unable to export employee profiles");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") ?? "";
      const filename =
        disposition.match(/filename="([^"]+)"/)?.[1] ??
        `employee-profiles.${exportFormat}`;
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);

      toast.success("Employee profile export downloaded");
      setExportOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to export employee profiles",
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-3">
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
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mono-muted" />

            <Input
              value={draft.search}
              onChange={(event) => updateDraft("search", event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applyFilters();
                }
              }}
              placeholder="Name, ID, email, role…"
              className="h-10 pl-9"
            />
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-mono-muted">
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
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-mono-muted">
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
                  ariaLabel="Account status"
                  onValueChange={(value) => updateDraft("active", value)}
                  options={[
                    {
                      value: "all",
                      label: "All account statuses",
                    },
                    {
                      value: "true",
                      label: "Login enabled",
                    },
                    {
                      value: "false",
                      label: "Login disabled",
                    },
                    {
                      value: "invited",
                      label: "Invited",
                    },
                  ]}
                  placeholder="Account status"
                  triggerClassName="h-10 py-2 text-sm"
                  value={draft.active}
                />
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-mono-muted">
                Employment
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <DropdownSelect
                  ariaLabel="Employee status"
                  onValueChange={(value) =>
                    updateDraft("employeeStatus", value)
                  }
                  options={[
                    {
                      value: "",
                      label: "All employee statuses",
                    },
                    {
                      value: "ACTIVE",
                      label: "Active",
                    },
                    {
                      value: "EXITED",
                      label: "Exited",
                    },
                  ]}
                  placeholder="Employee status"
                  triggerClassName="h-10 py-2 text-sm"
                  value={draft.employeeStatus}
                />

                <DropdownSelect
                  ariaLabel="Onboarding status"
                  onValueChange={(value) =>
                    updateDraft("onboardingStatus", value)
                  }
                  options={[
                    {
                      value: "",
                      label: "All onboarding statuses",
                    },
                    {
                      value: "Not started",
                      label: "Not started",
                    },
                    {
                      value: "In progress",
                      label: "In progress",
                    },
                    {
                      value: "Completed",
                      label: "Completed",
                    },
                    {
                      value: "On hold",
                      label: "On hold",
                    },
                  ]}
                  placeholder="Onboarding status"
                  triggerClassName="h-10 py-2 text-sm"
                  value={draft.onboardingStatus}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <MnxAction
              type="button"
              onClick={clearFilters}
              className="rounded-xl border border-mono-border/40 px-3 py-2 text-sm text-mono-muted transition hover:border-[var(--mnx-accent)]/45 hover:text-mono-text"
            >
              Clear
            </MnxAction>

            <MnxAction
              type="button"
              onClick={applyFilters}
              className="rounded-xl bg-[var(--mnx-accent)] px-3 py-2 text-sm font-medium text-[var(--mnx-text)] transition hover:bg-[var(--mnx-accent)]"
            >
              Apply filters
            </MnxAction>
          </div>
        </div>
        </FilterMenu>

        <MnxAction
          aria-label="Export employee profiles"
          onClick={() => setExportOpen(true)}
          size="compact"
          variant="secondary"
        >
          <Download className="h-4 w-4" />
          Export
        </MnxAction>

        <Link
          href="/hrms/employees/new"
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--mnx-accent)] px-4 py-2 text-sm font-medium text-[var(--mnx-text)] transition hover:bg-[var(--mnx-accent)]"
        >
          <Plus className="h-4 w-4" />
          Onboard Employee
        </Link>
      </div>

      <p className="text-sm text-mono-muted">
        Total count:{" "}
        <strong className="mnx-numeric font-semibold text-mono-text">
          {totalCount}
        </strong>
      </p>

      <WorkspaceDialog
        description="Download the employee profile directory in your preferred spreadsheet format."
        eyebrow="Employee profiles"
        footer={
          <>
            <MnxAction
              disabled={exporting}
              onClick={() => setExportOpen(false)}
              variant="secondary"
            >
              Cancel
            </MnxAction>
            <MnxAction
              disabled={exporting}
              onClick={exportEmployees}
              variant="primary"
            >
              <Download className="h-4 w-4" />
              {exporting ? "Preparing…" : "Export"}
            </MnxAction>
          </>
        }
        onClose={() => {
          if (!exporting) setExportOpen(false);
        }}
        open={exportOpen}
        size="compact"
        title="Export employee profiles"
      >
        <div className="space-y-5">
          <div className="flex items-center gap-4 rounded-2xl border border-mono-border bg-mono-soft p-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[var(--mnx-accent)]/15 text-[var(--mnx-accent-text)]">
              <FileSpreadsheet className="h-6 w-6" />
            </span>
            <div>
              <p className="font-medium text-mono-text">Choose file format</p>
              <p className="mt-1 text-xs leading-relaxed text-mono-muted">
                Excel workbooks and delimited text files are supported.
              </p>
            </div>
          </div>

          <fieldset>
            <legend className="sr-only">Export file format</legend>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {EXPORT_FORMATS.map((format) => (
                <label
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-mono-border bg-mono-card px-3 py-3 text-sm font-medium text-mono-text transition hover:border-[var(--mnx-accent)]/55"
                  key={format.value}
                >
                  <Input
                    checked={exportFormat === format.value}
                    name="employee-export-format"
                    onChange={() => setExportFormat(format.value)}
                    type="radio"
                    value={format.value}
                  />
                  {format.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="rounded-2xl border border-[var(--mnx-warning)]/30 bg-[var(--mnx-warning-bg)] p-4">
            <p className="text-sm font-medium text-[var(--mnx-warning)]">
              Current filters are respected
            </p>
            <p className="mt-1 text-xs leading-relaxed text-mono-muted">
              Only the {totalCount} employee record
              {totalCount === 1 ? "" : "s"} currently displayed by your
              selected filters will be exported.
            </p>
          </div>
        </div>
      </WorkspaceDialog>
    </div>
  );
}
