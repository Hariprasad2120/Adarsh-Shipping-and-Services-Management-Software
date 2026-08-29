"use client";

import {
  AlertTriangle,
  ArrowRightLeft,
  Building2,
  GitBranch,
  Network,
  Search,
  ShieldCheck,
  Users,
  UserCheck,
  UserCog,
} from "lucide-react";
import { useState } from "react";
import {
  PeoplePerson,
  PeopleSection,
  PeopleSummary,
  PeopleSummaryGrid,
  PeopleTable,
  PeopleTableBody,
  PeopleTableCell,
  PeopleTableEmpty,
  PeopleTableHead,
  PeopleTableHeader,
  PeopleTableRow,
  PeopleTableToolbar,
} from "@/components/monolith";
import {
  WorkspaceAction,
  WorkspaceAlert,
  WorkspaceBadge,
  WorkspaceField,
  WorkspaceInput,
  WorkspacePanel,
  WorkspacePanelHeader,
  WorkspaceSectionHeading,
  WorkspaceSelect,
} from "@/components/layout/workspace";
import {
  assignEmployeesToTlAction,
  assignTlsToManagerAction,
  unassignEmployeeFromTlAction,
  unassignTlFromManagerAction,
} from "@/modules/hrms/ownership-actions";

type OwnershipUser = {
  id: string;
  name: string;
  employeeNumber: string | null;
  designation: string | null;
  departmentId: string | null;
  departmentName: string | null;
  divisionId: string | null;
  divisionName: string | null;
  tlId: string | null;
  managerId: string | null;
  roles: string[];
};

type OwnershipDepartment = {
  id: string;
  name: string;
};

type OwnershipDivision = {
  id: string;
  name: string;
  departmentId: string;
};

type OwnershipReportingWorkspaceProps = {
  departments: OwnershipDepartment[];
  divisions: OwnershipDivision[];
  users: OwnershipUser[];
};

type OwnershipView = "overview" | "tl" | "manager" | "departments";
type TlRosterFilter = "all" | "active" | "unassigned" | "stretched";
type ManagerRosterFilter = "all" | "active" | "unassigned" | "stretched";
type PoolMode = "unassigned" | "all" | "department";
type DepartmentFilter = "all" | "gaps" | "healthy";

const leadershipExclusions = new Set([
  "TL",
  "Manager",
  "HR",
  "Admin",
  "Management",
  "Director",
]);

export function OwnershipReportingWorkspace({
  departments,
  divisions,
  users,
}: OwnershipReportingWorkspaceProps) {
  const [activeView, setActiveView] = useState<OwnershipView>("overview");
  const [tlSearch, setTlSearch] = useState("");
  const [tlRosterFilter, setTlRosterFilter] = useState<TlRosterFilter>("all");
  const [selectedTlId, setSelectedTlId] = useState("");
  const [employeePoolMode, setEmployeePoolMode] =
    useState<PoolMode>("unassigned");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [managerSearch, setManagerSearch] = useState("");
  const [managerRosterFilter, setManagerRosterFilter] =
    useState<ManagerRosterFilter>("all");
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [tlPoolMode, setTlPoolMode] = useState<PoolMode>("unassigned");
  const [tlPoolSearch, setTlPoolSearch] = useState("");
  const [selectedTlIds, setSelectedTlIds] = useState<string[]>([]);
  const [departmentSearch, setDepartmentSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] =
    useState<DepartmentFilter>("all");

  const tlUsers = users.filter((user) => user.roles.includes("TL"));
  const managerUsers = users.filter((user) => user.roles.includes("Manager"));
  const individualContributors = users.filter(
    (user) => !user.roles.some((role) => leadershipExclusions.has(role)),
  );

  const divisionsByDepartment = new Map<string, OwnershipDivision[]>();
  for (const division of divisions) {
    const current = divisionsByDepartment.get(division.departmentId) ?? [];
    current.push(division);
    divisionsByDepartment.set(division.departmentId, current);
  }

  const employeesByTl = new Map<string, OwnershipUser[]>();
  for (const tl of tlUsers) employeesByTl.set(tl.id, []);
  for (const employee of individualContributors) {
    if (!employee.tlId) continue;
    const current = employeesByTl.get(employee.tlId) ?? [];
    current.push(employee);
    employeesByTl.set(employee.tlId, current);
  }

  const tlsByManager = new Map<string, OwnershipUser[]>();
  for (const manager of managerUsers) tlsByManager.set(manager.id, []);
  for (const tl of tlUsers) {
    if (!tl.managerId) continue;
    const current = tlsByManager.get(tl.managerId) ?? [];
    current.push(tl);
    tlsByManager.set(tl.managerId, current);
  }

  const usersByDepartment = new Map<string, OwnershipUser[]>();
  const usersByDivision = new Map<string, OwnershipUser[]>();
  for (const user of users) {
    if (user.departmentId) {
      const current = usersByDepartment.get(user.departmentId) ?? [];
      current.push(user);
      usersByDepartment.set(user.departmentId, current);
    }
    if (user.divisionId) {
      const current = usersByDivision.get(user.divisionId) ?? [];
      current.push(user);
      usersByDivision.set(user.divisionId, current);
    }
  }

  const unassignedEmployees = individualContributors.filter(
    (user) => !user.tlId,
  );
  const unassignedTls = tlUsers.filter((user) => !user.managerId);
  const departmentsWithGaps = departments.filter((department) => {
    const departmentUsers = usersByDepartment.get(department.id) ?? [];
    const managerCount = departmentUsers.filter((user) =>
      user.roles.includes("Manager"),
    ).length;
    const tlCount = departmentUsers.filter((user) => user.roles.includes("TL"))
      .length;
    const divisionCount = (divisionsByDepartment.get(department.id) ?? []).length;

    return managerCount === 0 || tlCount === 0 || divisionCount === 0;
  });

  const tlCoveragePercent =
    individualContributors.length === 0
      ? 100
      : Math.round(
          ((individualContributors.length - unassignedEmployees.length) /
            individualContributors.length) *
            100,
        );
  const managerCoveragePercent =
    tlUsers.length === 0
      ? 100
      : Math.round(((tlUsers.length - unassignedTls.length) / tlUsers.length) * 100);
  const departmentCoveragePercent =
    departments.length === 0
      ? 100
      : Math.round(
          ((departments.length - departmentsWithGaps.length) / departments.length) *
            100,
        );

  const selectedTl = tlUsers.find((user) => user.id === selectedTlId) ?? null;
  const selectedManager =
    managerUsers.find((user) => user.id === selectedManagerId) ?? null;

  const tlSearchValue = tlSearch.trim().toLowerCase();
  const filteredTlUsers = tlUsers.filter((user) => {
    const ownedEmployees = employeesByTl.get(user.id) ?? [];
    const matchesSearch = matchesQuery(
      [
        user.name,
        user.employeeNumber,
        user.departmentName,
        user.divisionName,
        user.designation,
      ],
      tlSearchValue,
    );

    if (!matchesSearch) return false;
    if (tlRosterFilter === "active") return ownedEmployees.length > 0;
    if (tlRosterFilter === "unassigned") return ownedEmployees.length === 0;
    if (tlRosterFilter === "stretched") return ownedEmployees.length >= 8;
    return true;
  });

  const managerSearchValue = managerSearch.trim().toLowerCase();
  const filteredManagerUsers = managerUsers.filter((user) => {
    const ownedTls = tlsByManager.get(user.id) ?? [];
    const matchesSearch = matchesQuery(
      [
        user.name,
        user.employeeNumber,
        user.departmentName,
        user.divisionName,
        user.designation,
      ],
      managerSearchValue,
    );

    if (!matchesSearch) return false;
    if (managerRosterFilter === "active") return ownedTls.length > 0;
    if (managerRosterFilter === "unassigned") return ownedTls.length === 0;
    if (managerRosterFilter === "stretched") return ownedTls.length >= 4;
    return true;
  });

  const employeePool = individualContributors.filter((user) => {
    if (employeePoolMode === "unassigned" && user.tlId) return false;
    if (
      employeePoolMode === "department" &&
      selectedTl?.departmentId &&
      user.departmentId !== selectedTl.departmentId
    ) {
      return false;
    }

    return matchesQuery(
      [
        user.name,
        user.employeeNumber,
        user.departmentName,
        user.divisionName,
        user.designation,
      ],
      employeeSearch.trim().toLowerCase(),
    );
  });

  const tlPool = tlUsers.filter((user) => {
    if (tlPoolMode === "unassigned" && user.managerId) return false;
    if (
      tlPoolMode === "department" &&
      selectedManager?.departmentId &&
      user.departmentId !== selectedManager.departmentId
    ) {
      return false;
    }

    return matchesQuery(
      [
        user.name,
        user.employeeNumber,
        user.departmentName,
        user.divisionName,
        user.designation,
      ],
      tlPoolSearch.trim().toLowerCase(),
    );
  });

  const departmentSearchValue = departmentSearch.trim().toLowerCase();
  const filteredDepartments = departments.filter((department) => {
    const departmentDivisions = divisionsByDepartment.get(department.id) ?? [];
    const departmentUsers = usersByDepartment.get(department.id) ?? [];
    const managerCount = departmentUsers.filter((user) =>
      user.roles.includes("Manager"),
    ).length;
    const tlCount = departmentUsers.filter((user) => user.roles.includes("TL"))
      .length;
    const isHealthy =
      managerCount > 0 && tlCount > 0 && departmentDivisions.length > 0;

    if (
      !matchesQuery(
        [
          department.name,
          ...departmentDivisions.map((division) => division.name),
          ...departmentUsers.map((user) => user.name),
        ],
        departmentSearchValue,
      )
    ) {
      return false;
    }

    if (departmentFilter === "gaps") return !isHealthy;
    if (departmentFilter === "healthy") return isHealthy;
    return true;
  });

  const selectedEmployeeCount = selectedEmployeeIds.length;
  const selectedTlCount = selectedTlIds.length;

  return (
    <div className="mnx-ownership-workspace">
      <PeopleSummaryGrid>
        <PeopleSummary
          icon={<Users aria-hidden="true" />}
          label="Employees under TLs"
          value={`${tlCoveragePercent}%`}
          detail={`${individualContributors.length - unassignedEmployees.length} of ${individualContributors.length} contributors assigned`}
        />
        <PeopleSummary
          icon={<UserCheck aria-hidden="true" />}
          label="TLs under managers"
          value={`${managerCoveragePercent}%`}
          detail={`${tlUsers.length - unassignedTls.length} of ${tlUsers.length} TLs covered`}
        />
        <PeopleSummary
          icon={<Building2 aria-hidden="true" />}
          label="Department alignment"
          value={`${departmentCoveragePercent}%`}
          detail={`${departments.length - departmentsWithGaps.length} of ${departments.length} departments structured`}
        />
        <PeopleSummary
          icon={<AlertTriangle aria-hidden="true" />}
          label="Exceptions to resolve"
          value={
            unassignedEmployees.length +
            unassignedTls.length +
            departmentsWithGaps.length
          }
          detail="Unassigned employees, open TL spans, and department gaps"
        />
      </PeopleSummaryGrid>

      <WorkspaceAlert
        className="mnx-ownership-alert"
        variant={
          unassignedEmployees.length > 0 ||
          unassignedTls.length > 0 ||
          departmentsWithGaps.length > 0
            ? "warning"
            : "success"
        }
      >
        {unassignedEmployees.length > 0 ||
        unassignedTls.length > 0 ||
        departmentsWithGaps.length > 0
          ? `Reporting coverage needs attention: ${unassignedEmployees.length} employees have no TL, ${unassignedTls.length} TLs have no manager, and ${departmentsWithGaps.length} departments still need ownership alignment.`
          : "Reporting ownership is fully aligned across team leads, managers, and departments."}
      </WorkspaceAlert>

      <WorkspaceSectionHeading
        index="01"
        title="Ownership control centre"
        description="Framed like an advanced ERP setup workspace: monitor reporting coverage, assign spans of control, and keep department governance visible from one connected surface."
        actions={
          <div className="mnx-ownership-tabs" role="tablist" aria-label="Ownership views">
            <ViewTab
              active={activeView === "overview"}
              label="Overview"
              onClick={() => setActiveView("overview")}
            />
            <ViewTab
              active={activeView === "tl"}
              label="TL ownership"
              onClick={() => setActiveView("tl")}
            />
            <ViewTab
              active={activeView === "manager"}
              label="Manager reporting"
              onClick={() => setActiveView("manager")}
            />
            <ViewTab
              active={activeView === "departments"}
              label="Department alignment"
              onClick={() => setActiveView("departments")}
            />
          </div>
        }
      />

      {activeView === "overview" ? (
        <div className="mnx-ownership-shell">
          <div className="mnx-ownership-primary">
            <PeopleSection>
              <WorkspacePanelHeader
                className="mnx-people-section-header"
                eyebrow="Coverage"
                title="Reporting health overview"
                description="This consolidates the key ideas seen in current Zoho People structure guidance: entity-aware setup, filterable hierarchy views, and visible reporting chains."
              />

              <div className="mnx-ownership-overview-grid">
                <OverviewCard
                  icon={<Users aria-hidden="true" />}
                  title="Individual contributors"
                  value={individualContributors.length}
                  detail={`${unassignedEmployees.length} still waiting for TL ownership`}
                  tone={unassignedEmployees.length === 0 ? "success" : "warning"}
                />
                <OverviewCard
                  icon={<UserCheck aria-hidden="true" />}
                  title="Team lead network"
                  value={tlUsers.length}
                  detail={`${unassignedTls.length} TLs still waiting for manager oversight`}
                  tone={unassignedTls.length === 0 ? "success" : "warning"}
                />
                <OverviewCard
                  icon={<UserCog aria-hidden="true" />}
                  title="Manager network"
                  value={managerUsers.length}
                  detail="Use manager spans to supervise TL coverage and employee reach"
                  tone="accent"
                />
                <OverviewCard
                  icon={<GitBranch aria-hidden="true" />}
                  title="Department layers"
                  value={divisions.length}
                  detail={`${departmentsWithGaps.length} departments need manager, TL, or division cleanup`}
                  tone={departmentsWithGaps.length === 0 ? "success" : "warning"}
                />
              </div>
            </PeopleSection>

            <PeopleSection>
              <WorkspacePanelHeader
                className="mnx-people-section-header"
                eyebrow="Exceptions"
                title="Ownership exception desk"
                description="Prioritize these gaps first to close reporting blind spots."
              />

              <div className="mnx-ownership-exception-grid">
                <ExceptionCard
                  title="Employees without TL"
                  value={unassignedEmployees.length}
                  emptyMessage="Every contributor is assigned to a team lead."
                  items={unassignedEmployees.map((employee) => ({
                    key: employee.id,
                    label: formatPerson(employee),
                    meta: formatMeta(employee),
                  }))}
                />
                <ExceptionCard
                  title="TLs without manager"
                  value={unassignedTls.length}
                  emptyMessage="Every TL is linked to a manager."
                  items={unassignedTls.map((user) => ({
                    key: user.id,
                    label: formatPerson(user),
                    meta: formatMeta(user),
                  }))}
                />
                <ExceptionCard
                  title="Departments with gaps"
                  value={departmentsWithGaps.length}
                  emptyMessage="All departments have management coverage and structure layers."
                  items={departmentsWithGaps.map((department) => ({
                    key: department.id,
                    label: department.name,
                    meta: describeDepartmentGap(
                      department,
                      usersByDepartment,
                      divisionsByDepartment,
                    ),
                  }))}
                />
              </div>
            </PeopleSection>
          </div>

          <aside className="mnx-ownership-aside">
            <GovernancePanel
              title="What this workspace now manages"
              items={[
                "TL span of control and employee assignment coverage.",
                "Manager oversight coverage for TL-led teams.",
                "Department and division alignment for reporting design.",
                "Exception-first cleanup for unassigned and structurally incomplete records.",
              ]}
            />
            <GovernancePanel
              title="Operational guidance"
              items={[
                "Start with unassigned employees, then finish TL-to-manager mapping.",
                "Use department-matched pools when you want cleaner reporting lines.",
                "Review stretched spans before payroll, appraisal, or attendance cycles.",
              ]}
            />
          </aside>
        </div>
      ) : null}

      {activeView === "tl" ? (
        <div className="mnx-ownership-shell">
          <div className="mnx-ownership-primary">
            <PeopleSection>
              <WorkspacePanelHeader
                className="mnx-people-section-header"
                eyebrow="Team leads"
                title="TL ownership roster"
                description="Inspect span of control, manager coverage, and employee composition before you reassign work."
              />

              <PeopleTableToolbar className="mnx-ownership-toolbar">
                <div className="mnx-ownership-search">
                  <Search aria-hidden="true" />
                  <WorkspaceInput
                    aria-label="Search TL roster"
                    value={tlSearch}
                    onChange={(event) => setTlSearch(event.target.value)}
                    placeholder="Search TL, department, division, or employee number"
                  />
                </div>

                <div className="mnx-ownership-toolbar-fields">
                  <WorkspaceField
                    className="mnx-ownership-toolbar-field"
                    label="Roster filter"
                  >
                    <WorkspaceSelect
                      value={tlRosterFilter}
                      onChange={(event) =>
                        setTlRosterFilter(event.target.value as TlRosterFilter)
                      }
                    >
                      <option value="all">All TLs</option>
                      <option value="active">Only active teams</option>
                      <option value="unassigned">No employees yet</option>
                      <option value="stretched">Stretched spans</option>
                    </WorkspaceSelect>
                  </WorkspaceField>
                </div>
              </PeopleTableToolbar>

              <div className="mnx-ownership-card-stack">
                {filteredTlUsers.length === 0 ? (
                  <EmptyCard
                    title="No TL records match this view"
                    description="Try a different search or roster filter."
                  />
                ) : (
                  filteredTlUsers.map((tl) => {
                    const team = employeesByTl.get(tl.id) ?? [];
                    const manager = managerUsers.find(
                      (managerUser) => managerUser.id === tl.managerId,
                    );

                    return (
                      <article key={tl.id} className="mnx-ownership-card">
                        <div className="mnx-ownership-card-hero">
                          <div className="mnx-ownership-card-person">
                            <PeoplePerson
                              name={toTitleCase(tl.name)}
                              secondary={formatMeta(tl)}
                            />
                            <p>
                              {manager
                                ? `Reports to ${toTitleCase(manager.name)}`
                                : "No manager is mapped for this TL yet."}
                            </p>
                          </div>

                          <div className="mnx-ownership-card-badges">
                            <WorkspaceBadge
                              variant={getTlBadgeVariant(team.length)}
                            >
                              {team.length} employee{team.length === 1 ? "" : "s"}
                            </WorkspaceBadge>
                            <WorkspaceBadge
                              variant={manager ? "success" : "warning"}
                            >
                              {manager ? "Manager mapped" : "Manager pending"}
                            </WorkspaceBadge>
                          </div>
                        </div>

                        <div className="mnx-ownership-team-list">
                          {team.length === 0 ? (
                            <InlineState
                              title="No employees assigned"
                              description="Use the workbench to assign contributors into this reporting line."
                            />
                          ) : (
                            team.map((employee) => (
                              <div
                                key={employee.id}
                                className="mnx-ownership-team-item"
                              >
                                <div className="mnx-ownership-team-copy">
                                  <PeoplePerson
                                    name={toTitleCase(employee.name)}
                                    secondary={formatMeta(employee)}
                                  />
                                </div>
                                <form action={unassignEmployeeFromTlAction}>
                                  <WorkspaceInput
                                    type="hidden"
                                    name="employeeId"
                                    value={employee.id}
                                  />
                                  <WorkspaceAction
                                    size="compact"
                                    variant="outline"
                                  >
                                    Remove
                                  </WorkspaceAction>
                                </form>
                              </div>
                            ))
                          )}
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </PeopleSection>
          </div>

          <aside className="mnx-ownership-aside">
            <WorkspacePanel className="mnx-ownership-side-panel">
              <WorkspacePanelHeader
                eyebrow="Workbench"
                title="Assign employees to TL"
                description="Search the employee pool, apply scope filters, and assign one batch at a time."
              />

              <form
                action={assignEmployeesToTlAction}
                className="mnx-ownership-form"
              >
                <WorkspaceField label="Team lead" htmlFor="ownership-tl-select">
                  <WorkspaceSelect
                    id="ownership-tl-select"
                    name="tlId"
                    value={selectedTlId}
                    onChange={(event) => {
                      setSelectedTlId(event.target.value);
                      setSelectedEmployeeIds([]);
                    }}
                    required
                  >
                    <option value="">Choose TL</option>
                    {tlUsers.map((tl) => (
                      <option key={tl.id} value={tl.id}>
                        {formatPerson(tl)}
                      </option>
                    ))}
                  </WorkspaceSelect>
                </WorkspaceField>

                <div className="mnx-ownership-form-grid">
                  <WorkspaceField label="Pool">
                    <WorkspaceSelect
                      value={employeePoolMode}
                      onChange={(event) =>
                        setEmployeePoolMode(event.target.value as PoolMode)
                      }
                    >
                      <option value="unassigned">Only unassigned</option>
                      <option value="all">All contributors</option>
                      <option value="department">Same department</option>
                    </WorkspaceSelect>
                  </WorkspaceField>

                  <WorkspaceField label="Search">
                    <WorkspaceInput
                      value={employeeSearch}
                      onChange={(event) => setEmployeeSearch(event.target.value)}
                      placeholder="Search employees"
                    />
                  </WorkspaceField>
                </div>

                <div className="mnx-ownership-selection-toolbar">
                  <span>{selectedEmployeeCount} selected</span>
                  <div>
                    <WorkspaceAction
                      size="compact"
                      variant="outline"
                      onClick={() =>
                        toggleVisibleSelection(
                          employeePool.map((user) => user.id),
                          selectedEmployeeIds,
                          setSelectedEmployeeIds,
                        )
                      }
                    >
                      Select visible
                    </WorkspaceAction>
                    <WorkspaceAction
                      size="compact"
                      variant="outline"
                      onClick={() => setSelectedEmployeeIds([])}
                    >
                      Clear
                    </WorkspaceAction>
                  </div>
                </div>

                <div className="mnx-ownership-selection-list">
                  {employeePool.length === 0 ? (
                    <InlineState
                      title="No employees in this pool"
                      description="Adjust the search or pool filter."
                    />
                  ) : (
                    employeePool.map((employee) => {
                      const checked = selectedEmployeeIds.includes(employee.id);

                      return (
                        <label
                          key={employee.id}
                          className={`mnx-ownership-selection-item${checked ? " is-selected" : ""}`}
                        >
                          {/* eslint-disable-next-line no-restricted-syntax -- This is an intentional controlled selection checkbox for the workbench list. */}
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setSelectedEmployeeIds((current) =>
                                current.includes(employee.id)
                                  ? current.filter((value) => value !== employee.id)
                                  : [...current, employee.id],
                              )
                            }
                          />
                          <span>
                            <strong>{formatPerson(employee)}</strong>
                            <small>
                              {formatMeta(employee)} ·{" "}
                              {employee.tlId ? "Already assigned" : "Unassigned"}
                            </small>
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>

                {selectedEmployeeIds.map((employeeId) => (
                  <WorkspaceInput
                    key={employeeId}
                    type="hidden"
                    name="employeeId"
                    value={employeeId}
                  />
                ))}

                <WorkspaceAction
                  type="submit"
                  disabled={!selectedTlId || selectedEmployeeCount === 0}
                >
                  <ArrowRightLeft aria-hidden="true" />
                  Assign selected employees
                </WorkspaceAction>
              </form>
            </WorkspacePanel>

            <GovernancePanel
              title="Quick watchlist"
              items={[
                `${unassignedEmployees.length} contributors still need TL ownership.`,
                `${filteredTlUsers.filter((tl) => (employeesByTl.get(tl.id) ?? []).length >= 8).length} visible TLs are carrying stretched spans.`,
                "Use the same-department pool when you want cleaner operating alignment.",
              ]}
            />
          </aside>
        </div>
      ) : null}

      {activeView === "manager" ? (
        <div className="mnx-ownership-shell">
          <div className="mnx-ownership-primary">
            <PeopleSection>
              <WorkspacePanelHeader
                className="mnx-people-section-header"
                eyebrow="Managers"
                title="Manager oversight roster"
                description="Track manager ownership across TLs and the employee population beneath each reporting line."
              />

              <PeopleTableToolbar className="mnx-ownership-toolbar">
                <div className="mnx-ownership-search">
                  <Search aria-hidden="true" />
                  <WorkspaceInput
                    aria-label="Search manager roster"
                    value={managerSearch}
                    onChange={(event) => setManagerSearch(event.target.value)}
                    placeholder="Search manager, department, division, or employee number"
                  />
                </div>

                <div className="mnx-ownership-toolbar-fields">
                  <WorkspaceField
                    className="mnx-ownership-toolbar-field"
                    label="Roster filter"
                  >
                    <WorkspaceSelect
                      value={managerRosterFilter}
                      onChange={(event) =>
                        setManagerRosterFilter(
                          event.target.value as ManagerRosterFilter,
                        )
                      }
                    >
                      <option value="all">All managers</option>
                      <option value="active">Only active oversight</option>
                      <option value="unassigned">No TLs yet</option>
                      <option value="stretched">Wide spans</option>
                    </WorkspaceSelect>
                  </WorkspaceField>
                </div>
              </PeopleTableToolbar>

              <div className="mnx-ownership-card-stack">
                {filteredManagerUsers.length === 0 ? (
                  <EmptyCard
                    title="No manager records match this view"
                    description="Try a different search or roster filter."
                  />
                ) : (
                  filteredManagerUsers.map((manager) => {
                    const ownedTls = tlsByManager.get(manager.id) ?? [];
                    const managedEmployees = ownedTls.reduce(
                      (count, tl) => count + (employeesByTl.get(tl.id) ?? []).length,
                      0,
                    );

                    return (
                      <article key={manager.id} className="mnx-ownership-card">
                        <div className="mnx-ownership-card-hero">
                          <div className="mnx-ownership-card-person">
                            <PeoplePerson
                              name={toTitleCase(manager.name)}
                              secondary={formatMeta(manager)}
                            />
                            <p>
                              {ownedTls.length === 0
                                ? "No TLs are reporting to this manager yet."
                                : `${managedEmployees} employees roll up through ${ownedTls.length} TLs.`}
                            </p>
                          </div>

                          <div className="mnx-ownership-card-badges">
                            <WorkspaceBadge
                              variant={getManagerBadgeVariant(ownedTls.length)}
                            >
                              {ownedTls.length} TL{ownedTls.length === 1 ? "" : "s"}
                            </WorkspaceBadge>
                            <WorkspaceBadge
                              variant={managedEmployees > 0 ? "accent" : "warning"}
                            >
                              {managedEmployees} employee
                              {managedEmployees === 1 ? "" : "s"}
                            </WorkspaceBadge>
                          </div>
                        </div>

                        <div className="mnx-ownership-team-list">
                          {ownedTls.length === 0 ? (
                            <InlineState
                              title="No TLs assigned"
                              description="Use the workbench to attach TLs to this manager."
                            />
                          ) : (
                            ownedTls.map((tl) => (
                              <div key={tl.id} className="mnx-ownership-team-item">
                                <div className="mnx-ownership-team-copy">
                                  <PeoplePerson
                                    name={toTitleCase(tl.name)}
                                    secondary={`${formatMeta(tl)} · ${(employeesByTl.get(tl.id) ?? []).length} employees`}
                                  />
                                </div>
                                <form action={unassignTlFromManagerAction}>
                                  <WorkspaceInput
                                    type="hidden"
                                    name="tlId"
                                    value={tl.id}
                                  />
                                  <WorkspaceAction
                                    size="compact"
                                    variant="outline"
                                  >
                                    Remove
                                  </WorkspaceAction>
                                </form>
                              </div>
                            ))
                          )}
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </PeopleSection>
          </div>

          <aside className="mnx-ownership-aside">
            <WorkspacePanel className="mnx-ownership-side-panel">
              <WorkspacePanelHeader
                eyebrow="Workbench"
                title="Assign TLs to manager"
                description="Build manager oversight lanes with filtered TL pools."
              />

              <form
                action={assignTlsToManagerAction}
                className="mnx-ownership-form"
              >
                <WorkspaceField
                  label="Manager"
                  htmlFor="ownership-manager-select"
                >
                  <WorkspaceSelect
                    id="ownership-manager-select"
                    name="managerId"
                    value={selectedManagerId}
                    onChange={(event) => {
                      setSelectedManagerId(event.target.value);
                      setSelectedTlIds([]);
                    }}
                    required
                  >
                    <option value="">Choose manager</option>
                    {managerUsers.map((manager) => (
                      <option key={manager.id} value={manager.id}>
                        {formatPerson(manager)}
                      </option>
                    ))}
                  </WorkspaceSelect>
                </WorkspaceField>

                <div className="mnx-ownership-form-grid">
                  <WorkspaceField label="Pool">
                    <WorkspaceSelect
                      value={tlPoolMode}
                      onChange={(event) =>
                        setTlPoolMode(event.target.value as PoolMode)
                      }
                    >
                      <option value="unassigned">Only unassigned</option>
                      <option value="all">All TLs</option>
                      <option value="department">Same department</option>
                    </WorkspaceSelect>
                  </WorkspaceField>

                  <WorkspaceField label="Search">
                    <WorkspaceInput
                      value={tlPoolSearch}
                      onChange={(event) => setTlPoolSearch(event.target.value)}
                      placeholder="Search TLs"
                    />
                  </WorkspaceField>
                </div>

                <div className="mnx-ownership-selection-toolbar">
                  <span>{selectedTlCount} selected</span>
                  <div>
                    <WorkspaceAction
                      size="compact"
                      variant="outline"
                      onClick={() =>
                        toggleVisibleSelection(
                          tlPool.map((user) => user.id),
                          selectedTlIds,
                          setSelectedTlIds,
                        )
                      }
                    >
                      Select visible
                    </WorkspaceAction>
                    <WorkspaceAction
                      size="compact"
                      variant="outline"
                      onClick={() => setSelectedTlIds([])}
                    >
                      Clear
                    </WorkspaceAction>
                  </div>
                </div>

                <div className="mnx-ownership-selection-list">
                  {tlPool.length === 0 ? (
                    <InlineState
                      title="No TLs in this pool"
                      description="Adjust the search or pool filter."
                    />
                  ) : (
                    tlPool.map((tl) => {
                      const checked = selectedTlIds.includes(tl.id);

                      return (
                        <label
                          key={tl.id}
                          className={`mnx-ownership-selection-item${checked ? " is-selected" : ""}`}
                        >
                          {/* eslint-disable-next-line no-restricted-syntax -- This is an intentional controlled selection checkbox for the manager workbench list. */}
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setSelectedTlIds((current) =>
                                current.includes(tl.id)
                                  ? current.filter((value) => value !== tl.id)
                                  : [...current, tl.id],
                              )
                            }
                          />
                          <span>
                            <strong>{formatPerson(tl)}</strong>
                            <small>
                              {formatMeta(tl)} ·{" "}
                              {tl.managerId ? "Already supervised" : "Needs manager"}
                            </small>
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>

                {selectedTlIds.map((tlId) => (
                  <WorkspaceInput
                    key={tlId}
                    type="hidden"
                    name="tlId"
                    value={tlId}
                  />
                ))}

                <WorkspaceAction
                  type="submit"
                  disabled={!selectedManagerId || selectedTlCount === 0}
                >
                  <ArrowRightLeft aria-hidden="true" />
                  Assign selected TLs
                </WorkspaceAction>
              </form>
            </WorkspacePanel>

            <GovernancePanel
              title="Oversight watchlist"
              items={[
                `${unassignedTls.length} TLs still need a reporting manager.`,
                `${filteredManagerUsers.filter((manager) => (tlsByManager.get(manager.id) ?? []).length >= 4).length} visible managers are carrying broad oversight spans.`,
                "Use same-department filters when you want clearer functional supervision lines.",
              ]}
            />
          </aside>
        </div>
      ) : null}

      {activeView === "departments" ? (
        <div className="mnx-ownership-shell">
          <div className="mnx-ownership-primary">
            <PeopleSection>
              <WorkspacePanelHeader
                className="mnx-people-section-header"
                eyebrow="Alignment"
                title="Department and division reporting map"
                description="Check whether every department has leadership coverage, employees, and division framing."
              />

              <PeopleTableToolbar className="mnx-ownership-toolbar">
                <div className="mnx-ownership-search">
                  <Search aria-hidden="true" />
                  <WorkspaceInput
                    aria-label="Search departments"
                    value={departmentSearch}
                    onChange={(event) => setDepartmentSearch(event.target.value)}
                    placeholder="Search departments, divisions, or people"
                  />
                </div>

                <div className="mnx-ownership-toolbar-fields">
                  <WorkspaceField
                    className="mnx-ownership-toolbar-field"
                    label="Coverage"
                  >
                    <WorkspaceSelect
                      value={departmentFilter}
                      onChange={(event) =>
                        setDepartmentFilter(
                          event.target.value as DepartmentFilter,
                        )
                      }
                    >
                      <option value="all">All departments</option>
                      <option value="gaps">Needs attention</option>
                      <option value="healthy">Healthy only</option>
                    </WorkspaceSelect>
                  </WorkspaceField>
                </div>
              </PeopleTableToolbar>

              <PeopleTable tableClassName="mnx-ownership-table">
                <PeopleTableHeader>
                  <PeopleTableRow>
                    <PeopleTableHead>Department</PeopleTableHead>
                    <PeopleTableHead>Managers</PeopleTableHead>
                    <PeopleTableHead>Team leads</PeopleTableHead>
                    <PeopleTableHead>Contributors</PeopleTableHead>
                    <PeopleTableHead>Divisions</PeopleTableHead>
                    <PeopleTableHead>Status</PeopleTableHead>
                  </PeopleTableRow>
                </PeopleTableHeader>
                <PeopleTableBody>
                  {filteredDepartments.length === 0 ? (
                    <PeopleTableEmpty
                      colSpan={6}
                      message="No departments match this view."
                    />
                  ) : (
                    filteredDepartments.map((department) => {
                      const departmentUsers =
                        usersByDepartment.get(department.id) ?? [];
                      const departmentDivisions =
                        divisionsByDepartment.get(department.id) ?? [];
                      const managers = departmentUsers.filter((user) =>
                        user.roles.includes("Manager"),
                      );
                      const tls = departmentUsers.filter((user) =>
                        user.roles.includes("TL"),
                      );
                      const contributors = departmentUsers.filter(
                        (user) =>
                          !user.roles.some((role) =>
                            leadershipExclusions.has(role),
                          ),
                      );
                      const isHealthy =
                        managers.length > 0 &&
                        tls.length > 0 &&
                        departmentDivisions.length > 0;

                      return (
                        <PeopleTableRow key={department.id}>
                          <PeopleTableCell>
                            <div className="mnx-ownership-table-copy">
                              <strong>{department.name}</strong>
                              <small>
                                {departmentDivisions.length === 0
                                  ? "Division framing pending"
                                  : departmentDivisions
                                      .map((division) => division.name)
                                      .join(", ")}
                              </small>
                            </div>
                          </PeopleTableCell>
                          <PeopleTableCell>
                            {renderNames(managers, "No managers")}
                          </PeopleTableCell>
                          <PeopleTableCell>{renderNames(tls, "No TLs")}</PeopleTableCell>
                          <PeopleTableCell>
                            {contributors.length} employee
                            {contributors.length === 1 ? "" : "s"}
                          </PeopleTableCell>
                          <PeopleTableCell>
                            {departmentDivisions.length === 0
                              ? "No divisions"
                              : `${departmentDivisions.length} division${
                                  departmentDivisions.length === 1 ? "" : "s"
                                }`}
                          </PeopleTableCell>
                          <PeopleTableCell>
                            <WorkspaceBadge
                              variant={isHealthy ? "success" : "warning"}
                            >
                              {isHealthy ? "Aligned" : "Needs attention"}
                            </WorkspaceBadge>
                          </PeopleTableCell>
                        </PeopleTableRow>
                      );
                    })
                  )}
                </PeopleTableBody>
              </PeopleTable>
            </PeopleSection>
          </div>

          <aside className="mnx-ownership-aside">
            <GovernancePanel
              title="Department governance"
              items={[
                `${departmentsWithGaps.length} departments are missing either a manager, a TL, or a division layer.`,
                `${departments.filter((department) => (divisionsByDepartment.get(department.id) ?? []).length === 0).length} departments have no divisions yet.`,
                "Entity-aware filtering and visible reporting layers were taken from current Zoho People structure guidance published on Monday, August 24, 2026.",
              ]}
            />

            <WorkspacePanel className="mnx-ownership-side-panel">
              <WorkspacePanelHeader
                eyebrow="Coverage"
                title="Department exception summary"
                description="Use this watchlist while finishing structural cleanup."
              />

              <div className="mnx-ownership-watch-list">
                {departmentsWithGaps.length === 0 ? (
                  <InlineState
                    title="No department gaps"
                    description="Every department currently has leadership coverage and structure layers."
                  />
                ) : (
                  departmentsWithGaps.map((department) => (
                    <div
                      key={department.id}
                      className="mnx-ownership-watch-item"
                    >
                      <div>
                        <strong>{department.name}</strong>
                        <p>
                          {describeDepartmentGap(
                            department,
                            usersByDepartment,
                            divisionsByDepartment,
                          )}
                        </p>
                      </div>
                      <WorkspaceBadge variant="warning">Gap</WorkspaceBadge>
                    </div>
                  ))
                )}
              </div>
            </WorkspacePanel>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function ViewTab({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    // eslint-disable-next-line no-restricted-syntax -- This is a tab control button with explicit tab semantics, not a general action button.
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={`mnx-ownership-tab${active ? " is-active" : ""}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function OverviewCard({
  detail,
  icon,
  title,
  tone,
  value,
}: {
  detail: string;
  icon: React.ReactNode;
  title: string;
  tone: "accent" | "success" | "warning";
  value: number;
}) {
  return (
    <article className="mnx-ownership-overview-card">
      <div className="mnx-ownership-overview-card-top">
        <span>{icon}</span>
        <WorkspaceBadge variant={tone}>{title}</WorkspaceBadge>
      </div>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function ExceptionCard({
  emptyMessage,
  items,
  title,
  value,
}: {
  emptyMessage: string;
  items: Array<{ key: string; label: string; meta: string }>;
  title: string;
  value: number;
}) {
  return (
    <article className="mnx-ownership-exception-card">
      <div className="mnx-ownership-exception-card-top">
        <div>
          <strong>{title}</strong>
          <p>{value} open items</p>
        </div>
        <WorkspaceBadge variant={value === 0 ? "success" : "warning"}>
          {value === 0 ? "Clear" : "Open"}
        </WorkspaceBadge>
      </div>

      <div className="mnx-ownership-exception-list">
        {items.length === 0 ? (
          <InlineState title="Nothing pending" description={emptyMessage} />
        ) : (
          items.map((item) => (
            <div key={item.key} className="mnx-ownership-watch-item">
              <div>
                <strong>{item.label}</strong>
                <p>{item.meta}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </article>
  );
}

function GovernancePanel({
  items,
  title,
}: {
  items: string[];
  title: string;
}) {
  return (
    <WorkspacePanel className="mnx-ownership-side-panel">
      <WorkspacePanelHeader
        eyebrow="Governance"
        title={title}
        description="Keep structure, reporting, and operational ownership synchronized."
      />

      <div className="mnx-ownership-watch-list">
        {items.map((item, index) => (
          <div key={item} className="mnx-ownership-watch-item">
            <span>{String(index + 1).padStart(2, "0")}</span>
            <p>{item}</p>
          </div>
        ))}
      </div>
    </WorkspacePanel>
  );
}

function InlineState({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="mnx-ownership-inline-state">
      <ShieldCheck aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
    </div>
  );
}

function EmptyCard({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="mnx-ownership-empty-card">
      <Network aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
    </div>
  );
}

function toTitleCase(value?: string | null) {
  if (!value) return "";
  return value.replace(
    /\w\S*/g,
    (segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase(),
  );
}

function formatPerson(user: OwnershipUser) {
  const prefix = user.employeeNumber ? `${user.employeeNumber} - ` : "";
  return `${prefix}${toTitleCase(user.name)}`;
}

function formatMeta(user: OwnershipUser) {
  return [user.departmentName, user.divisionName, user.designation]
    .filter(Boolean)
    .map((value) => toTitleCase(value))
    .join(" · ");
}

function matchesQuery(values: Array<string | null | undefined>, query: string) {
  if (!query) return true;
  return values.some((value) => (value ?? "").toLowerCase().includes(query));
}

function toggleVisibleSelection(
  visibleIds: string[],
  currentIds: string[],
  setValue: (value: string[]) => void,
) {
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => currentIds.includes(id));

  if (allVisibleSelected) {
    setValue(currentIds.filter((id) => !visibleIds.includes(id)));
    return;
  }

  const next = new Set(currentIds);
  for (const id of visibleIds) next.add(id);
  setValue(Array.from(next));
}

function getTlBadgeVariant(count: number) {
  if (count === 0) return "warning";
  if (count >= 8) return "accent";
  return "success";
}

function getManagerBadgeVariant(count: number) {
  if (count === 0) return "warning";
  if (count >= 4) return "accent";
  return "success";
}

function renderNames(users: OwnershipUser[], emptyMessage: string) {
  if (users.length === 0) return emptyMessage;
  return users.map((user) => toTitleCase(user.name)).join(", ");
}

function describeDepartmentGap(
  department: OwnershipDepartment,
  usersByDepartment: Map<string, OwnershipUser[]>,
  divisionsByDepartment: Map<string, OwnershipDivision[]>,
) {
  const departmentUsers = usersByDepartment.get(department.id) ?? [];
  const divisions = divisionsByDepartment.get(department.id) ?? [];
  const concerns: string[] = [];

  if (!departmentUsers.some((user) => user.roles.includes("Manager"))) {
    concerns.push("manager missing");
  }
  if (!departmentUsers.some((user) => user.roles.includes("TL"))) {
    concerns.push("TL missing");
  }
  if (divisions.length === 0) {
    concerns.push("division framing missing");
  }

  return concerns.length > 0 ? concerns.join(", ") : "No gaps";
}
