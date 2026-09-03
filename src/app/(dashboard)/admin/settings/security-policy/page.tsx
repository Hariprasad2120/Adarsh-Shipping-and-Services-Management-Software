import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { WorkspacePage, WorkspacePageHeader } from "@/components/layout/workspace";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getOrgSecurityPolicy } from "./actions";
import { SecurityPolicyClient } from "./security-policy-client";

export const metadata = { title: "Organisation security policy" };
export const dynamic = "force-dynamic";

export default async function OrgSecurityPolicyPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await can(session.user.id, "admin.settings.manage"))) redirect("/dashboard");

  const policy = await getOrgSecurityPolicy();

  return (
    <WorkspacePage>
      <WorkspacePageHeader
        eyebrow="Administration"
        title="Organisation security policy"
        icon={<ShieldCheck size={21} aria-hidden="true" />}
        description="Authentication rules that apply to every member of this organisation. You cannot set these below the platform's hard minimums."
      />
      <SecurityPolicyClient requireMfa={policy.requireMfa} />
    </WorkspacePage>
  );
}
