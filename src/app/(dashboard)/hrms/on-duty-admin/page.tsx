import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { OnDutyAdminView } from "@/modules/hrms/components/on-duty-admin-view";

export default async function OnDutyAdminPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return <OnDutyAdminView />;
}
