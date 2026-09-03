/**
 * Stage 2 — enterprise platform: module registry.
 *
 * Single declaration point for what each Monolith module is — dependencies,
 * routes, permission groups, features, capabilities. See `types.ts` for the
 * contract and `registry.ts` for the manifests.
 */
export type { ModuleId, ModuleKind, ModuleManifest, ModuleFeatureManifest } from "./types";
export { MODULE_REGISTRY } from "./registry";
export {
  listModules,
  getModule,
  isModuleId,
  listCoreModuleIds,
  listBusinessModuleIds,
  validateRegistry,
  resolveEnabledModules,
  getModuleForPath,
  RegistryError,
} from "./resolve";
