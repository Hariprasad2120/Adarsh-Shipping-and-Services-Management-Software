"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import * as crmService from "./service";
import { db } from "@/lib/db";

type ActionResponse = { ok: true; data?: any } | { ok: false; error: string };

// ─── Lead Actions ────────────────────────────────────────────────────────────

export async function createLeadAction(formData: FormData): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "crm.lead.create");

    const lastName = formData.get("lastName") as string;
    const company = formData.get("company") as string;
    if (!lastName || !company) {
      return { ok: false, error: "Lead Name/Last Name and Company are required" };
    }

    const data = {
      firstName: (formData.get("firstName") as string) || null,
      lastName,
      company,
      designation: (formData.get("designation") as string) || null,
      email: (formData.get("email") as string) || null,
      phone: (formData.get("phone") as string) || null,
      mobile: (formData.get("mobile") as string) || null,
      fax: (formData.get("fax") as string) || null,
      website: (formData.get("website") as string) || null,
      source: (formData.get("source") as string) || "Cold Call",
      status: (formData.get("status") as string) || "NEW",
      industry: (formData.get("industry") as string) || null,
      annualRevenue: parseFloat((formData.get("annualRevenue") as string) || "0") || 0,
      employeeCount: parseInt((formData.get("employeeCount") as string) || "0", 10) || 0,
      rating: (formData.get("rating") as string) || null,
      address: (formData.get("address") as string) || null,
      city: (formData.get("city") as string) || null,
      state: (formData.get("state") as string) || null,
      country: (formData.get("country") as string) || null,
      pincode: (formData.get("pincode") as string) || null,
      description: (formData.get("description") as string) || null,
      tags: formData.get("tags") ? (formData.get("tags") as string).split(",").map(t => t.trim()).filter(Boolean) : [],
      ownerId: (formData.get("ownerId") as string) || session.user.id,
    };

    const lead = await crmService.createLead(orgId, session.user.id, data);
    revalidatePath("/crm/leads");
    return { ok: true, data: lead };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to create lead" };
  }
}

export async function updateLeadAction(leadId: string, formData: FormData): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "crm.lead.create"); // edit uses create permission in RBAC

    const lastName = formData.get("lastName") as string;
    const company = formData.get("company") as string;
    if (!lastName || !company) {
      return { ok: false, error: "Lead Name/Last Name and Company are required" };
    }

    const data = {
      firstName: (formData.get("firstName") as string) || null,
      lastName,
      company,
      designation: (formData.get("designation") as string) || null,
      email: (formData.get("email") as string) || null,
      phone: (formData.get("phone") as string) || null,
      mobile: (formData.get("mobile") as string) || null,
      fax: (formData.get("fax") as string) || null,
      website: (formData.get("website") as string) || null,
      source: (formData.get("source") as string) || "Cold Call",
      status: (formData.get("status") as string) || "NEW",
      industry: (formData.get("industry") as string) || null,
      annualRevenue: parseFloat((formData.get("annualRevenue") as string) || "0") || 0,
      employeeCount: parseInt((formData.get("employeeCount") as string) || "0", 10) || 0,
      rating: (formData.get("rating") as string) || null,
      address: (formData.get("address") as string) || null,
      city: (formData.get("city") as string) || null,
      state: (formData.get("state") as string) || null,
      country: (formData.get("country") as string) || null,
      pincode: (formData.get("pincode") as string) || null,
      description: (formData.get("description") as string) || null,
      tags: formData.get("tags") ? (formData.get("tags") as string).split(",").map(t => t.trim()).filter(Boolean) : [],
      ownerId: (formData.get("ownerId") as string) || session.user.id,
    };

    const lead = await crmService.updateLead(orgId, leadId, session.user.id, data);
    revalidatePath(`/crm/leads/${leadId}`);
    revalidatePath("/crm/leads");
    return { ok: true, data: lead };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to update lead" };
  }
}

export async function convertLeadAction(
  leadId: string,
  createDeal: boolean,
  dealAmount?: number,
  dealCloseDate?: string
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "crm.lead.convert");

    const lead = await db.crmLead.findFirst({
      where: { id: leadId, orgId, isConverted: false },
    });
    if (!lead) return { ok: false, error: "Active lead not found" };

    // Duplicate detection helper: check if Account or Contact already exists
    if (lead.email) {
      const existingContact = await db.crmContact.findFirst({
        where: { orgId, email: lead.email },
      });
      if (existingContact) {
        return { ok: false, error: `A contact with email ${lead.email} already exists inside the system.` };
      }
    }

    // 1. Create CrmAccount
    const account = await db.crmAccount.create({
      data: {
        orgId,
        ownerId: lead.ownerId,
        name: lead.company,
        type: "Customer",
        industry: lead.industry,
        website: lead.website,
        phone: lead.phone,
        email: lead.email,
        billingAddress: lead.address,
        shippingAddress: lead.address,
        createdById: session.user.id,
        updatedById: session.user.id,
      },
    });

    // 2. Create CrmContact
    const contact = await db.crmContact.create({
      data: {
        orgId,
        ownerId: lead.ownerId,
        accountId: account.id,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        mobile: lead.mobile,
        designation: lead.designation,
        address: lead.address,
        createdById: session.user.id,
        updatedById: session.user.id,
      },
    });

    // 3. Optional CrmDeal
    let dealId: string | undefined;
    if (createDeal) {
      const deal = await db.crmDeal.create({
        data: {
          orgId,
          ownerId: lead.ownerId,
          accountId: account.id,
          contactId: contact.id,
          name: `${lead.company} - Opportunity`,
          amount: dealAmount || 0,
          expectedCloseDate: dealCloseDate ? new Date(dealCloseDate) : null,
          createdById: session.user.id,
          updatedById: session.user.id,
        },
      });
      dealId = deal.id;
    }

    // 4. Transfer related sub-items (Activities, Notes, Attachments)
    await db.crmActivity.updateMany({
      where: { orgId, relatedToType: "LEAD", relatedToId: leadId },
      data: { relatedToType: "ACCOUNT", relatedToId: account.id },
    });

    await db.crmNote.updateMany({
      where: { orgId, relatedToType: "LEAD", relatedToId: leadId },
      data: { relatedToType: "ACCOUNT", relatedToId: account.id },
    });

    await db.crmAttachment.updateMany({
      where: { orgId, relatedToType: "LEAD", relatedToId: leadId },
      data: { relatedToType: "ACCOUNT", relatedToId: account.id },
    });

    // 5. Mark lead as converted
    await db.crmLead.update({
      where: { id: leadId },
      data: {
        isConverted: true,
        convertedAt: new Date(),
      },
    });

    // 6. Log timeline activities
    await crmService.addTimelineEvent(orgId, {
      relatedToType: "ACCOUNT",
      relatedToId: account.id,
      eventType: "LEAD_CONVERTED",
      description: `Converted Lead ${lead.firstName ? `${lead.firstName} ` : ""}${lead.lastName} into this Account`,
      createdById: session.user.id,
    });

    revalidatePath("/crm/leads");
    revalidatePath("/crm/accounts");
    revalidatePath("/crm/contacts");

    return {
      ok: true,
      data: {
        accountId: account.id,
        contactId: contact.id,
        dealId,
      },
    };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to convert lead" };
  }
}

export async function deleteLeadAction(leadId: string): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "crm.lead.delete");
    await crmService.deleteLead(orgId, leadId, session.user.id);
    
    revalidatePath("/crm/leads");
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to delete lead" };
  }
}

// ─── Account & Contact Actions ────────────────────────────────────────────────

export async function createAccountAction(formData: FormData): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "crm.account.manage");

    const name = formData.get("name") as string;
    if (!name) return { ok: false, error: "Account Name is required" };

    const data = {
      name,
      type: (formData.get("type") as string) || "Customer",
      industry: (formData.get("industry") as string) || null,
      website: (formData.get("website") as string) || null,
      phone: (formData.get("phone") as string) || null,
      email: (formData.get("email") as string) || null,
      gstin: (formData.get("gstin") as string) || null,
      billingAddress: (formData.get("billingAddress") as string) || null,
      shippingAddress: (formData.get("shippingAddress") as string) || null,
      creditLimit: parseFloat((formData.get("creditLimit") as string) || "0") || 0,
      paymentTerms: (formData.get("paymentTerms") as string) || null,
      ownerId: (formData.get("ownerId") as string) || session.user.id,
    };

    const account = await crmService.createAccount(orgId, session.user.id, data);
    revalidatePath("/crm/accounts");
    return { ok: true, data: account };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to create account" };
  }
}

export async function createContactAction(formData: FormData): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "crm.contact.manage");

    const lastName = formData.get("lastName") as string;
    if (!lastName) return { ok: false, error: "Last Name is required" };

    const data = {
      lastName,
      firstName: (formData.get("firstName") as string) || null,
      accountId: (formData.get("accountId") as string) || null,
      email: (formData.get("email") as string) || null,
      phone: (formData.get("phone") as string) || null,
      mobile: (formData.get("mobile") as string) || null,
      designation: (formData.get("designation") as string) || null,
      department: (formData.get("department") as string) || null,
      isDecisionMaker: formData.get("isDecisionMaker") === "true",
      address: (formData.get("address") as string) || null,
      ownerId: (formData.get("ownerId") as string) || session.user.id,
    };

    const contact = await crmService.createContact(orgId, session.user.id, data);
    revalidatePath("/crm/contacts");
    return { ok: true, data: contact };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to create contact" };
  }
}

// ─── Deal Actions ────────────────────────────────────────────────────────────

export async function createDealAction(formData: FormData): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "crm.deal.manage");

    const name = formData.get("name") as string;
    if (!name) return { ok: false, error: "Deal Name is required" };

    const data = {
      name,
      accountId: (formData.get("accountId") as string) || null,
      contactId: (formData.get("contactId") as string) || null,
      amount: parseFloat((formData.get("amount") as string) || "0") || 0,
      stage: (formData.get("stage") as string) || "PROSPECTING",
      probability: parseFloat((formData.get("probability") as string) || "10") || 10,
      expectedCloseDate: formData.get("expectedCloseDate") ? new Date(formData.get("expectedCloseDate") as string) : null,
      serviceType: (formData.get("serviceType") as string) || "Freight Forwarding",
      logisticsCategory: (formData.get("logisticsCategory") as string) || "Import",
      nextFollowUpDate: formData.get("nextFollowUpDate") ? new Date(formData.get("nextFollowUpDate") as string) : null,
      competitor: (formData.get("competitor") as string) || null,
      description: (formData.get("description") as string) || null,
      ownerId: (formData.get("ownerId") as string) || session.user.id,
    };

    const deal = await crmService.createDeal(orgId, session.user.id, data);
    revalidatePath("/crm/deals");
    return { ok: true, data: deal };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to create deal" };
  }
}

export async function updateDealStageAction(dealId: string, stage: string, probability: number): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "crm.deal.manage");
    const deal = await crmService.updateDealStage(orgId, dealId, session.user.id, stage, probability);
    
    revalidatePath("/crm/deals");
    revalidatePath(`/crm/deals/${dealId}`);
    return { ok: true, data: deal };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to update deal stage" };
  }
}

// ─── Activity Actions ────────────────────────────────────────────────────────

export async function createActivityAction(formData: FormData): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "crm.activity.manage");

    const title = formData.get("title") as string;
    const type = formData.get("type") as string; // TASK | EVENT | CALL
    if (!title || !type) return { ok: false, error: "Title and Type are required" };

    const data = {
      title,
      type,
      description: (formData.get("description") as string) || null,
      status: (formData.get("status") as string) || "NOT_STARTED",
      priority: (formData.get("priority") as string) || "NORMAL",
      dueAt: formData.get("dueAt") ? new Date(formData.get("dueAt") as string) : null,
      startAt: formData.get("startAt") ? new Date(formData.get("startAt") as string) : null,
      endAt: formData.get("endAt") ? new Date(formData.get("endAt") as string) : null,
      location: (formData.get("location") as string) || null,
      callResult: (formData.get("callResult") as string) || null,
      durationMins: parseInt((formData.get("durationMins") as string) || "0", 10) || null,
      relatedToType: (formData.get("relatedToType") as string) || null,
      relatedToId: (formData.get("relatedToId") as string) || null,
      ownerId: (formData.get("ownerId") as string) || session.user.id,
    };

    const activity = await crmService.createActivity(orgId, session.user.id, data);
    
    if (data.relatedToType && data.relatedToId) {
      revalidatePath(`/crm/${data.relatedToType.toLowerCase()}s/${data.relatedToId}`);
    }
    return { ok: true, data: activity };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to create activity" };
  }
}

// ─── Shared Note & Attachment Actions ────────────────────────────────────────

export async function createNoteAction(
  relatedToType: string,
  relatedToId: string,
  body: string
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "crm.activity.manage"); // CRUD notes maps to activities permission
    const note = await crmService.addNote(orgId, {
      relatedToType,
      relatedToId,
      body,
      createdById: session.user.id,
    });

    revalidatePath(`/crm/${relatedToType.toLowerCase()}s/${relatedToId}`);
    return { ok: true, data: note };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to add note" };
  }
}

export async function deleteNoteAction(noteId: string, relatedToType: string, relatedToId: string): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "crm.activity.manage");
    await crmService.deleteNote(orgId, noteId, session.user.id);

    revalidatePath(`/crm/${relatedToType.toLowerCase()}s/${relatedToId}`);
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to delete note" };
  }
}

export async function globalCrmSearchAction(query: string): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    if (!query || query.trim().length < 2) {
      return { ok: true, data: [] };
    }

    const q = query.trim();

    const [leads, contacts, accounts, deals, invoices, tickets] = await Promise.all([
      db.crmLead.findMany({
        where: {
          orgId,
          isConverted: false,
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { company: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 5,
        select: { id: true, firstName: true, lastName: true, company: true, status: true },
      }),
      db.crmContact.findMany({
        where: {
          orgId,
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 5,
        select: { id: true, firstName: true, lastName: true, email: true },
      }),
      db.crmAccount.findMany({
        where: {
          orgId,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
            { gstin: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 5,
        select: { id: true, name: true, phone: true },
      }),
      db.crmDeal.findMany({
        where: {
          orgId,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { stage: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 5,
        select: { id: true, name: true, stage: true, amount: true },
      }),
      db.crmInvoice.findMany({
        where: {
          orgId,
          OR: [
            { invoiceNumber: { contains: q, mode: "insensitive" } },
            { type: { contains: q, mode: "insensitive" } },
            { status: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 5,
        select: { id: true, invoiceNumber: true, type: true, total: true, status: true },
      }),
      db.crmTicket.findMany({
        where: {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { category: { contains: q, mode: "insensitive" } },
            { status: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 5,
        select: { id: true, title: true, status: true, priority: true, category: true },
      }),
    ]);

    const results = [
      ...leads.map(l => ({ id: l.id, title: `${l.firstName || ""} ${l.lastName}`.trim(), subtitle: l.company, type: "Lead", href: `/crm/leads/${l.id}` })),
      ...contacts.map(c => ({ id: c.id, title: `${c.firstName || ""} ${c.lastName}`.trim(), subtitle: c.email || "No email", type: "Contact", href: `/crm/contacts/${c.id}` })),
      ...accounts.map(a => ({ id: a.id, title: a.name, subtitle: a.phone || "No phone", type: "Account", href: `/crm/accounts/${a.id}` })),
      ...deals.map(d => ({ id: d.id, title: d.name, subtitle: `${d.stage} - ₹${d.amount}`, type: "Deal", href: `/crm/deals/${d.id}` })),
      ...invoices.map(i => ({ id: i.id, title: i.invoiceNumber, subtitle: `${i.type} - ₹${i.total} (${i.status})`, type: i.type === "QUOTE" ? "Quote" : i.type === "INVOICE" ? "Invoice" : i.type === "SALES_ORDER" ? "Sales Order" : "Purchase Order", href: i.type === "QUOTE" ? `/crm/invoices/${i.id}` : `/crm/invoices/${i.id}` })),
      ...tickets.map(t => ({ id: t.id, title: t.title, subtitle: `${t.category} (${t.status})`, type: "Support Case", href: `/crm/tickets/${t.id}` })),
    ];

    return { ok: true, data: results };
  } catch (err: any) {
    return { ok: false, error: err.message || "Search failed" };
  }
}

// ─── Contact CRUD Actions ───────────────────────────────────────────────────

export async function updateContactAction(contactId: string, formData: FormData): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "crm.contact.manage");

    const lastName = formData.get("lastName") as string;
    if (!lastName) return { ok: false, error: "Last Name is required" };

    const data = {
      lastName,
      firstName: (formData.get("firstName") as string) || null,
      accountId: (formData.get("accountId") as string) || null,
      email: (formData.get("email") as string) || null,
      phone: (formData.get("phone") as string) || null,
      mobile: (formData.get("mobile") as string) || null,
      designation: (formData.get("designation") as string) || null,
      department: (formData.get("department") as string) || null,
      isDecisionMaker: formData.get("isDecisionMaker") === "true",
      address: (formData.get("address") as string) || null,
      ownerId: (formData.get("ownerId") as string) || session.user.id,
    };

    const contact = await crmService.updateContact(orgId, contactId, session.user.id, data);
    revalidatePath("/crm/contacts");
    revalidatePath(`/crm/contacts/${contactId}`);
    return { ok: true, data: contact };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to update contact" };
  }
}

export async function deleteContactAction(contactId: string): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "crm.contact.manage");

    await db.crmContact.delete({
      where: { id: contactId, orgId },
    });

    revalidatePath("/crm/contacts");
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to delete contact" };
  }
}

// ─── Account CRUD Actions ───────────────────────────────────────────────────

export async function updateAccountAction(accountId: string, formData: FormData): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "crm.account.manage");

    const name = formData.get("name") as string;
    if (!name) return { ok: false, error: "Account Name is required" };

    const data = {
      name,
      type: (formData.get("type") as string) || "Customer",
      industry: (formData.get("industry") as string) || null,
      website: (formData.get("website") as string) || null,
      phone: (formData.get("phone") as string) || null,
      email: (formData.get("email") as string) || null,
      gstin: (formData.get("gstin") as string) || null,
      billingAddress: (formData.get("billingAddress") as string) || null,
      shippingAddress: (formData.get("shippingAddress") as string) || null,
      creditLimit: parseFloat((formData.get("creditLimit") as string) || "0") || 0,
      paymentTerms: (formData.get("paymentTerms") as string) || null,
      ownerId: (formData.get("ownerId") as string) || session.user.id,
    };

    const account = await crmService.updateAccount(orgId, accountId, session.user.id, data);
    revalidatePath("/crm/accounts");
    revalidatePath(`/crm/accounts/${accountId}`);
    return { ok: true, data: account };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to update account" };
  }
}

export async function deleteAccountAction(accountId: string): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "crm.account.manage");

    await db.crmAccount.delete({
      where: { id: accountId, orgId },
    });

    revalidatePath("/crm/accounts");
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to delete account" };
  }
}

// ─── Deal CRUD Actions ──────────────────────────────────────────────────────

export async function updateDealAction(dealId: string, formData: FormData): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "crm.deal.manage");

    const name = formData.get("name") as string;
    if (!name) return { ok: false, error: "Deal Name is required" };

    const data = {
      name,
      accountId: (formData.get("accountId") as string) || null,
      contactId: (formData.get("contactId") as string) || null,
      amount: parseFloat((formData.get("amount") as string) || "0") || 0,
      stage: (formData.get("stage") as string) || "PROSPECTING",
      probability: parseFloat((formData.get("probability") as string) || "10") || 10,
      expectedCloseDate: formData.get("expectedCloseDate") ? new Date(formData.get("expectedCloseDate") as string) : null,
      serviceType: (formData.get("serviceType") as string) || "Freight Forwarding",
      logisticsCategory: (formData.get("logisticsCategory") as string) || "Import",
      nextFollowUpDate: formData.get("nextFollowUpDate") ? new Date(formData.get("nextFollowUpDate") as string) : null,
      competitor: (formData.get("competitor") as string) || null,
      description: (formData.get("description") as string) || null,
      ownerId: (formData.get("ownerId") as string) || session.user.id,
    };

    const deal = await crmService.updateDeal(orgId, dealId, session.user.id, data);
    revalidatePath("/crm/deals");
    revalidatePath(`/crm/deals/${dealId}`);
    return { ok: true, data: deal };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to update deal" };
  }
}

export async function deleteDealAction(dealId: string): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "crm.deal.manage");

    await db.crmDeal.delete({
      where: { id: dealId, orgId },
    });

    revalidatePath("/crm/deals");
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to delete deal" };
  }
}

// ─── Product CRUD Actions ───────────────────────────────────────────────────

export async function createProductAction(formData: FormData): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    const name = formData.get("name") as string;
    const sku = formData.get("sku") as string;
    if (!name || !sku) return { ok: false, error: "Name and SKU are required" };

    const data = {
      name,
      sku,
      category: (formData.get("category") as string) || null,
      price: parseFloat((formData.get("price") as string) || "0") || 0,
      taxPercent: parseFloat((formData.get("taxPercent") as string) || "18") || 18,
      active: formData.get("active") === "true",
      description: (formData.get("description") as string) || null,
    };

    const product = await crmService.createProduct(orgId, data);
    revalidatePath("/crm/products");
    return { ok: true, data: product };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to create product" };
  }
}

export async function updateProductAction(productId: string, formData: FormData): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    const name = formData.get("name") as string;
    if (!name) return { ok: false, error: "Name is required" };

    const data = {
      name,
      category: (formData.get("category") as string) || null,
      price: parseFloat((formData.get("price") as string) || "0") || 0,
      taxPercent: parseFloat((formData.get("taxPercent") as string) || "18") || 18,
      active: formData.get("active") === "true",
      description: (formData.get("description") as string) || null,
    };

    const product = await db.crmProduct.update({
      where: { id: productId, orgId },
      data,
    });

    revalidatePath("/crm/products");
    return { ok: true, data: product };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to update product" };
  }
}

export async function deleteProductAction(productId: string): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await db.crmProduct.delete({
      where: { id: productId, orgId },
    });

    revalidatePath("/crm/products");
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to delete product" };
  }
}

// ─── Vendor CRUD Actions ───────────────────────────────────────────────────

export async function createVendorAction(formData: FormData): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "crm.vendor.manage");

    const name = formData.get("name") as string;
    if (!name) return { ok: false, error: "Vendor Name is required" };

    const data = {
      name,
      contactName: (formData.get("contactName") as string) || null,
      phone: (formData.get("phone") as string) || null,
      email: (formData.get("email") as string) || null,
      address: (formData.get("address") as string) || null,
      gstin: (formData.get("gstin") as string) || null,
      services: (formData.get("services") as string) || null,
      status: (formData.get("status") as string) || "ACTIVE",
      ownerId: (formData.get("ownerId") as string) || session.user.id,
    };

    const vendor = await crmService.createVendor(orgId, session.user.id, data);
    revalidatePath("/crm/vendors");
    return { ok: true, data: vendor };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to create vendor" };
  }
}

export async function updateVendorAction(vendorId: string, formData: FormData): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "crm.vendor.manage");

    const name = formData.get("name") as string;
    if (!name) return { ok: false, error: "Vendor Name is required" };

    const data = {
      name,
      contactName: (formData.get("contactName") as string) || null,
      phone: (formData.get("phone") as string) || null,
      email: (formData.get("email") as string) || null,
      address: (formData.get("address") as string) || null,
      gstin: (formData.get("gstin") as string) || null,
      services: (formData.get("services") as string) || null,
      status: (formData.get("status") as string) || "ACTIVE",
      ownerId: (formData.get("ownerId") as string) || session.user.id,
    };

    const vendor = await db.crmVendor.update({
      where: { id: vendorId, orgId },
      data: {
        updatedById: session.user.id,
        ...data,
      },
    });

    revalidatePath("/crm/vendors");
    revalidatePath(`/crm/vendors/${vendorId}`);
    return { ok: true, data: vendor };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to update vendor" };
  }
}

export async function deleteVendorAction(vendorId: string): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "crm.vendor.manage");

    await db.crmVendor.delete({
      where: { id: vendorId, orgId },
    });

    revalidatePath("/crm/vendors");
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to delete vendor" };
  }
}

// ─── Invoice & Quote CRUD Actions ──────────────────────────────────────────

export async function createInvoiceAction(formData: FormData, itemsJSON: string): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "crm.invoice.manage");

    const invoiceNumber = formData.get("invoiceNumber") as string;
    const type = formData.get("type") as string; // QUOTE | INVOICE | SALES_ORDER | PURCHASE_ORDER
    if (!invoiceNumber || !type) return { ok: false, error: "Number and Type are required" };

    const items = JSON.parse(itemsJSON);
    if (!Array.isArray(items) || items.length === 0) {
      return { ok: false, error: "At least one line item is required" };
    }

    // Calculations
    const discount = parseFloat(formData.get("discount") as string || "0") || 0;
    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.qty) * parseFloat(item.rate)), 0);
    const tax = items.reduce((sum, item) => {
      const itemTaxPercent = parseFloat(item.taxPercent ?? "18");
      return sum + (parseFloat(item.qty) * parseFloat(item.rate) * (itemTaxPercent / 100));
    }, 0);
    const total = subtotal + tax - discount;

    const data = {
      invoiceNumber,
      type,
      date: new Date(formData.get("date") as string || new Date()),
      dueDate: formData.get("dueDate") ? new Date(formData.get("dueDate") as string) : null,
      status: (formData.get("status") as string) || "DRAFT",
      discount,
      tax,
      total,
      accountId: (formData.get("accountId") as string) || null,
      contactId: (formData.get("contactId") as string) || null,
      dealId: (formData.get("dealId") as string) || null,
      vendorId: (formData.get("vendorId") as string) || null,
      ownerId: (formData.get("ownerId") as string) || session.user.id,
    };

    const invoice = await crmService.createInvoice(orgId, session.user.id, data, items);
    revalidatePath("/crm/invoices");
    return { ok: true, data: invoice };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to create invoice/quote" };
  }
}

export async function updateInvoiceAction(invoiceId: string, formData: FormData, itemsJSON: string): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "crm.invoice.manage");

    const items = JSON.parse(itemsJSON);
    if (!Array.isArray(items) || items.length === 0) {
      return { ok: false, error: "At least one line item is required" };
    }

    const discount = parseFloat(formData.get("discount") as string || "0") || 0;
    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.qty) * parseFloat(item.rate)), 0);
    const tax = items.reduce((sum, item) => {
      const itemTaxPercent = parseFloat(item.taxPercent ?? "18");
      return sum + (parseFloat(item.qty) * parseFloat(item.rate) * (itemTaxPercent / 100));
    }, 0);
    const total = subtotal + tax - discount;

    const data = {
      date: new Date(formData.get("date") as string || new Date()),
      dueDate: formData.get("dueDate") ? new Date(formData.get("dueDate") as string) : null,
      status: (formData.get("status") as string) || "DRAFT",
      discount,
      tax,
      total,
      accountId: (formData.get("accountId") as string) || null,
      contactId: (formData.get("contactId") as string) || null,
      dealId: (formData.get("dealId") as string) || null,
      vendorId: (formData.get("vendorId") as string) || null,
      ownerId: (formData.get("ownerId") as string) || session.user.id,
      updatedById: session.user.id,
    };

    // Update main invoice record
    const invoice = await db.crmInvoice.update({
      where: { id: invoiceId, orgId },
      data,
    });

    // Delete existing items and recreate
    await db.crmInvoiceItem.deleteMany({
      where: { invoiceId },
    });

    await db.crmInvoiceItem.createMany({
      data: items.map((item) => ({
        invoiceId,
        productName: item.productName,
        qty: parseFloat(item.qty),
        rate: parseFloat(item.rate),
        taxPercent: parseFloat(item.taxPercent ?? 18),
        amount: parseFloat(item.qty) * parseFloat(item.rate) * (1 + (parseFloat(item.taxPercent ?? 18) / 100)),
      })),
    });

    revalidatePath("/crm/invoices");
    revalidatePath(`/crm/invoices/${invoiceId}`);
    return { ok: true, data: invoice };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to update invoice/quote" };
  }
}

export async function deleteInvoiceAction(invoiceId: string): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "crm.invoice.manage");

    await db.crmInvoice.delete({
      where: { id: invoiceId, orgId },
    });

    revalidatePath("/crm/invoices");
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to delete invoice" };
  }
}

// ─── Project CRUD Actions ───────────────────────────────────────────────────

export async function createProjectAction(formData: FormData): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "crm.project.manage");

    const name = formData.get("name") as string;
    if (!name) return { ok: false, error: "Project Name is required" };

    const data = {
      name,
      status: (formData.get("status") as string) || "PLANNING",
      startDate: formData.get("startDate") ? new Date(formData.get("startDate") as string) : null,
      endDate: formData.get("endDate") ? new Date(formData.get("endDate") as string) : null,
      description: (formData.get("description") as string) || null,
      accountId: (formData.get("accountId") as string) || null,
      ownerId: (formData.get("ownerId") as string) || session.user.id,
    };

    const project = await crmService.createProject(orgId, session.user.id, data);
    revalidatePath("/crm/projects");
    return { ok: true, data: project };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to create project" };
  }
}

export async function updateProjectAction(projectId: string, formData: FormData): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "crm.project.manage");

    const name = formData.get("name") as string;
    if (!name) return { ok: false, error: "Project Name is required" };

    const data = {
      name,
      status: (formData.get("status") as string) || "PLANNING",
      startDate: formData.get("startDate") ? new Date(formData.get("startDate") as string) : null,
      endDate: formData.get("endDate") ? new Date(formData.get("endDate") as string) : null,
      description: (formData.get("description") as string) || null,
      accountId: (formData.get("accountId") as string) || null,
      ownerId: (formData.get("ownerId") as string) || session.user.id,
    };

    const project = await db.crmProject.update({
      where: { id: projectId, orgId },
      data: {
        updatedById: session.user.id,
        ...data,
      },
    });

    revalidatePath("/crm/projects");
    revalidatePath(`/crm/projects/${projectId}`);
    return { ok: true, data: project };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to update project" };
  }
}

export async function deleteProjectAction(projectId: string): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "crm.project.manage");

    await db.crmProject.delete({
      where: { id: projectId, orgId },
    });

    revalidatePath("/crm/projects");
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to delete project" };
  }
}

// ─── Attachment Actions ──────────────────────────────────────────────────────

export async function createAttachmentAction(
  relatedToType: string,
  relatedToId: string,
  fileName: string,
  fileSize: number,
  fileType: string
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "crm.access");

    const attachment = await crmService.addAttachment(orgId, {
      relatedToType,
      relatedToId,
      fileName,
      filePath: `/uploads/crm/${Date.now()}_${fileName}`,
      fileSize,
      fileType,
      createdById: session.user.id,
    });

    revalidatePath(`/crm/${relatedToType.toLowerCase()}s/${relatedToId}`);
    return { ok: true, data: attachment };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to add attachment" };
  }
}

export async function deleteAttachmentAction(
  attachmentId: string,
  relatedToType: string,
  relatedToId: string
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "crm.access");
    await crmService.deleteAttachment(orgId, attachmentId, session.user.id);

    revalidatePath(`/crm/${relatedToType.toLowerCase()}s/${relatedToId}`);
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to delete attachment" };
  }
}

export async function seedCrmDemoDataAction(): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "crm.access");

    const userId = session.user.id;
    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(now.getDate() + 1);
    const nextMonth = new Date();
    nextMonth.setMonth(now.getMonth() + 1);

    // 1. Create Leads
    const lead1 = await db.crmLead.create({
      data: {
        orgId,
        ownerId: userId,
        firstName: "Aravind",
        lastName: "Ramanathan",
        company: "Madras Steel & Tube Ltd",
        designation: "Import Coordinator",
        email: "aravind@madrassteel.co.in",
        phone: "+91 44 2434 8899",
        source: "Web Enquiry",
        status: "NEW",
        annualRevenue: 45000000,
        employeeCount: 120,
        rating: "WARM",
        address: "12, GST Road, Guindy",
        city: "Chennai",
        state: "Tamil Nadu",
        country: "India",
        pincode: "600032",
        description: "Looking for customized project cargo solutions for shipping steel structures from Mundra to Chennai Port.",
        tags: ["Project Cargo", "Steel Import"],
        createdById: userId,
        updatedById: userId,
      }
    });

    await db.crmLead.create({
      data: {
        orgId,
        ownerId: userId,
        firstName: "Siddharth",
        lastName: "Sharma",
        company: "Delhi Logistics Hub",
        designation: "Supply Chain Manager",
        email: "siddharth@dlh.org.in",
        phone: "+91 11 4987 1122",
        source: "Cold Call",
        status: "CONTACTED",
        annualRevenue: 82000000,
        employeeCount: 250,
        rating: "HOT",
        address: "B-44, Okhla Phase III",
        city: "New Delhi",
        state: "Delhi",
        country: "India",
        pincode: "110020",
        description: "Requires freight forwarding rate sheets for monthly 40-foot containers.",
        tags: ["FCL Container", "Monthly Volume"],
        createdById: userId,
        updatedById: userId,
      }
    });

    // 2. Create Accounts
    const account1 = await db.crmAccount.create({
      data: {
        orgId,
        ownerId: userId,
        name: "Apex Auto Parts Chennai",
        type: "Customer",
        industry: "Automotive",
        website: "apexauto.co.in",
        phone: "+91 44 2811 5566",
        email: "info@apexauto.co.in",
        gstin: "33AAACA1234F1Z1",
        billingAddress: "45, Ambattur Industrial Estate, Chennai, TN - 600058",
        shippingAddress: "45, Ambattur Industrial Estate, Chennai, TN - 600058",
        creditLimit: 1500000,
        paymentTerms: "Net 30",
        status: "ACTIVE",
        createdById: userId,
        updatedById: userId,
      }
    });

    const account2 = await db.crmAccount.create({
      data: {
        orgId,
        ownerId: userId,
        name: "Global Agri-Foods Pvt Ltd",
        type: "Customer",
        industry: "Agriculture",
        website: "globalagrifoods.com",
        phone: "+91 22 2650 9900",
        email: "operations@globalagri.com",
        gstin: "27BBBCA5678A1Z2",
        billingAddress: "Building 9, Bandra Kurla Complex, Mumbai, MH - 400051",
        shippingAddress: "JNPT Warehouse Terminal 2, Navi Mumbai, MH - 400707",
        creditLimit: 2500000,
        paymentTerms: "Net 45",
        status: "ACTIVE",
        createdById: userId,
        updatedById: userId,
      }
    });

    // 3. Create Contacts
    const contact1 = await db.crmContact.create({
      data: {
        orgId,
        ownerId: userId,
        accountId: account1.id,
        firstName: "Ramesh",
        lastName: "Krishnan",
        email: "ramesh@apexauto.co.in",
        phone: "+91 94440 88221",
        designation: "Dispatch Manager",
        department: "Logistics",
        isDecisionMaker: true,
        address: "Flat A, Mount Road, Chennai",
        createdById: userId,
        updatedById: userId,
      }
    });

    const contact2 = await db.crmContact.create({
      data: {
        orgId,
        ownerId: userId,
        accountId: account2.id,
        firstName: "Priya",
        lastName: "Nair",
        email: "priya.nair@globalagri.com",
        phone: "+91 98200 44332",
        designation: "Import Manager",
        department: "Procurement",
        isDecisionMaker: true,
        address: "Vashi, Navi Mumbai",
        createdById: userId,
        updatedById: userId,
      }
    });

    // 4. Create Deals
    const deal1 = await db.crmDeal.create({
      data: {
        orgId,
        ownerId: userId,
        accountId: account1.id,
        contactId: contact1.id,
        name: "Chennai to Hamburg Ocean Freight Deal",
        stage: "PROPOSAL",
        amount: 850000,
        probability: 60,
        source: "Existing Client",
        serviceType: "Freight Forwarding",
        logisticsCategory: "Export",
        description: "Ocean shipping for 12 containers of auto parts. Target rate is ₹70,000 per container.",
        createdById: userId,
        updatedById: userId,
      }
    });

    // 5. Create Products/Services
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const prod1 = await db.crmProduct.create({
      data: {
        orgId,
        name: "20ft FCL Dry Container Ocean Freight",
        sku: `FRT-20FCL-${randomSuffix}`,
        category: "Freight Forwarding",
        price: 75000,
        taxPercent: 18,
        active: true,
        description: "Standard 20-foot dry container ocean freight port-to-port charges.",
      }
    });

    const prod2 = await db.crmProduct.create({
      data: {
        orgId,
        name: "Customs CHA Clearance Fee",
        sku: `CHA-CLR-${randomSuffix}`,
        category: "CHA service",
        price: 15000,
        taxPercent: 18,
        active: true,
        description: "Customs house agent clearance and document handling fees.",
      }
    });

    // 6. Create Vendors
    await db.crmVendor.create({
      data: {
        orgId,
        ownerId: userId,
        name: "Maersk Lines Shipping India",
        contactName: "Anil Goel",
        phone: "+91 22 6655 4400",
        email: "anil.goel@maersk.com",
        address: "Nariman Point, Mumbai",
        gstin: "27AAAAM1212B1Z3",
        services: "Ocean Freight carriers",
        status: "ACTIVE",
        createdById: userId,
        updatedById: userId,
      }
    });

    // 7. Create Invoice
    const invoiceNumber = `QT-2026-DEMO-${randomSuffix}`;
    const invoice = await db.crmInvoice.create({
      data: {
        orgId,
        ownerId: userId,
        invoiceNumber,
        type: "QUOTE",
        date: now,
        dueDate: tomorrow,
        status: "SENT",
        discount: 2000,
        tax: 16200,
        total: 104200,
        accountId: account1.id,
        contactId: contact1.id,
        dealId: deal1.id,
        createdById: userId,
        updatedById: userId,
      }
    });

    await db.crmInvoiceItem.create({
      data: {
        invoiceId: invoice.id,
        productName: prod2.name,
        qty: 1,
        rate: 15000,
        taxPercent: 18,
        amount: 15000,
      }
    });

    await db.crmInvoiceItem.create({
      data: {
        invoiceId: invoice.id,
        productName: "Local Transport Trucking (Flatbed)",
        qty: 3,
        rate: 22000,
        taxPercent: 12,
        amount: 66000,
      }
    });

    // 8. Create Projects
    await db.crmProject.create({
      data: {
        orgId,
        ownerId: userId,
        accountId: account1.id,
        name: "Apex Auto Parts Dispatch Setup",
        status: "IN_PROGRESS",
        startDate: now,
        endDate: nextMonth,
        description: "Operational onboarding of daily flatbed haulage trucks for Ambattur plant.",
        createdById: userId,
        updatedById: userId,
      }
    });

    // 9. Create Activities
    await db.crmActivity.create({
      data: {
        orgId,
        ownerId: userId,
        type: "TASK",
        title: "Follow up on container rate quotes",
        status: "NOT_STARTED",
        priority: "HIGH",
        dueAt: tomorrow,
        relatedToType: "CrmLead",
        relatedToId: lead1.id,
        createdById: userId,
        updatedById: userId,
      }
    });

    // 10. Log some timeline events
    await db.crmTimelineEvent.create({
      data: {
        orgId,
        relatedToType: "CrmLead",
        relatedToId: lead1.id,
        eventType: "CREATED",
        description: "Enquiry logged via Madras Steel Lead profile setup.",
        createdById: userId,
      }
    });

    revalidatePath("/crm/dashboard");
    revalidatePath("/crm/leads");
    revalidatePath("/crm/accounts");
    revalidatePath("/crm/contacts");
    revalidatePath("/crm/deals");
    revalidatePath("/crm/invoices");
    revalidatePath("/crm/products");
    revalidatePath("/crm/vendors");
    revalidatePath("/crm/projects");

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to generate CRM demo data" };
  }
}
