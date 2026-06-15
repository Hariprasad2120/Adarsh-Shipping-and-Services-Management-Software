import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { ExtensionsClient } from "./extensions-client";
import { Calendar } from "lucide-react";

export const metadata = {
  title: "Deadline Extensions | AMS | Adarsh Shipping",
};

async function checkIsAdmin(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { roles: { include: { role: true } } },
  });
  const roles = user?.roles.map((r) => r.role.name) ?? [];
  return roles.some((r) => ["Admin", "HR", "Management", "Director"].includes(r));
}

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

  const isAdmin = await checkIsAdmin(session.user.id);

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
    <div className="max-w-7xl space-y-6">
      <div className="space-y-1">
        <h1 className="ds-h1 flex items-center gap-4 text-gray-900 dark:text-white">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#00cec4]/10 text-[#00cec4]">
            <Calendar className="size-5" />
          </span>
          Deadline Extensions
        </h1>
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
