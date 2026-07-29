import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getVisibleSectionById } from "@/lib/navigation";
import { loadCaps } from "@/lib/rbac";
import { isRecruitEnabled } from "@/lib/recruit-flag";
import { getOrg, getRoles } from "@/modules/core/organisation/service";
import { listUsersForDashboard } from "@/modules/core/user/service";
import { db } from "@/lib/db";
import { Users, Building2, Network, BarChart3 } from "lucide-react";
import {
  PeopleActionLink,
  PeopleLinkCard,
  PeopleLinkGrid,
  PeoplePerson,
  PeopleRecordLink,
  PeopleSection,
  PeopleSectionHeader,
  PeopleSummary,
  PeopleSummaryGrid,
  PeopleTable,
  PeopleTableBody,
  PeopleTableCell,
  PeopleTableEmpty,
  PeopleTableHead,
  PeopleTableHeader,
  PeopleTableRow,
} from "@/components/monolith/people-workspace";

export default async function HrmsDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const orgId = session.user.orgId!;
  const caps = await loadCaps(session.user.id);

  // listUsersForDashboard fetches only the fields displayed on this page and
  // applies take:8 at the DB level — avoids loading all employees with all
  // relations just to slice the first 8.
  const [org, recentEmployees, roles, totalActiveCount] = await Promise.all([
    getOrg(orgId),
    listUsersForDashboard(orgId, { active: true, take: 8 }),
    getRoles(orgId),
    db.user.count({ where: { orgId, active: true } }),
  ]);
  const hrmsSection = getVisibleSectionById(caps, "hrms");
  const recruitSection = isRecruitEnabled()
    ? getVisibleSectionById(caps, "recruit")
    : null;

  const stats = [
    { label: "Active employees", value: totalActiveCount, icon: Users },
    {
      label: "Departments",
      value: org?.departments.length ?? 0,
      icon: Network,
    },
    { label: "Branches", value: org?.branches.length ?? 0, icon: Building2 },
    { label: "Roles", value: roles.length, icon: BarChart3 },
  ];

  const descriptionByLabel: Record<string, string> = {
    Employees: "Browse profiles, reporting lines, and contact details.",
    "Onboarding Checklists": "Track onboarding steps and completion status.",
    "Work Reports": "Review submitted work logs and daily progress.",
    "Task Checklists": "Manage recurring HR and employee task lists.",
    "Approvals Central":
      "Handle requests and approval workflows from one place.",
    "Travel & Expenses":
      "Manage travel requests, reimbursements, and approvals.",
    "HR Letters": "Generate and manage employee letters.",
    "Document Drive": "Open employee files and shared HR documents.",
    "Help Desk": "Handle internal support and HR help requests.",
    "User Control":
      "Enable or disable employee login access from one HRMS control panel.",
    "Organisation Structure":
      "Manage branches, departments, and divisions from the HRMS workspace.",
    Ownership: "Define team leads, managers, and reporting hierarchy.",
    "Salary Structure": "Build salary structures and update payroll metadata.",
    "Salary Revisions": "Track each employee's latest revision and history.",
    "Payroll Batches": "Run payroll batches and monitor payout prep.",
    "HRMS Settings": "Toggle HRMS services and workspace-level app behavior.",
    Recruit:
      "Open hiring and career workflows for employer and employee workspaces.",
    "Employer Dashboard":
      "Track openings, candidates, applications, and hiring workflows.",
    "Career Dashboard":
      "Manage private career profile, resumes, and job applications.",
  };

  const quickActions = [
    ...(hrmsSection?.items ?? []).map((item) => ({
      href: item.href,
      label: item.label,
      description:
        descriptionByLabel[item.label] ?? "Open this HRMS workspace.",
    })),
    ...(recruitSection
      ? [
          {
            href: recruitSection.href,
            label: recruitSection.label,
            description:
              descriptionByLabel[recruitSection.label] ??
              "Open this HRMS workspace.",
          },
        ]
      : []),
  ];

  return (
    <>
      <PeopleSummaryGrid>
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <PeopleSummary
              key={stat.label}
              icon={<Icon aria-hidden="true" />}
              label={stat.label}
              value={stat.value}
            />
          );
        })}
      </PeopleSummaryGrid>

      <PeopleSection>
        <PeopleSectionHeader
          eyebrow="Navigation"
          title="People operations"
          description="Open a workspace available through your current role."
        />
        <PeopleLinkGrid>
          {quickActions.map((action) => {
            return (
              <PeopleLinkCard
                key={action.href}
                href={action.href}
                title={action.label}
                description={action.description}
              />
            );
          })}
        </PeopleLinkGrid>
      </PeopleSection>

      <PeopleSection>
        <PeopleSectionHeader
          eyebrow="Directory"
          title="Recent employees"
          description="The eight most recently returned active employee records."
          actions={
            <PeopleActionLink href="/hrms/employees">
              View all employees
            </PeopleActionLink>
          }
        />
        <PeopleTable>
          <PeopleTableHeader>
            <tr>
              <PeopleTableHead>Employee</PeopleTableHead>
              <PeopleTableHead>Employee #</PeopleTableHead>
              <PeopleTableHead>Department</PeopleTableHead>
              <PeopleTableHead>Branch</PeopleTableHead>
            </tr>
          </PeopleTableHeader>
          <PeopleTableBody>
            {recentEmployees.length === 0 ? (
              <PeopleTableEmpty
                colSpan={4}
                message="No employees found. Onboard your first employee."
              />
            ) : (
              recentEmployees.map((emp) => (
                <PeopleTableRow key={emp.id}>
                  <PeopleTableCell>
                    <PeopleRecordLink href={`/hrms/employees/${emp.id}`}>
                      <PeoplePerson name={emp.name} secondary={emp.email} />
                    </PeopleRecordLink>
                  </PeopleTableCell>
                  <PeopleTableCell className="mnx-people-muted">
                    {emp.employeeNumber ? `#${emp.employeeNumber}` : "—"}
                  </PeopleTableCell>
                  <PeopleTableCell className="mnx-people-muted">
                    {emp.department?.name ?? "—"}
                  </PeopleTableCell>
                  <PeopleTableCell className="mnx-people-muted">
                    {emp.branch?.name ?? "—"}
                  </PeopleTableCell>
                </PeopleTableRow>
              ))
            )}
          </PeopleTableBody>
        </PeopleTable>
      </PeopleSection>
    </>
  );
}
