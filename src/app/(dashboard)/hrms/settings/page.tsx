import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { HrmsAppSettingsPage } from "@/components/hrms/app-settings-page";

export default async function HrmsSettingsRoute() {
  const session = await auth();
  if (!session) redirect("/login");

  await requirePermission(session.user.id, "hrms.settings.manage");

  return <HrmsAppSettingsPage />;
}
