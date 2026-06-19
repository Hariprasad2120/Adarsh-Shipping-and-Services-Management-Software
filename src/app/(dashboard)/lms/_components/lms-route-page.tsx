import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LmsView } from "@/components/hrms/lms-view";

export async function LmsRoutePage() {
  const session = await auth();
  if (!session) redirect("/login");

  return <LmsView />;
}
