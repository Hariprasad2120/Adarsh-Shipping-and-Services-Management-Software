"use client";

import {
  Building2,
  Building2Icon,
  ChevronRight,
  GitBranch,
  Layers3,
  Network,
  PencilLine,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Workflow,
} from "lucide-react";
import { startTransition, useState } from "react";
import { Tabs } from "@/components/ui/tabs";
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
  WorkspaceState,
} from "@/components/layout/workspace";
import { WorkspaceDialog } from "@/components/layout/workspace-dialog";
import {
  EmployeeTreeExplorer,
  OrganisationTreeExplorer,
} from "@/modules/hrms/components/organisation-tree-explorers";
import {
  PeopleSection,
  PeopleSummary,
  PeopleSummaryGrid,
} from "@/components/monolith";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

type Division = { id: string; name: string };
type Department = {
  id: string;
  name: string;
  code: string;
  divisions: Division[];
};
type Branch = { id: string; name: string; code: string };
type Org = {
  id: string;
  name: string;
  branches: Branch[];
  departments: Department[];
} | null;

type FilterMode = "all" | "branches" | "departments" | "attention";
type StructureView = "control-centre" | "organisation-tree" | "employee-tree";

type FormState =
  | {
      entity: "branch";
      mode: "create" | "edit";
      id?: string;
      name: string;
      code: string;
    }
  | {
      entity: "department";
      mode: "create" | "edit";
      id?: string;
      name: string;
      code: string;
    }
  | {
      entity: "division";
      mode: "create" | "edit";
      id?: string;
      departmentId: string;
      departmentName: string;
      name: string;
    };

type DeleteState = {
  entity: "branch" | "department" | "division";
  id: string;
  name: string;
  url: string;
  description: string;
};

type FeedbackState =
  | { tone: "success"; message: string }
  | { tone: "error"; message: string }
  | null;

export function OrganisationStructureWorkspace({
  employees,
  org,
}: {
  employees: unknown[];
  org: Org;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [activeView, setActiveView] = useState<StructureView>("control-centre");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<
    string | null
  >(org?.departments[0]?.id ?? null);
  const [formState, setFormState] = useState<FormState | null>(null);
  const [deleteState, setDeleteState] = useState<DeleteState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  if (!org) {
    return (
      <WorkspaceState
        variant="empty"
        eyebrow="Organisation"
        title="No organisation record is available"
        description="Create the parent organisation first so branches, departments, and divisions can be managed here."
        icon={<Building2 aria-hidden="true" />}
      />
    );
  }

  const queryValue = query.trim().toLowerCase();
  const branches = org.branches;
  const departments = org.departments;
  const totalDivisions = departments.reduce(
    (count, department) => count + department.divisions.length,
    0,
  );
  const departmentsWithoutDivisions = departments.filter(
    (department) => department.divisions.length === 0,
  );
  const filteredBranches = branches.filter((branch) =>
    `${branch.name} ${branch.code}`.toLowerCase().includes(queryValue),
  );
  const filteredDepartments = departments.filter((department) => {
    const matchesQuery =
      `${department.name} ${department.code}`.toLowerCase().includes(queryValue) ||
      department.divisions.some((division) =>
        division.name.toLowerCase().includes(queryValue),
      );

    if (!matchesQuery) return false;
    if (filter === "departments") return true;
    if (filter === "attention") return department.divisions.length === 0;
    if (filter === "branches") return false;
    return true;
  });
  const branchCountShown =
    filter === "departments" || filter === "attention"
      ? branches.length
      : filteredBranches.length;
  const departmentCountShown =
    filter === "branches" ? departments.length : filteredDepartments.length;
  const selectedDepartment =
    departments.find((department) => department.id === selectedDepartmentId) ??
    filteredDepartments[0] ??
    departments[0] ??
    null;
  const structureTabs = [
    {
      value: "control-centre",
      label: "Control centre",
      icon: <Workflow aria-hidden="true" />,
    },
    {
      value: "organisation-tree",
      label: "Organisation tree",
      icon: <Network aria-hidden="true" />,
    },
    {
      value: "employee-tree",
      label: "Employee tree",
      icon: <GitBranch aria-hidden="true" />,
    },
  ];

  async function apiFetch(
    url: string,
    method: "POST" | "PATCH" | "DELETE",
    body?: Record<string, string>,
  ) {
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorText = (await response.text()).trim();
        throw new Error(errorText || "The request could not be completed.");
      }

      startTransition(() => {
        router.refresh();
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function openCreateBranch() {
    setFormState({ entity: "branch", mode: "create", name: "", code: "" });
  }

  function openEditBranch(branch: Branch) {
    setFormState({
      entity: "branch",
      mode: "edit",
      id: branch.id,
      name: branch.name,
      code: branch.code,
    });
  }

  function openCreateDepartment() {
    setFormState({
      entity: "department",
      mode: "create",
      name: "",
      code: "",
    });
  }

  function openEditDepartment(department: Department) {
    setSelectedDepartmentId(department.id);
    setFormState({
      entity: "department",
      mode: "edit",
      id: department.id,
      name: department.name,
      code: department.code,
    });
  }

  function openCreateDivision(department: Department) {
    setSelectedDepartmentId(department.id);
    setFormState({
      entity: "division",
      mode: "create",
      departmentId: department.id,
      departmentName: department.name,
      name: "",
    });
  }

  function openEditDivision(department: Department, division: Division) {
    setSelectedDepartmentId(department.id);
    setFormState({
      entity: "division",
      mode: "edit",
      id: division.id,
      departmentId: department.id,
      departmentName: department.name,
      name: division.name,
    });
  }

  function requestDeleteBranch(branch: Branch) {
    setDeleteState({
      entity: "branch",
      id: branch.id,
      name: branch.name,
      url: `/api/org/branches/${branch.id}`,
      description:
        "This removes the branch from the organisation structure. Use this only when the branch should no longer exist.",
    });
  }

  function requestDeleteDepartment(department: Department) {
    setDeleteState({
      entity: "department",
      id: department.id,
      name: department.name,
      url: `/api/org/departments/${department.id}`,
      description:
        "Deleting a department also removes every division inside it. Review dependent assignments before confirming.",
    });
  }

  function requestDeleteDivision(division: Division) {
    setDeleteState({
      entity: "division",
      id: division.id,
      name: division.name,
      url: `/api/org/divisions/${division.id}`,
      description:
        "This removes the division from the department hierarchy immediately.",
    });
  }

  async function submitForm() {
    if (!formState) return;

    const name = formState.name.trim();
    if (!name) return;

    try {
      if (formState.entity === "branch") {
        const code = formState.code.trim().toUpperCase();
        if (!code) return;

        await apiFetch(
          formState.mode === "create"
            ? "/api/org/branches"
            : `/api/org/branches/${formState.id}`,
          formState.mode === "create" ? "POST" : "PATCH",
          { name, code },
        );
      } else if (formState.entity === "department") {
        const code = formState.code.trim().toUpperCase();
        if (!code) return;

        await apiFetch(
          formState.mode === "create"
            ? "/api/org/departments"
            : `/api/org/departments/${formState.id}`,
          formState.mode === "create" ? "POST" : "PATCH",
          { name, code },
        );
      } else {
        await apiFetch(
          formState.mode === "create"
            ? `/api/org/departments/${formState.departmentId}/divisions`
            : `/api/org/divisions/${formState.id}`,
          formState.mode === "create" ? "POST" : "PATCH",
          { name },
        );
      }

      setFeedback({
        tone: "success",
        message: `${getEntityLabel(formState.entity)} ${
          formState.mode === "create" ? "created" : "updated"
        } successfully.`,
      });
      setFormState(null);
    } catch (error) {
      setFeedback({
        tone: "error",
        message: getErrorMessage(error),
      });
    }
  }

  async function confirmDelete() {
    if (!deleteState) return;

    try {
      await apiFetch(deleteState.url, "DELETE");
      setFeedback({
        tone: "success",
        message: `${getEntityLabel(deleteState.entity)} deleted successfully.`,
      });
      setDeleteState(null);
    } catch (error) {
      setFeedback({
        tone: "error",
        message: getErrorMessage(error),
      });
    }
  }

  return (
    <div className="mnx-org-structure-workspace">
      <PeopleSummaryGrid>
        <PeopleSummary
          icon={<Building2Icon aria-hidden="true" />}
          label="Branches"
          value={branches.length}
          detail={`${branchCountShown} in current view`}
        />
        <PeopleSummary
          icon={<Network aria-hidden="true" />}
          label="Departments"
          value={departments.length}
          detail={`${departmentCountShown} in current view`}
        />
        <PeopleSummary
          icon={<GitBranch aria-hidden="true" />}
          label="Divisions"
          value={totalDivisions}
          detail="Operational layers inside departments"
        />
        <PeopleSummary
          icon={<ShieldCheck aria-hidden="true" />}
          label="Needs design attention"
          value={departmentsWithoutDivisions.length}
          detail="Departments without at least one division"
        />
      </PeopleSummaryGrid>

      {feedback ? (
        <WorkspaceAlert
          className="mnx-org-structure-alert"
          variant={feedback.tone === "error" ? "danger" : "success"}
        >
          {feedback.message}
        </WorkspaceAlert>
      ) : null}

      <Tabs
        className="mnx-org-structure-tabs"
        items={structureTabs}
        value={activeView}
        onChange={(value) => setActiveView(value as StructureView)}
      />

      {activeView === "control-centre" ? (
        <>
          <WorkspaceSectionHeading
            index="01"
            title="Structure control centre"
            description="Search the current hierarchy, shape departments into working divisions, and keep branch and reporting foundations tidy from one surface."
            actions={
              <div className="mnx-org-structure-heading-actions">
                <WorkspaceAction variant="outline" onClick={openCreateBranch}>
                  <Plus aria-hidden="true" />
                  Add branch
                </WorkspaceAction>
                <WorkspaceAction onClick={openCreateDepartment}>
                  <Plus aria-hidden="true" />
                  Add department
                </WorkspaceAction>
              </div>
            }
          />

          <div className="mnx-org-structure-shell">
            <div className="mnx-org-structure-primary">
              <PeopleSection>
                <WorkspacePanelHeader
                  className="mnx-people-section-header"
                  eyebrow="Explorer"
                  title="Organisation map"
                  description="Inspired by modern ERP structure workspaces: one searchable registry for branches, departments, and subordinate divisions."
                  actions={
                    <div className="mnx-org-structure-panel-actions">
                      <WorkspaceAction
                        variant="outline"
                        onClick={() =>
                          selectedDepartment
                            ? openCreateDivision(selectedDepartment)
                            : openCreateDepartment()
                        }
                      >
                        <Plus aria-hidden="true" />
                        {selectedDepartment ? "Add division" : "Add department"}
                      </WorkspaceAction>
                    </div>
                  }
                />

                <div className="mnx-people-toolbar mnx-org-structure-toolbar">
                  <div className="mnx-org-structure-search">
                    <Search aria-hidden="true" />
                    <WorkspaceInput
                      aria-label="Search organisation structure"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search branches, departments, divisions, or codes"
                    />
                  </div>

                  <div className="mnx-org-structure-toolbar-controls">
                    <WorkspaceField
                      className="mnx-org-structure-toolbar-field"
                      label="Scope"
                    >
                      <WorkspaceSelect
                        value={filter}
                        onChange={(event) =>
                          setFilter(event.target.value as FilterMode)
                        }
                      >
                        <option value="all">All entities</option>
                        <option value="departments">Departments only</option>
                        <option value="branches">Branches only</option>
                        <option value="attention">Needs attention</option>
                      </WorkspaceSelect>
                    </WorkspaceField>
                  </div>
                </div>

                {filter !== "branches" ? (
                  <section className="mnx-org-structure-stack">
                    {filteredDepartments.length === 0 ? (
                      <EmptyStateCard
                        title="No departments match this view"
                        description="Try a different search or create a new department to start shaping the hierarchy."
                        action={
                          <WorkspaceAction onClick={openCreateDepartment}>
                            Add department
                          </WorkspaceAction>
                        }
                      />
                    ) : (
                      filteredDepartments.map((department) => {
                        const active = selectedDepartment?.id === department.id;

                        return (
                          <article
                            key={department.id}
                            className={cn(
                              "mnx-org-structure-card",
                              active && "is-active",
                            )}
                          >
                            {/* eslint-disable-next-line no-restricted-syntax -- This is an intentional full-card selection control, not a button-styled action. */}
                            <button
                              type="button"
                              className="mnx-org-structure-card-main"
                              onClick={() => setSelectedDepartmentId(department.id)}
                            >
                              <div className="mnx-org-structure-card-copy">
                                <div className="mnx-org-structure-card-title-row">
                                  <strong>{department.name}</strong>
                                  <span>{department.code}</span>
                                </div>
                                <p>
                                  {department.divisions.length === 0
                                    ? "No divisions have been framed for this department yet."
                                    : `${department.divisions.length} division${
                                        department.divisions.length === 1 ? "" : "s"
                                      } active inside this department.`}
                                </p>
                              </div>
                              <div className="mnx-org-structure-card-badges">
                                <WorkspaceBadge
                                  variant={
                                    department.divisions.length === 0
                                      ? "warning"
                                      : "accent"
                                  }
                                >
                                  {department.divisions.length === 0
                                    ? "Needs division"
                                    : `${department.divisions.length} divisions`}
                                </WorkspaceBadge>
                                <ChevronRight aria-hidden="true" />
                              </div>
                            </button>

                            <div className="mnx-org-structure-card-actions">
                              <WorkspaceAction
                                size="compact"
                                variant="outline"
                                onClick={() => openEditDepartment(department)}
                              >
                                <PencilLine aria-hidden="true" />
                                Edit
                              </WorkspaceAction>
                              <WorkspaceAction
                                size="compact"
                                variant="outline"
                                onClick={() => openCreateDivision(department)}
                              >
                                <Plus aria-hidden="true" />
                                Add division
                              </WorkspaceAction>
                              <WorkspaceAction
                                size="compact"
                                variant="destructive"
                                onClick={() => requestDeleteDepartment(department)}
                              >
                                <Trash2 aria-hidden="true" />
                                Delete
                              </WorkspaceAction>
                            </div>

                            <div className="mnx-org-structure-division-list">
                              {department.divisions.length === 0 ? (
                                <div className="mnx-org-structure-inline-empty">
                                  <Workflow aria-hidden="true" />
                                  <div>
                                    <strong>Build the first division</strong>
                                    <p>
                                      Create subdivisions for teams, desks, service
                                      lines, or reporting clusters.
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                department.divisions.map((division) => (
                                  <div
                                    key={division.id}
                                    className="mnx-org-structure-division-item"
                                  >
                                    <div>
                                      <strong>{division.name}</strong>
                                      <p>{department.name}</p>
                                    </div>
                                    <div className="mnx-org-structure-division-actions">
                                      <WorkspaceAction
                                        size="compact"
                                        variant="outline"
                                        onClick={() =>
                                          openEditDivision(department, division)
                                        }
                                      >
                                        <PencilLine aria-hidden="true" />
                                        Edit
                                      </WorkspaceAction>
                                      <WorkspaceAction
                                        size="compact"
                                        variant="destructive"
                                        onClick={() =>
                                          requestDeleteDivision(division)
                                        }
                                      >
                                        <Trash2 aria-hidden="true" />
                                        Delete
                                      </WorkspaceAction>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </article>
                        );
                      })
                    )}
                  </section>
                ) : null}

                {filter !== "departments" && filter !== "attention" ? (
                  <section className="mnx-org-structure-branch-grid">
                    {filteredBranches.length === 0 ? (
                      <EmptyStateCard
                        title="No branches match this search"
                        description="Search by branch name or code, or add a new operating location."
                        action={
                          <WorkspaceAction
                            variant="outline"
                            onClick={openCreateBranch}
                          >
                            Add branch
                          </WorkspaceAction>
                        }
                      />
                    ) : (
                      filteredBranches.map((branch) => (
                        <article
                          key={branch.id}
                          className="mnx-org-structure-branch-card"
                        >
                          <div className="mnx-org-structure-branch-card-copy">
                            <span>{branch.code}</span>
                            <strong>{branch.name}</strong>
                            <p>Available for assignment across HR and operations.</p>
                          </div>
                          <div className="mnx-org-structure-branch-card-actions">
                            <WorkspaceAction
                              size="compact"
                              variant="outline"
                              onClick={() => openEditBranch(branch)}
                            >
                              <PencilLine aria-hidden="true" />
                              Edit
                            </WorkspaceAction>
                            <WorkspaceAction
                              size="compact"
                              variant="destructive"
                              onClick={() => requestDeleteBranch(branch)}
                            >
                              <Trash2 aria-hidden="true" />
                              Delete
                            </WorkspaceAction>
                          </div>
                        </article>
                      ))
                    )}
                  </section>
                ) : null}
              </PeopleSection>
            </div>

            <aside className="mnx-org-structure-aside">
              <WorkspacePanel className="mnx-org-structure-aside-panel">
                <WorkspacePanelHeader
                  eyebrow="Blueprint"
                  title={
                    selectedDepartment
                      ? selectedDepartment.name
                      : "Department blueprint"
                  }
                  description={
                    selectedDepartment
                      ? "Use this focused view to frame and maintain the selected department."
                      : "Select a department to inspect its current operating shape."
                  }
                />

                {selectedDepartment ? (
                  <div className="mnx-org-structure-blueprint">
                    <div className="mnx-org-structure-blueprint-hero">
                      <div>
                        <span className="mnx-org-structure-blueprint-code">
                          {selectedDepartment.code}
                        </span>
                        <strong>{selectedDepartment.name}</strong>
                        <p>
                          {selectedDepartment.divisions.length === 0
                            ? "No subordinate divisions exist yet."
                            : `${selectedDepartment.divisions.length} operating division${
                                selectedDepartment.divisions.length === 1 ? "" : "s"
                              } defined.`}
                        </p>
                      </div>
                      <WorkspaceBadge
                        variant={
                          selectedDepartment.divisions.length === 0
                            ? "warning"
                            : "success"
                        }
                      >
                        {selectedDepartment.divisions.length === 0
                          ? "Draft structure"
                          : "Structured"}
                      </WorkspaceBadge>
                    </div>

                    <div className="mnx-org-structure-blueprint-actions">
                      <WorkspaceAction
                        variant="outline"
                        onClick={() => openEditDepartment(selectedDepartment)}
                      >
                        <PencilLine aria-hidden="true" />
                        Edit department
                      </WorkspaceAction>
                      <WorkspaceAction
                        onClick={() => openCreateDivision(selectedDepartment)}
                      >
                        <Plus aria-hidden="true" />
                        Add division
                      </WorkspaceAction>
                    </div>

                    <div className="mnx-org-structure-blueprint-list">
                      {selectedDepartment.divisions.length === 0 ? (
                        <div className="mnx-org-structure-inline-empty">
                          <Layers3 aria-hidden="true" />
                          <div>
                            <strong>Division framing is pending</strong>
                            <p>
                              Add units for specialist teams, management cells, or
                              service lines to complete this department.
                            </p>
                          </div>
                        </div>
                      ) : (
                        selectedDepartment.divisions.map((division, index) => (
                          <div
                            key={division.id}
                            className="mnx-org-structure-blueprint-step"
                          >
                            <span>{String(index + 1).padStart(2, "0")}</span>
                            <div>
                              <strong>{division.name}</strong>
                              <p>Division under {selectedDepartment.name}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mnx-org-structure-inline-empty">
                    <Network aria-hidden="true" />
                    <div>
                      <strong>No department selected</strong>
                      <p>
                        Create or select a department from the explorer to start
                        shaping its internal hierarchy.
                      </p>
                    </div>
                  </div>
                )}
              </WorkspacePanel>

              <WorkspacePanel className="mnx-org-structure-aside-panel">
                <WorkspacePanelHeader
                  eyebrow="Governance"
                  title="Structure health"
                  description="Quick checks modeled after advanced ERP setup workspaces."
                />

                <div className="mnx-org-structure-health-list">
                  <HealthRow
                    label="Branch footprint"
                    value={`${branches.length} locations`}
                    tone={branches.length > 0 ? "success" : "warning"}
                    detail="Maintain a clean branch list for employee assignments and downstream module mapping."
                  />
                  <HealthRow
                    label="Department coverage"
                    value={`${departments.length} departments`}
                    tone={departments.length > 0 ? "success" : "warning"}
                    detail="Departments create the top-level management map used across HR workflows."
                  />
                  <HealthRow
                    label="Division readiness"
                    value={`${departmentsWithoutDivisions.length} gaps`}
                    tone={
                      departmentsWithoutDivisions.length === 0
                        ? "success"
                        : "warning"
                    }
                    detail="Departments without divisions are the main design gaps in the current structure."
                  />
                </div>
              </WorkspacePanel>
            </aside>
          </div>
        </>
      ) : null}

      {activeView === "organisation-tree" ? (
        <PeopleSection>
          <OrganisationTreeExplorer org={org} />
        </PeopleSection>
      ) : null}

      {activeView === "employee-tree" ? (
        <PeopleSection>
          <EmployeeTreeExplorer employees={employees} />
        </PeopleSection>
      ) : null}

      <StructureEntityDialog
        open={Boolean(formState)}
        state={formState}
        loading={isSubmitting}
        onClose={() => {
          if (!isSubmitting) setFormState(null);
        }}
        onChange={setFormState}
        onSubmit={() => void submitForm()}
      />

      <DeleteDialog
        open={Boolean(deleteState)}
        state={deleteState}
        loading={isSubmitting}
        onClose={() => {
          if (!isSubmitting) setDeleteState(null);
        }}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}

function EmptyStateCard({
  action,
  description,
  title,
}: {
  action?: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <div className="mnx-org-structure-empty-card">
      <strong>{title}</strong>
      <p>{description}</p>
      {action ? <div>{action}</div> : null}
    </div>
  );
}

function HealthRow({
  detail,
  label,
  tone,
  value,
}: {
  detail: string;
  label: string;
  tone: "success" | "warning";
  value: string;
}) {
  return (
    <div className="mnx-org-structure-health-row">
      <div className="mnx-org-structure-health-row-top">
        <strong>{label}</strong>
        <WorkspaceBadge variant={tone}>{value}</WorkspaceBadge>
      </div>
      <p>{detail}</p>
    </div>
  );
}

function StructureEntityDialog({
  loading,
  onChange,
  onClose,
  onSubmit,
  open,
  state,
}: {
  loading: boolean;
  onChange: (state: FormState | null) => void;
  onClose: () => void;
  onSubmit: () => void;
  open: boolean;
  state: FormState | null;
}) {
  if (!state) return null;

  const isDivision = state.entity === "division";
  const title =
    state.mode === "create"
      ? `Create ${getEntityLabel(state.entity)}`
      : `Edit ${getEntityLabel(state.entity)}`;
  const description = isDivision
    ? `This division will sit under ${state.departmentName}.`
    : "Keep the name and code clean so downstream workspaces remain consistent.";

  return (
    <WorkspaceDialog
      open={open}
      onClose={onClose}
      eyebrow="Organisation structure"
      title={title}
      description={description}
      className="mnx-people-dialog-compact"
      footer={
        <div className="mnx-org-structure-dialog-footer">
          <WorkspaceAction
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </WorkspaceAction>
          <WorkspaceAction
            onClick={onSubmit}
            disabled={
              loading ||
              !state.name.trim() ||
              (!isDivision && !state.code.trim())
            }
          >
            {loading
              ? state.mode === "create"
                ? "Creating..."
                : "Saving..."
              : state.mode === "create"
                ? "Create"
                : "Save changes"}
          </WorkspaceAction>
        </div>
      }
    >
      <form
        className="mnx-org-structure-dialog-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <WorkspaceField label="Name" htmlFor="org-structure-name" required>
          <WorkspaceInput
            id="org-structure-name"
            autoFocus
            value={state.name}
            onChange={(event) =>
              onChange({
                ...state,
                name: event.target.value,
              })
            }
            placeholder={
              isDivision ? "Enter division name" : "Enter display name"
            }
          />
        </WorkspaceField>

        {!isDivision ? (
          <WorkspaceField label="Code" htmlFor="org-structure-code" required>
            <WorkspaceInput
              id="org-structure-code"
              value={state.code}
              onChange={(event) =>
                onChange({
                  ...state,
                  code: event.target.value.toUpperCase(),
                })
              }
              maxLength={12}
              placeholder="Short code"
            />
          </WorkspaceField>
        ) : null}
      </form>
    </WorkspaceDialog>
  );
}

function DeleteDialog({
  loading,
  onClose,
  onConfirm,
  open,
  state,
}: {
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
  open: boolean;
  state: DeleteState | null;
}) {
  if (!state) return null;

  return (
    <WorkspaceDialog
      open={open}
      onClose={onClose}
      eyebrow="Organisation structure"
      title={`Delete ${getEntityLabel(state.entity)}`}
      description={`You are about to delete "${state.name}".`}
      className="mnx-people-dialog-compact"
      footer={
        <div className="mnx-org-structure-dialog-footer">
          <WorkspaceAction
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </WorkspaceAction>
          <WorkspaceAction
            variant="destructive"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Deleting..." : "Delete"}
          </WorkspaceAction>
        </div>
      }
    >
      <div className="mnx-org-structure-delete-copy">
        <p>{state.description}</p>
      </div>
    </WorkspaceDialog>
  );
}

function getEntityLabel(entity: FormState["entity"] | DeleteState["entity"]) {
  if (entity === "branch") return "Branch";
  if (entity === "department") return "Department";
  return "Division";
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong while saving the organisation structure.";
}
