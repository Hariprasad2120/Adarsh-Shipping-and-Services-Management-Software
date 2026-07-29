import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function CRMPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  redirect("/crm/dashboard");
}
