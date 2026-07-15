import { redirect } from "next/navigation";
import { getPortalSession } from "@/modules/customer-portal/auth";

export default async function CustomerPortalIndexPage() {
  const session = await getPortalSession();
  redirect(session ? "/customer-portal/dashboard" : "/customer-portal/login");
}
