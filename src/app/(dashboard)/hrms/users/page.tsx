import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { UserControlPage } from "@/components/hrms/user-control-page";

export default async function HrmsUserControlRoute() {
  const session = await auth();
  if (!session) redirect("/login");

  await requirePermission(session.user.id, "hrms.employee.deactivate");

  return <UserControlPage />;
}
