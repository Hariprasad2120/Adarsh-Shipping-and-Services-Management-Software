import Link from "next/link";
import { ArrowLeft, CircleUserRound } from "lucide-react";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-4">
          <Link
            href="/ams/appraisals"
            className="inline-flex items-center gap-2 text-sm text-[#8ca0c2] transition hover:text-[#6985b0]"
          >
            <ArrowLeft className="size-4" />
            Back to Appraisals
          </Link>

          <div className="flex items-start gap-4">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#00cec4]/10 text-[#00cec4]">
              <CircleUserRound className="size-5" />
            </span>
            <div>
              <h1 className="ds-h1 heading-icon-none text-gray-900">{user.name}</h1>
              <p className="mt-1 text-base text-[#61779b]">{subtitle || "Employee appraisal setup"}</p>
            </div>
          </div>
        </div>

        <Link
          href={`/hrms/employees/${user.id}`}
          className="inline-flex items-center gap-2 self-start rounded-2xl border border-outline-variant/40 bg-surface px-4 py-2.5 text-sm font-medium text-on-surface shadow-sm transition hover:border-[#00cec4]/35 hover:text-[#00a79f]"
        >
          <CircleUserRound className="size-4" />
          Employee Details
        </Link>
      </div>

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
        hrUsers={hrUsers}
        managerUsers={managerUsers}
        salarySummary={salarySummary}
        scheduledAppraisal={scheduledAppraisal}
        tlUsers={tlUsers}
      />
    </div>
  );
}
