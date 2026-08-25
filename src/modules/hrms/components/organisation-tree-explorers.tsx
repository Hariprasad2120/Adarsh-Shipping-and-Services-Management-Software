"use client";

import {
  ArrowRight,
  Building2,
  GitBranch,
  Landmark,
  Network,
  Search,
  ShieldCheck,
  Users2,
} from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import {
  WorkspaceBadge,
  WorkspaceField,
  WorkspaceInput,
  WorkspacePanelHeader,
  WorkspaceSelect,
  WorkspaceState,
} from "@/components/layout/workspace";
import { cn } from "@/lib/utils";

type OrganisationBranch = {
  id: string;
  name: string;
  code: string;
};

type OrganisationDivision = {
  id: string;
  name: string;
};

type OrganisationDepartment = {
  id: string;
  name: string;
  code: string;
  divisions: OrganisationDivision[];
};

type OrganisationTreeData = {
  name: string;
  branches: OrganisationBranch[];
  departments: OrganisationDepartment[];
};

type OrganisationEmployee = {
  id: string;
  name: string;
  email: string;
  designation: string;
  employeeNumber: string;
  branchId: string | null;
  branchName: string;
  departmentId: string | null;
  departmentName: string;
  divisionName: string;
  managerId: string | null;
  managerName: string;
};

type OrganisationTreeScope = "all" | "branches" | "departments";
type EmployeeTreeScope = "all" | "branch" | "department";

type OrgInput = {
  name?: string | null;
  branches?: unknown[];
  departments?: unknown[];
} | null;

function employeeMatchesFilters(
  employee: OrganisationEmployee,
  queryValue: string,
  scope: EmployeeTreeScope,
  scopeValue: string,
) {
  const matchesQuery =
    !queryValue ||
    [
      employee.name,
      employee.email,
      employee.designation,
      employee.departmentName,
      employee.branchName,
      employee.managerName,
    ].some((value) => value.toLowerCase().includes(queryValue));

  if (!matchesQuery) return false;
  if (scope === "branch")
    return scopeValue === "all" || employee.branchName === scopeValue;
  if (scope === "department")
    return scopeValue === "all" || employee.departmentName === scopeValue;
  return true;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function textValue(
  record: Record<string, unknown>,
  keys: string[],
  fallback = "",
) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number") return String(value);
  }

  return fallback;
}

function normalizeOrganisationTree(org: OrgInput): OrganisationTreeData | null {
  if (!org) return null;

  const branches = Array.isArray(org.branches)
    ? org.branches.map((value, index) => {
        const record = asRecord(value);
        return {
          id: textValue(record, ["id", "code", "name"], `branch-${index}`),
          name: textValue(record, ["name"], `Branch ${index + 1}`),
          code: textValue(record, ["code"], String(index + 1).padStart(2, "0")),
        };
      })
    : [];

  const departments = Array.isArray(org.departments)
    ? org.departments.map((value, index) => {
        const record = asRecord(value);
        const divisionsValue = record.divisions;
        const divisions = Array.isArray(divisionsValue)
          ? divisionsValue.map((divisionValue, divisionIndex) => {
              const divisionRecord = asRecord(divisionValue);
              return {
                id: textValue(
                  divisionRecord,
                  ["id", "name"],
                  `division-${index}-${divisionIndex}`,
                ),
                name: textValue(
                  divisionRecord,
                  ["name"],
                  `Division ${divisionIndex + 1}`,
                ),
              };
            })
          : [];

        return {
          id: textValue(record, ["id", "code", "name"], `department-${index}`),
          name: textValue(record, ["name"], `Department ${index + 1}`),
          code: textValue(record, ["code"], String(index + 1).padStart(2, "0")),
          divisions,
        };
      })
    : [];

  return {
    name: org.name?.trim() || "Adarsh Shipping & Services",
    branches,
    departments,
  };
}

function normalizeEmployees(values: unknown[]): OrganisationEmployee[] {
  return values.map((value, index) => {
    const record = asRecord(value);
    const branch = asRecord(record.branch);
    const department = asRecord(record.department);
    const division = asRecord(record.division);
    const manager = asRecord(record.manager);

    return {
      id: textValue(record, ["id", "employeeNumber", "employeeNo"], `employee-${index}`),
      name: textValue(record, ["name", "fullName"], "Unnamed employee"),
      email: textValue(record, ["email", "workEmail"], "No email recorded"),
      designation: textValue(record, ["designation", "role", "jobTitle"], "Team member"),
      employeeNumber: textValue(record, ["employeeNumber", "employeeNo"], "—"),
      branchId: textValue(branch, ["id"], "") || null,
      branchName: textValue(branch, ["name", "branchName"], "Branch not assigned"),
      departmentId: textValue(department, ["id"], "") || null,
      departmentName: textValue(
        department,
        ["name", "departmentName"],
        "Department not assigned",
      ),
      divisionName: textValue(division, ["name", "divisionName"], "No division"),
      managerId: textValue(record, ["managerId"], textValue(manager, ["id"], "")) || null,
      managerName: textValue(manager, ["name"], "Top-level"),
    };
  });
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function OrganisationTreeExplorer({
  className,
  description = "Inspect branches, departments, and divisions in one tree-shaped operating map.",
  org,
  title = "Organisation tree",
}: {
  className?: string;
  description?: string;
  org: OrgInput;
  title?: string;
}) {
  const normalizedOrg = useMemo(() => normalizeOrganisationTree(org), [org]);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<OrganisationTreeScope>("all");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);

  if (!normalizedOrg) {
    return (
      <WorkspaceState
        variant="empty"
        eyebrow="Organisation"
        title="Organisation data is not available"
        description="Add branches, departments, and divisions first so the organisation tree can be rendered."
        icon={<Building2 aria-hidden="true" />}
      />
    );
  }

  const queryValue = query.trim().toLowerCase();
  const filteredBranches = normalizedOrg.branches.filter((branch) =>
    `${branch.name} ${branch.code}`.toLowerCase().includes(queryValue),
  );
  const filteredDepartments = normalizedOrg.departments.filter((department) => {
    const matchesQuery =
      `${department.name} ${department.code}`.toLowerCase().includes(queryValue) ||
      department.divisions.some((division) =>
        division.name.toLowerCase().includes(queryValue),
      );
    if (!matchesQuery) return false;
    if (scope === "branches") return false;
    return true;
  });
  const selectedDepartment =
    filteredDepartments.find((department) => department.id === selectedDepartmentId) ??
    filteredDepartments[0] ??
    normalizedOrg.departments[0] ??
    null;
  const totalDivisions = normalizedOrg.departments.reduce(
    (count, department) => count + department.divisions.length,
    0,
  );
  const departmentsWithoutDivisions = normalizedOrg.departments.filter(
    (department) => department.divisions.length === 0,
  ).length;

  return (
    <div className={cn("mnx-org-visual-explorer", className)}>
      <WorkspacePanelHeader
        className="mnx-people-section-header"
        eyebrow="Explorer"
        title={title}
        description={description}
      />

      <div className="mnx-people-toolbar mnx-org-visual-toolbar">
        <div className="mnx-org-visual-search">
          <Search aria-hidden="true" />
          <WorkspaceInput
            aria-label="Search organisation hierarchy"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search branch, department, division, or code"
          />
        </div>

        <div className="mnx-org-visual-toolbar-fields">
          <WorkspaceField className="mnx-org-visual-toolbar-field" label="Scope">
            <WorkspaceSelect
              value={scope}
              onChange={(event) =>
                setScope(event.target.value as OrganisationTreeScope)
              }
            >
              <option value="all">All layers</option>
              <option value="departments">Departments only</option>
              <option value="branches">Branches only</option>
            </WorkspaceSelect>
          </WorkspaceField>
        </div>
      </div>

      <div className="mnx-org-visual-company-card">
        <div className="mnx-org-visual-company-copy">
          <span className="mnx-org-visual-company-icon">
            <Building2 aria-hidden="true" />
          </span>
          <div>
            <strong>{normalizedOrg.name}</strong>
            <p>
              Use the branch footprint, department blueprint, and division depth
              together to read the organisation shape honestly without inventing
              missing reporting links.
            </p>
          </div>
        </div>

        <div className="mnx-org-visual-company-metrics">
          <WorkspaceBadge variant="accent">
            {normalizedOrg.branches.length} branches
          </WorkspaceBadge>
          <WorkspaceBadge variant="success">
            {normalizedOrg.departments.length} departments
          </WorkspaceBadge>
          <WorkspaceBadge
            variant={departmentsWithoutDivisions === 0 ? "success" : "warning"}
          >
            {totalDivisions} divisions
          </WorkspaceBadge>
        </div>
      </div>

      <div className="mnx-org-visual-grid">
        {scope !== "departments" ? (
          <section className="mnx-org-visual-lane">
            <header className="mnx-org-visual-lane-header">
              <div>
                <span>Branch footprint</span>
                <strong>{filteredBranches.length} operating locations</strong>
              </div>
              <WorkspaceBadge
                variant={filteredBranches.length > 0 ? "success" : "warning"}
              >
                Active map
              </WorkspaceBadge>
            </header>

            <div className="mnx-org-visual-list">
              {filteredBranches.length === 0 ? (
                <VisualEmptyState
                  icon={<Landmark aria-hidden="true" />}
                  title="No branches match this view"
                  description="Adjust the search or add more operating locations to strengthen the branch network."
                />
              ) : (
                filteredBranches.map((branch) => (
                  <article key={branch.id} className="mnx-org-visual-node">
                    <div className="mnx-org-visual-node-top">
                      <span className="mnx-org-visual-chip">{branch.code}</span>
                      <WorkspaceBadge variant="neutral">Location</WorkspaceBadge>
                    </div>
                    <strong>{branch.name}</strong>
                    <p>Available for employee assignment, attendance mapping, and downstream operations.</p>
                  </article>
                ))
              )}
            </div>
          </section>
        ) : null}

        {scope !== "branches" ? (
          <section className="mnx-org-visual-lane">
            <header className="mnx-org-visual-lane-header">
              <div>
                <span>Department blueprint</span>
                <strong>{filteredDepartments.length} hierarchy nodes</strong>
              </div>
              <WorkspaceBadge
                variant={
                  departmentsWithoutDivisions === 0 ? "success" : "warning"
                }
              >
                {departmentsWithoutDivisions === 0
                  ? "Structured"
                  : `${departmentsWithoutDivisions} gaps`}
              </WorkspaceBadge>
            </header>

            <div className="mnx-org-visual-list">
              {filteredDepartments.length === 0 ? (
                <VisualEmptyState
                  icon={<Network aria-hidden="true" />}
                  title="No departments match this view"
                  description="Search again or add departments to begin shaping the organisation hierarchy."
                />
              ) : (
                filteredDepartments.map((department) => (
                  // eslint-disable-next-line no-restricted-syntax -- This is an intentional full-card hierarchy selection control, not a generic action button.
                  <button
                    type="button"
                    key={department.id}
                    className={cn(
                      "mnx-org-visual-node mnx-org-visual-node-button",
                      selectedDepartment?.id === department.id && "is-active",
                    )}
                    onClick={() => setSelectedDepartmentId(department.id)}
                  >
                    <div className="mnx-org-visual-node-top">
                      <span className="mnx-org-visual-chip">{department.code}</span>
                      <WorkspaceBadge
                        variant={
                          department.divisions.length > 0 ? "accent" : "warning"
                        }
                      >
                        {department.divisions.length > 0
                          ? `${department.divisions.length} divisions`
                          : "Needs division"}
                      </WorkspaceBadge>
                    </div>
                    <strong>{department.name}</strong>
                    <p>
                      {department.divisions.length > 0
                        ? department.divisions.map((division) => division.name).join(" • ")
                        : "No division layer exists yet for this department."}
                    </p>
                  </button>
                ))
              )}
            </div>
          </section>
        ) : null}

        <aside className="mnx-org-visual-focus">
          <header className="mnx-org-visual-lane-header">
            <div>
              <span>Focus panel</span>
              <strong>
                {selectedDepartment ? selectedDepartment.name : "No department selected"}
              </strong>
            </div>
            <WorkspaceBadge
              variant={
                selectedDepartment?.divisions.length ? "success" : "warning"
              }
            >
              {selectedDepartment?.divisions.length
                ? "Ready"
                : "Needs framing"}
            </WorkspaceBadge>
          </header>

          {selectedDepartment ? (
            <div className="mnx-org-visual-focus-stack">
              <article className="mnx-org-visual-spotlight">
                <span className="mnx-org-visual-chip">{selectedDepartment.code}</span>
                <strong>{selectedDepartment.name}</strong>
                <p>
                  {selectedDepartment.divisions.length > 0
                    ? `${selectedDepartment.divisions.length} operating division${
                        selectedDepartment.divisions.length === 1 ? "" : "s"
                      } currently shape this department.`
                    : "This department is still waiting for its first division layer."}
                </p>
              </article>

              <div className="mnx-org-visual-division-stack">
                {selectedDepartment.divisions.length > 0 ? (
                  selectedDepartment.divisions.map((division, index) => (
                    <div key={division.id} className="mnx-org-visual-step">
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <div>
                        <strong>{division.name}</strong>
                        <p>Division within {selectedDepartment.name}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <VisualEmptyState
                    icon={<GitBranch aria-hidden="true" />}
                    title="Division framing is pending"
                    description="Add subordinate units for teams, desks, or service lines to complete this department."
                  />
                )}
              </div>
            </div>
          ) : (
            <VisualEmptyState
              icon={<ShieldCheck aria-hidden="true" />}
              title="Select a department"
              description="Choose a department from the hierarchy lane to inspect its internal structure and division readiness."
            />
          )}
        </aside>
      </div>
    </div>
  );
}

export function EmployeeTreeExplorer({
  className,
  description = "Read the reporting structure through leaders, direct reports, and second-line visibility.",
  employees,
  title = "Employee tree",
}: {
  className?: string;
  description?: string;
  employees: unknown[];
  title?: string;
}) {
  const normalizedEmployees = useMemo(
    () => normalizeEmployees(employees),
    [employees],
  );
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<EmployeeTreeScope>("all");
  const [scopeValue, setScopeValue] = useState("all");
  const [selectedLeaderId, setSelectedLeaderId] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const queryValue = query.trim().toLowerCase();

  const employeeMap = useMemo(
    () => new Map(normalizedEmployees.map((employee) => [employee.id, employee])),
    [normalizedEmployees],
  );
  const directReportMap = useMemo(() => {
    const reportMap = new Map<string, OrganisationEmployee[]>();

    for (const employee of normalizedEmployees) {
      if (!employee.managerId) continue;
      const current = reportMap.get(employee.managerId) ?? [];
      current.push(employee);
      reportMap.set(employee.managerId, current);
    }

    for (const reports of reportMap.values()) {
      reports.sort((left, right) =>
        left.name.localeCompare(right.name, undefined, { sensitivity: "base" }),
      );
    }

    return reportMap;
  }, [normalizedEmployees]);

  const branchOptions = useMemo(
    () =>
      Array.from(
        new Set(
          normalizedEmployees
            .map((employee) => employee.branchName)
            .filter((value) => value && value !== "Branch not assigned"),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    [normalizedEmployees],
  );

  const departmentOptions = useMemo(
    () =>
      Array.from(
        new Set(
          normalizedEmployees
            .map((employee) => employee.departmentName)
            .filter((value) => value && value !== "Department not assigned"),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    [normalizedEmployees],
  );

  const leaders = useMemo(() => {
    const rootCandidates = normalizedEmployees.filter((employee) => {
      if (!directReportMap.has(employee.id)) return false;
      return !employee.managerId || !employeeMap.has(employee.managerId);
    });

    const filtered = rootCandidates.filter((leader) => {
      if (employeeMatchesFilters(leader, queryValue, scope, scopeValue)) return true;
      const directs = directReportMap.get(leader.id) ?? [];
      return directs.some((report) => {
        if (employeeMatchesFilters(report, queryValue, scope, scopeValue))
          return true;
        return (directReportMap.get(report.id) ?? []).some((employee) =>
          employeeMatchesFilters(employee, queryValue, scope, scopeValue),
        );
      });
    });

    return filtered.sort((left, right) => {
      const countDelta =
        (directReportMap.get(right.id)?.length ?? 0) -
        (directReportMap.get(left.id)?.length ?? 0);
      if (countDelta !== 0) return countDelta;
      return left.name.localeCompare(right.name, undefined, {
        sensitivity: "base",
      });
    });
  }, [directReportMap, employeeMap, normalizedEmployees, queryValue, scope, scopeValue]);

  const selectedLeader =
    leaders.find((leader) => leader.id === selectedLeaderId) ?? leaders[0] ?? null;
  const directReports = useMemo(
    () =>
      selectedLeader
        ? (directReportMap.get(selectedLeader.id) ?? []).filter((employee) =>
            employeeMatchesFilters(employee, queryValue, scope, scopeValue),
          )
        : [],
    [directReportMap, queryValue, scope, scopeValue, selectedLeader],
  );
  const selectedReport =
    directReports.find((report) => report.id === selectedReportId) ??
    directReports[0] ??
    null;
  const secondLineReports = useMemo(
    () =>
      selectedReport
        ? (directReportMap.get(selectedReport.id) ?? []).filter((employee) =>
            employeeMatchesFilters(employee, queryValue, scope, scopeValue),
          )
        : [],
    [directReportMap, queryValue, scope, scopeValue, selectedReport],
  );
  const mappedEmployees = normalizedEmployees.filter(
    (employee) => employee.managerId && employeeMap.has(employee.managerId),
  ).length;

  if (normalizedEmployees.length === 0) {
    return (
      <WorkspaceState
        variant="empty"
        eyebrow="Organisation"
        title="Employee hierarchy is not available"
        description="Add active employees first so the employee tree can show reporting visibility."
        icon={<Users2 aria-hidden="true" />}
      />
    );
  }

  return (
    <div className={cn("mnx-org-visual-explorer", className)}>
      <WorkspacePanelHeader
        className="mnx-people-section-header"
        eyebrow="Explorer"
        title={title}
        description={description}
      />

      <div className="mnx-people-toolbar mnx-org-visual-toolbar">
        <div className="mnx-org-visual-search">
          <Search aria-hidden="true" />
          <WorkspaceInput
            aria-label="Search employee hierarchy"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search employee, manager, department, branch, or role"
          />
        </div>

        <div className="mnx-org-visual-toolbar-fields">
          <WorkspaceField className="mnx-org-visual-toolbar-field" label="Group by">
            <WorkspaceSelect
              value={scope}
              onChange={(event) => {
                const nextScope = event.target.value as EmployeeTreeScope;
                setScope(nextScope);
                setScopeValue("all");
              }}
            >
              <option value="all">All employees</option>
              <option value="branch">Branch</option>
              <option value="department">Department</option>
            </WorkspaceSelect>
          </WorkspaceField>

          {scope !== "all" ? (
            <WorkspaceField
              className="mnx-org-visual-toolbar-field"
              label={scope === "branch" ? "Branch" : "Department"}
            >
              <WorkspaceSelect
                value={scopeValue}
                onChange={(event) => setScopeValue(event.target.value)}
              >
                <option value="all">All</option>
                {(scope === "branch" ? branchOptions : departmentOptions).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </WorkspaceSelect>
            </WorkspaceField>
          ) : null}
        </div>
      </div>

      <div className="mnx-org-visual-company-card">
        <div className="mnx-org-visual-company-copy">
          <span className="mnx-org-visual-company-icon">
            <Users2 aria-hidden="true" />
          </span>
          <div>
            <strong>Reporting visibility</strong>
            <p>
              This tree reads current manager mappings. Employees without a
              linked manager stay visible, but they do not appear inside a
              supervised reporting chain.
            </p>
          </div>
        </div>

        <div className="mnx-org-visual-company-metrics">
          <WorkspaceBadge variant="accent">
            {normalizedEmployees.length} active employees
          </WorkspaceBadge>
          <WorkspaceBadge
            variant={leaders.length > 0 ? "success" : "warning"}
          >
            {leaders.length} top-level leads
          </WorkspaceBadge>
          <WorkspaceBadge
            variant={
              mappedEmployees === normalizedEmployees.length ? "success" : "warning"
            }
          >
            {mappedEmployees} mapped reports
          </WorkspaceBadge>
        </div>
      </div>

      <div className="mnx-org-employee-grid">
        <section className="mnx-org-visual-lane">
          <header className="mnx-org-visual-lane-header">
            <div>
              <span>Leadership layer</span>
              <strong>{leaders.length} visible leaders</strong>
            </div>
            <WorkspaceBadge
              variant={leaders.length > 0 ? "success" : "warning"}
            >
              Root nodes
            </WorkspaceBadge>
          </header>

          <div className="mnx-org-visual-list">
            {leaders.length === 0 ? (
              <VisualEmptyState
                icon={<ShieldCheck aria-hidden="true" />}
                title="No reporting roots match this view"
                description="Search more broadly or complete manager mappings so the employee tree can be built."
              />
            ) : (
              leaders.map((leader) => (
                // eslint-disable-next-line no-restricted-syntax -- This is an intentional full-card hierarchy selection control, not a generic action button.
                <button
                  type="button"
                  key={leader.id}
                  className={cn(
                    "mnx-org-person-card",
                    selectedLeader?.id === leader.id && "is-active",
                  )}
                  onClick={() => setSelectedLeaderId(leader.id)}
                >
                  <span className="mnx-org-person-avatar">{initials(leader.name)}</span>
                  <div className="mnx-org-person-copy">
                    <strong>{leader.name}</strong>
                    <p>{leader.designation}</p>
                    <small>
                      {leader.departmentName} • {directReportMap.get(leader.id)?.length ?? 0} direct reports
                    </small>
                  </div>
                  <ArrowRight aria-hidden="true" />
                </button>
              ))
            )}
          </div>
        </section>

        <section className="mnx-org-visual-lane">
          <header className="mnx-org-visual-lane-header">
            <div>
              <span>Direct reports</span>
              <strong>
                {selectedLeader ? selectedLeader.name : "Choose a leader"}
              </strong>
            </div>
            <WorkspaceBadge
              variant={directReports.length > 0 ? "accent" : "warning"}
            >
              {directReports.length} people
            </WorkspaceBadge>
          </header>

          <div className="mnx-org-visual-list">
            {selectedLeader ? (
              directReports.length > 0 ? (
                directReports.map((report) => (
                  // eslint-disable-next-line no-restricted-syntax -- This is an intentional full-card hierarchy selection control, not a generic action button.
                  <button
                    type="button"
                    key={report.id}
                    className={cn(
                      "mnx-org-person-card",
                      selectedReport?.id === report.id && "is-active",
                    )}
                    onClick={() => setSelectedReportId(report.id)}
                  >
                    <span className="mnx-org-person-avatar">{initials(report.name)}</span>
                    <div className="mnx-org-person-copy">
                      <strong>{report.name}</strong>
                      <p>{report.designation}</p>
                      <small>
                        {report.departmentName} • {directReportMap.get(report.id)?.length ?? 0} second-line reports
                      </small>
                    </div>
                    <ArrowRight aria-hidden="true" />
                  </button>
                ))
              ) : (
                <VisualEmptyState
                  icon={<Users2 aria-hidden="true" />}
                  title="No direct reports match this view"
                  description="This leader has no visible direct reports in the current filter scope."
                />
              )
            ) : (
              <VisualEmptyState
                icon={<Users2 aria-hidden="true" />}
                title="Choose a leader"
                description="Select a root node to inspect the next reporting layer."
              />
            )}
          </div>
        </section>

        <section className="mnx-org-visual-lane">
          <header className="mnx-org-visual-lane-header">
            <div>
              <span>Second line</span>
              <strong>
                {selectedReport ? selectedReport.name : "Extended team view"}
              </strong>
            </div>
            <WorkspaceBadge
              variant={secondLineReports.length > 0 ? "success" : "neutral"}
            >
              {secondLineReports.length} people
            </WorkspaceBadge>
          </header>

          <div className="mnx-org-visual-list">
            {selectedReport && secondLineReports.length > 0 ? (
              secondLineReports.map((report) => (
                <article key={report.id} className="mnx-org-person-card is-static">
                  <span className="mnx-org-person-avatar">{initials(report.name)}</span>
                  <div className="mnx-org-person-copy">
                    <strong>{report.name}</strong>
                    <p>{report.designation}</p>
                    <small>
                      {report.departmentName} • {report.branchName}
                    </small>
                  </div>
                </article>
              ))
            ) : selectedLeader ? (
              <article className="mnx-org-visual-spotlight">
                <span className="mnx-org-visual-chip">
                  {selectedLeader.employeeNumber}
                </span>
                <strong>{selectedLeader.name}</strong>
                <p>
                  {selectedLeader.designation} leads the current visible span
                  from {selectedLeader.branchName}. Select a direct report with
                  subordinates to extend the tree further.
                </p>
                <div className="mnx-org-visual-inline-meta">
                  <WorkspaceBadge variant="neutral">
                    {selectedLeader.departmentName}
                  </WorkspaceBadge>
                  <WorkspaceBadge variant="neutral">
                    {selectedLeader.branchName}
                  </WorkspaceBadge>
                </div>
              </article>
            ) : (
              <VisualEmptyState
                icon={<Network aria-hidden="true" />}
                title="The employee tree is waiting"
                description="Choose a leader and a direct report to inspect the second reporting layer."
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function VisualEmptyState({
  description,
  icon,
  title,
}: {
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="mnx-org-visual-empty">
      <span>{icon}</span>
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
    </div>
  );
}
