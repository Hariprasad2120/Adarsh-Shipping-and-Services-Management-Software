/**
 * Stage 2 — enterprise platform: organisation provisioning templates.
 *
 * A template is *data* — a reusable starting configuration, not a hardcoded
 * platform mode. `provisionOrganisation` composes the Stage-2 primitives
 * (module registry, regional settings, legal entity, roles, approval policies,
 * numbering sequences) from it. The installer may override any of it before
 * activation.
 */

import type { ModuleId } from "@/modules/core/module-registry";
import type { OrganisationRegionalSettingsPatch } from "@/modules/core/regional";

export type TemplateRole = {
  name: string;
  isSystem?: boolean;
  /** Permission keys to grant (must exist in the global catalogue). */
  permissionKeys?: string[];
};

export type TemplateApprovalStep = {
  level: number;
  approverMode: "PERMISSION" | "USER";
  permissionKey?: string;
  requiredApprovals?: number;
};

export type TemplateApprovalPolicy = {
  subjectType: string;
  name: string;
  scopeKey?: string;
  requireDistinctApprover?: boolean;
  steps: TemplateApprovalStep[];
};

export type TemplateNumberingSequence = {
  moduleId: string;
  docType: string;
  prefix?: string;
  suffix?: string;
  padding?: number;
  startValue?: number;
  resetPolicy?: "NEVER" | "ANNUALLY" | "MONTHLY";
};

export type OrganisationTemplate = {
  id: string;
  name: string;
  version: string;
  description: string;
  /** Business modules to enable; the registry resolves their dependency closure. */
  modules: ModuleId[];
  /** Regional defaults — installer overrides during setup. */
  regional: OrganisationRegionalSettingsPatch;
  /** Default legal-entity shape. */
  legalEntity?: { entityType?: string };
  roles: TemplateRole[];
  approvalPolicies?: TemplateApprovalPolicy[];
  numberingSequences?: TemplateNumberingSequence[];
};

export type ProvisionInput = {
  template: OrganisationTemplate;
  /** Target: create a new org, or apply the template to an existing one. */
  organisation:
    | { create: { name: string; slug?: string } }
    | { existingOrgId: string };
  /** Overrides applied on top of the template before anything is written. */
  overrides?: {
    regional?: OrganisationRegionalSettingsPatch;
    modules?: ModuleId[];
  };
  actorLabel?: string;
};

export type ProvisionResult = {
  orgId: string;
  created: boolean;
  legalEntityId: string;
  enabledModules: string[];
  rolesCreated: string[];
  approvalPoliciesCreated: string[];
  numberingSequencesCreated: string[];
};
