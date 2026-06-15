"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const createSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(200),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.string().min(1, "Category is required"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
});

const commentSchema = z.object({
  ticketId: z.string(),
  message: z.string().min(1, "Message cannot be empty"),
});

type Result = { ok: true; ticketId?: string } | { ok: false; error: string };

async function isUserAdmin(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { roles: { include: { role: true } } },
  });
  const roles = user?.roles.map((r) => r.role.name) ?? [];
  return roles.some((r) => ["Admin", "HR", "Management", "Director"].includes(r));
}

export async function createTicketAction(formData: FormData): Promise<Result> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const parsed = createSchema.safeParse({
      title: formData.get("title"),
      description: formData.get("description"),
      category: formData.get("category"),
      priority: formData.get("priority"),
    });

    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]!.message };
    }

    const ticket = await db.crmTicket.create({
      data: {
        raisedById: session.user.id,
        title: parsed.data.title,
        description: parsed.data.description,
        category: parsed.data.category,
        priority: parsed.data.priority,
        status: "OPEN",
      },
    });

    // Notify all admins and HR in the organisation
    const admins = await db.user.findMany({
      where: {
        active: true,
        orgId: session.user.orgId,
        roles: {
          some: {
            role: {
              name: { in: ["Admin", "HR"] },
            },
          },
        },
      },
    });

    for (const admin of admins) {
      await db.notification.create({
        data: {
          userId: admin.id,
          orgId: session.user.orgId,
          kind: "TICKET_CREATED",
          title: `New CRM Ticket: "${parsed.data.title}"`,
          body: `A new ${parsed.data.priority} priority ticket was raised by ${session.user.name ?? "employee"}.`,
          link: `/crm/tickets/${ticket.id}`,
        },
      }).catch(() => {});
    }

    revalidatePath("/crm/tickets");
    return { ok: true, ticketId: ticket.id };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to create ticket" };
  }
}

export async function addTicketCommentAction(formData: FormData): Promise<Result> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const ticketId = formData.get("ticketId") as string;
    const message = formData.get("message") as string;

    const parsed = commentSchema.safeParse({ ticketId, message });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]!.message };
    }

    const ticket = await db.crmTicket.findUnique({
      where: { id: parsed.data.ticketId },
      include: { raisedBy: true },
    });
    if (!ticket) return { ok: false, error: "Ticket not found" };

    const isAdmin = await isUserAdmin(session.user.id);
    if (ticket.raisedById !== session.user.id && !isAdmin) {
      return { ok: false, error: "Forbidden" };
    }

    await db.crmTicketComment.create({
      data: {
        ticketId: parsed.data.ticketId,
        authorId: session.user.id,
        message: parsed.data.message,
      },
    });

    // Notify the other party
    if (isAdmin) {
      // Notify employee
      await db.notification.create({
        data: {
          userId: ticket.raisedById,
          orgId: session.user.orgId,
          kind: "TICKET_COMMENT",
          title: `Admin replied to ticket`,
          body: `Support team commented on: "${ticket.title}"`,
          link: `/crm/tickets/${ticket.id}`,
        },
      }).catch(() => {});
    } else {
      // Notify assignee if set, else notify all admins
      if (ticket.assigneeId) {
        await db.notification.create({
          data: {
            userId: ticket.assigneeId,
            orgId: session.user.orgId,
            kind: "TICKET_COMMENT",
            title: `User replied to ticket`,
            body: `${session.user.name} commented on: "${ticket.title}"`,
            link: `/crm/tickets/${ticket.id}`,
          },
        }).catch(() => {});
      }
    }

    revalidatePath(`/crm/tickets/${parsed.data.ticketId}`);
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to add comment" };
  }
}

export async function updateTicketStatusAction(formData: FormData): Promise<Result> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const ticketId = formData.get("ticketId") as string;
    const status = formData.get("status") as any;

    if (!ticketId || !status) return { ok: false, error: "Missing parameters" };

    const isAdmin = await isUserAdmin(session.user.id);
    if (!isAdmin) return { ok: false, error: "Forbidden" };

    const ticket = await db.crmTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) return { ok: false, error: "Ticket not found" };

    await db.crmTicket.update({
      where: { id: ticketId },
      data: { status },
    });

    await db.notification.create({
      data: {
        userId: ticket.raisedById,
        orgId: session.user.orgId,
        kind: "TICKET_STATUS",
        title: `Ticket Status Updated`,
        body: `Your ticket "${ticket.title}" status is now ${status.replace("_", " ")}.`,
        link: `/crm/tickets/${ticket.id}`,
      },
    }).catch(() => {});

    revalidatePath(`/crm/tickets/${ticketId}`);
    revalidatePath("/crm/tickets");
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to update status" };
  }
}

export async function assignTicketAction(formData: FormData): Promise<Result> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const ticketId = formData.get("ticketId") as string;
    const assigneeId = formData.get("assigneeId") as string;

    if (!ticketId) return { ok: false, error: "Missing ticket ID" };

    const isAdmin = await isUserAdmin(session.user.id);
    if (!isAdmin) return { ok: false, error: "Forbidden" };

    const ticket = await db.crmTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) return { ok: false, error: "Ticket not found" };

    await db.crmTicket.update({
      where: { id: ticketId },
      data: { assigneeId: assigneeId || null, status: assigneeId ? "IN_PROGRESS" : "OPEN" },
    });

    if (assigneeId) {
      await db.notification.create({
        data: {
          userId: assigneeId,
          orgId: session.user.orgId,
          kind: "TICKET_ASSIGNED",
          title: `Ticket Assigned to You`,
          body: `You have been assigned ticket "${ticket.title}".`,
          link: `/crm/tickets/${ticket.id}`,
        },
      }).catch(() => {});
    }

    revalidatePath(`/crm/tickets/${ticketId}`);
    revalidatePath("/crm/tickets");
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to assign ticket" };
  }
}
