/**
 * Stage 2 — enterprise platform: module registry contract.
 *
 * Every deployable capability of Monolith is described by one `ModuleManifest`.
 * The registry is the single declaration point for what a module *is*: its
 * dependencies, the routes it owns, the permission groups it introduces, the
 * navigation section it contributes, and (later) its settings schema and setup
 * steps. Nothing here is industry-specific — CHA is just another manifest.
 *
 * This layer is additive over the existing per-org enable/disable persistence in
 * `core/organisation/module-settings.ts`; it does not replace it.
 */

/** Stable identifiers — these match the navigation section ids 1:1. */
export type ModuleId =
  | "dashboard"
  | "todo"
  | "notifications"
  | "admin"
  | "product-catalogue"
  | "hrms"
  | "payroll"
  | "attendance"
  | "ams"
  | "lms"
  | "crm"
  | "freight-forwarding"
  | "communication"
  | "expense"
  | "cha"
  | "accounting"
  | "recruit";

export type ModuleKind =
  /** Platform capability — always enabled, cannot be turned off per-org. */
  | "core"
  /** Optional business module — enabled per organisation. */
  | "business";

export type ModuleFeatureManifest = {
  id: string;
  label: string;
  description: string;
  /** Route prefixes this sub-feature owns (gated when the feature is off). */
  routePrefixes: string[];
};

export type ModuleManifest = {
  id: ModuleId;
  label: string;
  description: string;
  /** Semver of the module's contract; bump on breaking manifest changes. */
  version: string;
  kind: ModuleKind;
  /**
   * Other modules that must be enabled for this one to function. Enabling a
   * module enables its full dependency closure. Must be acyclic.
   */
  dependsOn: ModuleId[];
  /**
   * URL path prefixes owned by this module, used by the proxy / nav to gate
   * access when the module is disabled. Empty for core modules that are never
   * gated, or whose routes live under another module's prefix.
   */
  routePrefixes: string[];
  /**
   * `Permission.group` values in the seed catalogue that belong to this module.
   * Lets provisioning seed only the permissions for enabled modules.
   */
  permissionGroups: string[];
  /** Toggleable sub-features within the module. */
  features?: ModuleFeatureManifest[];
  /**
   * Free-form capability tags a module offers to others (e.g. "documents",
   * "approvals"). Reserved for later dependency-by-capability resolution.
   */
  capabilities?: string[];
};
