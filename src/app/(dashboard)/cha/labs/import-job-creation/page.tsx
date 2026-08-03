import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { ImportJobCreationPageClient } from "./_components/import-job-creation-page-client";

export default async function ImportJobCreationLabPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  if (!session.user.orgId) redirect("/setup");

  await requirePermission(session.user.id, "cha.access");

  return <ImportJobCreationPageClient />;
}
