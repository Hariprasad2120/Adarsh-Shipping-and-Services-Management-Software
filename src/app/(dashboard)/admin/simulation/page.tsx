import { auth } from "@/lib/auth";
import { getClockState } from "@/lib/clock";
import { can } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { SimulationClient } from "./simulation-client";

export default async function SimulationPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const allowed = await can(session.user.id, "admin.org.manage");
  if (!allowed) redirect("/dashboard");

  const { frozenAt } = await getClockState();

  return <SimulationClient initialFrozenAt={frozenAt?.toISOString() ?? null} />;
}
