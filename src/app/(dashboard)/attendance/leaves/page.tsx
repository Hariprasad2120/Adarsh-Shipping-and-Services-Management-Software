import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requirePermission, can } from "@/lib/rbac";
import { getLeaveRequests, getLeaveTypes, getLeaveBalances } from "@/modules/attendance/service";
import { getNow } from "@/lib/clock";
import { LeavesClient } from "./leaves-client";

type LeavesClientProps = React.ComponentProps<typeof LeavesClient>;

export default async function LeavesPage() {
  const session = await auth();
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

  return (
    <div className="space-y-6">
      <h1 className="ds-h1 text-gray-900">Leaves</h1>
      <LeavesClient
        myRequests={myRequestRows as LeavesClientProps["myRequests"]}
        leaveTypes={leaveTypes as LeavesClientProps["leaveTypes"]}
        balances={balances as LeavesClientProps["balances"]}
        pendingApprovals={approvalRows as LeavesClientProps["pendingApprovals"]}
        canApprove={canApprove}
      />
    </div>
  );
}
