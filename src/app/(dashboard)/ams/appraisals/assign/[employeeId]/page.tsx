import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { BreadcrumbLabel } from "@/components/breadcrumb-label";
import { getNow } from "@/lib/clock";
import { loadCaps, requirePermission } from "@/lib/rbac";
import { toDisplayTitleCase } from "@/lib/text-case";
import { dueInMonth } from "@/modules/ams/due-dates";
import { getRoles } from "@/modules/core/organisation/service";
import { getUser, listUsersSlim } from "@/modules/core/user/service";
import { getSalaryRevisionSummaryForUser } from "@/modules/hrms/salary-revisions";
import { StartAppraisalClient } from "./start-appraisal-client";

export default async function AssignAppraisalPage({ params }: { params: Promise<{ employeeId: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");
  await requirePermission(session.user.id, "ams.appraisal.assign_reviewers");

  const { employeeId } = await params;
  const orgId = session.user.orgId!;

  const [user, roles, salarySummary, now, caps] = await Promise.all([
    getUser(employeeId),
    getRoles(orgId),
    getSalaryRevisionSummaryForUser(employeeId),
    getNow(),
    loadCaps(session.user.id),
  ]);

  if (!user || user.orgId !== orgId) notFound();

  const hrRoleId = roles.find((role) => role.name === "HR")?.id;
  const tlRoleId = roles.find((role) => role.name === "TL")?.id;
  const managerRoleId = roles.find((role) => role.name === "Manager")?.id;

  const [hrUsers, tlUsers, managerUsers] = await Promise.all([
    hrRoleId ? listUsersSlim(orgId, { roleId: hrRoleId, active: true }) : [],
    tlRoleId ? listUsersSlim(orgId, { roleId: tlRoleId, active: true }) : [],
    managerRoleId ? listUsersSlim(orgId, { roleId: managerRoleId, active: true }) : [],
  ]);

  const joinDate = user.employmentRecord?.joinDate ?? null;
  const dueSlot = joinDate
    ? dueInMonth(
        new Date(joinDate),
        Number(user.employmentRecord?.priorExperienceYears ?? 0),
        now.getFullYear(),
        now.getMonth(),
      )
    : null;

  const scheduledAppraisal = dueSlot
    ? {
        dueDate: dueSlot.dueDate.toISOString(),
        dueDateLabel: dueSlot.dueDate.toLocaleDateString("en-IN"),
        kind: dueSlot.kind,
        descriptor:
          dueSlot.kind === "ANNUAL"
            ? `Year ${dueSlot.cycleIndex} anniversary`
            : "6 month milestone",
      }
    : null;

  const employeeNumber =
    ((user.employmentRecord?.payrollMeta as { employeeNumber?: string } | null)?.employeeNumber ?? "").trim() || "-";
  const subtitle = [toDisplayTitleCase(user.department?.name), toDisplayTitleCase(user.designation)]
    .filter((value) => value !== "-")
    .join(" · ");
  const designation = toDisplayTitleCase(user.designation);

  return (
    <div className="space-y-5">
      <BreadcrumbLabel segment={employeeId} label={user.name} />
      <StartAppraisalClient
        canStartSpecial={Boolean(caps["admin.org.manage"])}
        employee={{
          id: user.id,
          name: user.name,
          designation: designation === "-" ? null : designation,
          employeeNumber,
          joinDateLabel: salarySummary?.joinDateLabel ?? (joinDate ? new Date(joinDate).toLocaleDateString("en-IN") : "-"),
          tenureLabel: salarySummary?.tenureLabel ?? "-",
          employeeTypeLabel: salarySummary?.employeeTypeLabel ?? "Employee",
        }}
        employeeDetailsHref={`/hrms/employees/${user.id}`}
        hrUsers={hrUsers}
        managerUsers={managerUsers}
        salarySummary={salarySummary}
        scheduledAppraisal={scheduledAppraisal}
        tlUsers={tlUsers}
      />
    </div>
  );
}
