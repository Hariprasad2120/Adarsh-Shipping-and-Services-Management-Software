"use client";

import {
  ArrowUpRight,
  BookOpen,
  Building2,
  CalendarDays,
  Download,
  GitBranch,
  Landmark,
  Megaphone,
  Network,
  Search,
  UserPlus,
  Users,
} from "lucide-react";
import { useState } from "react";
import type { DashboardWidgetsData } from "@/modules/hrms/types";

interface DashboardOrganizationProps {
  data: DashboardWidgetsData;
  employees: unknown[];
  departments: unknown[];
  branches: unknown[];
}

type OrganizationView =
  | "overview"
  | "announcements"
  | "policies"
  | "employee-tree"
  | "department-tree"
  | "directory"
  | "birthday"
  | "new-hires";

interface NormalizedEmployee {
  id: string;
  name: string;
  email: string;
  designation: string;
  department: string;
  branch: string;
  employeeNumber: string;
  dateOfJoining: Date | null;
  dateOfBirth: Date | null;
}

interface NormalizedEntity {
  id: string;
  name: string;
  code: string;
}

const organizationTabs: { id: OrganizationView; label: string; icon: typeof Users }[] = [
  { id: "overview", label: "Overview", icon: Building2 },
  { id: "announcements", label: "Announcements", icon: Megaphone },
  { id: "policies", label: "Policies", icon: BookOpen },
  { id: "employee-tree", label: "Employee tree", icon: Network },
  { id: "department-tree", label: "Department tree", icon: GitBranch },
  { id: "directory", label: "Directory", icon: Users },
  { id: "birthday", label: "Birthdays", icon: CalendarDays },
  { id: "new-hires", label: "New hires", icon: UserPlus },
];

const policies = [
  { title: "Code of Conduct", note: "Version 2.0 · Updated January 2026" },
  { title: "Leave & Holiday Policy", note: "Reviewed February 2026" },
  { title: "Information Security Policy", note: "Version 1.4 · Company-wide" },
  { title: "Travel & Reimbursement", note: "Updated April 2026" },
];

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function textValue(record: Record<string, unknown>, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number") return String(value);
    if (value && typeof value === "object") {
      const nested = value as Record<string, unknown>;
      if (typeof nested.name === "string" && nested.name.trim()) return nested.name;
    }
  }
  return fallback;
}

function dateValue(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
    if (typeof value === "string" || typeof value === "number") {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
  }
  return null;
}

function normalizeEmployees(values: unknown[]): NormalizedEmployee[] {
  return values.map((value, index) => {
    const record = asRecord(value);
    return {
      id: textValue(record, ["id", "employeeNumber", "employeeNo"], `employee-${index}`),
      name: textValue(record, ["name", "fullName"], "Unnamed employee"),
      email: textValue(record, ["email", "workEmail"], "No email recorded"),
      designation: textValue(record, ["designation", "role", "jobTitle"], "Team member"),
      department: textValue(record, ["department", "departmentName"], "General operations"),
      branch: textValue(record, ["branch", "branchName", "location"], "Head office"),
      employeeNumber: textValue(record, ["employeeNumber", "employeeNo"], "—"),
      dateOfJoining: dateValue(record, ["dateOfJoining", "doj", "joinedAt", "createdAt"]),
      dateOfBirth: dateValue(record, ["dateOfBirth", "dob", "birthday"]),
    };
  });
}

function normalizeEntities(values: unknown[], prefix: string): NormalizedEntity[] {
  return values.map((value, index) => {
    const record = asRecord(value);
    return {
      id: textValue(record, ["id", "code", "name"], `${prefix}-${index}`),
      name: textValue(record, ["name", "title", "label"], `Unnamed ${prefix}`),
      code: textValue(record, ["code", "shortCode"], String(index + 1).padStart(2, "0")),
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

function sameMonthAndDay(date: Date, comparison: Date) {
  return date.getMonth() === comparison.getMonth() && date.getDate() === comparison.getDate();
}

export function DashboardOrganization({
  data,
  employees,
  departments,
  branches,
}: DashboardOrganizationProps) {
  const [activeView, setActiveView] = useState<OrganizationView>("overview");
  const [query, setQuery] = useState("");
  const normalizedEmployees = normalizeEmployees(employees);
  const normalizedDepartments = normalizeEntities(departments, "department");
  const normalizedBranches = normalizeEntities(branches, "branch");
  const today = new Date();

  const normalizedQuery = query.trim().toLowerCase();
  const filteredEmployees = normalizedQuery
    ? normalizedEmployees.filter((employee) =>
        [
          employee.name,
          employee.email,
          employee.designation,
          employee.department,
          employee.branch,
        ].some((value) => value.toLowerCase().includes(normalizedQuery)),
      )
    : normalizedEmployees;

  const birthdays = normalizedEmployees.filter(
    (employee) => employee.dateOfBirth && sameMonthAndDay(employee.dateOfBirth, today),
  );
  const newHires = normalizedEmployees.filter(
    (employee) => employee.dateOfJoining
      && today.getTime() - employee.dateOfJoining.getTime() <= 1000 * 60 * 60 * 24 * 30,
  );

  return (
    <section className="mnx-panel mnx-organization-workspace">
      <header className="mnx-organization-header">
        <div>
          <span className="mnx-dashboard-spec-label">ORGANIZATION SPACE</span>
          <h2>Company services & people</h2>
          <p>Company signals, policy references, structures, and colleague records.</p>
        </div>
        {activeView === "directory" ? (
          <label className="mnx-search-field">
            <Search size={16} />
            <input
              type="search"
              placeholder="Search colleagues…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search company directory"
            />
          </label>
        ) : null}
      </header>

      <nav className="mnx-organization-tabs" aria-label="Organization views">
        {organizationTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              type="button"
              key={tab.id}
              className={activeView === tab.id ? "is-active" : ""}
              onClick={() => setActiveView(tab.id)}
              aria-current={activeView === tab.id ? "page" : undefined}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      <div className="mnx-organization-content">
        {activeView === "overview" ? (
          <div className="mnx-organization-overview">
            <div className="mnx-org-stat-grid">
              <article><Users size={19} /><strong>{normalizedEmployees.length}</strong><span>Active employees</span></article>
              <article><GitBranch size={19} /><strong>{normalizedDepartments.length}</strong><span>Departments</span></article>
              <article><Landmark size={19} /><strong>{normalizedBranches.length}</strong><span>Branches</span></article>
            </div>
            <article className="mnx-org-announcement">
              <header><Megaphone size={17} /><span>Latest company signal</span></header>
              {data.announcements[0] ? (
                <>
                  <h3>{data.announcements[0].title}</h3>
                  <p>{data.announcements[0].body}</p>
                  <small>{new Date(data.announcements[0].createdAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}</small>
                </>
              ) : (
                <div className="mnx-empty-state">
                  <Megaphone size={23} />
                  <h3>No announcement posted</h3>
                  <p>New company updates will appear here.</p>
                </div>
              )}
            </article>
          </div>
        ) : null}

        {activeView === "announcements" ? (
          <div className="mnx-card-list">
            {data.announcements.length > 0 ? data.announcements.map((announcement) => (
              <article className="mnx-inset-card" key={announcement.id}>
                <header><Megaphone size={16} /><span>Company announcement</span></header>
                <h3>{announcement.title}</h3>
                <p>{announcement.body}</p>
                <small>{new Date(announcement.createdAt).toLocaleDateString("en-IN")}</small>
              </article>
            )) : (
              <div className="mnx-empty-state">
                <Megaphone size={24} />
                <h3>No announcements</h3>
                <p>The company broadcast feed is currently clear.</p>
              </div>
            )}
          </div>
        ) : null}

        {activeView === "policies" ? (
          <div className="mnx-policy-grid">
            {policies.map((policy) => (
              <article key={policy.title}>
                <span><BookOpen size={18} /></span>
                <div><h3>{policy.title}</h3><p>{policy.note}</p></div>
                <button type="button" className="mnx-icon-button" aria-label={`Download ${policy.title}`}>
                  <Download size={15} />
                </button>
              </article>
            ))}
          </div>
        ) : null}

        {activeView === "employee-tree" ? (
          <div className="mnx-tree-board">
            <header><Network size={17} /><span>Employee structure by department</span></header>
            <div className="mnx-tree-columns">
              {normalizedDepartments.slice(0, 5).map((department) => {
                const members = normalizedEmployees.filter((employee) =>
                  employee.department.toLowerCase() === department.name.toLowerCase(),
                );
                return (
                  <article key={department.id}>
                    <div className="mnx-tree-root"><span>{department.code}</span><b>{department.name}</b><small>{members.length} people</small></div>
                    <div>
                      {members.slice(0, 5).map((member) => (
                        <span className="mnx-tree-person" key={member.id}>
                          <i>{initials(member.name)}</i>
                          <span><b>{member.name}</b><small>{member.designation}</small></span>
                        </span>
                      ))}
                      {members.length === 0 ? <small className="mnx-muted-value">No linked employees</small> : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        ) : null}

        {activeView === "department-tree" ? (
          <div className="mnx-department-board">
            <article className="mnx-department-root">
              <span className="mnx-brand-mark"><i /><i /></span>
              <div><b>Adarsh Shipping & Services</b><small>Organization root</small></div>
            </article>
            <div className="mnx-department-branches">
              {normalizedBranches.map((branch) => (
                <article key={branch.id}>
                  <header><Landmark size={16} /><b>{branch.name}</b></header>
                  <div>
                    {normalizedDepartments.slice(0, 6).map((department) => (
                      <span key={`${branch.id}-${department.id}`}>
                        <i>{department.code}</i>
                        {department.name}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
            {normalizedBranches.length === 0 ? (
              <div className="mnx-empty-state">
                <GitBranch size={24} />
                <h3>No branches configured</h3>
                <p>Organization branches will appear in this structure.</p>
              </div>
            ) : null}
          </div>
        ) : null}

        {activeView === "directory" ? (
          <div className="mnx-directory-grid">
            {filteredEmployees.map((employee) => (
              <article key={employee.id}>
                <span className="mnx-person-avatar">{initials(employee.name)}</span>
                <div>
                  <h3>{employee.name}</h3>
                  <p>{employee.designation}</p>
                  <small>{employee.email}</small>
                </div>
                <span className="mnx-directory-location">{employee.branch}</span>
              </article>
            ))}
            {filteredEmployees.length === 0 ? (
              <div className="mnx-empty-state">
                <Search size={24} />
                <h3>No colleague found</h3>
                <p>Try a different name, role, department, or branch.</p>
              </div>
            ) : null}
          </div>
        ) : null}

        {activeView === "birthday" ? (
          <PeopleMoment
            people={birthdays}
            icon={CalendarDays}
            title="No birthdays today"
            detail="Today’s celebration list is clear."
          />
        ) : null}

        {activeView === "new-hires" ? (
          <PeopleMoment
            people={newHires}
            icon={UserPlus}
            title="No recent new hires"
            detail="Employees who joined in the last 30 days will appear here."
          />
        ) : null}
      </div>
    </section>
  );
}

function PeopleMoment({
  people,
  icon: Icon,
  title,
  detail,
}: {
  people: NormalizedEmployee[];
  icon: typeof Users;
  title: string;
  detail: string;
}) {
  if (people.length === 0) {
    return (
      <div className="mnx-empty-state mnx-people-empty">
        <Icon size={27} />
        <h3>{title}</h3>
        <p>{detail}</p>
      </div>
    );
  }

  return (
    <div className="mnx-directory-grid">
      {people.map((employee) => (
        <article key={employee.id}>
          <span className="mnx-person-avatar">{initials(employee.name)}</span>
          <div>
            <h3>{employee.name}</h3>
            <p>{employee.designation}</p>
            <small>{employee.department}</small>
          </div>
          <button type="button" className="mnx-icon-button" aria-label={`Open ${employee.name}'s profile`}>
            <ArrowUpRight size={15} />
          </button>
        </article>
      ))}
    </div>
  );
}
