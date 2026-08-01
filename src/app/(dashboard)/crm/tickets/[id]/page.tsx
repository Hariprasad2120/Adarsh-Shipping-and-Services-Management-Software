import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { TicketDetailClient } from "./ticket-detail-client";
import {
  CrmConfigurationState,
  CrmEmptyState,
  CrmPermissionState,
} from "@/modules/crm/components/workspace/crm-workspace";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "Ticket Details | CRM | Adarsh Shipping",
};

async function checkIsAdmin(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { roles: { include: { role: true } } },
  });
  const roles = user?.roles.map((r) => r.role.name) ?? [];
  return roles.some((r) => ["Admin", "HR", "Management", "Director"].includes(r));
}

export default async function TicketDetailPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  await requirePermission(session.user.id, "crm.access");
  const orgId = session.user.orgId;

  if (!orgId) {
    return <CrmConfigurationState description="Organisation configuration is missing." />;
  }

  const { id: ticketId } = await params;

  // Fetch ticket details
  const ticket = await db.crmTicket.findUnique({
    where: { id: ticketId },
    include: {
      raisedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          designation: true,
        },
      },
      assignee: {
        select: {
          id: true,
          name: true,
        },
      },
      comments: {
        orderBy: {
          createdAt: "asc",
        },
        include: {
          author: {
            select: {
              name: true,
              roles: {
                include: {
                  role: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!ticket) {
    return (
      <CrmEmptyState
        title="Support case not found"
        description="The requested support case does not exist or is no longer available."
      />
    );
  }

  const isAdmin = await checkIsAdmin(session.user.id);

  // Security check: must be owner or admin/HR
  if (ticket.raisedById !== session.user.id && !isAdmin) {
    return (
      <CrmPermissionState description="You do not have permission to view this support case." />
    );
  }

  // If admin, fetch potential assignees
  const admins = isAdmin
    ? await db.user.findMany({
        where: {
          active: true,
          orgId,
          roles: {
            some: {
              role: {
                name: { in: ["Admin", "HR", "Management", "Director"] },
              },
            },
          },
        },
        select: {
          id: true,
          name: true,
        },
        orderBy: {
          name: "asc",
        },
      })
    : [];

  return (
    <div className="space-y-6">
      <TicketDetailClient
        initialTicket={ticket}
        admins={admins}
        isAdmin={isAdmin}
        currentUserId={session.user.id}
      />
    </div>
  );
}
