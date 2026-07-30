import "server-only";

import { getSession } from "@/lib/auth";
import { loadCaps } from "@/lib/rbac";
import { redirect } from "next/navigation";

import {
  canAccessAccountingRoute,
  hasAnyAccountingPermission,
} from "./operational-access";

export async function requireAccountingRouteAccess(
  pathname: string,
  explicitPermissions?: readonly string[],
) {
  const session = await getSession();
  if (!session?.user) redirect(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
  if (!session.user.orgId) redirect("/dashboard");
  const caps = await loadCaps(session.user.id);
  const allowed = explicitPermissions
    ? hasAnyAccountingPermission(caps, explicitPermissions)
    : canAccessAccountingRoute(caps, pathname);
  if (!allowed) redirect("/accounting/access-denied");
  return {
    session,
    caps,
    orgId: session.user.orgId,
    userId: session.user.id,
  };
}
