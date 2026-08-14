import { CrmButton, CrmInput, CrmTextarea, CrmConfigurationState, CrmPermissionState } from "@/modules/crm/components/workspace/crm-workspace";
import { NativeSelect } from "@/components/ui/native-select";
import React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { listProjects } from "@/modules/crm/service";
import { requirePermission } from "@/lib/rbac";
import { DateInput } from "@/components/ui/date-input";
import {
  Search,
  FolderKanban,
  Calendar,
  Save,
} from "lucide-react";
import { createProjectAction, deleteProjectAction } from "@/modules/crm/actions";
import { DeleteRecordButton } from "@/modules/crm/components/delete-record-button";

interface SearchParams {
  search?: string;
}

export default async function CrmProjectsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) {
    return (
      <CrmConfigurationState description="Missing organisation context." />
    );
  }

  // Permission Guard
  try {
    await requirePermission(session.user.id, "crm.project.manage");
  } catch (e) {
    return (
      <CrmPermissionState description="You do not have permission to view CRM operational projects." />
    );
  }

  const awaitedParams = await searchParams;
  const search = awaitedParams.search || "";

  // Fetch projects from db
  const projects = await listProjects(orgId, { search });

  // Fetch accounts and employees in parallel
  const [accounts, employees] = await Promise.all([
    db.crmAccount.findMany({
      where: { orgId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.user.findMany({
      where: { orgId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Projects list table */}
        <div className="lg:col-span-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/55 rounded-xl overflow-hidden shadow-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[var(--mnx-text-strong)] uppercase tracking-wider">
              Active Operations
            </h3>
            <span className="text-xs text-[var(--mnx-muted)] font-bold">
              {projects.length} running projects
            </span>
          </div>

          <form method="GET" className="relative">
            <Search className="absolute left-3 top-2.5 size-4 text-[var(--mnx-muted)]" />
            <CrmInput
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search projects by name..."
              className="w-full pl-9 pr-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm placeholder:text-[var(--mnx-muted)] focus:outline-none focus:border-[var(--mnx-accent)] text-[var(--mnx-text-strong)]"
            />
          </form>

          {projects.length === 0 ? (
            <div className="p-8 text-center text-[var(--mnx-muted)] text-xs italic">
              No operational projects tracked.
            </div>
          ) : (
            <div className="divide-y divide-[var(--mnx-border)]/30">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="py-4 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-[var(--mnx-text-strong)] text-sm block truncate">
                      {project.name}
                    </span>
                    <span className="text-xs text-[var(--mnx-muted)] block mt-0.5">
                      Client: {project.account?.name || "No Account"} • Status:{" "}
                      {project.status}
                    </span>
                    <div className="flex gap-4 text-[10px] text-[var(--mnx-muted)] mt-1.5">
                      {project.startDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3" />
                          Start:{" "}
                          {new Date(project.startDate).toLocaleDateString(
                            "en-IN",
                          )}
                        </span>
                      )}
                      {project.endDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3" />
                          Target:{" "}
                          {new Date(project.endDate).toLocaleDateString(
                            "en-IN",
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                        project.status === "COMPLETED"
                          ? "bg-[var(--mnx-success-bg)] text-[var(--mnx-success)]"
                          : "bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)]"
                      }`}
                    >
                      {project.status.replace("_", " ")}
                    </span>
                    <DeleteRecordButton
                      recordId={project.id}
                      deleteAction={deleteProjectAction}
                      confirmMessage="Are you sure you want to delete this project?"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Inline Create Project Form */}
        <div className="bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/55 rounded-xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--mnx-border)]/30 pb-2">
            <FolderKanban className="size-4.5 text-[var(--mnx-accent)]" />
            <h3 className="font-bold text-xs text-[var(--mnx-text-strong)] uppercase tracking-wider">
              Start Operation Project
            </h3>
          </div>

          <form
            action={async (fd) => {
              "use server";
              await createProjectAction(fd);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider mb-1.5">
                Project Title *
              </label>
              <CrmInput
                type="text"
                name="name"
                placeholder="e.g. Adarsh Cargo Dispatch setup"
                className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded text-xs text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider mb-1.5">
                Linked Client Account *
              </label>
              <NativeSelect
                name="accountId"
                className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded text-xs text-[var(--mnx-muted)] focus:outline-none focus:border-[var(--mnx-accent)]"
                required
              >
                <option value="">Select Customer</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider mb-1.5">
                  Start Date
                </label>
                <DateInput
                  name="startDate"
                  className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded text-xs text-[var(--mnx-muted)] focus:outline-none focus:border-[var(--mnx-accent)]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider mb-1.5">
                  End Date
                </label>
                <DateInput
                  name="endDate"
                  className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded text-xs text-[var(--mnx-muted)] focus:outline-none focus:border-[var(--mnx-accent)]"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider mb-1.5">
                  Status
                </label>
                <NativeSelect
                  name="status"
                  defaultValue="PLANNING"
                  className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded text-xs text-[var(--mnx-muted)] focus:outline-none focus:border-[var(--mnx-accent)]"
                >
                  <option value="PLANNING">Planning</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="ON_HOLD">On Hold</option>
                  <option value="COMPLETED">Completed</option>
                </NativeSelect>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider mb-1.5">
                  Project Owner *
                </label>
                <NativeSelect
                  name="ownerId"
                  className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded text-xs text-[var(--mnx-muted)] focus:outline-none focus:border-[var(--mnx-accent)]"
                  required
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider mb-1.5">
                Description
              </label>
              <CrmTextarea
                name="description"
                placeholder="Log operational instructions..."
                rows={3}
                className="w-full p-2.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded text-xs text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
              />
            </div>
            <CrmButton
              type="submit"
              className="w-full flex items-center justify-center gap-1.5 py-2 bg-[var(--mnx-accent)] hover:bg-[var(--mnx-accent)] text-[var(--mnx-text-strong)] font-bold rounded-lg text-xs transition-all mnx-shadow-panel cursor-pointer"
            >
              <Save className="size-4" />
              <span>Launch Project</span>
            </CrmButton>
          </form>
        </div>
      </div>
    </div>
  );
}
