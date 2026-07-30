import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { HrmsAppSettingsPage } from "@/modules/hrms/components/app-settings-page";

export default async function HrmsSettingsRoute() {
  const session = await getSession();
  if (!session) redirect("/login");

  await requirePermission(session.user.id, "hrms.settings.manage");

  return <HrmsAppSettingsPage />;
}
