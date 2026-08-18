import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requirePermission, can } from "@/lib/rbac";
import { getLeaveRequests, getLeaveTypes, getLeaveBalances } from "@/modules/attendance/service";
import { getNow } from "@/lib/clock";
import { db } from "@/lib/db";
import { LeavesClient } from "./leaves-client";

type LeavesClientProps = React.ComponentProps<typeof LeavesClient>;

export default async function LeavesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  await requirePermission(session.user.id, "attendance.leave.request");

  const now = await getNow();
  const canApprove = await can(session.user.id, "attendance.leave.approve");

  const [myRequests, leaveTypes, balances, pendingApprovals] = await Promise.all([
    getLeaveRequests(session.user.orgId!, { userId: session.user.id }),
    getLeaveTypes(session.user.orgId!),
    getLeaveBalances(session.user.id, now.getFullYear()),
    canApprove
      ? getLeaveRequests(session.user.orgId!, { status: "pending" })
      : Promise.resolve([]),
  ]);
  const serializeLeaveRequest = (request: (typeof myRequests)[number]) => ({
    ...request,
    fromDate: request.fromDate.toISOString(),
    toDate: request.toDate.toISOString(),
  });
  const myRequestRows = myRequests.map(serializeLeaveRequest);
  const approvalRows = pendingApprovals.map(serializeLeaveRequest);

  // LeaveType.defaultBalance and LeaveBalance.balance are Prisma.Decimal
  // server-side (see the Float→Decimal migration) — Decimal instances
  // aren't serializable across the server/client boundary, so convert to
  // plain numbers here rather than relying on the `as` casts below to
  // paper over the shape mismatch.
  // Classification lives on the active LeavePolicyVersion, not LeaveType
  // itself — fetched separately here so the on-duty-only fields (spec §21)
  // can be shown/required in the UI without changing the shared
  // getCachedLeaveTypes() cache shape used by other callers.
  const activeVersionIds = leaveTypes.map((lt) => lt.activeVersionId).filter((id): id is string => Boolean(id));
  const activeVersions = activeVersionIds.length
    ? await db.leavePolicyVersion.findMany({
        where: { id: { in: activeVersionIds } },
        select: { id: true, classification: true, unit: true },
      })
    : [];
  const versionById = new Map(activeVersions.map((v) => [v.id, v]));

  const leaveTypeRows = leaveTypes.map((lt) => ({
    ...lt,
    defaultBalance: lt.defaultBalance.toNumber(),
    classification: lt.activeVersionId ? (versionById.get(lt.activeVersionId)?.classification ?? null) : null,
    unit: lt.activeVersionId ? (versionById.get(lt.activeVersionId)?.unit ?? null) : null,
  }));
  const balanceRows = balances.map((b) => ({
    ...b,
    balance: b.balance.toNumber(),
    leaveType: { ...b.leaveType, defaultBalance: b.leaveType.defaultBalance.toNumber() },
  }));

  return (
    <div className="space-y-6">
      <LeavesClient
        myRequests={myRequestRows as LeavesClientProps["myRequests"]}
        leaveTypes={leaveTypeRows as LeavesClientProps["leaveTypes"]}
        balances={balanceRows as LeavesClientProps["balances"]}
        pendingApprovals={approvalRows as LeavesClientProps["pendingApprovals"]}
        canApprove={canApprove}
      />
    </div>
  );
}
