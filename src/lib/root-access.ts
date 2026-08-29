import { can } from "@/lib/rbac";

/**
 * "Root module control" is the ability to enable/suspend whole workspaces for an
 * organisation. It is an ordinary permission — NOT a hardcoded identity.
 *
 * Historically this was gated on a specific hardcoded Gmail address
 * (`isRootControlEmail`, MON-S1-003), which is an undocumented backdoor and an
 * information leak. Authorisation now derives only from the permission below,
 * granted through a role like "Root Module Controller".
 */
export const ROOT_MODULE_CONTROL_PERMISSION = "admin.modules.manage";

/** True when the user may access the root module-control surface. */
export function hasRootModuleControl(userId: string): Promise<boolean> {
  return can(userId, ROOT_MODULE_CONTROL_PERMISSION);
}
