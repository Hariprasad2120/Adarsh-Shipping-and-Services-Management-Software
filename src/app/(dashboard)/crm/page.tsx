import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function CRMPage() {
  const session = await auth();
  if (!session) redirect("/login");
  redirect("/crm/dashboard");
}
