import Link from "next/link";
import { Fragment } from "react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { redirect } from "next/navigation";
import { Users, UserCheck, Building2, ChevronRight } from "lucide-react";
import {
  assignEmployeesToTlAction,
  assignTlsToManagerAction,
  unassignEmployeeFromTlAction,
  unassignTlFromManagerAction,
} from "./actions";

type SearchParams = Promise<{ tab?: string }>;

function toTitleCase(str?: string | null): string {
  if (!str) return "";
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
}

async function loadData(orgId: string) {
  const [users, departments, divisions] = await Promise.all([
    db.user.findMany({
      where: { active: true, isPlatformAdmin: false, orgId },
      orderBy: [{ employeeNumber: "asc" }, { name: "asc" }],
      include: {
        roles: {
          include: {
            role: true,
          },
        },
        department: true,
        division: true,
        tl: true,
      },
    }),
    db.department.findMany({
      where: { orgId },
      orderBy: { name: "asc" },
    }),
    db.division.findMany({
      where: { orgId },
      orderBy: { name: "asc" },
    }),
  ]);
  return { users, departments, divisions };
}

function TabLink({ tab, activeTab, children }: { tab: string; activeTab: string; children: React.ReactNode }) {
  const active = tab === activeTab;
  return (
    <Link
      href={`/hrms/ownership?tab=${tab}`}
      className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
        active 
          ? "bg-[#00cec4] text-white shadow-sm shadow-[#00cec4]/25" 
          : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
      }`}
    >
      {children}
    </Link>
  );
}

export const metadata = {
  title: "Ownership | HRMS | Adarsh Shipping",
};

export default async function OwnershipPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session) redirect("/login");

  await requirePermission(session.user.id, "hrms.hierarchy.manage");
  const orgId = session.user.orgId;
  if (!orgId) {
    return (
      <div className="rounded-xl border border-outline-variant bg-surface p-8 text-center text-sm text-on-surface-variant">
        Organisation configuration missing.
      </div>
    );
  }

  const sp = await searchParams;
  const activeTab = ["tl", "manager", "departments"].includes(sp.tab ?? "") ? sp.tab! : "tl";
  const { users, departments, divisions } = await loadData(orgId);

  const tlUsers = users.filter((u) => u.roles.some((ur) => ur.role.name === "TL"));
  const managerUsers = users.filter((u) => u.roles.some((ur) => ur.role.name === "Manager"));
  const appraisableNonTl = users.filter((u) => 
    !u.roles.some((ur) => ["TL", "Manager", "HR", "Admin", "Management", "Director"].includes(ur.role.name))
  );

  // TL -> employees map
  const employeesByTl = new Map<string, typeof users>();
  for (const tl of tlUsers) employeesByTl.set(tl.id, []);
  const unassignedEmployees = appraisableNonTl.filter((u) => {
    if (u.tlId) {
      if (!employeesByTl.has(u.tlId)) employeesByTl.set(u.tlId, []);
      employeesByTl.get(u.tlId)!.push(u);
      return false;
    }
    return true;
  });

  // Manager -> TLs map
  const tlsByManager = new Map<string, typeof tlUsers>();
  for (const mgr of managerUsers) tlsByManager.set(mgr.id, []);
  const unassignedTls = tlUsers.filter((tl) => {
    if (tl.managerId) {
      if (!tlsByManager.has(tl.managerId)) tlsByManager.set(tl.managerId, []);
      tlsByManager.get(tl.managerId)!.push(tl);
      return false;
    }
    return true;
  });

  // Department hierarchy
  const divisionsByDept = new Map<string, typeof divisions>();
  for (const div of divisions) {
    if (!divisionsByDept.has(div.departmentId)) {
      divisionsByDept.set(div.departmentId, []);
    }
    divisionsByDept.get(div.departmentId)!.push(div);
  }

  const usersByDept = new Map<string, typeof users>();
  const usersByDivision = new Map<string, typeof users>();
  for (const u of users) {
    if (u.departmentId) {
      if (!usersByDept.has(u.departmentId)) usersByDept.set(u.departmentId, []);
      usersByDept.get(u.departmentId)!.push(u);
    }
    if (u.divisionId) {
      if (!usersByDivision.has(u.divisionId)) usersByDivision.set(u.divisionId, []);
      usersByDivision.get(u.divisionId)!.push(u);
    }
  }

  const selectClass = "flex h-11 w-full rounded-xl border border-[#00cec4]/55 bg-surface px-4 py-2.5 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/15 hover:border-[#00cec4]/85 transition";

  return (
    <div className="max-w-7xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm text-on-surface-variant dark:text-slate-400 font-medium">
            Define organizational hierarchy, team leads, and managers reporting lines.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-outline-variant pb-4">
        <TabLink tab="tl" activeTab={activeTab}>TL Ownership</TabLink>
        <TabLink tab="manager" activeTab={activeTab}>Manager Ownership</TabLink>
        <TabLink tab="departments" activeTab={activeTab}>Department / Division Mapping</TabLink>
      </div>

      {/* ── TL Ownership Tab ── */}
      {activeTab === "tl" && (
        <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
          {/* TL list with employees */}
          <section className="space-y-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-on-surface dark:text-slate-200">
              <UserCheck className="size-4 text-[#00cec4]" /> TL Teams
            </h2>
            {tlUsers.length === 0 && (
              <div className="rounded-xl border border-outline-variant bg-surface p-8 text-center text-sm text-on-surface-variant">
                No Team Lead (TL) role users found.
              </div>
            )}
            {tlUsers.map((tl) => {
              const owned = employeesByTl.get(tl.id) ?? [];
              return (
                <div key={tl.id} className="rounded-xl border border-outline-variant bg-surface shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between gap-3 border-b border-outline-variant/60 px-5 py-3.5 bg-surface-container-high/50 dark:bg-slate-800/20">
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{toTitleCase(tl.name)}</p>
                      <p className="text-[11px] font-medium text-slate-400">{tl.department?.name ?? "No department"} · TL</p>
                    </div>
                    <span className="rounded-full bg-surface-container-high dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-on-surface-variant dark:text-slate-300">
                      {owned.length} employee{owned.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="divide-y divide-outline-variant/60">
                    {owned.map((emp) => (
                      <div key={emp.id} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-surface-container-high/30 dark:hover:bg-slate-800/10 transition">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {emp.employeeNumber ? `${emp.employeeNumber} – ` : ""}{toTitleCase(emp.name)}
                          </p>
                          <p className="truncate text-[11px] font-medium text-slate-400">{emp.department?.name ?? "—"} · {emp.designation ?? "Employee"}</p>
                        </div>
                        <form action={unassignEmployeeFromTlAction}>
                          <input type="hidden" name="employeeId" value={emp.id} />
                          <Button type="submit" variant="outline" size="sm" className="text-rose-600 hover:text-rose-700 text-xs font-semibold h-8 border-rose-200 hover:border-rose-300 hover:bg-rose-50/30">
                            Remove
                          </Button>
                        </form>
                      </div>
                    ))}
                    {owned.length === 0 && (
                      <p className="px-5 py-4 text-xs font-medium text-slate-400">No employees assigned to this Team Lead.</p>
                    )}
                  </div>
                </div>
              );
            })}

            {unassignedEmployees.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-950/10">
                <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
                  Unassigned Employees ({unassignedEmployees.length})
                </p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {unassignedEmployees.map((u) => (
                    <span key={u.id} className="rounded-lg border border-amber-200/60 bg-surface px-2.5 py-1 text-[11px] font-semibold text-amber-700/80 dark:border-amber-900/60 dark:text-amber-400">
                      {u.employeeNumber ? `${u.employeeNumber} – ` : ""}{toTitleCase(u.name)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Assign form */}
          <section>
            <form action={assignEmployeesToTlAction} className="rounded-xl border border-outline-variant bg-surface p-5 space-y-4 shadow-sm">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-on-surface dark:text-slate-200">
                <Users className="size-4 text-[#00cec4]" /> Assign to TL
              </h2>
              <div className="space-y-1.5">
                <Label>Team Lead</Label>
                <select name="tlId" required className={selectClass}>
                  <option value="" className="bg-surface">Choose TL</option>
                  {tlUsers.map((tl) => (
                    <option key={tl.id} value={tl.id} className="bg-surface">
                      {tl.employeeNumber ? `${tl.employeeNumber} – ` : ""}{toTitleCase(tl.name)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Employees (select one or more)</Label>
                <div className="max-h-[350px] space-y-1 overflow-y-auto rounded-xl border border-outline-variant/60 p-2.5">
                  {appraisableNonTl.map((u) => (
                    <label key={u.id} className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-xs hover:bg-surface-container-high dark:hover:bg-slate-800/30 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                      <input type="checkbox" name="employeeId" value={u.id} className="accent-[#00cec4] size-4 rounded cursor-pointer" />
                      <span className="min-w-0 flex-1 truncate">
                        {u.employeeNumber ? `${u.employeeNumber} – ` : ""}{toTitleCase(u.name)}
                      </span>
                      <span className="text-[10px] text-slate-400 bg-surface-container-high dark:bg-slate-800 px-1.5 py-0.5 rounded font-semibold shrink-0">
                        {u.tl ? toTitleCase(u.tl.name) : "Unassigned"}
                      </span>
                    </label>
                  ))}
                  {appraisableNonTl.length === 0 && (
                    <p className="py-8 text-center text-xs text-slate-400">No employees found.</p>
                  )}
                </div>
              </div>
              <Button type="submit" className="w-full h-11 text-xs font-semibold rounded-xl bg-[#00cec4] hover:bg-[#00b8af] text-white">
                Assign Selected Employees
              </Button>
            </form>
          </section>
        </div>
      )}

      {/* ── Manager Ownership Tab ── */}
      {activeTab === "manager" && (
        <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
          {/* Manager hierarchy */}
          <section className="space-y-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-on-surface dark:text-slate-200">
              <UserCheck className="size-4 text-[#00cec4]" /> Manager Teams
            </h2>
            {managerUsers.length === 0 && (
              <div className="rounded-xl border border-outline-variant bg-surface p-8 text-center text-sm text-on-surface-variant">
                No Manager role users found.
              </div>
            )}
            {managerUsers.map((mgr) => {
              const ownedTls = tlsByManager.get(mgr.id) ?? [];
              const totalEmployees = ownedTls.reduce((sum, tl) => sum + (employeesByTl.get(tl.id)?.length ?? 0), 0);
              return (
                <div key={mgr.id} className="rounded-xl border border-outline-variant bg-surface shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between gap-3 border-b border-outline-variant/60 px-5 py-3.5 bg-surface-container-high/50 dark:bg-slate-800/20">
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{toTitleCase(mgr.name)}</p>
                      <p className="text-[11px] font-medium text-slate-400">{mgr.department?.name ?? "No department"} · Manager</p>
                    </div>
                    <span className="rounded-full bg-surface-container-high dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-on-surface-variant dark:text-slate-300">
                      {ownedTls.length} TL{ownedTls.length === 1 ? "" : "s"} · {totalEmployees} employee{totalEmployees === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="divide-y divide-outline-variant/60 bg-surface">
                    {ownedTls.map((tl) => {
                      const tlEmployees = employeesByTl.get(tl.id) ?? [];
                      return (
                        <div key={tl.id} className="px-5 py-3.5 hover:bg-surface-container-high/20 transition">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                {toTitleCase(tl.name)}
                              </p>
                              <span className="rounded bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 px-1.5 py-0.5 text-[9px] font-bold">TL</span>
                            </div>
                            <form action={unassignTlFromManagerAction} className="flex items-center gap-1">
                              <input type="hidden" name="tlId" value={tl.id} />
                              <Button type="submit" variant="outline" size="sm" className="text-rose-600 hover:text-rose-700 text-xs font-semibold h-8 border-rose-200 hover:border-rose-300 hover:bg-rose-50/30">
                                Remove
                              </Button>
                            </form>
                          </div>
                          {tlEmployees.length > 0 && (
                            <div className="mt-2.5 flex flex-wrap gap-1.5 pl-3.5 border-l-2 border-outline-variant">
                              {tlEmployees.map((emp) => (
                                <span key={emp.id} className="rounded-md border border-outline-variant bg-surface-container-high/50 dark:bg-slate-800/20 px-2 py-0.5 text-[10px] font-semibold text-on-surface-variant dark:text-slate-400">
                                  {emp.employeeNumber ? `${emp.employeeNumber} – ` : ""}{toTitleCase(emp.name)}
                                </span>
                              ))}
                            </div>
                          )}
                          {tlEmployees.length === 0 && (
                            <p className="mt-1 pl-3.5 text-[10px] font-medium text-slate-400">No employees under this Team Lead.</p>
                          )}
                        </div>
                      );
                    })}
                    {ownedTls.length === 0 && (
                      <p className="px-5 py-4 text-xs font-medium text-slate-400">No Team Leads assigned to this Manager.</p>
                    )}
                  </div>
                </div>
              );
            })}

            {unassignedTls.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-950/10">
                <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
                  Unassigned Team Leads ({unassignedTls.length})
                </p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {unassignedTls.map((tl) => (
                    <span key={tl.id} className="rounded-lg border border-amber-200/60 bg-surface px-2.5 py-1 text-[11px] font-semibold text-amber-700/80 dark:border-amber-900/60 dark:text-amber-400">
                      {toTitleCase(tl.name)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Assign TLs to manager form */}
          <section>
            <form action={assignTlsToManagerAction} className="rounded-xl border border-outline-variant bg-surface p-5 space-y-4 shadow-sm">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-on-surface dark:text-slate-200">
                <Users className="size-4 text-[#00cec4]" /> Assign TL to Manager
              </h2>
              <div className="space-y-1.5">
                <Label>Manager</Label>
                <select name="managerId" required className={selectClass}>
                  <option value="" className="bg-surface">Choose Manager</option>
                  {managerUsers.map((mgr) => (
                    <option key={mgr.id} value={mgr.id} className="bg-surface">
                      {mgr.employeeNumber ? `${mgr.employeeNumber} – ` : ""}{toTitleCase(mgr.name)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Team Leads (select one or more)</Label>
                <div className="max-h-[350px] space-y-1 overflow-y-auto rounded-xl border border-outline-variant/60 p-2.5">
                  {tlUsers.map((tl) => (
                    <label key={tl.id} className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-xs hover:bg-surface-container-high dark:hover:bg-slate-800/30 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                      <input type="checkbox" name="tlId" value={tl.id} className="accent-[#00cec4] size-4 rounded cursor-pointer" />
                      <span className="min-w-0 flex-1 truncate">
                        {tl.employeeNumber ? `${tl.employeeNumber} – ` : ""}{toTitleCase(tl.name)}
                      </span>
                      <span className="text-[10px] text-slate-400 bg-surface-container-high dark:bg-slate-800 px-1.5 py-0.5 rounded font-semibold shrink-0">
                        {tl.managerId ? toTitleCase(users.find((u) => u.id === tl.managerId)?.name) : "Unassigned"}
                      </span>
                    </label>
                  ))}
                  {tlUsers.length === 0 && (
                    <p className="py-8 text-center text-xs text-slate-400">No TL users found.</p>
                  )}
                </div>
              </div>
              <Button type="submit" className="w-full h-11 text-xs font-semibold rounded-xl bg-[#00cec4] hover:bg-[#00b8af] text-white">
                Assign Selected Team Leads
              </Button>
            </form>
          </section>
        </div>
      )}

      {/* ── Department/Division Mapping Tab ── */}
      {activeTab === "departments" && (
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-on-surface dark:text-slate-200">
            <Building2 className="size-4 text-[#00cec4]" /> Hierarchy Map
          </h2>
          <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-sm text-left">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-high dark:bg-slate-800/30 text-xs font-bold text-on-surface-variant dark:text-slate-400">
                    <th className="px-5 py-3.5 font-semibold">Department / Division</th>
                    <th className="px-5 py-3.5 font-semibold">Managers</th>
                    <th className="px-5 py-3.5 font-semibold">Team Leads</th>
                    <th className="px-5 py-3.5 font-semibold">Employees</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/60 font-medium text-slate-700 dark:text-slate-300">
                  {departments.map((dept) => {
                    const divs = divisionsByDept.get(dept.id) ?? [];
                    const deptUsers = usersByDept.get(dept.id) ?? [];
                    const deptTls = deptUsers.filter((u) => u.roles.some((ur) => ur.role.name === "TL"));
                    const deptManagers = deptUsers.filter((u) => u.roles.some((ur) => ur.role.name === "Manager"));
                    const deptEmployees = deptUsers.filter((u) => 
                      !u.roles.some((ur) => ["TL", "Manager", "Admin", "Management", "Director"].includes(ur.role.name))
                    );

                    if (divs.length === 0) {
                      return (
                        <tr key={dept.id} className="hover:bg-surface-container-high/30 dark:hover:bg-slate-800/5 transition">
                          <td className="px-5 py-4 font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <ChevronRight className="size-4 text-slate-400" />
                            {dept.name}
                          </td>
                          <td className="px-5 py-4 text-xs font-semibold text-on-surface-variant">
                            {deptManagers.length > 0 ? deptManagers.map((m) => toTitleCase(m.name)).join(", ") : "—"}
                          </td>
                          <td className="px-5 py-4 text-xs font-semibold text-on-surface-variant">
                            {deptTls.length > 0 ? deptTls.map((t) => toTitleCase(t.name)).join(", ") : "—"}
                          </td>
                          <td className="px-5 py-4 text-xs font-semibold text-on-surface-variant">
                            {deptEmployees.length > 0 ? (
                              <span className="rounded-full bg-surface-container-high dark:bg-slate-800 px-2 py-0.5">{deptEmployees.length} employee{deptEmployees.length === 1 ? "" : "s"}</span>
                            ) : "—"}
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <Fragment key={dept.id}>
                        <tr className="bg-surface-container-high/50 dark:bg-slate-800/10 font-bold border-y border-outline-variant/40">
                          <td className="px-5 py-3 font-extrabold text-slate-900 dark:text-white" colSpan={4}>
                            {dept.name}
                            <span className="ml-2.5 rounded bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400 px-2 py-0.5 text-[10px] font-bold">
                              {divs.length} division{divs.length === 1 ? "" : "s"}
                            </span>
                          </td>
                        </tr>
                        {divs.map((div) => {
                          const divUsers = usersByDivision.get(div.id) ?? [];
                          const divTls = divUsers.filter((u) => u.roles.some((ur) => ur.role.name === "TL"));
                          const divManagers = divUsers.filter((u) => u.roles.some((ur) => ur.role.name === "Manager"));
                          const divEmployees = divUsers.filter((u) => 
                            !u.roles.some((ur) => ["TL", "Manager", "Admin", "Management", "Director"].includes(ur.role.name))
                          );
                          return (
                            <tr key={div.id} className="hover:bg-surface-container-high/30 dark:hover:bg-slate-800/5 transition">
                              <td className="px-5 py-3.5 pl-10 text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1">
                                <span className="text-slate-400 mr-1.5 font-normal">└</span>{div.name}
                              </td>
                              <td className="px-5 py-3.5 text-xs font-semibold text-on-surface-variant">
                                {divManagers.length > 0 ? divManagers.map((m) => toTitleCase(m.name)).join(", ") : "—"}
                              </td>
                              <td className="px-5 py-3.5 text-xs font-semibold text-on-surface-variant">
                                {divTls.length > 0 ? divTls.map((t) => toTitleCase(t.name)).join(", ") : "—"}
                              </td>
                              <td className="px-5 py-3.5 text-xs font-semibold text-on-surface-variant">
                                {divEmployees.length > 0 ? (
                                  <span className="rounded-full bg-surface-container-high dark:bg-slate-800 px-2 py-0.5">{divEmployees.length} employee{divEmployees.length === 1 ? "" : "s"}</span>
                                ) : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </Fragment>
                    );
                  })}
                  {departments.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center text-slate-400">
                        No departments found in the system.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-[11px] font-medium text-slate-400">
            * Manager and Team Lead columns list active users with matching roles who belong to the given department or division.
          </p>
        </div>
      )}
    </div>
  );
}
