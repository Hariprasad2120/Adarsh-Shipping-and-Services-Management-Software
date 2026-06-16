import { db } from "@/lib/db";
import { getNow } from "@/lib/clock";

// Helper to check standard ownership permissions if required, 
// but primarily we perform org-scoped queries.
// All functions expect user's orgId as standard parameter.

// ─── Timeline Events ──────────────────────────────────────────────────────────

export async function addTimelineEvent(orgId: string, data: {
  relatedToType: string;
  relatedToId: string;
  eventType: string;
  description: string;
  details?: any;
  createdById: string;
}) {
  return db.crmTimelineEvent.create({
    data: {
      orgId,
      ...data,
    },
  });
}

export async function getTimelineEvents(orgId: string, relatedToType: string, relatedToId: string) {
  return db.crmTimelineEvent.findMany({
    where: { orgId, relatedToType, relatedToId },
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, name: true } },
    },
  });
}

// ─── Notes ───────────────────────────────────────────────────────────────────

export async function addNote(orgId: string, data: {
  relatedToType: string;
  relatedToId: string;
  body: string;
  isPinned?: boolean;
  createdById: string;
}) {
  const note = await db.crmNote.create({
    data: {
      orgId,
      ...data,
    },
  });

  await addTimelineEvent(orgId, {
    relatedToType: data.relatedToType,
    relatedToId: data.relatedToId,
    eventType: "NOTE_ADDED",
    description: "Added a new note",
    createdById: data.createdById,
  });

  return note;
}

export async function getNotes(orgId: string, relatedToType: string, relatedToId: string) {
  return db.crmNote.findMany({
    where: { orgId, relatedToType, relatedToId },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    include: {
      createdBy: { select: { id: true, name: true } },
    },
  });
}

export async function deleteNote(orgId: string, id: string, userId: string) {
  const note = await db.crmNote.findFirst({
    where: { id, orgId },
  });
  if (!note) throw new Error("Note not found");

  await db.crmNote.delete({ where: { id } });

  await addTimelineEvent(orgId, {
    relatedToType: note.relatedToType,
    relatedToId: note.relatedToId,
    eventType: "NOTE_DELETED",
    description: "Deleted a note",
    createdById: userId,
  });
}

// ─── Attachments ─────────────────────────────────────────────────────────────

export async function addAttachment(orgId: string, data: {
  relatedToType: string;
  relatedToId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  createdById: string;
}) {
  const attachment = await db.crmAttachment.create({
    data: {
      orgId,
      ...data,
    },
  });

  await addTimelineEvent(orgId, {
    relatedToType: data.relatedToType,
    relatedToId: data.relatedToId,
    eventType: "ATTACHMENT_ADDED",
    description: `Attached file: ${data.fileName}`,
    createdById: data.createdById,
  });

  return attachment;
}

export async function getAttachments(orgId: string, relatedToType: string, relatedToId: string) {
  return db.crmAttachment.findMany({
    where: { orgId, relatedToType, relatedToId },
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, name: true } },
    },
  });
}

export async function deleteAttachment(orgId: string, id: string, userId: string) {
  const attachment = await db.crmAttachment.findFirst({
    where: { id, orgId },
  });
  if (!attachment) throw new Error("Attachment not found");

  await db.crmAttachment.delete({ where: { id } });

  await addTimelineEvent(orgId, {
    relatedToType: attachment.relatedToType,
    relatedToId: attachment.relatedToId,
    eventType: "ATTACHMENT_DELETED",
    description: `Removed file attachment: ${attachment.fileName}`,
    createdById: userId,
  });
}

// ─── Leads ───────────────────────────────────────────────────────────────────

export async function listLeads(orgId: string, filters?: { status?: string; search?: string }) {
  const where: any = { orgId, isConverted: false };
  if (filters?.status) where.status = filters.status;
  if (filters?.search) {
    where.OR = [
      { firstName: { contains: filters.search, mode: "insensitive" } },
      { lastName: { contains: filters.search, mode: "insensitive" } },
      { company: { contains: filters.search, mode: "insensitive" } },
      { email: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  return db.crmLead.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      owner: { select: { id: true, name: true } },
    },
  });
}

export async function getLead(orgId: string, id: string) {
  return db.crmLead.findFirst({
    where: { id, orgId },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      crmExternalLead: true,
    },
  });
}

export async function createLead(orgId: string, createdById: string, data: any) {
  const lead = await db.crmLead.create({
    data: {
      orgId,
      createdById,
      updatedById: createdById,
      ...data,
    },
  });

  await addTimelineEvent(orgId, {
    relatedToType: "LEAD",
    relatedToId: lead.id,
    eventType: "LEAD_CREATED",
    description: `Lead created for ${lead.firstName ? `${lead.firstName} ` : ""}${lead.lastName}`,
    createdById,
  });

  return lead;
}

export async function updateLead(orgId: string, id: string, updatedById: string, data: any) {
  const lead = await db.crmLead.update({
    where: { id },
    data: {
      updatedById,
      ...data,
    },
  });

  await addTimelineEvent(orgId, {
    relatedToType: "LEAD",
    relatedToId: lead.id,
    eventType: "LEAD_UPDATED",
    description: `Lead updated`,
    createdById: updatedById,
  });

  return lead;
}

export async function deleteLead(orgId: string, id: string, userId: string) {
  await db.crmLead.delete({
    where: { id },
  });
}

// ─── Contacts ────────────────────────────────────────────────────────────────

export async function listContacts(orgId: string, filters?: { search?: string }) {
  const where: any = { orgId };
  if (filters?.search) {
    where.OR = [
      { firstName: { contains: filters.search, mode: "insensitive" } },
      { lastName: { contains: filters.search, mode: "insensitive" } },
      { email: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  return db.crmContact.findMany({
    where,
    orderBy: { lastName: "asc" },
    include: {
      account: { select: { id: true, name: true } },
      owner: { select: { id: true, name: true } },
    },
  });
}

export async function getContact(orgId: string, id: string) {
  return db.crmContact.findFirst({
    where: { id, orgId },
    include: {
      account: { select: { id: true, name: true, phone: true, email: true } },
      owner: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function createContact(orgId: string, createdById: string, data: any) {
  const contact = await db.crmContact.create({
    data: {
      orgId,
      createdById,
      updatedById: createdById,
      ...data,
    },
  });

  await addTimelineEvent(orgId, {
    relatedToType: "CONTACT",
    relatedToId: contact.id,
    eventType: "CONTACT_CREATED",
    description: `Contact created for ${contact.firstName ? `${contact.firstName} ` : ""}${contact.lastName}`,
    createdById,
  });

  return contact;
}

export async function updateContact(orgId: string, id: string, updatedById: string, data: any) {
  const contact = await db.crmContact.update({
    where: { id },
    data: {
      updatedById,
      ...data,
    },
  });

  await addTimelineEvent(orgId, {
    relatedToType: "CONTACT",
    relatedToId: contact.id,
    eventType: "CONTACT_UPDATED",
    description: `Contact details updated`,
    createdById: updatedById,
  });

  return contact;
}

// ─── Accounts ────────────────────────────────────────────────────────────────

export async function listAccounts(orgId: string, filters?: { search?: string }) {
  const where: any = { orgId };
  if (filters?.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { email: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  return db.crmAccount.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      owner: { select: { id: true, name: true } },
    },
  });
}

export async function getAccount(orgId: string, id: string) {
  return db.crmAccount.findFirst({
    where: { id, orgId },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      contacts: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      deals: { select: { id: true, name: true, amount: true, stage: true, expectedCloseDate: true } },
      projects: { select: { id: true, name: true, status: true } },
    },
  });
}

export async function createAccount(orgId: string, createdById: string, data: any) {
  const account = await db.crmAccount.create({
    data: {
      orgId,
      createdById,
      updatedById: createdById,
      ...data,
    },
  });

  await addTimelineEvent(orgId, {
    relatedToType: "ACCOUNT",
    relatedToId: account.id,
    eventType: "ACCOUNT_CREATED",
    description: `Account created for ${account.name}`,
    createdById,
  });

  return account;
}

export async function updateAccount(orgId: string, id: string, updatedById: string, data: any) {
  const account = await db.crmAccount.update({
    where: { id },
    data: {
      updatedById,
      ...data,
    },
  });

  await addTimelineEvent(orgId, {
    relatedToType: "ACCOUNT",
    relatedToId: account.id,
    eventType: "ACCOUNT_UPDATED",
    description: `Account details updated`,
    createdById: updatedById,
  });

  return account;
}

// ─── Deals / Opportunities ───────────────────────────────────────────────────

export async function listDeals(orgId: string, filters?: { search?: string; stage?: string }) {
  const where: any = { orgId };
  if (filters?.stage) where.stage = filters.stage;
  if (filters?.search) {
    where.name = { contains: filters.search, mode: "insensitive" };
  }

  return db.crmDeal.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      account: { select: { id: true, name: true } },
      owner: { select: { id: true, name: true } },
    },
  });
}

export async function getDeal(orgId: string, id: string) {
  return db.crmDeal.findFirst({
    where: { id, orgId },
    include: {
      account: { select: { id: true, name: true, phone: true } },
      contact: { select: { id: true, firstName: true, lastName: true, email: true } },
      owner: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function createDeal(orgId: string, createdById: string, data: any) {
  const deal = await db.crmDeal.create({
    data: {
      orgId,
      createdById,
      updatedById: createdById,
      ...data,
    },
  });

  await addTimelineEvent(orgId, {
    relatedToType: "DEAL",
    relatedToId: deal.id,
    eventType: "DEAL_CREATED",
    description: `Deal created: ${deal.name}`,
    createdById,
  });

  return deal;
}

export async function updateDealStage(orgId: string, id: string, updatedById: string, stage: string, probability: number) {
  const deal = await db.crmDeal.update({
    where: { id },
    data: {
      stage,
      probability,
      updatedById,
    },
  });

  await addTimelineEvent(orgId, {
    relatedToType: "DEAL",
    relatedToId: deal.id,
    eventType: "DEAL_STAGE_CHANGED",
    description: `Stage updated to ${stage} (${probability}%)`,
    createdById: updatedById,
  });

  return deal;
}

export async function updateDeal(orgId: string, id: string, updatedById: string, data: any) {
  const deal = await db.crmDeal.update({
    where: { id },
    data: {
      updatedById,
      ...data,
    },
  });

  await addTimelineEvent(orgId, {
    relatedToType: "DEAL",
    relatedToId: deal.id,
    eventType: "DEAL_UPDATED",
    description: `Deal details updated`,
    createdById: updatedById,
  });

  return deal;
}

// ─── Activities (Tasks, Events, Calls) ───────────────────────────────────────

export async function listActivities(orgId: string, filters?: { type?: string; relatedToType?: string; relatedToId?: string }) {
  const where: any = { orgId };
  if (filters?.type) where.type = filters.type;
  if (filters?.relatedToType && filters?.relatedToId) {
    where.relatedToType = filters.relatedToType;
    where.relatedToId = filters.relatedToId;
  }

  return db.crmActivity.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      owner: { select: { id: true, name: true } },
    },
  });
}

export async function createActivity(orgId: string, createdById: string, data: any) {
  const activity = await db.crmActivity.create({
    data: {
      orgId,
      createdById,
      updatedById: createdById,
      ...data,
    },
    include: {
      owner: { select: { id: true, name: true } },
    },
  });

  if (data.relatedToType && data.relatedToId) {
    await addTimelineEvent(orgId, {
      relatedToType: data.relatedToType,
      relatedToId: data.relatedToId,
      eventType: "ACTIVITY_CREATED",
      description: `Scheduled activity: ${activity.title} (${data.type})`,
      createdById,
    });
  }

  return activity;
}

export async function updateActivity(orgId: string, id: string, updatedById: string, data: any) {
  const activity = await db.crmActivity.update({
    where: { id },
    data: {
      updatedById,
      ...data,
    },
  });

  return activity;
}

export async function deleteActivity(orgId: string, id: string) {
  await db.crmActivity.delete({
    where: { id },
  });
}

// ─── Products & Vendors ──────────────────────────────────────────────────────

export async function listProducts(orgId: string, filters?: { search?: string }) {
  const where: any = { orgId };
  if (filters?.search) {
    where.name = { contains: filters.search, mode: "insensitive" };
  }

  return db.crmProduct.findMany({
    where,
    orderBy: { name: "asc" },
  });
}

export async function createProduct(orgId: string, data: any) {
  return db.crmProduct.create({
    data: {
      orgId,
      ...data,
    },
  });
}

export async function listVendors(orgId: string, filters?: { search?: string }) {
  const where: any = { orgId };
  if (filters?.search) {
    where.name = { contains: filters.search, mode: "insensitive" };
  }

  return db.crmVendor.findMany({
    where,
    orderBy: { name: "asc" },
  });
}

export async function createVendor(orgId: string, createdById: string, data: any) {
  return db.crmVendor.create({
    data: {
      orgId,
      createdById,
      updatedById: createdById,
      ...data,
    },
  });
}

// ─── Invoices, Quotes & Sales Orders ─────────────────────────────────────────

export async function listInvoices(orgId: string, filters?: { type?: string; customerId?: string }) {
  const where: any = { orgId };
  if (filters?.type) where.type = filters.type;
  if (filters?.customerId) where.accountId = filters.customerId;

  return db.crmInvoice.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      account: { select: { id: true, name: true } },
      owner: { select: { id: true, name: true } },
    },
  });
}

export async function getInvoice(orgId: string, id: string) {
  return db.crmInvoice.findFirst({
    where: { id, orgId },
    include: {
      account: { select: { id: true, name: true, phone: true, email: true, billingAddress: true, shippingAddress: true } },
      contact: { select: { id: true, firstName: true, lastName: true, email: true } },
      deal: { select: { id: true, name: true } },
      vendor: { select: { id: true, name: true } },
      items: true,
      owner: { select: { id: true, name: true } },
    },
  });
}

export async function createInvoice(orgId: string, createdById: string, data: any, items: any[]) {
  const invoice = await db.crmInvoice.create({
    data: {
      orgId,
      createdById,
      updatedById: createdById,
      ...data,
      items: {
        create: items.map((item) => ({
          productName: item.productName,
          qty: parseFloat(item.qty),
          rate: parseFloat(item.rate),
          taxPercent: parseFloat(item.taxPercent ?? 18),
          amount: parseFloat(item.qty) * parseFloat(item.rate) * (1 + (parseFloat(item.taxPercent ?? 18) / 100)),
        })),
      },
    },
  });

  return invoice;
}

// ─── Projects ────────────────────────────────────────────────────────────────

export async function listProjects(orgId: string, filters?: { search?: string }) {
  const where: any = { orgId };
  if (filters?.search) {
    where.name = { contains: filters.search, mode: "insensitive" };
  }

  return db.crmProject.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      account: { select: { id: true, name: true } },
      owner: { select: { id: true, name: true } },
    },
  });
}

export async function createProject(orgId: string, createdById: string, data: any) {
  return db.crmProject.create({
    data: {
      orgId,
      createdById,
      updatedById: createdById,
      ...data,
    },
  });
}
