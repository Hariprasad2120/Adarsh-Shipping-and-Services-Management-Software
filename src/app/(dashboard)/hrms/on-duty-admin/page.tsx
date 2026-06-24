import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { OnDutyAdminView } from "@/components/hrms/on-duty-admin-view";

export default async function OnDutyAdminPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return <OnDutyAdminView />;
}
