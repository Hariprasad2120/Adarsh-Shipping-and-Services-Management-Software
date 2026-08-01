import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ReimbursementAdminView } from "@/modules/hrms/components/reimbursement-admin-view";

export default async function ReimbursementPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return <ReimbursementAdminView />;
}
