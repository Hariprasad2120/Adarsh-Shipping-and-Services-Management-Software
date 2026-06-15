import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { TicketForm } from "./ticket-form";
import { TicketsClient } from "./tickets-client";
import { LifeBuoy } from "lucide-react";

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
    <div className="max-w-7xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="ds-h1 flex items-center gap-4 text-gray-900 dark:text-white">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#00cec4]/10 text-[#00cec4]">
              <LifeBuoy className="size-5" />
            </span>
            Support Tickets
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            {isAdmin
              ? "Monitor and resolve employee technical issues and appraisal requests."
              : "Need help? Raise a ticket or follow up on existing ones here."}
          </p>
        </div>
        <div className="shrink-0">
          <TicketForm />
        </div>
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
