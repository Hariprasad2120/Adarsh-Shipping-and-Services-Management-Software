import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { loadCaps } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { ExtensionsClient } from "./extensions-client";
import { Calendar } from "lucide-react";

export const metadata = {
  title: "Deadline Extensions | AMS | Adarsh Shipping",
};

export default async function ExtensionsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) {
    return (
      <div className="rounded-xl border border-outline-variant bg-surface p-8 text-center text-sm text-on-surface-variant">
        Organisation configuration missing.
      </div>
    );
  }

  const caps = await loadCaps(session.user.id);
  const isAdmin = Boolean(
    caps["ams.cycle.manage"] ||
    caps["ams.appraisal.assign_reviewers"] ||
    caps["ams.appraisal.management_review"]
  );

  // Fetch extension requests
  const requests = await db.appraisalExtensionRequest.findMany({
    where: isAdmin
      ? { appraisal: { cycle: { orgId } } }
      : { requesterId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      requester: {
        select: {
          name: true,
          designation: true,
        },
      },
      decidedBy: {
        select: {
          name: true,
        },
      },
      appraisal: {
        include: {
          cycle: {
            select: {
              name: true,
            },
          },
          employee: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  // Fetch active appraisals for the user to request extensions on (if not admin)
  const activeAppraisals = !isAdmin
    ? await db.appraisal.findMany({
        where: {
          OR: [
            { employeeId: session.user.id },
            { reviewers: { some: { userId: session.user.id } } },
          ],
          stage: {
            notIn: ["CLOSED"],
          },
        },
        include: {
          cycle: {
            select: {
              name: true,
            },
          },
          employee: {
            select: {
              name: true,
            },
          },
        },
      })
    : [];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
          {isAdmin
            ? "Manage extension request submissions and extend self-assessments or reviewer deadlines."
            : "Request more time to complete your self-assessments or reviewer ratings."}
        </p>
      </div>

      <ExtensionsClient
        initialRequests={requests as any}
        activeAppraisals={activeAppraisals}
        isAdmin={isAdmin}
        currentUserId={session.user.id}
      />
    </div>
  );
}
