/**
 * Stage 2 — enterprise platform: organisation provisioning.
 *
 * Composes the Stage-2 primitives from a template to stand up (or reconfigure)
 * an organisation. Idempotent where practical — re-running with the same
 * template tops up missing pieces rather than duplicating them. Uses the
 * cache-free write paths so it is safe from scripts / API routes / the seed.
 */

import { db } from "@/lib/db";
import { resolveEnabledModules, type ModuleId } from "@/modules/core/module-registry";
import { setEnabledModuleIdsRaw } from "@/modules/core/organisation/module-settings";
import type { ToggleableModuleSectionId } from "@/modules/core/organisation/module-config";
import { ensureDefaultLegalEntity } from "@/modules/core/organisation/legal-entity";
import { writeOrganisationRegionalSettingsRaw } from "@/modules/core/regional";
import { upsertApprovalPolicy } from "@/modules/core/approvals";
import { upsertNumberingSequence } from "@/modules/core/numbering";
import { recordConfigChange } from "@/modules/core/config-audit";
import type { OrganisationTemplate, ProvisionInput, ProvisionResult } from "./types";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function grantRolePermissions(roleId: string, permissionKeys: string[]) {
  if (permissionKeys.length === 0) return;
  const perms = await db.permission.findMany({
    where: { key: { in: permissionKeys } },
    select: { id: true },
  });
  if (perms.length === 0) return;
  await db.rolePermission.createMany({
    data: perms.map((p) => ({ roleId, permissionId: p.id })),
    skipDuplicates: true,
  });
}

async function ensureRoles(orgId: string, template: OrganisationTemplate): Promise<string[]> {
  const created: string[] = [];
  for (const roleDef of template.roles) {
    const existing = await db.role.findFirst({
      where: { orgId, name: roleDef.name },
      select: { id: true },
    });
    let roleId = existing?.id;
    if (!roleId) {
      const role = await db.role.create({
        data: { orgId, name: roleDef.name, isSystem: roleDef.isSystem ?? false },
      });
      roleId = role.id;
      created.push(roleDef.name);
    }
    await grantRolePermissions(roleId, roleDef.permissionKeys ?? []);
  }
  return created;
}

export async function provisionOrganisation(input: ProvisionInput): Promise<ProvisionResult> {
  const { template } = input;
  const actorLabel = input.actorLabel ?? "provisioning";

  // 1. Organisation
  let orgId: string;
  let created = false;
  if ("existingOrgId" in input.organisation) {
    orgId = input.organisation.existingOrgId;
    const org = await db.organisation.findUnique({ where: { id: orgId }, select: { id: true } });
    if (!org) throw new Error(`provisionOrganisation: org ${orgId} not found`);
  } else {
    const name = input.organisation.create.name.trim();
    if (!name) throw new Error("provisionOrganisation: organisation name is required");
    let slug = input.organisation.create.slug?.trim() || slugify(name);
    if (!slug) slug = `org-${Date.now()}`;
    // De-dupe slug.
    for (let i = 1; await db.organisation.findUnique({ where: { slug }, select: { id: true } }); i++) {
      slug = `${slugify(name) || "org"}-${i}`;
    }
    const org = await db.organisation.create({ data: { name, slug } });
    orgId = org.id;
    created = true;
  }

  // 2. Default legal entity
  const legalEntityId = await ensureDefaultLegalEntity(orgId);
  if (template.legalEntity?.entityType) {
    await db.legalEntity.updateMany({
      where: { id: legalEntityId, entityType: null },
      data: { entityType: template.legalEntity.entityType },
    });
  }

  // 3. Regional settings (template defaults, then installer overrides)
  await writeOrganisationRegionalSettingsRaw(orgId, {
    ...template.regional,
    ...(input.overrides?.regional ?? {}),
  });

  // 4. Modules (dependency closure resolved by the registry)
  const requestedModules: ModuleId[] = input.overrides?.modules ?? template.modules;
  const { enabled } = resolveEnabledModules(requestedModules);
  const businessModuleIds = enabled.filter(
    (id): id is ToggleableModuleSectionId => id !== "dashboard" && id !== "todo" && id !== "notifications" && id !== "admin",
  );
  const enabledModules = await setEnabledModuleIdsRaw(orgId, businessModuleIds);

  // 5. Roles
  const rolesCreated = await ensureRoles(orgId, template);

  // 6. Approval policies
  const approvalPoliciesCreated: string[] = [];
  for (const pol of template.approvalPolicies ?? []) {
    await upsertApprovalPolicy({
      orgId,
      subjectType: pol.subjectType,
      scopeKey: pol.scopeKey,
      name: pol.name,
      requireDistinctApprover: pol.requireDistinctApprover,
      steps: pol.steps.map((s) => ({
        level: s.level,
        approverMode: s.approverMode,
        permissionKey: s.permissionKey,
        requiredApprovals: s.requiredApprovals,
      })),
    });
    approvalPoliciesCreated.push(pol.subjectType);
  }

  // 7. Numbering sequences
  const numberingSequencesCreated: string[] = [];
  for (const seq of template.numberingSequences ?? []) {
    await upsertNumberingSequence(
      { orgId, moduleId: seq.moduleId, docType: seq.docType },
      {
        prefix: seq.prefix,
        suffix: seq.suffix,
        padding: seq.padding,
        startValue: seq.startValue,
        resetPolicy: seq.resetPolicy,
      },
    );
    numberingSequencesCreated.push(`${seq.moduleId}/${seq.docType}`);
  }

  // 8. Audit
  await recordConfigChange({
    orgId,
    actor: { label: actorLabel },
    source: "provisioning",
    action: created ? "organisation.provision" : "organisation.apply_template",
    targetType: "Organisation",
    targetId: orgId,
    after: {
      template: `${template.id}@${template.version}`,
      enabledModules,
      rolesCreated,
      approvalPoliciesCreated,
      numberingSequencesCreated,
    },
    summary: `${created ? "Provisioned" : "Applied template to"} organisation from "${template.name}"`,
  });

  return {
    orgId,
    created,
    legalEntityId,
    enabledModules,
    rolesCreated,
    approvalPoliciesCreated,
    numberingSequencesCreated,
  };
}
