import { auth } from "@/lib/auth";
import { loadCaps } from "@/lib/rbac";
import { getOrg } from "@/modules/core/organisation/service";
import { listUsers } from "@/modules/core/user/service";
import { redirect } from "next/navigation";
import { PeoplePlusPortalClient } from "./portal-client";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const orgId = session.user.orgId!;
  const caps = await loadCaps(session.user.id);

  const [org, users] = await Promise.all([
    getOrg(orgId),
    listUsers(orgId, { active: true }),
  ]);

  const permissions = Object.keys(caps).filter((k) => caps[k]);
  const safeUsers = users.map(({ passwordHash, ...u }) => u);

  return (
    <PeoplePlusPortalClient
      sessionUser={{
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      }}
      permissions={permissions}
      departments={org?.departments ?? []}
      branches={org?.branches ?? []}
      initialUsers={safeUsers}
    />
  );
}
