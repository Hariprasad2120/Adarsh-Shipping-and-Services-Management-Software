import { redirect } from "next/navigation";
import { Lock } from "lucide-react";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { WorkspaceState } from "@/components/monolith";
import DesignSystemClient from "./design-system-client";
import "./design-system-catalogue.css";

export default async function AdminDesignSystemPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const allowed = await can(session.user.id, "admin.org.manage");
  if (!allowed) {
    return (
      <WorkspaceState
        variant="permission"
        eyebrow="Permission required"
        title="Design system"
        description="You need administrator access to view the Monolith production component catalogue."
        icon={<Lock size={22} />}
      />
    );
  }

  return <DesignSystemClient />;
}
