import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LmsView } from "@/components/hrms/lms-view";

export default async function LMSPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return <LmsView />;
}
