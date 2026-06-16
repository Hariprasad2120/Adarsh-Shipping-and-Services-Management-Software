import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requirePermission, loadCaps } from "@/lib/rbac";
import { getOrg } from "@/modules/core/organisation/service";
import { listUsers } from "@/modules/core/user/service";
import { PeoplePlusPortalClient } from "./portal-client";

export default async function PeoplePlusPage() {
  const session = await auth();
  if (!session) redirect("/login");

  // Verify read permission
  await requirePermission(session.user.id, "hrms.peopleplus.read");

  const orgId = session.user.orgId!;
  const caps = await loadCaps(session.user.id);

  // Fetch initial org metadata
  const [org, users] = await Promise.all([
    getOrg(orgId),
    listUsers(orgId, { active: true }),
  ]);

  const permissions = Object.keys(caps).filter((k) => caps[k]);

  const safeUsers = users.map(({ passwordHash, ...u }) => u);
  const departments = org?.departments || [];
  const branches = org?.branches || [];

  return (
    <PeoplePlusPortalClient
      sessionUser={{
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      }}
      permissions={permissions}
      departments={departments}
      branches={branches}
      initialUsers={safeUsers}
    />
  );
}
