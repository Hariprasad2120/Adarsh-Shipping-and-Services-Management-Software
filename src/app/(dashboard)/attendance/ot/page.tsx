import { auth } from "@/lib/auth";
import { loadCaps } from "@/lib/rbac";
import { getOTEntries } from "@/modules/attendance/service";
import { redirect } from "next/navigation";
import { OtClient } from "./ot-client";
import { Clock } from "lucide-react";

export const metadata = {
  title: "Overtime Management | Attendance | Adarsh Shipping",
};

export default async function OvertimePage() {
  const session = await auth();
  if (!session) redirect("/login");

  const caps = await loadCaps(session.user.id);
  const canApprove = Boolean(caps["attendance.ot.approve"] || caps["attendance.punch.manage"]);
  const canRequest = Boolean(caps["attendance.ot.request"]);

  if (!canApprove && !canRequest) {
    return (
      <div className="rounded-xl border border-outline-variant bg-surface p-8 text-center text-sm text-on-surface-variant">
        Access Denied: You do not have permissions for Overtime Management.
      </div>
    );
  }

  const orgId = session.user.orgId;
  if (!orgId) {
    return (
      <div className="rounded-xl border border-outline-variant bg-surface p-8 text-center text-sm text-on-surface-variant">
        Organisation configuration missing.
      </div>
    );
  }

  // Fetch entries based on access level
  const entries = canApprove
    ? await getOTEntries(orgId)
    : await getOTEntries(orgId, { userId: session.user.id });

  return (
    <div className="max-w-7xl space-y-6">
      <div className="space-y-1">
        <h1 className="ds-h1 flex items-center gap-4 text-gray-900 dark:text-white">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#00cec4]/10 text-[#00cec4]">
            <Clock className="size-5" />
          </span>
          Overtime Management
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
          {canApprove
            ? "Approve or reject employee overtime submissions and monitor work log hours."
            : "Request overtime compensation and track your submission history."}
        </p>
      </div>

      <OtClient
        initialEntries={entries as any}
        canApprove={canApprove}
        canRequest={canRequest}
        currentUserId={session.user.id}
      />
    </div>
  );
}
