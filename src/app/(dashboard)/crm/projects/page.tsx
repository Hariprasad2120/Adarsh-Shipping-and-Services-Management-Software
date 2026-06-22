import React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listProjects } from "@/modules/crm/service";
import { requirePermission } from "@/lib/rbac";
import {
  Search,
  FolderKanban,
  Calendar,
  ShieldAlert,
  Save,
} from "lucide-react";
import { createProjectAction, deleteProjectAction } from "@/modules/crm/actions";
import { DeleteRecordButton } from "../_components/delete-record-button";

interface SearchParams {
  search?: string;
}

export default async function CrmProjectsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) {
    return (
      <div className="p-8 text-center text-red-400">
        <ShieldAlert className="size-12 mx-auto mb-4" />
        <h2 className="text-xl font-bold">Configuration Error</h2>
        <p className="text-sm mt-1">Missing organisation context.</p>
      </div>
    );
  }

  // Permission Guard
  try {
    await requirePermission(session.user.id, "crm.project.manage");
  } catch (e) {
    return (
      <div className="p-8 text-center text-red-400">
        <ShieldAlert className="size-12 mx-auto mb-4" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-sm mt-1">You do not have permission to view CRM operational projects.</p>
      </div>
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
    <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-200">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Projects list table */}
        <div className="lg:col-span-2 bg-[#0f1319] border border-[#1c212a]/55 rounded-xl overflow-hidden shadow-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white uppercase tracking-wider">Active Operations</h3>
            <span className="text-xs text-slate-400 font-bold">{projects.length} running projects</span>
          </div>

          <form method="GET" className="relative">
            <Search className="absolute left-3 top-2.5 size-4 text-slate-500" />
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search projects by name..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm placeholder-slate-500 focus:outline-none focus:border-[#00c4b6] text-white"
            />
          </form>

          {projects.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs italic">No operational projects tracked.</div>
          ) : (
            <div className="divide-y divide-[#1c212a]/30">
              {projects.map((project) => (
                <div key={project.id} className="py-4 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-white text-sm block truncate">{project.name}</span>
                    <span className="text-xs text-slate-400 block mt-0.5">
                      Client: {project.account?.name || "No Account"} • Status: {project.status}
                    </span>
                    <div className="flex gap-4 text-[10px] text-slate-500 mt-1.5">
                      {project.startDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3" />
                          Start: {new Date(project.startDate).toLocaleDateString("en-IN")}
                        </span>
                      )}
                      {project.endDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3" />
                          Target: {new Date(project.endDate).toLocaleDateString("en-IN")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                      project.status === "COMPLETED"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-amber-500/10 text-amber-400"
                    }`}>
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
        <div className="bg-[#0f1319] border border-[#1c212a]/55 rounded-xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center gap-2 border-b border-[#1c212a]/30 pb-2">
            <FolderKanban className="size-4.5 text-[#00c4b6]" />
            <h3 className="font-bold text-xs text-white uppercase tracking-wider">Start Operation Project</h3>
          </div>

          <form
            action={async (fd) => {
              "use server";
              await createProjectAction(fd);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Project Title *</label>
              <input
                type="text"
                name="name"
                placeholder="e.g. Adarsh Cargo Dispatch setup"
                className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded text-xs text-white focus:outline-none focus:border-[#00c4b6]"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Linked Client Account *</label>
              <select
                name="accountId"
                className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded text-xs text-slate-300 focus:outline-none focus:border-[#00c4b6]"
                required
              >
                <option value="">Select Customer</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Start Date</label>
                <input
                  type="date"
                  name="startDate"
                  className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded text-xs text-slate-300 focus:outline-none focus:border-[#00c4b6]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">End Date</label>
                <input
                  type="date"
                  name="endDate"
                  className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded text-xs text-slate-300 focus:outline-none focus:border-[#00c4b6]"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Status</label>
                <select
                  name="status"
                  defaultValue="PLANNING"
                  className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded text-xs text-slate-300 focus:outline-none focus:border-[#00c4b6]"
                >
                  <option value="PLANNING">Planning</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="ON_HOLD">On Hold</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Project Owner *</label>
                <select
                  name="ownerId"
                  className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded text-xs text-slate-300 focus:outline-none focus:border-[#00c4b6]"
                  required
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Description</label>
              <textarea
                name="description"
                placeholder="Log operational instructions..."
                rows={3}
                className="w-full p-2.5 bg-[#0a0d12] border border-[#1c212a] rounded text-xs text-white focus:outline-none focus:border-[#00c4b6]"
              />
            </div>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-1.5 py-2 bg-[#00c4b6] hover:bg-[#00b0a3] text-white font-bold rounded-lg text-xs transition-all shadow-md shadow-[#00c4b6]/10 cursor-pointer"
            >
              <Save className="size-4" />
              <span>Launch Project</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
