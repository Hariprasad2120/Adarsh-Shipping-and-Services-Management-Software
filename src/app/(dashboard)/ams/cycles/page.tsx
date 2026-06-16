import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { listCycles } from "@/modules/ams/service";
import { getNow } from "@/lib/clock";
import { CyclesClient } from "./cycles-client";

type CyclesClientProps = React.ComponentProps<typeof CyclesClient>;

export default async function CyclesPage() {
  const session = await auth();
  if (!session) redirect("/login");
  await requirePermission(session.user.id, "ams.cycle.manage");

  const [cycles, now] = await Promise.all([
    listCycles(session.user.orgId!),
    getNow(),
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      <CyclesClient cycles={cycles as CyclesClientProps["cycles"]} currentYear={now.getFullYear()} />
    </div>
  );
}
