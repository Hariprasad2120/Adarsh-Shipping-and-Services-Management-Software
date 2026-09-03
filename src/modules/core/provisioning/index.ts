/**
 * Stage 2 — enterprise platform: organisation provisioning from templates.
 */
export * from "./types";
export { BUILTIN_TEMPLATES, GENERIC_SME_TEMPLATE, ENTERPRISE_TEMPLATE } from "./templates";
export { provisionOrganisation } from "./service";

import { BUILTIN_TEMPLATES } from "./templates";
import type { OrganisationTemplate } from "./types";

export function listTemplates(): readonly OrganisationTemplate[] {
  return BUILTIN_TEMPLATES;
}

export function getTemplate(id: string): OrganisationTemplate | undefined {
  return BUILTIN_TEMPLATES.find((t) => t.id === id);
}
