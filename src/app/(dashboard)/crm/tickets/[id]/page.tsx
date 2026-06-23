import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { TicketDetailClient } from "./ticket-detail-client";

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
  const session = await auth();
  if (!session) redirect("/login");

  await requirePermission(session.user.id, "crm.access");
  const orgId = session.user.orgId;

  if (!orgId) {
    return (
      <div className="rounded-xl border border-outline-variant bg-surface p-8 text-center text-sm text-on-surface-variant">
        Organisation configuration missing.
      </div>
    );
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
      <div className="rounded-xl border border-outline-variant bg-surface p-8 text-center text-sm text-on-surface-variant">
        Ticket not found.
      </div>
    );
  }

  const isAdmin = await checkIsAdmin(session.user.id);

  // Security check: must be owner or admin/HR
  if (ticket.raisedById !== session.user.id && !isAdmin) {
    return (
      <div className="rounded-xl border border-outline-variant bg-surface p-8 text-center text-sm text-on-surface-variant">
        Access denied. You do not have permission to view this ticket.
      </div>
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
