import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { getMonthAttendance } from "@/modules/attendance/service";
import { getNow } from "@/lib/clock";
import { PunchCard } from "./punch-card";

type PunchCardProps = React.ComponentProps<typeof PunchCard>;

export default async function PunchPage() {
  const session = await auth();
  if (!session) redirect("/login");
  await requirePermission(session.user.id, "attendance.punch.self");

  const now = await getNow();
  const punches = await getMonthAttendance(session.user.id, now.getFullYear(), now.getMonth() + 1);
  const punchRows = punches.map((p) => ({
    id: p.id,
    date: p.date.toISOString(),
    inAt: p.inAt?.toISOString() ?? null,
    outAt: p.outAt?.toISOString() ?? null,
  }));

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
      <PunchCard punches={punchRows as PunchCardProps["punches"]} today={now.toISOString()} />
    </div>
  );
}
