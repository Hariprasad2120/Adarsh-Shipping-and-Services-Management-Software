import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { ensureSettingsAndDefaults } from "@/modules/cha/service";
import { db } from "@/lib/db";
import { listUsersSlim } from "@/modules/core/user/service";
import { SettingsForm } from "./settings-form";

export default async function ChaSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) redirect("/setup");

  // Check RBAC permission for settings management
  await requirePermission(session.user.id, "cha.settings.manage");

  const settings = await ensureSettingsAndDefaults(orgId);
  const roles = await db.role.findMany({
    where: { orgId },
    select: { name: true },
  });

  const availableRoles = roles.map((r) => r.name);
  if (!availableRoles.includes("Admin")) availableRoles.push("Admin");
  if (!availableRoles.includes("HR")) availableRoles.push("HR");
  if (!availableRoles.includes("Manager")) availableRoles.push("Manager");
  if (!availableRoles.includes("Employee")) availableRoles.push("Employee");

  const parseStringArray = (value: unknown, fallback: string[] = []) => {
    if (!value) return fallback;
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === "string");
    }
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed)
          ? parsed.filter((item): item is string => typeof item === "string")
          : fallback;
      } catch {
        return fallback;
      }
    }
    return fallback;
  };

  const parsedJobCreatorRoles = parseStringArray(settings.jobCreatorRoles, ["Admin", "HR", "Manager", "Employee"]);

  const parsedJobCreatorUsers = parseStringArray(settings.jobCreatorUsers);

  const parsedExpenseCategories = parseStringArray(settings.expenseCategories, [
    "Customs Duty",
    "Port Handling Charges",
    "Transportation",
    "Documentation charges",
    "Agent Commission",
    "Storage Fees",
    "Miscellaneous",
  ]);

  // Fetch active employees for specific employee selection dropdown/checkbox list
  const activeEmployees = await listUsersSlim(orgId, { active: true });

  // Fetch job types for customization
  const jobTypes = await db.chaJobType.findMany({
    where: { orgId },
    orderBy: { name: "asc" },
  });

  const shipmentTypes = await db.chaShipmentType.findMany({
    where: { orgId },
    orderBy: { name: "asc" },
  });

  // Fetch team groups
  const teamGroups = await db.chaTeamGroup.findMany({
    where: { orgId },
    orderBy: { name: "asc" },
  });

  const branches = await db.branch.findMany({
    where: { orgId },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });

  const branchNumberingRules = await db.chaBranchNumberingRule.findMany({
    where: { orgId },
    orderBy: { branch: { name: "asc" } },
  });

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="flex items-center justify-between border-b border-outline-variant/30 pb-4">
        <div>
          <h1 className="ds-h1 text-[#00cec4]">CHA Configuration & Settings</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Manage operational workflows, approval gates, and disbursement rules for the Custom House Agent module.
          </p>
        </div>
      </div>

      <SettingsForm
        initialSettings={{
          id: settings.id,
          selfApprovalAllowed: settings.selfApprovalAllowed,
          managerApprovalPolicy: settings.managerApprovalPolicy as "ANY" | "ALL",
          jobCreatorRoles: parsedJobCreatorRoles,
          jobCreatorUsers: parsedJobCreatorUsers,
          expenseCategories: parsedExpenseCategories,
          jobNumberPrefix: settings.jobNumberPrefix,
          jobNumberNextNum: settings.jobNumberNextNum,
        }}
        availableRoles={Array.from(new Set(availableRoles))}
        availableEmployees={activeEmployees}
        branches={branches}
        branchNumberingRules={branchNumberingRules}
        jobTypes={jobTypes}
        shipmentTypes={shipmentTypes}
        teamGroups={teamGroups}
      />
    </div>
  );
}
