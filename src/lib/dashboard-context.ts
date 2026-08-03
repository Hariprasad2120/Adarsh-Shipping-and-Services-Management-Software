import "server-only";

import { cache } from "react";
import { getSession } from "@/lib/auth";
import { loadCaps } from "@/lib/rbac";
import {
  getEnabledFeatureIds,
  getEnabledModuleIds,
} from "@/modules/core/organisation/module-settings";

/**
 * One request-scoped source for the authenticated dashboard shell context.
 *
 * React cache only deduplicates during a render request. It intentionally does
 * not cache the session across HTTP requests, so DB-backed revocation remains
 * immediate on the next request.
 */
export const getDashboardContext = cache(async () => {
  const session = await getSession();
  if (!session?.user) return null;

  const orgId = session.user.orgId;
  if (!orgId) {
    return {
      session,
      orgId: null,
      caps: {},
      enabledModuleIds: [],
      enabledFeatureIds: [],
    };
  }

  const [caps, enabledModuleIds, enabledFeatureIds] = await Promise.all([
    loadCaps(session.user.id),
    getEnabledModuleIds(orgId),
    getEnabledFeatureIds(orgId),
  ]);

  return { session, orgId, caps, enabledModuleIds, enabledFeatureIds };
});
