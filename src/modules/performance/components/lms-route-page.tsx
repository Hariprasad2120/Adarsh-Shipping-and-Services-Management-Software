import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LmsView } from "./lms-view";

export async function LmsRoutePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return <LmsView />;
}
