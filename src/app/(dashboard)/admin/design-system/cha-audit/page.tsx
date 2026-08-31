import { redirect } from "next/navigation";
import { Lock } from "lucide-react";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { WorkspaceState } from "@/components/monolith";
import { ChaAuditClient } from "./cha-audit-client";

export default async function AdminChaAuditPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const allowed = await can(session.user.id, "admin.org.manage");
  if (!allowed) {
    return (
      <WorkspaceState
        variant="permission"
        eyebrow="Permission required"
        title="CHA design audit"
        description="You need administrator access to inspect the CHA module design audit catalogue."
        icon={<Lock size={22} />}
      />
    );
  }

  return <ChaAuditClient />;
}
