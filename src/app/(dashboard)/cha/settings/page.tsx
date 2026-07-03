import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { ensureSettingsAndDefaults, listJobTypesForSettings } from "@/modules/cha/service";
import { db } from "@/lib/db";
import { listUsersSlim } from "@/modules/core/user/service";
import { SettingsForm } from "./settings-form";

export default async function ChaSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) redirect("/setup");

  await requirePermission(session.user.id, "cha.settings.manage");

  const [
    settings,
    roles,
    activeEmployees,
    normalizedJobTypes,
    shipmentTypes,
    teamGroups,
    branches,
    branchNumberingRules,
    documentCategories,
  ] = await Promise.all([
    ensureSettingsAndDefaults(orgId),
    db.role.findMany({ where: { orgId }, select: { name: true } }),
    listUsersSlim(orgId, { active: true }),
    listJobTypesForSettings(orgId),
    db.chaShipmentType.findMany({ where: { orgId }, orderBy: { name: "asc" } }),
    db.chaTeamGroup.findMany({ where: { orgId }, orderBy: { name: "asc" } }),
    db.branch.findMany({
      where: { orgId },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
    db.chaBranchNumberingRule.findMany({
      where: { orgId },
      orderBy: { branch: { name: "asc" } },
    }),
    db.chaDocumentRequirementCategory.findMany({
      where: { orgId },
      include: { items: { orderBy: { sortOrder: "asc" } } },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const availableRoles = roles.map((role) => role.name);

  for (const fallbackRole of ["Admin", "HR", "Manager", "Employee"]) {
    if (!availableRoles.includes(fallbackRole)) {
      availableRoles.push(fallbackRole);
    }
  }

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

  const parsedJobCreatorRoles = parseStringArray(settings.jobCreatorRoles, [
    "Admin",
    "HR",
    "Manager",
    "Employee",
  ]);

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

  return (
    <div className="w-full max-w-none space-y-4">
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
        jobTypes={normalizedJobTypes}
        shipmentTypes={shipmentTypes}
        teamGroups={teamGroups}
        documentCategories={documentCategories}
      />
    </div>
  );
}