import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { TicketForm } from "./ticket-form";
import { TicketsClient } from "./tickets-client";
import { CrmConfigurationState } from "@/modules/crm/components/workspace/crm-workspace";

export const metadata = {
  title: "Support Tickets | CRM | Adarsh Shipping",
};

async function checkIsAdmin(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { roles: { include: { role: true } } },
  });
  const roles = user?.roles.map((r) => r.role.name) ?? [];
  return roles.some((r) => ["Admin", "HR", "Management", "Director"].includes(r));
}

export default async function TicketsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  await requirePermission(session.user.id, "crm.access");
  const orgId = session.user.orgId;

  if (!orgId) {
    return <CrmConfigurationState description="Organisation configuration is missing." />;
  }

  const isAdmin = await checkIsAdmin(session.user.id);

  // Fetch tickets
  const tickets = await db.crmTicket.findMany({
    where: isAdmin
      ? { raisedBy: { orgId } }
      : { raisedById: session.user.id },
    orderBy: [
      { status: "asc" }, // open first
      { createdAt: "desc" },
    ],
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
        select: {
          id: true,
        },
      },
    },
  });

  // Fetch administrators/HR users who can be assigned tickets
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
      <div className="flex justify-end">
        <TicketForm />
      </div>

      <TicketsClient
        initialTickets={tickets}
        admins={admins}
        currentUserId={session.user.id}
        isAdmin={isAdmin}
      />
    </div>
  );
}
