import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { UserControlPage } from "@/components/hrms/user-control-page";

export default async function HrmsUserControlRoute() {
  const session = await getSession();
  if (!session) redirect("/login");

  await requirePermission(session.user.id, "hrms.employee.deactivate");

  return <UserControlPage />;
}
