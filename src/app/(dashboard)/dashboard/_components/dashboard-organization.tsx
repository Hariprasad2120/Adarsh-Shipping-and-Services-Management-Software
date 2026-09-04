"use client";

import {
  ArrowUpRight,
  BookOpen,
  Building2,
  CalendarDays,
  FileText,
  Megaphone,
  Network,
  Plus,
  Search,
  Send,
  UserPlus,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "@/modules/notifications/client";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MonolithEmptyState } from "@/components/ui/foundation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs } from "@/components/ui/tabs";
import { WorkspaceSectionHeading } from "@/components/layout/workspace";
import {
  EmployeeTreeExplorer,
  OrganisationTreeExplorer,
} from "@/modules/hrms/components/organisation-tree-explorers";
import type { DashboardWidgetsData } from "@/modules/hrms/types";

interface DashboardOrganizationProps {
  data: DashboardWidgetsData;
  employees: unknown[];
  departments: unknown[];
  branches: unknown[];
}

type OrganizationView =
  | "overview"
  | "organisation-tree"
  | "employee-tree"
  | "directory"
  | "announcements"
  | "policies"
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

interface PolicyWorkspace {
  title: string;
  note: string;
  detail: string;
  href: string;
}

const organizationTabs: {
  id: OrganizationView;
  label: string;
  icon: typeof Users;
}[] = [
  { id: "overview", label: "Overview", icon: Building2 },
  { id: "organisation-tree", label: "Organisation tree", icon: Building2 },
  { id: "employee-tree", label: "Employee tree", icon: Network },
  { id: "directory", label: "Directory", icon: Users },
  { id: "announcements", label: "Announcements", icon: Megaphone },
  { id: "policies", label: "Policies", icon: BookOpen },
  { id: "birthday", label: "Birthdays", icon: CalendarDays },
  { id: "new-hires", label: "New hires", icon: UserPlus },
];

const policyWorkspaces: PolicyWorkspace[] = [
  {
    title: "Leave policy administration",
    note: "Attendance module",
    detail:
      "Configure live leave types, versioned policy rules, eligibility, and publication states from the dedicated attendance policy workspace.",
    href: "/attendance/leaves/policies",
  },
  {
    title: "Location tracking controls",
    note: "HRMS module",
    detail:
      "Review geofence and tracking-policy settings from the live location tracking workspace instead of relying on dashboard placeholders.",
    href: "/hrms/location-tracking",
  },
  {
    title: "Fuel reimbursement governance",
    note: "HRMS module",
    detail:
      "Open the reimbursement control centre to review the current rate history, payout queue, and reimbursement-policy updates.",
    href: "/hrms/reimbursement",
  },
];

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
      name: textValue(record, ["name", "fullName"], "Name not recorded"),
      email: textValue(record, ["email", "workEmail"], "No email recorded"),
      designation: textValue(record, ["designation", "role", "jobTitle"]),
      department: textValue(record, ["department", "departmentName"]),
      branch: textValue(record, ["branch", "branchName", "location"]),
      employeeNumber: textValue(record, ["employeeNumber", "employeeNo"], "—"),
      dateOfJoining: dateValue(record, ["dateOfJoining", "doj", "joinedAt", "createdAt"]),
      dateOfBirth: dateValue(record, ["dateOfBirth", "dob", "birthday"]),
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
  return (
    date.getMonth() === comparison.getMonth() &&
    date.getDate() === comparison.getDate()
  );
}

export function DashboardOrganization({
  data,
  employees,
  departments,
  branches,
}: DashboardOrganizationProps) {
  const [activeView, setActiveView] = useState<OrganizationView>("overview");
  const [query, setQuery] = useState("");
  const [announcementsList, setAnnouncementsList] = useState(data.announcements);
  const [showPostForm, setShowPostForm] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizedEmployees = normalizeEmployees(employees);
  const organizationTreeData = {
    name: "Adarsh Shipping & Services",
    branches,
    departments,
  };
  const today = new Date();

  async function handleCreateAnnouncement(isDraft: boolean) {
    if (!postTitle.trim()) {
      toast.error("Please enter an announcement title");
      return;
    }
    if (!postContent.trim()) {
      toast.error("Please enter the announcement text body");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/hrms/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: postTitle,
          content: postContent,
          isDraft,
        }),
      });

      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.error?.message || "Failed to save announcement");
      }

      toast.success(isDraft ? "Announcement saved as draft" : "Announcement published successfully");
      setAnnouncementsList((prev) => [json.data, ...prev]);
      setPostTitle("");
      setPostContent("");
      setShowPostForm(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving announcement";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

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
    (employee) =>
      employee.dateOfBirth && sameMonthAndDay(employee.dateOfBirth, today),
  );
  const newHires = normalizedEmployees.filter(
    (employee) =>
      employee.dateOfJoining &&
      today.getTime() - employee.dateOfJoining.getTime() <=
        1000 * 60 * 60 * 24 * 30,
  );

  return (
    <section className="mnx-organization-section">
      <WorkspaceSectionHeading
        index={(
          <span className="mnx-section-heading-marker" aria-hidden="true">
            &rsaquo;
          </span>
        )}
        title="Company services & people"
        description="Company signals, policy references, structures, and colleague records."
      />

      <Card className="mnx-organization-workspace">
        <header className="mnx-organization-toolbar">
          <Tabs
            className="mnx-organization-tabs"
            items={organizationTabs.map((tab) => {
              const Icon = tab.icon;
              return {
                value: tab.id,
                label: tab.label,
                icon: <Icon size={15} aria-hidden="true" />,
              };
            })}
            value={activeView}
            onChange={(value) => setActiveView(value as OrganizationView)}
          />

          {activeView === "directory" ? (
            <label className="mnx-search-field">
              <Search size={16} />
              <Input
                type="search"
                placeholder="Search colleagues…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Search company directory"
              />
            </label>
          ) : null}

          {activeView === "announcements" ? (
            <Button
              className="mnx-button-accent-sm"
              onClick={() => setShowPostForm((prev) => !prev)}
            >
              <Plus size={15} /> {showPostForm ? "Close form" : "Draft & post"}
            </Button>
          ) : null}
        </header>

        <div className="mnx-organization-content">
          {activeView === "overview" ? (
            <div className="mnx-organization-overview">
              <div
                className="mnx-dashboard-metrics mnx-org-metrics"
                aria-label="Organization metrics"
              >
                <article className="mnx-metric-card">
                  <header>
                    <span>Active employees</span>
                  </header>
                  <strong>{String(normalizedEmployees.length).padStart(2, "0")}</strong>
                  <p>Colleagues currently active</p>
                </article>
                <article className="mnx-metric-card">
                  <header>
                    <span>Departments</span>
                  </header>
                  <strong>{String(departments.length).padStart(2, "0")}</strong>
                  <p>Operational teams mapped</p>
                </article>
                <article className="mnx-metric-card">
                  <header>
                    <span>Branches</span>
                  </header>
                  <strong>{String(branches.length).padStart(2, "0")}</strong>
                  <p>Company locations configured</p>
                </article>
              </div>

              <article className="mnx-org-announcement">
                <header>
                  <span>Latest company signal</span>
                </header>
                {data.announcements[0] ? (
                  <>
                    <h3>{data.announcements[0].title}</h3>
                    <p>{data.announcements[0].body}</p>
                    <small>
                      {new Date(data.announcements[0].createdAt).toLocaleDateString(
                        "en-IN",
                        {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        },
                      )}
                    </small>
                  </>
                ) : (
                  <MonolithEmptyState>
                    <Megaphone size={23} />
                    <h3>No announcement posted</h3>
                    <p>New company updates will appear here.</p>
                  </MonolithEmptyState>
                )}
              </article>

              <article className="mnx-org-announcement">
                <header>
                  <span>Organisation workspace</span>
                </header>
                <h3>Open the full organisation control centre</h3>
                <p>
                  Maintain branches, departments, divisions, and reporting-aware
                  tree views from the dedicated HRMS organisation workspace.
                </p>
                <ButtonLink
                  href="/hrms/org-structure"
                  variant="inverse"
                >
                  Open organisation structure
                  <ArrowUpRight size={15} />
                </ButtonLink>
              </article>
            </div>
          ) : null}

          {activeView === "organisation-tree" ? (
            <OrganisationTreeExplorer
              org={organizationTreeData}
              className="mnx-dashboard-org-explorer"
              title="Organisation tree"
              description="Use the same organisation hierarchy language from the HRMS structure workspace without leaving the dashboard."
            />
          ) : null}

          {activeView === "employee-tree" ? (
            <EmployeeTreeExplorer
              employees={employees}
              className="mnx-dashboard-org-explorer"
              title="Employee tree"
              description="Trace leaders, direct reports, and second-line visibility from the current active employee set."
            />
          ) : null}

          {activeView === "announcements" ? (
            <div className="mnx-announcements-wrapper">
              {showPostForm ? (
                <Card className="mnx-announcement-composer-card">
                  <header className="mnx-composer-header">
                    <div>
                      <span className="mnx-spec-label">BROADCAST COMPOSER</span>
                      <h2>Draft & post announcement</h2>
                    </div>
                  </header>

                  <div className="mnx-composer-form">
                    <label className="mnx-form-field">
                      <span>Announcement Title *</span>
                      <Input
                        placeholder="e.g., Q3 All-Hands Meeting & Annual Holiday Schedule"
                        value={postTitle}
                        onChange={(e) => setPostTitle(e.target.value)}
                        disabled={isSubmitting}
                      />
                    </label>

                    <label className="mnx-form-field">
                      <span>Announcement Content *</span>
                      <Textarea
                        placeholder="Write detailed company broadcast text..."
                        rows={4}
                        value={postContent}
                        onChange={(e) => setPostContent(e.target.value)}
                        disabled={isSubmitting}
                      />
                    </label>

                    <div className="mnx-composer-actions">
                      <Button
                        disabled={isSubmitting}
                        onClick={() => handleCreateAnnouncement(false)}
                      >
                        <Send size={14} /> Post Announcement
                      </Button>
                      <Button
                        variant="outline"
                        disabled={isSubmitting}
                        onClick={() => handleCreateAnnouncement(true)}
                      >
                        <FileText size={14} /> Save as Draft
                      </Button>
                      <Button
                        variant="outline"
                        disabled={isSubmitting}
                        onClick={() => setShowPostForm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </Card>
              ) : null}

              {announcementsList.length > 0 ? (
                <div className="mnx-card-list">
                  {announcementsList.map((announcement) => {
                    const isDraft = !announcement.publishedAt;
                    return (
                      <article className="mnx-inset-card" key={announcement.id}>
                        <header>
                          <div className="mnx-announcement-header-left">
                            <Megaphone size={16} />
                            <span>Company announcement</span>
                          </div>
                          <Badge className={isDraft ? "mnx-badge-neutral" : "mnx-badge-accent"}>
                            {isDraft ? "DRAFT" : "PUBLISHED"}
                          </Badge>
                        </header>
                        <h3>{announcement.title}</h3>
                        <p>{announcement.body}</p>
                        <small>
                          {announcement.publishedAt
                            ? `Published ${new Date(announcement.publishedAt).toLocaleDateString("en-IN")}`
                            : `Created ${new Date(announcement.createdAt).toLocaleDateString("en-IN")}`}
                        </small>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <MonolithEmptyState>
                  <Megaphone size={24} />
                  <h3>No announcements posted yet</h3>
                  <p>Click &quot;Draft &amp; post&quot; above to issue your first company broadcast.</p>
                </MonolithEmptyState>
              )}
            </div>
          ) : null}

          {activeView === "policies" ? (
            <div className="mnx-policy-grid">
              <article>
                <span>
                  <BookOpen size={18} />
                </span>
                <div>
                  <h3>Central company policy library is not connected here yet</h3>
                  <p>
                    The dashboard no longer shows synthetic handbook entries. Use the
                    live operational policy workspaces below until a real company-wide
                    document register is available.
                  </p>
                </div>
              </article>

              {policyWorkspaces.map((workspace) => (
                <article key={workspace.href}>
                  <span>
                    <BookOpen size={18} />
                  </span>
                  <div>
                    <h3>{workspace.title}</h3>
                    <p>{workspace.note}</p>
                    <p>{workspace.detail}</p>
                  </div>
                  <ButtonLink href={workspace.href} variant="outline">
                    Open
                    <ArrowUpRight size={15} />
                  </ButtonLink>
                </article>
              ))}
            </div>
          ) : null}

          {activeView === "directory" ? (
            <div className="mnx-directory-grid">
              {filteredEmployees.map((employee) => (
                <article key={employee.id}>
                  <span className="mnx-person-avatar">{initials(employee.name)}</span>
                  <div>
                    <h3>{employee.name}</h3>
                    <p>{employee.designation || "Designation not assigned"}</p>
                    <small>{employee.email}</small>
                  </div>
                  <span className="mnx-directory-location">
                    {employee.branch || "Location not assigned"}
                  </span>
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
      </Card>
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
            <p>{employee.designation || "Designation not assigned"}</p>
            <small>{employee.department || "Department not assigned"}</small>
          </div>
          <Button
            mode="icon"
            size="sm"
            variant="outline"
            aria-label={`Open ${employee.name}'s profile`}
          >
            <ArrowUpRight size={15} />
          </Button>
        </article>
      ))}
    </div>
  );
}
