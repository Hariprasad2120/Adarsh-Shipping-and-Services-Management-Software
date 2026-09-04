"use client";

import {
  Building2,
  GitBranch,
  Layers3,
  Network,
  Search,
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

type TreeNodeKind = "company" | "group" | "unit" | "person";

type TreeNode = {
  id: string;
  title: string;
  subtitle?: string;
  initials?: string;
  kind: TreeNodeKind;
  children: TreeNode[];
};

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

function countDescendants(nodes: TreeNode[]): number {
  return nodes.reduce(
    (total, node) => total + 1 + countDescendants(node.children),
    0,
  );
}

function collectExpandable(
  nodes: TreeNode[],
  depth: number,
  maxDepth: number,
  target: Set<string>,
) {
  for (const node of nodes) {
    if (node.children.length > 0 && depth < maxDepth) target.add(node.id);
    collectExpandable(node.children, depth + 1, maxDepth, target);
  }
}

const KIND_ICON: Record<Exclude<TreeNodeKind, "person">, ReactNode> = {
  company: <Building2 aria-hidden="true" />,
  group: <Network aria-hidden="true" />,
  unit: <GitBranch aria-hidden="true" />,
};

function TreeRow({
  node,
  depth,
  expanded,
  onToggle,
}: {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isOpen = hasChildren && expanded.has(node.id);

  return (
    <div
      className={cn("mnx-tree-row", isOpen && "is-open")}
      role="treeitem"
      aria-selected={false}
      aria-expanded={hasChildren ? isOpen : undefined}
    >
      <div className={cn("mnx-tree-node", `is-${node.kind}`)}>
        <span className="mnx-tree-node-avatar" aria-hidden="true">
          {node.kind === "person"
            ? node.initials ?? initials(node.title)
            : KIND_ICON[node.kind]}
        </span>
        <span className="mnx-tree-node-copy">
          <strong title={node.title}>{node.title}</strong>
          {node.subtitle ? <small title={node.subtitle}>{node.subtitle}</small> : null}
        </span>
        {hasChildren ? (
          // eslint-disable-next-line no-restricted-syntax -- compact inline tree expand/collapse control, not a standalone action button.
          <button
            type="button"
            className={cn("mnx-tree-node-toggle", isOpen && "is-open")}
            onClick={() => onToggle(node.id)}
            aria-label={
              isOpen
                ? `Collapse ${node.title}`
                : `Expand ${node.title} (${node.children.length})`
            }
          >
            {node.children.length}
          </button>
        ) : null}
      </div>

      {isOpen ? (
        <div className="mnx-tree-children" role="group">
          {node.children.map((child) => (
            <TreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function HierarchyTree({
  roots,
  defaultExpandedDepth = 1,
}: {
  roots: TreeNode[];
  defaultExpandedDepth?: number;
}) {
  const initialExpanded = useMemo(() => {
    const target = new Set<string>();
    collectExpandable(roots, 0, defaultExpandedDepth, target);
    return target;
    // Rebuild whenever the tree shape changes (filters, data refresh).
  }, [roots, defaultExpandedDepth]);

  const [manualExpanded, setManualExpanded] = useState<Set<string>>(new Set());
  const [manualCollapsed, setManualCollapsed] = useState<Set<string>>(new Set());

  const expanded = useMemo(() => {
    const next = new Set(initialExpanded);
    for (const id of manualExpanded) next.add(id);
    for (const id of manualCollapsed) next.delete(id);
    return next;
  }, [initialExpanded, manualExpanded, manualCollapsed]);

  function onToggle(id: string) {
    if (expanded.has(id)) {
      setManualExpanded((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
      setManualCollapsed((current) => new Set(current).add(id));
    } else {
      setManualCollapsed((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
      setManualExpanded((current) => new Set(current).add(id));
    }
  }

  return (
    <div className="mnx-tree" role="tree">
      <div className="mnx-tree-children is-root" role="group">
        {roots.map((node) => (
          <TreeRow
            key={node.id}
            node={node}
            depth={0}
            expanded={expanded}
            onToggle={onToggle}
          />
        ))}
      </div>
    </div>
  );
}

function pruneTree(
  node: TreeNode,
  matches: (node: TreeNode) => boolean,
): TreeNode | null {
  const children = node.children
    .map((child) => pruneTree(child, matches))
    .filter((child): child is TreeNode => child !== null);

  if (children.length === 0 && !matches(node)) return null;
  return { ...node, children };
}

export function OrganisationTreeExplorer({
  className,
  description = "Read branches, departments, and divisions as one branched operating tree.",
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

  const roots = useMemo(() => {
    if (!normalizedOrg) return [];

    const branchGroup: TreeNode[] =
      scope !== "departments" && normalizedOrg.branches.length > 0
        ? [
            {
              id: "org-branches",
              title: "Branches",
              subtitle: `${normalizedOrg.branches.length} operating location${
                normalizedOrg.branches.length === 1 ? "" : "s"
              }`,
              kind: "group",
              children: normalizedOrg.branches.map((branch) => ({
                id: `branch-${branch.id}`,
                title: branch.name,
                subtitle: `Code ${branch.code}`,
                kind: "unit" as const,
                children: [],
              })),
            },
          ]
        : [];

    const departmentGroup: TreeNode[] =
      scope !== "branches"
        ? normalizedOrg.departments.map((department) => ({
            id: `dept-${department.id}`,
            title: department.name,
            subtitle:
              department.divisions.length > 0
                ? `Code ${department.code} · ${department.divisions.length} division${
                    department.divisions.length === 1 ? "" : "s"
                  }`
                : `Code ${department.code} · no divisions yet`,
            kind: "group" as const,
            children: department.divisions.map((division) => ({
              id: `div-${division.id}`,
              title: division.name,
              subtitle: "Division",
              kind: "unit" as const,
              children: [],
            })),
          }))
        : [];

    const companyRoot: TreeNode = {
      id: "org-root",
      title: normalizedOrg.name,
      subtitle: `${normalizedOrg.branches.length} branch${
        normalizedOrg.branches.length === 1 ? "" : "es"
      } · ${normalizedOrg.departments.length} department${
        normalizedOrg.departments.length === 1 ? "" : "s"
      }`,
      kind: "company",
      children: [...branchGroup, ...departmentGroup],
    };

    const queryValue = query.trim().toLowerCase();
    if (!queryValue) return [companyRoot];

    const matches = (node: TreeNode) =>
      `${node.title} ${node.subtitle ?? ""}`.toLowerCase().includes(queryValue);
    const pruned = pruneTree(companyRoot, matches);
    return pruned ? [pruned] : [];
  }, [normalizedOrg, query, scope]);

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
              Expand any node to walk the structure. Counts show how many
              children sit under a collapsed branch.
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

      {roots.length === 0 ? (
        <TreeEmptyState
          icon={<Network aria-hidden="true" />}
          title="Nothing matches this view"
          description="Adjust the search or scope to see the organisation tree."
        />
      ) : (
        <HierarchyTree roots={roots} defaultExpandedDepth={2} />
      )}
    </div>
  );
}

export function EmployeeTreeExplorer({
  className,
  description = "Walk the reporting structure branch by branch, from leaders down to every direct report.",
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

  const rootEmployees = useMemo(
    () =>
      normalizedEmployees
        .filter((employee) => {
          if (!directReportMap.has(employee.id)) return false;
          return !employee.managerId || !employeeMap.has(employee.managerId);
        })
        .sort((left, right) => {
          const countDelta =
            (directReportMap.get(right.id)?.length ?? 0) -
            (directReportMap.get(left.id)?.length ?? 0);
          if (countDelta !== 0) return countDelta;
          return left.name.localeCompare(right.name, undefined, {
            sensitivity: "base",
          });
        }),
    [directReportMap, employeeMap, normalizedEmployees],
  );

  const roots = useMemo(() => {
    const buildNode = (
      employee: OrganisationEmployee,
      seen: Set<string>,
    ): TreeNode => {
      const nextSeen = new Set(seen).add(employee.id);
      const children = (directReportMap.get(employee.id) ?? [])
        .filter((report) => !nextSeen.has(report.id))
        .map((report) => buildNode(report, nextSeen));

      return {
        id: employee.id,
        title: employee.name,
        subtitle: employee.designation,
        initials: initials(employee.name),
        kind: "person",
        children,
      };
    };

    const fullRoots = rootEmployees.map((employee) =>
      buildNode(employee, new Set()),
    );

    if (!queryValue && scope === "all") return fullRoots;

    const matches = (node: TreeNode) => {
      const employee = employeeMap.get(node.id);
      return employee
        ? employeeMatchesFilters(employee, queryValue, scope, scopeValue)
        : false;
    };

    return fullRoots
      .map((node) => pruneTree(node, matches))
      .filter((node): node is TreeNode => node !== null);
  }, [directReportMap, employeeMap, queryValue, rootEmployees, scope, scopeValue]);

  const mappedEmployees = normalizedEmployees.filter(
    (employee) => employee.managerId && employeeMap.has(employee.managerId),
  ).length;
  const peopleInTree = countDescendants(roots);

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
              This tree follows current manager mappings. Employees without a
              linked manager stay out of the supervised chain.
            </p>
          </div>
        </div>

        <div className="mnx-org-visual-company-metrics">
          <WorkspaceBadge variant="accent">
            {normalizedEmployees.length} active employees
          </WorkspaceBadge>
          <WorkspaceBadge variant={rootEmployees.length > 0 ? "success" : "warning"}>
            {rootEmployees.length} top-level leads
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

      {roots.length === 0 ? (
        <TreeEmptyState
          icon={<Users2 aria-hidden="true" />}
          title={
            rootEmployees.length === 0
              ? "No reporting roots are mapped yet"
              : "No one matches this view"
          }
          description={
            rootEmployees.length === 0
              ? "Complete manager mappings so the employee tree can be built."
              : "Search more broadly or clear the group filter to see the tree."
          }
        />
      ) : (
        <>
          <div className="mnx-tree-hint">
            <Layers3 aria-hidden="true" />
            <span>
              Showing {peopleInTree} of {normalizedEmployees.length} people across{" "}
              {roots.length} reporting root{roots.length === 1 ? "" : "s"}.
            </span>
          </div>
          <HierarchyTree roots={roots} defaultExpandedDepth={2} />
        </>
      )}
    </div>
  );
}

function TreeEmptyState({
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
