import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requirePermission, loadCaps } from "@/lib/rbac";
import { getMonthAttendance } from "@/modules/attendance/service";
import { getNow } from "@/lib/clock";
import { db } from "@/lib/db";
import { PunchCard } from "./punch-card";

type PunchCardProps = React.ComponentProps<typeof PunchCard>;

export default async function PunchPage({
  searchParams,
}: {
  searchParams: Promise<{ employeeId?: string; year?: string; month?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const sp = await searchParams;
  const now = await getNow();

  const caps = await loadCaps(session.user.id);
  const canManage = Boolean(caps["attendance.punch.manage"]);

  let targetEmployeeId = session.user.id;
  if (sp.employeeId && sp.employeeId !== session.user.id) {
    if (!canManage) {
      redirect("/attendance/punch");
    }
    targetEmployeeId = sp.employeeId;
  } else {
    await requirePermission(session.user.id, "attendance.punch.self");
  }

  const selectedYear = sp.year ? parseInt(sp.year, 10) : now.getFullYear();
  const selectedMonth = sp.month ? parseInt(sp.month, 10) : now.getMonth() + 1;

  const targetUser = await db.user.findUnique({
    where: { id: targetEmployeeId },
    select: { id: true, name: true, employeeNumber: true },
  });

  if (!targetUser) {
    redirect("/attendance/punch");
  }

  // Load all active employees for switcher if user is admin
  let employees: { id: string; name: string; employeeNumber: number | null }[] = [];
  if (canManage) {
    const dbEmployees = await db.user.findMany({
      where: { orgId: session.user.orgId, active: true },
      select: { id: true, name: true, employeeNumber: true },
      orderBy: { name: "asc" },
    });
    employees = dbEmployees.map((e) => ({
      id: e.id,
      name: e.name,
      employeeNumber: e.employeeNumber ? Number(e.employeeNumber) : null,
    }));
  }

  const punches = await getMonthAttendance(targetEmployeeId, selectedYear, selectedMonth);
  const punchRows = punches.map((p) => ({
    id: p.id,
    date: p.date.toISOString(),
    inAt: p.inAt?.toISOString() ?? null,
    outAt: p.outAt?.toISOString() ?? null,
  }));

  return (
    <div className="max-w-4xl space-y-6">
      <PunchCard
        punches={punchRows as PunchCardProps["punches"]}
        today={now.toISOString()}
        canManage={canManage}
        employees={employees}
        selectedEmployeeId={targetEmployeeId}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
      />
    </div>
  );
}
