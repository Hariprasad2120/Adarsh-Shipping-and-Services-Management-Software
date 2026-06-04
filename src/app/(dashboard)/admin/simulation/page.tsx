import Link from "next/link";
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

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700">
          ← Admin
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Date Simulation</h1>
        <p className="mt-1 text-sm text-gray-500">
          Freeze the system clock for testing deadline and date-driven features.
        </p>
      </div>

      <SimulationClient initialFrozenAt={frozenAt?.toISOString() ?? null} />
    </div>
  );
}
