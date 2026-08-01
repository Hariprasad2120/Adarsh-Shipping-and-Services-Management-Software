import {
  PeopleControlInput as MnxInput,
  PeopleControlTable as MnxTable,
} from "@/modules/people/components/people-controls";
import { NativeSelect } from "@/components/ui/native-select";
import Link from "next/link";
import { Fragment } from "react";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase(),
  );
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

function TabLink({
  tab,
  activeTab,
  children,
}: {
  tab: string;
  activeTab: string;
  children: React.ReactNode;
}) {
  const active = tab === activeTab;
  return (
    <Link
      href={`/hrms/ownership?tab=${tab}`}
      className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
        active
          ? "bg-[var(--mnx-accent)] text-[var(--mnx-text)] mnx-shadow-panel"
          : "bg-mono-soft text-mono-muted hover:bg-mono-soft hover:text-mono-text"
      }`}
    >
      {children}
    </Link>
  );
}

export const metadata = {
  title: "Ownership | HRMS | Adarsh Shipping",
};

export default async function OwnershipPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  await requirePermission(session.user.id, "hrms.hierarchy.manage");
  const orgId = session.user.orgId;
  if (!orgId) {
    return (
      <div className="rounded-xl border border-mono-border bg-mono-card p-8 text-center text-sm text-mono-muted">
        Organisation configuration missing.
      </div>
    );
  }

  const sp = await searchParams;
  const activeTab = ["tl", "manager", "departments"].includes(sp.tab ?? "")
    ? sp.tab!
    : "tl";
  const { users, departments, divisions } = await loadData(orgId);

  const tlUsers = users.filter((u) =>
    u.roles.some((ur) => ur.role.name === "TL"),
  );
  const managerUsers = users.filter((u) =>
    u.roles.some((ur) => ur.role.name === "Manager"),
  );
  const appraisableNonTl = users.filter(
    (u) =>
      !u.roles.some((ur) =>
        ["TL", "Manager", "HR", "Admin", "Management", "Director"].includes(
          ur.role.name,
        ),
      ),
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
      if (!usersByDivision.has(u.divisionId))
        usersByDivision.set(u.divisionId, []);
      usersByDivision.get(u.divisionId)!.push(u);
    }
  }

  const selectClass =
    "flex h-11 w-full rounded-xl border border-[var(--mnx-accent)]/55 bg-mono-card px-4 py-2.5 text-mono-text focus:outline-none focus:ring-2 focus:ring-primary/15 hover:border-[var(--mnx-accent)]/85 transition";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm text-mono-muted text-[var(--mnx-muted)] font-medium">
            Define organizational hierarchy, team leads, and managers reporting
            lines.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-mono-border pb-4">
        <TabLink tab="tl" activeTab={activeTab}>
          TL Ownership
        </TabLink>
        <TabLink tab="manager" activeTab={activeTab}>
          Manager Ownership
        </TabLink>
        <TabLink tab="departments" activeTab={activeTab}>
          Department / Division Mapping
        </TabLink>
      </div>

      {/* ── TL Ownership Tab ── */}
      {activeTab === "tl" && (
        <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
          {/* TL list with employees */}
          <section className="space-y-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-mono-text text-[var(--mnx-muted)]">
              <UserCheck className="size-4 text-[var(--mnx-accent)]" /> TL Teams
            </h2>
            {tlUsers.length === 0 && (
              <div className="rounded-xl border border-mono-border bg-mono-card p-8 text-center text-sm text-mono-muted">
                No Team Lead (TL) role users found.
              </div>
            )}
            {tlUsers.map((tl) => {
              const owned = employeesByTl.get(tl.id) ?? [];
              return (
                <div
                  key={tl.id}
                  className="rounded-xl border border-mono-border bg-mono-card shadow-sm overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-3 border-b border-mono-border/60 px-5 py-3.5 bg-mono-soft/50 bg-[var(--mnx-soft)]/20">
                    <div>
                      <p className="text-sm font-bold text-[var(--mnx-text)] text-[var(--mnx-text)]">
                        {toTitleCase(tl.name)}
                      </p>
                      <p className="text-[11px] font-medium text-[var(--mnx-muted)]">
                        {tl.department?.name ?? "No department"} · TL
                      </p>
                    </div>
                    <span className="rounded-full bg-mono-soft bg-[var(--mnx-soft)] px-2.5 py-1 text-[11px] font-semibold text-mono-muted text-[var(--mnx-muted)]">
                      {owned.length} employee{owned.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="divide-y divide-outline-variant/60">
                    {owned.map((emp) => (
                      <div
                        key={emp.id}
                        className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-mono-soft/30 hover:bg-[var(--mnx-soft)]/10 transition"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-[var(--mnx-text)] text-[var(--mnx-muted)]">
                            {emp.employeeNumber
                              ? `${emp.employeeNumber} – `
                              : ""}
                            {toTitleCase(emp.name)}
                          </p>
                          <p className="truncate text-[11px] font-medium text-[var(--mnx-muted)]">
                            {emp.department?.name ?? "—"} ·{" "}
                            {emp.designation ?? "Employee"}
                          </p>
                        </div>
                        <form action={unassignEmployeeFromTlAction}>
                          <MnxInput
                            type="hidden"
                            name="employeeId"
                            value={emp.id}
                          />
                          <Button
                            type="submit"
                            variant="outline"
                            size="sm"
                            className="text-[var(--mnx-danger)] hover:text-[var(--mnx-danger)] text-xs font-semibold h-8 border-[var(--mnx-danger)] hover:border-[var(--mnx-danger)] hover:bg-[var(--mnx-danger-bg)]/30"
                          >
                            Remove
                          </Button>
                        </form>
                      </div>
                    ))}
                    {owned.length === 0 && (
                      <p className="px-5 py-4 text-xs font-medium text-[var(--mnx-muted)]">
                        No employees assigned to this Team Lead.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            {unassignedEmployees.length > 0 && (
              <div className="rounded-xl border border-[var(--mnx-warning)] bg-[var(--mnx-warning-bg)]/50 p-4 border-[var(--mnx-warning)]/50 bg-[var(--mnx-warning-bg)]/10">
                <p className="text-xs font-bold text-[var(--mnx-warning)] text-[var(--mnx-warning)]">
                  Unassigned Employees ({unassignedEmployees.length})
                </p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {unassignedEmployees.map((u) => (
                    <span
                      key={u.id}
                      className="rounded-lg border border-[var(--mnx-warning)]/60 bg-mono-card px-2.5 py-1 text-[11px] font-semibold text-[var(--mnx-warning)]/80 border-[var(--mnx-warning)]/60 text-[var(--mnx-warning)]"
                    >
                      {u.employeeNumber ? `${u.employeeNumber} – ` : ""}
                      {toTitleCase(u.name)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Assign form */}
          <section>
            <form
              action={assignEmployeesToTlAction}
              className="rounded-xl border border-mono-border bg-mono-card p-5 space-y-4 shadow-sm"
            >
              <h2 className="flex items-center gap-2 text-sm font-semibold text-mono-text text-[var(--mnx-muted)]">
                <Users className="size-4 text-[var(--mnx-accent)]" /> Assign to
                TL
              </h2>
              <div className="space-y-1.5">
                <Label>Team Lead</Label>
                <NativeSelect name="tlId" required className={selectClass}>
                  <option value="" className="bg-mono-card">
                    Choose TL
                  </option>
                  {tlUsers.map((tl) => (
                    <option key={tl.id} value={tl.id} className="bg-mono-card">
                      {tl.employeeNumber ? `${tl.employeeNumber} – ` : ""}
                      {toTitleCase(tl.name)}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <Label>Employees (select one or more)</Label>
                <div className="max-h-[350px] space-y-1 overflow-y-auto rounded-xl border border-mono-border/60 p-2.5">
                  {appraisableNonTl.map((u) => (
                    <label
                      key={u.id}
                      className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-xs hover:bg-mono-soft hover:bg-[var(--mnx-soft)]/30 cursor-pointer font-medium text-[var(--mnx-text)] text-[var(--mnx-muted)]"
                    >
                      <MnxInput
                        type="checkbox"
                        name="employeeId"
                        value={u.id}
                        className="accent-[var(--mnx-accent)] size-4 rounded cursor-pointer"
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {u.employeeNumber ? `${u.employeeNumber} – ` : ""}
                        {toTitleCase(u.name)}
                      </span>
                      <span className="text-[10px] text-[var(--mnx-muted)] bg-mono-soft bg-[var(--mnx-soft)] px-1.5 py-0.5 rounded font-semibold shrink-0">
                        {u.tl ? toTitleCase(u.tl.name) : "Unassigned"}
                      </span>
                    </label>
                  ))}
                  {appraisableNonTl.length === 0 && (
                    <p className="py-8 text-center text-xs text-[var(--mnx-muted)]">
                      No employees found.
                    </p>
                  )}
                </div>
              </div>
              <Button
                type="submit"
                className="w-full h-11 text-xs font-semibold rounded-xl bg-[var(--mnx-accent)] hover:bg-[var(--mnx-accent-soft)] text-[var(--mnx-text)]"
              >
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
            <h2 className="flex items-center gap-2 text-sm font-semibold text-mono-text text-[var(--mnx-muted)]">
              <UserCheck className="size-4 text-[var(--mnx-accent)]" /> Manager
              Teams
            </h2>
            {managerUsers.length === 0 && (
              <div className="rounded-xl border border-mono-border bg-mono-card p-8 text-center text-sm text-mono-muted">
                No Manager role users found.
              </div>
            )}
            {managerUsers.map((mgr) => {
              const ownedTls = tlsByManager.get(mgr.id) ?? [];
              const totalEmployees = ownedTls.reduce(
                (sum, tl) => sum + (employeesByTl.get(tl.id)?.length ?? 0),
                0,
              );
              return (
                <div
                  key={mgr.id}
                  className="rounded-xl border border-mono-border bg-mono-card shadow-sm overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-3 border-b border-mono-border/60 px-5 py-3.5 bg-mono-soft/50 bg-[var(--mnx-soft)]/20">
                    <div>
                      <p className="text-sm font-bold text-[var(--mnx-text)] text-[var(--mnx-text)]">
                        {toTitleCase(mgr.name)}
                      </p>
                      <p className="text-[11px] font-medium text-[var(--mnx-muted)]">
                        {mgr.department?.name ?? "No department"} · Manager
                      </p>
                    </div>
                    <span className="rounded-full bg-mono-soft bg-[var(--mnx-soft)] px-2.5 py-1 text-[11px] font-semibold text-mono-muted text-[var(--mnx-muted)]">
                      {ownedTls.length} TL{ownedTls.length === 1 ? "" : "s"} ·{" "}
                      {totalEmployees} employee{totalEmployees === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="divide-y divide-outline-variant/60 bg-mono-card">
                    {ownedTls.map((tl) => {
                      const tlEmployees = employeesByTl.get(tl.id) ?? [];
                      return (
                        <div
                          key={tl.id}
                          className="px-5 py-3.5 hover:bg-mono-soft/20 transition"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold text-[var(--mnx-text)] text-[var(--mnx-muted)]">
                                {toTitleCase(tl.name)}
                              </p>
                              <span className="rounded bg-[var(--mnx-info-bg)] text-[var(--mnx-info)] bg-[var(--mnx-info-bg)]/40 text-[var(--mnx-info)] px-1.5 py-0.5 text-[9px] font-bold">
                                TL
                              </span>
                            </div>
                            <form
                              action={unassignTlFromManagerAction}
                              className="flex items-center gap-1"
                            >
                              <MnxInput
                                type="hidden"
                                name="tlId"
                                value={tl.id}
                              />
                              <Button
                                type="submit"
                                variant="outline"
                                size="sm"
                                className="text-[var(--mnx-danger)] hover:text-[var(--mnx-danger)] text-xs font-semibold h-8 border-[var(--mnx-danger)] hover:border-[var(--mnx-danger)] hover:bg-[var(--mnx-danger-bg)]/30"
                              >
                                Remove
                              </Button>
                            </form>
                          </div>
                          {tlEmployees.length > 0 && (
                            <div className="mt-2.5 flex flex-wrap gap-1.5 pl-3.5 border-l-2 border-mono-border">
                              {tlEmployees.map((emp) => (
                                <span
                                  key={emp.id}
                                  className="rounded-md border border-mono-border bg-mono-soft/50 bg-[var(--mnx-soft)]/20 px-2 py-0.5 text-[10px] font-semibold text-mono-muted text-[var(--mnx-muted)]"
                                >
                                  {emp.employeeNumber
                                    ? `${emp.employeeNumber} – `
                                    : ""}
                                  {toTitleCase(emp.name)}
                                </span>
                              ))}
                            </div>
                          )}
                          {tlEmployees.length === 0 && (
                            <p className="mt-1 pl-3.5 text-[10px] font-medium text-[var(--mnx-muted)]">
                              No employees under this Team Lead.
                            </p>
                          )}
                        </div>
                      );
                    })}
                    {ownedTls.length === 0 && (
                      <p className="px-5 py-4 text-xs font-medium text-[var(--mnx-muted)]">
                        No Team Leads assigned to this Manager.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            {unassignedTls.length > 0 && (
              <div className="rounded-xl border border-[var(--mnx-warning)] bg-[var(--mnx-warning-bg)]/50 p-4 border-[var(--mnx-warning)]/50 bg-[var(--mnx-warning-bg)]/10">
                <p className="text-xs font-bold text-[var(--mnx-warning)] text-[var(--mnx-warning)]">
                  Unassigned Team Leads ({unassignedTls.length})
                </p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {unassignedTls.map((tl) => (
                    <span
                      key={tl.id}
                      className="rounded-lg border border-[var(--mnx-warning)]/60 bg-mono-card px-2.5 py-1 text-[11px] font-semibold text-[var(--mnx-warning)]/80 border-[var(--mnx-warning)]/60 text-[var(--mnx-warning)]"
                    >
                      {toTitleCase(tl.name)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Assign TLs to manager form */}
          <section>
            <form
              action={assignTlsToManagerAction}
              className="rounded-xl border border-mono-border bg-mono-card p-5 space-y-4 shadow-sm"
            >
              <h2 className="flex items-center gap-2 text-sm font-semibold text-mono-text text-[var(--mnx-muted)]">
                <Users className="size-4 text-[var(--mnx-accent)]" /> Assign TL
                to Manager
              </h2>
              <div className="space-y-1.5">
                <Label>Manager</Label>
                <NativeSelect name="managerId" required className={selectClass}>
                  <option value="" className="bg-mono-card">
                    Choose Manager
                  </option>
                  {managerUsers.map((mgr) => (
                    <option
                      key={mgr.id}
                      value={mgr.id}
                      className="bg-mono-card"
                    >
                      {mgr.employeeNumber ? `${mgr.employeeNumber} – ` : ""}
                      {toTitleCase(mgr.name)}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <Label>Team Leads (select one or more)</Label>
                <div className="max-h-[350px] space-y-1 overflow-y-auto rounded-xl border border-mono-border/60 p-2.5">
                  {tlUsers.map((tl) => (
                    <label
                      key={tl.id}
                      className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-xs hover:bg-mono-soft hover:bg-[var(--mnx-soft)]/30 cursor-pointer font-medium text-[var(--mnx-text)] text-[var(--mnx-muted)]"
                    >
                      <MnxInput
                        type="checkbox"
                        name="tlId"
                        value={tl.id}
                        className="accent-[var(--mnx-accent)] size-4 rounded cursor-pointer"
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {tl.employeeNumber ? `${tl.employeeNumber} – ` : ""}
                        {toTitleCase(tl.name)}
                      </span>
                      <span className="text-[10px] text-[var(--mnx-muted)] bg-mono-soft bg-[var(--mnx-soft)] px-1.5 py-0.5 rounded font-semibold shrink-0">
                        {tl.managerId
                          ? toTitleCase(
                              users.find((u) => u.id === tl.managerId)?.name,
                            )
                          : "Unassigned"}
                      </span>
                    </label>
                  ))}
                  {tlUsers.length === 0 && (
                    <p className="py-8 text-center text-xs text-[var(--mnx-muted)]">
                      No TL users found.
                    </p>
                  )}
                </div>
              </div>
              <Button
                type="submit"
                className="w-full h-11 text-xs font-semibold rounded-xl bg-[var(--mnx-accent)] hover:bg-[var(--mnx-accent-soft)] text-[var(--mnx-text)]"
              >
                Assign Selected Team Leads
              </Button>
            </form>
          </section>
        </div>
      )}

      {/* ── Department/Division Mapping Tab ── */}
      {activeTab === "departments" && (
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-mono-text text-[var(--mnx-muted)]">
            <Building2 className="size-4 text-[var(--mnx-accent)]" /> Hierarchy
            Map
          </h2>
          <div className="overflow-hidden rounded-xl border border-mono-border bg-mono-card shadow-sm">
            <div className="overflow-x-auto">
              <MnxTable className="w-full min-w-[800px] text-sm text-left">
                <thead>
                  <tr className="border-b border-mono-border bg-mono-soft bg-[var(--mnx-soft)]/30 text-xs font-bold text-mono-muted text-[var(--mnx-muted)]">
                    <th className="px-5 py-3.5 font-semibold">
                      Department / Division
                    </th>
                    <th className="px-5 py-3.5 font-semibold">Managers</th>
                    <th className="px-5 py-3.5 font-semibold">Team Leads</th>
                    <th className="px-5 py-3.5 font-semibold">Employees</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/60 font-medium text-[var(--mnx-text)] text-[var(--mnx-muted)]">
                  {departments.map((dept) => {
                    const divs = divisionsByDept.get(dept.id) ?? [];
                    const deptUsers = usersByDept.get(dept.id) ?? [];
                    const deptTls = deptUsers.filter((u) =>
                      u.roles.some((ur) => ur.role.name === "TL"),
                    );
                    const deptManagers = deptUsers.filter((u) =>
                      u.roles.some((ur) => ur.role.name === "Manager"),
                    );
                    const deptEmployees = deptUsers.filter(
                      (u) =>
                        !u.roles.some((ur) =>
                          [
                            "TL",
                            "Manager",
                            "Admin",
                            "Management",
                            "Director",
                          ].includes(ur.role.name),
                        ),
                    );

                    if (divs.length === 0) {
                      return (
                        <tr
                          key={dept.id}
                          className="hover:bg-mono-soft/30 hover:bg-[var(--mnx-soft)]/5 transition"
                        >
                          <td className="px-5 py-4 font-bold text-[var(--mnx-text)] text-[var(--mnx-text)] flex items-center gap-1.5">
                            <ChevronRight className="size-4 text-[var(--mnx-muted)]" />
                            {dept.name}
                          </td>
                          <td className="px-5 py-4 text-xs font-semibold text-mono-muted">
                            {deptManagers.length > 0
                              ? deptManagers
                                  .map((m) => toTitleCase(m.name))
                                  .join(", ")
                              : "—"}
                          </td>
                          <td className="px-5 py-4 text-xs font-semibold text-mono-muted">
                            {deptTls.length > 0
                              ? deptTls
                                  .map((t) => toTitleCase(t.name))
                                  .join(", ")
                              : "—"}
                          </td>
                          <td className="px-5 py-4 text-xs font-semibold text-mono-muted">
                            {deptEmployees.length > 0 ? (
                              <span className="rounded-full bg-mono-soft bg-[var(--mnx-soft)] px-2 py-0.5">
                                {deptEmployees.length} employee
                                {deptEmployees.length === 1 ? "" : "s"}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <Fragment key={dept.id}>
                        <tr className="bg-mono-soft/50 bg-[var(--mnx-soft)]/10 font-bold border-y border-mono-border/40">
                          <td
                            className="px-5 py-3 font-extrabold text-[var(--mnx-text)] text-[var(--mnx-text)]"
                            colSpan={4}
                          >
                            {dept.name}
                            <span className="ml-2.5 rounded bg-[var(--mnx-info-bg)] text-[var(--mnx-info)] bg-[var(--mnx-info-bg)]/40 text-[var(--mnx-info)] px-2 py-0.5 text-[10px] font-bold">
                              {divs.length} division
                              {divs.length === 1 ? "" : "s"}
                            </span>
                          </td>
                        </tr>
                        {divs.map((div) => {
                          const divUsers = usersByDivision.get(div.id) ?? [];
                          const divTls = divUsers.filter((u) =>
                            u.roles.some((ur) => ur.role.name === "TL"),
                          );
                          const divManagers = divUsers.filter((u) =>
                            u.roles.some((ur) => ur.role.name === "Manager"),
                          );
                          const divEmployees = divUsers.filter(
                            (u) =>
                              !u.roles.some((ur) =>
                                [
                                  "TL",
                                  "Manager",
                                  "Admin",
                                  "Management",
                                  "Director",
                                ].includes(ur.role.name),
                              ),
                          );
                          return (
                            <tr
                              key={div.id}
                              className="hover:bg-mono-soft/30 hover:bg-[var(--mnx-soft)]/5 transition"
                            >
                              <td className="px-5 py-3.5 pl-10 text-[var(--mnx-text)] text-[var(--mnx-muted)] font-semibold flex items-center gap-1">
                                <span className="text-[var(--mnx-muted)] mr-1.5 font-normal">
                                  └
                                </span>
                                {div.name}
                              </td>
                              <td className="px-5 py-3.5 text-xs font-semibold text-mono-muted">
                                {divManagers.length > 0
                                  ? divManagers
                                      .map((m) => toTitleCase(m.name))
                                      .join(", ")
                                  : "—"}
                              </td>
                              <td className="px-5 py-3.5 text-xs font-semibold text-mono-muted">
                                {divTls.length > 0
                                  ? divTls
                                      .map((t) => toTitleCase(t.name))
                                      .join(", ")
                                  : "—"}
                              </td>
                              <td className="px-5 py-3.5 text-xs font-semibold text-mono-muted">
                                {divEmployees.length > 0 ? (
                                  <span className="rounded-full bg-mono-soft bg-[var(--mnx-soft)] px-2 py-0.5">
                                    {divEmployees.length} employee
                                    {divEmployees.length === 1 ? "" : "s"}
                                  </span>
                                ) : (
                                  "—"
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </Fragment>
                    );
                  })}
                  {departments.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-5 py-10 text-center text-[var(--mnx-muted)]"
                      >
                        No departments found in the system.
                      </td>
                    </tr>
                  )}
                </tbody>
              </MnxTable>
            </div>
          </div>
          <p className="text-[11px] font-medium text-[var(--mnx-muted)]">
            * Manager and Team Lead columns list active users with matching
            roles who belong to the given department or division.
          </p>
        </div>
      )}
    </div>
  );
}
