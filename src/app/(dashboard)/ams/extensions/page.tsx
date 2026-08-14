import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { loadCaps } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { ExtensionsClient } from "./extensions-client";
import type {
  ActiveExtensionAppraisal,
  ExtensionRequestRow,
} from "./extensions-client";
import { Calendar } from "lucide-react";
import {
  PerformanceSection,
  PerformanceSectionHeader,
} from "@/modules/performance/components/performance-workspace";
import { WorkspaceState } from "@/components/layout/workspace";

export const metadata = {
  title: "Deadline Extensions | AMS | Adarsh Shipping",
};

export default async function ExtensionsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) {
    return (
      <WorkspaceState
        variant="danger"
        eyebrow="Appraisal operations"
        title="Configuration error"
        description="Organisation configuration is missing."
        icon={<Calendar aria-hidden="true" />}
      />
    );
  }

  const caps = await loadCaps(session.user.id);
  const isAdmin = Boolean(
    caps["ams.cycle.manage"] ||
    caps["ams.appraisal.assign_reviewers"] ||
    caps["ams.appraisal.management_review"],
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
    <PerformanceSection>
      <PerformanceSectionHeader
        eyebrow="Appraisal operations"
        title="Deadline extensions"
        description={
          isAdmin
            ? "Manage extension request submissions and extend self-assessments or reviewer deadlines."
            : "Request more time to complete your self-assessments or reviewer ratings."
        }
      />
      <div className="px-5 pb-5">
        <ExtensionsClient
          initialRequests={requests as ExtensionRequestRow[]}
          activeAppraisals={activeAppraisals as ActiveExtensionAppraisal[]}
          isAdmin={isAdmin}
        />
      </div>
    </PerformanceSection>
  );
}
