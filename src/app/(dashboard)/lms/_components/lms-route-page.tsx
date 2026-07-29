import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LmsView } from "@/components/hrms/lms-view";

export async function LmsRoutePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return <LmsView />;
}
