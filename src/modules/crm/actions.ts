"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { can, requirePermission } from "@/lib/rbac";
import * as crmService from "./service";
import { db } from "@/lib/db";
import * as leadSourceService from "./lead-source.service";
import { syncCustomerPortalUsersForCrmCustomer } from "@/modules/customer-portal/service";
import * as driveClient from "@/lib/google-drive-client";
import { fetchGstPortalDetails } from "./gst-portal";
import { routeQualifiedEnquiry } from "./services/service-enquiry-routing.service";

type ActionResponse = { ok: true; data?: any } | { ok: false; error: string };

type CustomerAddressInput = {
  attention: string;
  country: string;
  street1: string;
  street2: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  fax: string;
};

type CustomerContactPayload = {
  id?: string;
  firstName?: string;
  lastName?: string;
  designation?: string;
  email?: string;
  phone?: string;
  isPrimary?: boolean;
};

type OpeningBalancePayload = {
  branch: string;
  amount: string;
};

function parseCustomerAddressDetails(
  formData: FormData,
  prefix: "billing" | "shipping" | "courier",
): CustomerAddressInput {
  return {
    attention: (formData.get(`${prefix}Attention`) as string) || "",
    country: (formData.get(`${prefix}Country`) as string) || "",
    street1: (formData.get(`${prefix}Street1`) as string) || "",
    street2: (formData.get(`${prefix}Street2`) as string) || "",
    city: (formData.get(`${prefix}City`) as string) || "",
    state: (formData.get(`${prefix}State`) as string) || "",
    pincode: (formData.get(`${prefix}Pincode`) as string) || "",
    phone: (formData.get(`${prefix}Phone`) as string) || "",
    fax: (formData.get(`${prefix}Fax`) as string) || "",
  };
}

function formatCustomerAddressString(details: CustomerAddressInput) {
  const parts: string[] = [];
  if (details.attention) parts.push(`Attention: ${details.attention}`);
  if (details.street1) parts.push(details.street1);
  if (details.street2) parts.push(details.street2);

  const cityStateZip: string[] = [];
  if (details.city) cityStateZip.push(details.city);
  if (details.state) cityStateZip.push(details.state);
  if (details.pincode) cityStateZip.push(details.pincode);
  if (cityStateZip.length > 0) parts.push(cityStateZip.join(", "));

  if (details.country) parts.push(details.country);
  if (details.phone) parts.push(`Phone: ${details.phone}`);
  if (details.fax) parts.push(`Fax: ${details.fax}`);

  return parts.join("\n") || null;
}

function parseCustomerContacts(formData: FormData) {
  const rawPayload = (formData.get("contactsPayload") as string) || "[]";
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawPayload);
  } catch {
    parsed = [];
  }

  if (!Array.isArray(parsed)) {
    return [] as CustomerContactPayload[];
  }

  const contacts: CustomerContactPayload[] = [];
  for (const entry of parsed) {
    const source = entry as Record<string, unknown>;
    const firstName = String(source.firstName ?? "").trim();
    const lastName = String(source.lastName ?? "").trim();
    const designation = String(source.designation ?? "").trim();
    const email = String(source.email ?? "").trim();
    const phone = String(source.phone ?? "").trim();
    const id = String(source.id ?? "").trim();

    if (!firstName && !lastName && !designation && !email && !phone) {
      continue;
    }

    contacts.push({
      id: id || undefined,
      firstName: firstName || undefined,
      lastName: lastName || "Contact",
      designation: designation || undefined,
      email: email || undefined,
      phone: phone || undefined,
      isPrimary: Boolean(source.isPrimary),
    });
  }

  return contacts;
}

function parseOpeningBalances(formData: FormData) {
  const rawPayload = (formData.get("openingBalancesPayload") as string) || "[]";
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawPayload);
  } catch {
    parsed = [];
  }

  if (!Array.isArray(parsed)) {
    return [] as OpeningBalancePayload[];
  }

  const balances: OpeningBalancePayload[] = [];
  for (const entry of parsed) {
    const source = entry as Record<string, unknown>;
    const branch = String(source.branch ?? "").trim();
    const amount = String(source.amount ?? "").trim();
    if (!branch && !amount) continue;
    balances.push({
      branch: branch || "Chennai",
      amount: amount || "0",
    });
  }

  return balances;
}

function parseAccountRemarks(rawRemarks: string | null | undefined) {
  if (!rawRemarks) {
    return { userRemarks: "", kyc: {} as Record<string, any> };
  }

  try {
    const parsed = JSON.parse(rawRemarks);
    if (parsed && typeof parsed === "object") {
      return {
        userRemarks:
          typeof (parsed as { userRemarks?: unknown }).userRemarks === "string"
            ? ((parsed as { userRemarks: string }).userRemarks ?? "")
            : rawRemarks,
        kyc:
          (parsed as { kyc?: Record<string, any> }).kyc &&
          typeof (parsed as { kyc?: Record<string, any> }).kyc === "object"
            ? (parsed as { kyc: Record<string, any> }).kyc
            : {},
        ...parsed,
      };
    }
  } catch {
    // fall through to plain-text remarks
  }

  return { userRemarks: rawRemarks, kyc: {} as Record<string, any> };
}

async function syncAccountContacts(params: {
  orgId: string;
  actorUserId: string;
  accountId: string;
  ownerId: string;
  contacts: CustomerContactPayload[];
}) {
  const { orgId, actorUserId, accountId, ownerId, contacts } = params;
  const existingContacts = await db.crmContact.findMany({
    where: { orgId, accountId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      designation: true,
      email: true,
      phone: true,
      mobile: true,
      isPrimary: true,
      isActive: true,
    },
  });

  const keptIds = new Set<string>();

  for (const [index, contact] of contacts.entries()) {
    const payload = {
      ownerId,
      firstName: contact.firstName || null,
      lastName: contact.lastName || "Contact",
      designation: contact.designation || null,
      email: contact.email || null,
      phone: contact.phone || null,
      mobile: contact.phone || null,
      isPrimary: index === 0,
      isActive: true,
      updatedById: actorUserId,
    };

    if (contact.id) {
      const existing = existingContacts.find((entry) => entry.id === contact.id);
      if (existing) {
        keptIds.add(existing.id);
        await db.crmContact.update({
          where: { id: existing.id },
          data: payload,
        });
        continue;
      }
    }

    const created = await db.crmContact.create({
      data: {
        orgId,
        accountId,
        createdById: actorUserId,
        ...payload,
      },
    });
    keptIds.add(created.id);
  }

  for (const existing of existingContacts) {
    if (keptIds.has(existing.id)) continue;
    await db.crmContact.update({
      where: { id: existing.id },
      data: {
        isActive: false,
        isPrimary: false,
        updatedById: actorUserId,
      },
    });
  }
}

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

    const isPerishable = formData.get("isPerishable") === "true";
    const perishableDetails = isPerishable ? {
      perishableType: (formData.get("perishableType") as string) || "",
      tempRequired: (formData.get("tempRequired") as string) || "",
      humidityControl: (formData.get("humidityControl") as string) || "",
      ventilation: (formData.get("ventilation") as string) || "",
      perishableRemarks: (formData.get("perishableRemarks") as string) || "",
    } : null;

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
      isPerishable,
      perishableDetails,
    };

    const lead = await crmService.createLead(orgId, session.user.id, data);
    revalidatePath("/crm/leads");
    return { ok: true, data: lead };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to create lead" };
  }
}

export async function createDirectEnquiryAction(
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "crm.lead.create");

    const requestKey = ((formData.get("directEnquiryRequestKey") as string) || "").trim();
    const selectedScope = (formData.get("serviceScope") as string) || "";
    const shipmentMode = (formData.get("shipmentMode") as string) || "";
    const shipmentDirection = (formData.get("shipmentDirection") as string) || "";
    const customerId = ((formData.get("customerId") as string) || "").trim() || null;
    const lastName = ((formData.get("lastName") as string) || "").trim();
    const company = ((formData.get("company") as string) || "").trim();

    if (!requestKey) {
      return { ok: false, error: "Missing request key for the direct enquiry." };
    }

    if (!selectedScope) {
      return { ok: false, error: "Choose the required service type for the enquiry." };
    }

    if (!shipmentMode || !shipmentDirection) {
      return {
        ok: false,
        error: "Choose the shipment mode and whether the enquiry is Import or Export.",
      };
    }

    const existingLead = await db.crmLead.findFirst({
      where: {
        orgId,
        directEnquiryRequestKey: requestKey,
      },
      include: {
        serviceEnquiries: true,
      },
    });

    if (existingLead) {
      return {
        ok: true,
        data: {
          leadId: existingLead.id,
          serviceEnquiries: existingLead.serviceEnquiries,
        },
      };
    }

    let existingCustomer = null;
    if (customerId) {
      existingCustomer = await db.crmAccount.findFirst({
        where: {
          id: customerId,
          orgId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          ownerId: true,
          billingAddress: true,
        },
      });

      if (!existingCustomer) {
        return { ok: false, error: "Selected customer was not found for this organisation." };
      }
    }

    const resolvedLastName =
      lastName || existingCustomer?.name?.trim() || "Existing Customer";
    const resolvedCompany = company || existingCustomer?.name?.trim() || resolvedLastName;

    const isPerishable = formData.get("isPerishable") === "true";
    const perishableDetails = isPerishable
      ? {
          perishableType: (formData.get("perishableType") as string) || "",
          tempRequired: (formData.get("tempRequired") as string) || "",
          humidityControl: (formData.get("humidityControl") as string) || "",
          ventilation: (formData.get("ventilation") as string) || "",
          perishableRemarks: (formData.get("perishableRemarks") as string) || "",
        }
      : null;

    const lead = await crmService.createLead(orgId, session.user.id, {
      firstName: ((formData.get("firstName") as string) || "").trim() || null,
      lastName: resolvedLastName,
      company: resolvedCompany,
      designation: ((formData.get("designation") as string) || "").trim() || null,
      email:
        ((formData.get("email") as string) || "").trim() ||
        existingCustomer?.email ||
        null,
      phone:
        ((formData.get("phone") as string) || "").trim() ||
        existingCustomer?.phone ||
        null,
      mobile: ((formData.get("mobile") as string) || "").trim() || null,
      fax: ((formData.get("fax") as string) || "").trim() || null,
      website: ((formData.get("website") as string) || "").trim() || null,
      source: ((formData.get("source") as string) || "").trim() || "Existing Client",
      status: "INTERESTED",
      industry: ((formData.get("industry") as string) || "").trim() || null,
      annualRevenue:
        parseFloat((formData.get("annualRevenue") as string) || "0") || 0,
      employeeCount:
        parseInt((formData.get("employeeCount") as string) || "0", 10) || 0,
      rating: (formData.get("rating") as string) || null,
      address:
        ((formData.get("address") as string) || "").trim() ||
        existingCustomer?.billingAddress ||
        null,
      city: ((formData.get("city") as string) || "").trim() || null,
      state: ((formData.get("state") as string) || "").trim() || null,
      country: ((formData.get("country") as string) || "").trim() || null,
      pincode: ((formData.get("pincode") as string) || "").trim() || null,
      description: ((formData.get("description") as string) || "").trim() || null,
      tags: formData.get("tags")
        ? (formData.get("tags") as string)
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [],
      ownerId:
        ((formData.get("ownerId") as string) || "").trim() ||
        existingCustomer?.ownerId ||
        session.user.id,
      isPerishable,
      perishableDetails,
      directEnquiryRequestKey: requestKey,
    });

    const enquirySnapshot =
      shipmentMode === "SEA"
        ? {
            type: "Sea",
            seaType: shipmentDirection === "IMP" ? "Import" : "Export",
            seaLclFcl: (formData.get("seaLoadType") as string) || "LCL",
            pol: (formData.get("originPoint") as string) || "Not Specified",
            pod: (formData.get("destinationPoint") as string) || "Not Specified",
            commodity: (formData.get("commodity") as string) || "Not Specified",
            weight: (formData.get("weight") as string) || "Not Specified",
            dimensions: (formData.get("dimensions") as string) || "Not Specified",
            packages: (formData.get("packages") as string) || "Not Specified",
            incoterm: (formData.get("incoterm") as string) || null,
            serviceScope: selectedScope,
            leadSource: (formData.get("source") as string) || "Existing Client",
          }
        : {
            type: "Air",
            airType: shipmentDirection === "IMP" ? "Import" : "Export",
            aol: (formData.get("originPoint") as string) || "Not Specified",
            aod: (formData.get("destinationPoint") as string) || "Not Specified",
            commodity: (formData.get("commodity") as string) || "Not Specified",
            weight: (formData.get("weight") as string) || "Not Specified",
            dimensions: (formData.get("dimensions") as string) || "Not Specified",
            packages: (formData.get("packages") as string) || "Not Specified",
            incoterm: (formData.get("incoterm") as string) || null,
            serviceScope: selectedScope,
            leadSource: (formData.get("source") as string) || "Existing Client",
          };

    const routed = await routeQualifiedEnquiry({
      actorUserId: session.user.id,
      orgId,
      leadId: lead.id,
      selectedScope: selectedScope as
        | "BOTH_FREIGHT_AND_CLEARANCE"
        | "ONLY_FREIGHT"
        | "ONLY_CLEARANCE",
      enquirySnapshot,
      origin: "DIRECT_ENQUIRY",
      customerId,
      isPerishable,
    });

    await crmService.addTimelineEvent(orgId, {
      relatedToType: "LEAD",
      relatedToId: lead.id,
      eventType: "DIRECT_ENQUIRY_CREATED",
      description: `Direct enquiry created and routed.${customerId ? " Existing customer selected." : ""}`,
      createdById: session.user.id,
    });

    revalidatePath("/crm/enquiries");
    revalidatePath("/crm/freight-forwarding");
    revalidatePath("/crm/customs-clearance");
    revalidatePath("/crm/leads");

    return {
      ok: true,
      data: routed,
    };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to create direct enquiry" };
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

    const isPerishable = formData.get("isPerishable") === "true";
    const perishableDetails = isPerishable ? {
      perishableType: (formData.get("perishableType") as string) || "",
      tempRequired: (formData.get("tempRequired") as string) || "",
      humidityControl: (formData.get("humidityControl") as string) || "",
      ventilation: (formData.get("ventilation") as string) || "",
      perishableRemarks: (formData.get("perishableRemarks") as string) || "",
    } : null;

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
      isPerishable,
      perishableDetails,
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
        convertedAccountId: account.id,
        convertedContactId: contact.id,
        convertedDealId: dealId || null,
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
    revalidatePath("/crm/customers");
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

function calculateCrmReminderTime(now: Date): Date {
  const alertTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // +2 hours
  
  const alertHour = alertTime.getHours();
  const alertMin = alertTime.getMinutes();
  const alertMinutesFromMidnight = alertHour * 60 + alertMin;
  
  const startVal = 9 * 60 + 30; // 9:30 AM = 570 minutes
  const endVal = 17 * 60 + 30;  // 5:30 PM = 1050 minutes
  
  if (alertMinutesFromMidnight > endVal) {
    // Beyond 5:30 PM -> Tomorrow at 9:30 AM
    const scheduledDate = new Date(now);
    scheduledDate.setDate(scheduledDate.getDate() + 1);
    scheduledDate.setHours(9, 30, 0, 0);
    return scheduledDate;
  } else if (alertMinutesFromMidnight < startVal) {
    // Before 9:30 AM -> Today at 9:30 AM
    const scheduledDate = new Date(now);
    scheduledDate.setHours(9, 30, 0, 0);
    return scheduledDate;
  }
  
  return alertTime;
}

export async function updateLeadStatusAction(
  leadId: string,
  status: string,
  additionalData?: any
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "crm.lead.create");

    const existingLead = await db.crmLead.findFirst({
      where: { id: leadId, orgId },
    });
    if (!existingLead) return { ok: false, error: "Lead not found" };

    const isChangeFromFollowUp = existingLead.status === "NOT_PICKED" || existingLead.status === "NOT_REACHABLE";
    const changeRemarks = additionalData?.remarks || additionalData?.reason || "";

    // Require reason/remarks if changing from a follow-up status (or if retrying/rescheduling follow-up)
    if (isChangeFromFollowUp) {
      if (!changeRemarks.trim()) {
        return { ok: false, error: "A reason/remark for the status update is required during the follow-up period." };
      }
    }

    // Complete any existing pending/open follow-up tasks
    if (isChangeFromFollowUp) {
      const completionText = `Completed status update to ${status.replace("_", " ")} at ${new Date().toLocaleString("en-IN")}.${changeRemarks ? ` Outcome/Remarks: ${changeRemarks}` : ""}`;
      await db.crmActivity.updateMany({
        where: {
          relatedToType: "LEAD",
          relatedToId: leadId,
          type: "TASK",
          title: { startsWith: "Follow-up:" },
          status: "NOT_STARTED",
        },
        data: {
          status: "COMPLETED",
          description: completionText
        }
      });
    }

    if (status === "INTERESTED" && additionalData?.enquiry) {
      const serviceScope = additionalData?.enquiry?.serviceScope as
        | "BOTH_FREIGHT_AND_CLEARANCE"
        | "ONLY_FREIGHT"
        | "ONLY_CLEARANCE"
        | undefined;

      if (!serviceScope) {
        return { ok: false, error: "Choose the requested service scope before marking the lead as interested." };
      }

      const contactEmail = existingLead.email || "";
      const contactMobile = existingLead.mobile || "";

      let existingContact = null;
      if (contactEmail || contactMobile) {
        existingContact = await db.crmContact.findFirst({
          where: {
            orgId,
            OR: [
              contactEmail ? { email: contactEmail } : undefined,
              contactMobile ? { mobile: contactMobile } : undefined,
            ].filter(Boolean) as any,
          },
        });
      }

      if (!existingContact) {
        await db.crmContact.create({
          data: {
            orgId,
            ownerId: existingLead.ownerId,
            firstName: existingLead.firstName,
            lastName: existingLead.lastName,
            email: existingLead.email,
            phone: existingLead.phone,
            mobile: existingLead.mobile,
            designation: existingLead.designation,
            address: existingLead.address,
            createdById: session.user.id,
            updatedById: session.user.id,
          },
        });
      }

      const routed = await routeQualifiedEnquiry({
        actorUserId: session.user.id,
        orgId,
        leadId,
        selectedScope: serviceScope,
        enquirySnapshot: additionalData.enquiry,
        origin: "LEAD_CONVERSION",
        isPerishable: additionalData?.isPerishable ?? false,
        isFutureFollowUp: additionalData?.isFutureFollowUp ?? false,
        followUpReminderDate: additionalData?.followUpReminderDate
          ? new Date(additionalData.followUpReminderDate)
          : null,
      });

      await crmService.addTimelineEvent(orgId, {
        relatedToType: "LEAD",
        relatedToId: leadId,
        eventType: "LEAD_STATUS_CHANGED",
        description: `Lead status updated to Interested.${changeRemarks ? ` Reason/Remarks: ${changeRemarks}` : ""}`,
        createdById: session.user.id,
      });

      if (changeRemarks) {
        await crmService.addNote(orgId, {
          relatedToType: "LEAD",
          relatedToId: leadId,
          body: `[System Note - Status Change: Interested] Reason: ${changeRemarks}`,
          createdById: session.user.id,
        });
      }

      revalidatePath(`/crm/leads/${leadId}`);
      revalidatePath(`/crm/enquiries/${leadId}`);
      revalidatePath("/crm/enquiries");
      revalidatePath("/crm/freight-forwarding");
      revalidatePath("/crm/customs-clearance");
      revalidatePath("/crm/leads");

      return { ok: true, data: routed };
    }

    const updateData: any = { status };

    if (status === "NOT_INTERESTED") {
      updateData.notInterestedReason = additionalData?.reason || "";
    }

    if (status === "INTERESTED" || status === "FOLLOW_UP") {
      if (!existingLead.enquiryRef) {
        const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
        updateData.enquiryRef = `ADR-ENQ-${rand}`;
      }

      // Automatically save contact details to the Contacts tab of CRM
      const contactEmail = existingLead.email || "";
      const contactMobile = existingLead.mobile || "";

      let existingContact = null;
      if (contactEmail || contactMobile) {
        existingContact = await db.crmContact.findFirst({
          where: {
            orgId,
            OR: [
              contactEmail ? { email: contactEmail } : undefined,
              contactMobile ? { mobile: contactMobile } : undefined,
            ].filter(Boolean) as any,
          },
        });
      }

      if (!existingContact) {
        await db.crmContact.create({
          data: {
            orgId,
            ownerId: existingLead.ownerId,
            firstName: existingLead.firstName,
            lastName: existingLead.lastName,
            email: existingLead.email,
            phone: existingLead.phone,
            mobile: existingLead.mobile,
            designation: existingLead.designation,
            address: existingLead.address,
            createdById: session.user.id,
            updatedById: session.user.id,
          },
        });
      }
    }

    const lead = await db.crmLead.update({
      where: { id: leadId },
      data: updateData,
    });

    await crmService.addTimelineEvent(orgId, {
      relatedToType: "LEAD",
      relatedToId: leadId,
      eventType: "LEAD_STATUS_CHANGED",
      description: `Lead status updated to ${status.replace("_", " ")}.${changeRemarks ? ` Reason/Remarks: ${changeRemarks}` : ""}`,
      createdById: session.user.id,
    });

    if (status === "NOT_INTERESTED" && additionalData?.reason) {
      await crmService.addNote(orgId, {
        relatedToType: "LEAD",
        relatedToId: leadId,
        body: `Not Interested Reason: ${additionalData.reason}`,
        createdById: session.user.id,
      });
    }

    if (status === "INTERESTED" && changeRemarks) {
      await crmService.addNote(orgId, {
        relatedToType: "LEAD",
        relatedToId: leadId,
        body: `[System Note - Status Change: Interested] Reason: ${changeRemarks}`,
        createdById: session.user.id,
      });
    }

    if (status === "INTERESTED" && additionalData?.enquiry) {
      const enq = additionalData.enquiry;
      const type = enq.type || "Sea";
      let bodyText = `In-call Enquiry Captured (${type} Cargo):\n`;
      if (type === "Sea") {
        bodyText += `- Import/Export: ${enq.seaType || "N/A"}\n`
          + `- POL: ${enq.pol || "N/A"}\n`
          + `- POD: ${enq.pod || "N/A"}\n`
          + `- Commodity: ${enq.commodity || "N/A"}\n`
          + `- Weight: ${enq.weight || "N/A"}\n`
          + `- CBM/Volume: ${enq.cbm || "N/A"}\n`
          + `- Dimensions/Container type: ${enq.containerType || "N/A"}\n`
          + `- No. of containers: ${enq.containerCount || "N/A"}\n`
          + `- Incoterm: ${enq.incoterm || "N/A"}\n`
          + `- Shipment planning: ${enq.shipmentPlanning || "N/A"}\n`
          + `- Prior shipments done: ${enq.shipmentsDoneBefore || "N/A"}\n`
          + `- Purpose: ${enq.purpose || "N/A"}`;
      } else {
        bodyText += `- AOL: ${enq.aol || "N/A"}\n`
          + `- AOD: ${enq.aod || "N/A"}\n`
          + `- Commodity: ${enq.commodity || "N/A"}\n`
          + `- Weight: ${enq.weight || "N/A"}\n`
          + `- Dimensions: ${enq.dimensions || "N/A"}\n`
          + `- No. of packages: ${enq.packages || "N/A"}\n`
          + `- Incoterm: ${enq.incoterm || "N/A"}\n`
          + `- Shipment planning: ${enq.shipmentPlanning || "N/A"}\n`
          + `- Prior shipments done: ${enq.shipmentsDoneBefore || "N/A"}\n`
          + `- Purpose: ${enq.purpose || "N/A"}`;
      }

      await crmService.addNote(orgId, {
        relatedToType: "LEAD",
        relatedToId: leadId,
        body: bodyText,
        createdById: session.user.id,
      });
    }

    if (status === "NOT_PICKED" || status === "NOT_REACHABLE") {
      const now = new Date();
      const alertAt = calculateCrmReminderTime(now);

      await db.crmLeadReminder.deleteMany({
        where: { leadId, status: "PENDING" },
      });

      await db.crmLeadReminder.create({
        data: {
          orgId,
          leadId,
          userId: lead.ownerId,
          alertAt,
          status: "PENDING",
        },
      });

      const remarks = additionalData?.remarks || "";
      const extraDesc = remarks ? `\nRemarks: ${remarks}` : "";
      const statusLabel = status === "NOT_PICKED" ? "Not Picked" : "Not Reachable";
      
      await crmService.addTimelineEvent(orgId, {
        relatedToType: "LEAD",
        relatedToId: leadId,
        eventType: "REMINDER_SCHEDULED",
        description: `Follow-up reminder scheduled for ${alertAt.toLocaleString("en-IN")} because lead was marked as ${statusLabel}.${extraDesc}`,
        createdById: session.user.id,
      });

      // Also create a CRM Activity Task for the user's activities panel
      await db.crmActivity.create({
        data: {
          orgId,
          ownerId: lead.ownerId,
          type: "TASK",
          title: `Follow-up: ${statusLabel} Lead`,
          description: `This lead was marked as ${statusLabel}. Follow up is required by ${alertAt.toLocaleString("en-IN")}.${extraDesc}`,
          status: "NOT_STARTED",
          priority: "HIGH",
          dueAt: alertAt,
          relatedToType: "LEAD",
          relatedToId: leadId,
          createdById: session.user.id,
          updatedById: session.user.id,
        }
      });

      // Add a Note to the lead for review purpose
      if (remarks) {
        await crmService.addNote(orgId, {
          relatedToType: "LEAD",
          relatedToId: leadId,
          body: `[System Note - Status Change: ${statusLabel}] ${remarks}`,
          createdById: session.user.id,
        });
      }
    }

    revalidatePath(`/crm/leads/${leadId}`);
    revalidatePath("/crm/leads");
    return { ok: true, data: lead };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to update lead status" };
  }
}

export async function saveEnquiryRatesAction(
  leadId: string,
  ratesData: any
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "crm.lead.create");

    const lead = await db.crmLead.findFirst({
      where: { id: leadId, orgId },
    });
    if (!lead) return { ok: false, error: "Lead not found" };

    const currentEnquiry = (lead.enquiryDetails as any) || {};
    const updatedEnquiry = {
      ...currentEnquiry,
      rates: ratesData,
    };

    const updatedLead = await db.crmLead.update({
      where: { id: leadId },
      data: {
        enquiryDetails: updatedEnquiry,
      },
    });

    await db.crmServiceEnquiry.updateMany({
      where: { orgId, leadId },
      data: {
        pricingSnapshot: {
          rates: ratesData,
          updatedAt: new Date().toISOString(),
          updatedById: session.user.id,
        } as any,
        status: "PRICING_IN_PROGRESS",
        updatedById: session.user.id,
      },
    });

    await crmService.addTimelineEvent(orgId, {
      relatedToType: "LEAD",
      relatedToId: leadId,
      eventType: "RATES_UPDATED",
      description: `Rates worksheet updated for enquiry`,
      createdById: session.user.id,
    });

    revalidatePath(`/crm/leads/${leadId}`);
    revalidatePath(`/crm/enquiries/${leadId}`);
    revalidatePath("/crm/freight-forwarding");
    revalidatePath("/crm/customs-clearance");
    return { ok: true, data: updatedLead };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to save enquiry rates" };
  }
}

// ─── Account & Contact Actions ────────────────────────────────────────────────

export async function createAccountAction(formData: FormData): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    const canManageCrmAccounts = await can(session.user.id, "crm.account.manage");
    const canManageChaCustomers = await can(session.user.id, "cha.customer.manage");
    if (!canManageCrmAccounts && !canManageChaCustomers) {
      return { ok: false, error: "You are not allowed to create customer accounts." };
    }

    const displayName = (formData.get("displayName") as string) || "";
    const companyName = (formData.get("companyName") as string) || "";
    const firstName = (formData.get("firstName") as string) || "";
    const lastName = (formData.get("lastName") as string) || "";
    const name = displayName.trim() || companyName.trim() || `${firstName} ${lastName}`.trim() || "Unnamed Customer";

    const billingAddressDetails = parseCustomerAddressDetails(formData, "billing");
    const shippingAddressDetails = parseCustomerAddressDetails(formData, "shipping");
    const courierAddressDetails = parseCustomerAddressDetails(formData, "courier");
    const contacts = parseCustomerContacts(formData);
    const openingBalances = parseOpeningBalances(formData);
    const primaryOpeningBalance = openingBalances[0] ?? {
      branch: "Chennai",
      amount: "0",
    };

    const billingAddress = formatCustomerAddressString(billingAddressDetails);
    const shippingAddress = formatCustomerAddressString(shippingAddressDetails);

    const channels: string[] = [];
    if (formData.get("channelEmail") === "true" || formData.get("channelEmail") === "on") channels.push("EMAIL");
    if (formData.get("channelSms") === "true" || formData.get("channelSms") === "on") channels.push("SMS");

    const data = {
      name,
      type: (formData.get("type") as string) || "Customer",
      industry: (formData.get("industry") as string) || null,
      website: (formData.get("website") as string) || null,
      phone: (formData.get("phone") as string) || null,
      email: (formData.get("email") as string) || null,
      gstin: (formData.get("gstin") as string) || null,
      billingAddress,
      shippingAddress,
      creditLimit: parseFloat((formData.get("creditLimit") as string) || "0") || 0,
      paymentTerms: (formData.get("paymentTerms") as string) || null,
      ownerId: (formData.get("ownerId") as string) || session.user.id,

      customerSubType: (formData.get("customerSubType") as string) || null,
      salutation: (formData.get("salutation") as string) || null,
      firstName: firstName || null,
      lastName: lastName || null,
      companyName: companyName || null,
      language: (formData.get("language") as string) || "English",
      communicationChannels: channels,
      gstTreatment: (formData.get("gstTreatment") as string) || null,
      placeOfSupply: (formData.get("placeOfSupply") as string) || null,
      pan: (formData.get("pan") as string) || null,
      taxPreference: (formData.get("taxPreference") as string) || null,
      currency: (formData.get("currency") as string) || "INR",
      openingBalanceBranch: primaryOpeningBalance.branch || null,
      openingBalanceAmount: parseFloat(primaryOpeningBalance.amount || "0") || 0,
      isPortalEnabled: formData.get("isPortalEnabled") === "true" || formData.get("isPortalEnabled") === "on",
      remarks: (formData.get("remarks") as string) || null,
      billingAddressDetails: billingAddressDetails as any,
      shippingAddressDetails: shippingAddressDetails as any,
    };

    // KYC file uploads parsing and drive uploads
    const kycTypes = [
      "IEC",
      "GST",
      "AD Code",
      "FSSAI Licence",
      "Company Address Proof",
      "Partner / Proprietor Address Proof",
      "Authorisation Letter",
      "Cancelled Cheque",
    ];
    const kycData: Record<string, any> = {};
    for (const type of kycTypes) {
      const fieldKey = `kycFile_${type.replace(/\s+/g, "_")}`;
      const file = formData.get(fieldKey);
      if (file instanceof File && file.size > 0) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const mimeType = file.type || "application/octet-stream";
        const sizeBytes = file.size;

        let fileKey = `https://drive.google.com/file/d/mock-kyc-${Math.random().toString(36).substring(7)}/view`;
        try {
          const uploadResult = await driveClient.uploadFile({
            name: `${type}_${file.name}`,
            mimeType,
            parentFolderId: "root",
            fileBuffer: buffer,
          });
          fileKey = uploadResult.webViewLink;
        } catch (err: any) {
          console.warn(`[KYC CRM Upload] Drive upload fallback for ${type}:`, err.message || err);
        }

        kycData[type] = {
          fileKey,
          fileName: file.name,
          fileSize: sizeBytes,
          uploadedAt: new Date().toISOString(),
        };
      }
    }

    const remarksObj = {
      userRemarks: data.remarks || "",
      kyc: kycData,
      openingBalancesByBranch: openingBalances,
      courierAddressDetails,
      shippingSameAsBilling:
        formData.get("shippingSameAsBilling") === "true" ||
        formData.get("shippingSameAsBilling") === "on",
      courierSameAsBilling:
        formData.get("courierSameAsBilling") === "true" ||
        formData.get("courierSameAsBilling") === "on",
    };
    data.remarks = JSON.stringify(remarksObj);

    const account = await crmService.createAccount(orgId, session.user.id, data);
    await syncAccountContacts({
      orgId,
      actorUserId: session.user.id,
      accountId: account.id,
      ownerId: data.ownerId,
      contacts,
    });
    if (data.isPortalEnabled) {
      await syncCustomerPortalUsersForCrmCustomer({
        actorUserId: session.user.id,
        orgId,
        customerId: account.id,
      });
    }
    revalidatePath("/crm/customers");
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
    if (contact.accountId) {
      const account = await db.crmAccount.findFirst({
        where: { id: contact.accountId, orgId },
        select: { isPortalEnabled: true },
      });
      if (account?.isPortalEnabled) {
        await syncCustomerPortalUsersForCrmCustomer({
          actorUserId: session.user.id,
          orgId,
          customerId: contact.accountId,
        });
      }
    }
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
      ...accounts.map(a => ({ id: a.id, title: a.name, subtitle: a.phone || "No phone", type: "Customer", href: `/crm/customers/${a.id}` })),
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
    if (contact.accountId) {
      const account = await db.crmAccount.findFirst({
        where: { id: contact.accountId, orgId },
        select: { isPortalEnabled: true },
      });
      if (account?.isPortalEnabled) {
        await syncCustomerPortalUsersForCrmCustomer({
          actorUserId: session.user.id,
          orgId,
          customerId: contact.accountId,
        });
      }
    }
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

    const canManageCrmAccounts = await can(session.user.id, "crm.account.manage");
    const canManageChaCustomers = await can(session.user.id, "cha.customer.manage");
    if (!canManageCrmAccounts && !canManageChaCustomers) {
      return { ok: false, error: "You are not allowed to update customer accounts." };
    }

    const displayName = (formData.get("displayName") as string) || "";
    const companyName = (formData.get("companyName") as string) || "";
    const firstName = (formData.get("firstName") as string) || "";
    const lastName = (formData.get("lastName") as string) || "";
    const name = displayName.trim() || companyName.trim() || `${firstName} ${lastName}`.trim() || "Unnamed Customer";

    const billingAddressDetails = parseCustomerAddressDetails(formData, "billing");
    const shippingAddressDetails = parseCustomerAddressDetails(formData, "shipping");
    const courierAddressDetails = parseCustomerAddressDetails(formData, "courier");
    const contacts = parseCustomerContacts(formData);
    const openingBalances = parseOpeningBalances(formData);
    const primaryOpeningBalance = openingBalances[0] ?? {
      branch: "Chennai",
      amount: "0",
    };

    const billingAddress = formatCustomerAddressString(billingAddressDetails);
    const shippingAddress = formatCustomerAddressString(shippingAddressDetails);

    const channels: string[] = [];
    if (formData.get("channelEmail") === "true" || formData.get("channelEmail") === "on") channels.push("EMAIL");
    if (formData.get("channelSms") === "true" || formData.get("channelSms") === "on") channels.push("SMS");

    const data = {
      name,
      type: (formData.get("type") as string) || "Customer",
      industry: (formData.get("industry") as string) || null,
      website: (formData.get("website") as string) || null,
      phone: (formData.get("phone") as string) || null,
      email: (formData.get("email") as string) || null,
      gstin: (formData.get("gstin") as string) || null,
      billingAddress,
      shippingAddress,
      creditLimit: parseFloat((formData.get("creditLimit") as string) || "0") || 0,
      paymentTerms: (formData.get("paymentTerms") as string) || null,
      ownerId: (formData.get("ownerId") as string) || session.user.id,

      customerSubType: (formData.get("customerSubType") as string) || null,
      salutation: (formData.get("salutation") as string) || null,
      firstName: firstName || null,
      lastName: lastName || null,
      companyName: companyName || null,
      language: (formData.get("language") as string) || "English",
      communicationChannels: channels,
      gstTreatment: (formData.get("gstTreatment") as string) || null,
      placeOfSupply: (formData.get("placeOfSupply") as string) || null,
      pan: (formData.get("pan") as string) || null,
      taxPreference: (formData.get("taxPreference") as string) || null,
      currency: (formData.get("currency") as string) || "INR",
      openingBalanceBranch: primaryOpeningBalance.branch || null,
      openingBalanceAmount: parseFloat(primaryOpeningBalance.amount || "0") || 0,
      isPortalEnabled: formData.get("isPortalEnabled") === "true" || formData.get("isPortalEnabled") === "on",
      remarks: (formData.get("remarks") as string) || null,
      billingAddressDetails: billingAddressDetails as any,
      shippingAddressDetails: shippingAddressDetails as any,
    };

    // KYC file uploads parsing and drive uploads merging
    const kycTypes = [
      "IEC",
      "GST",
      "AD Code",
      "FSSAI Licence",
      "Company Address Proof",
      "Partner / Proprietor Address Proof",
      "Authorisation Letter",
      "Cancelled Cheque",
    ];

    const existing = await db.crmAccount.findUnique({
      where: { id: accountId },
      select: { remarks: true },
    });
    const remarksObj: any = parseAccountRemarks(existing?.remarks);

    remarksObj.kyc = remarksObj.kyc || {};
    for (const type of kycTypes) {
      const fieldKey = `kycFile_${type.replace(/\s+/g, "_")}`;
      const file = formData.get(fieldKey);
      if (file instanceof File && file.size > 0) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const mimeType = file.type || "application/octet-stream";
        const sizeBytes = file.size;

        let fileKey = `https://drive.google.com/file/d/mock-kyc-${Math.random().toString(36).substring(7)}/view`;
        try {
          const uploadResult = await driveClient.uploadFile({
            name: `${type}_${file.name}`,
            mimeType,
            parentFolderId: "root",
            fileBuffer: buffer,
          });
          fileKey = uploadResult.webViewLink;
        } catch (err: any) {
          console.warn(`[KYC CRM Update] Drive upload fallback for ${type}:`, err.message || err);
        }

        remarksObj.kyc[type] = {
          fileKey,
          fileName: file.name,
          fileSize: sizeBytes,
          uploadedAt: new Date().toISOString(),
        };
      }
    }

    remarksObj.userRemarks = data.remarks || "";
    remarksObj.openingBalancesByBranch = openingBalances;
    remarksObj.courierAddressDetails = courierAddressDetails;
    remarksObj.shippingSameAsBilling =
      formData.get("shippingSameAsBilling") === "true" ||
      formData.get("shippingSameAsBilling") === "on";
    remarksObj.courierSameAsBilling =
      formData.get("courierSameAsBilling") === "true" ||
      formData.get("courierSameAsBilling") === "on";
    data.remarks = JSON.stringify(remarksObj);

    const account = await crmService.updateAccount(orgId, accountId, session.user.id, data);
    await syncAccountContacts({
      orgId,
      actorUserId: session.user.id,
      accountId: account.id,
      ownerId: data.ownerId,
      contacts,
    });
    await syncCustomerPortalUsersForCrmCustomer({
      actorUserId: session.user.id,
      orgId,
      customerId: account.id,
    });
    revalidatePath("/crm/customers");
    revalidatePath(`/crm/customers/${accountId}`);
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

    revalidatePath("/crm/customers");
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
    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.qty) * parseFloat(item.rate) * parseFloat(item.exchangeRate ?? 1)), 0);
    const tax = items.reduce((sum, item) => {
      const itemTaxPercent = parseFloat(item.taxPercent ?? "18");
      return sum + (parseFloat(item.qty) * parseFloat(item.rate) * parseFloat(item.exchangeRate ?? 1) * (itemTaxPercent / 100));
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
      bankDetails: (formData.get("bankDetails") as string) || null,
      manualNotes: (formData.get("manualNotes") as string) || null,
      terms: (formData.get("terms") as string) || null,
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
    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.qty) * parseFloat(item.rate) * parseFloat(item.exchangeRate ?? 1)), 0);
    const tax = items.reduce((sum, item) => {
      const itemTaxPercent = parseFloat(item.taxPercent ?? "18");
      return sum + (parseFloat(item.qty) * parseFloat(item.rate) * parseFloat(item.exchangeRate ?? 1) * (itemTaxPercent / 100));
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
      bankDetails: (formData.get("bankDetails") as string) || null,
      manualNotes: (formData.get("manualNotes") as string) || null,
      terms: (formData.get("terms") as string) || null,
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
        amount: parseFloat(item.qty) * parseFloat(item.rate) * parseFloat(item.exchangeRate ?? 1) * (1 + (parseFloat(item.taxPercent ?? 18) / 100)),
        currency: item.currency || "INR",
        exchangeRate: parseFloat(item.exchangeRate ?? 1),
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

    const invoice = await db.crmInvoice.findUnique({
      where: { id: invoiceId, orgId },
      select: { type: true, approvalStatus: true }
    });

    if (!invoice) {
      return { ok: false, error: "Quote/Invoice not found" };
    }

    if (invoice.type === "QUOTE" && invoice.approvalStatus !== "DRAFT") {
      return { ok: false, error: "Only draft quotes can be deleted" };
    }

    await db.crmInvoice.delete({
      where: { id: invoiceId, orgId },
    });

    revalidatePath("/crm/invoices");
    revalidatePath("/crm/quotes");
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
    revalidatePath("/crm/customers");
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

// ─── Justdial Importer Actions ──────────────────────────────────────────────────

export async function saveJustdialConfigAction(formData: FormData): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "crm.leadSource.manage");

    const dashboardUrl = formData.get("dashboardUrl") as string;
    if (!dashboardUrl) {
      return { ok: false, error: "Dashboard URL is required" };
    }

    const data = {
      dashboardUrl,
      importMode: (formData.get("importMode") as string) || "MANUAL",
      scheduleInterval: (formData.get("scheduleInterval") as string) || "1h",
      maxLeads: parseInt((formData.get("maxLeads") as string) || "50", 10) || 50,
      duplicateHandling: (formData.get("duplicateHandling") as string) || "UPDATE_EXISTING",
      defaultOwnerId: (formData.get("defaultOwnerId") as string) || session.user.id,
      defaultStage: (formData.get("defaultStage") as string) || "NEW",
      cookiesJson: (formData.get("cookiesJson") as string) || null,
      isActive: formData.get("isActive") === "true",
    };

    const config = await leadSourceService.saveJustdialConfig(orgId, data);
    revalidatePath("/crm/lead-sources");
    return { ok: true, data: config };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to save Justdial configuration" };
  }
}

export async function runJustdialImportAction(): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "crm.lead.import");

    const config = await leadSourceService.getJustdialConfig(orgId);
    if (!config) {
      return { ok: false, error: "Justdial integration is not configured." };
    }

    if (config.isImporting) {
      return { ok: false, error: "A lead import run is already in progress. Please try again shortly." };
    }

    // Set lock
    await leadSourceService.setImportingLock(orgId, true);

    // Create log entry
    const log = await leadSourceService.createImportLog(orgId);

    // Run scraper asynchronously in the background to avoid blocking the server action response
    (async () => {
      try {
        const { runJustdialImport } = await import("./justdial-import.service");
        await runJustdialImport(orgId, session.user.id, log.id);
      } catch (err: any) {
        console.error(`[Justdial Background Action Run] Error for org ${orgId}:`, err);
      } finally {
        await leadSourceService.setImportingLock(orgId, false);
      }
    })();

    revalidatePath("/crm/lead-sources");
    revalidatePath("/crm/leads");
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Import run failed." };
  }
}

export async function forceResetJustdialLockAction(): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "crm.leadSource.manage");

    await leadSourceService.setImportingLock(orgId, false);
    
    // Also reset in-memory status so the UI updates
    const globalForScraper = globalThis as unknown as {
      justdialStatus?: Record<string, any>;
      justdialScreenshot?: Record<string, string>;
    };
    if (!globalForScraper.justdialStatus) {
      globalForScraper.justdialStatus = {};
    }
    globalForScraper.justdialStatus[orgId] = {
      status: "IDLE",
      currentStep: "Importer unlocked. Waiting for next trigger.",
      processedCount: 0,
      totalCount: 0,
      logs: [],
      currentUrl: "",
      timestamp: new Date().toISOString()
    };
    if (!globalForScraper.justdialScreenshot) {
      globalForScraper.justdialScreenshot = {};
    }
    globalForScraper.justdialScreenshot[orgId] = "";

    revalidatePath("/crm/lead-sources");
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to reset lock." };
  }
}


export async function testJustdialSessionAction(): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "crm.leadSource.manage");

    const { testJustdialSession } = await import("./justdial-import.service");
    const res = await testJustdialSession(orgId);
    if (res.ok) {
      return { ok: true, data: res.title };
    } else {
      return { ok: false, error: res.error || "Session test failed." };
    }
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to test session." };
  }
}

export async function getJustdialLogsAction(): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "crm.leadSource.read");

    const logs = await leadSourceService.getImportLogs(orgId);
    return { ok: true, data: logs };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to fetch logs" };
  }
}

export async function toggleJustdialActiveAction(isActive: boolean): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "crm.leadSource.manage");

    const config = await db.crmLeadSourceJustdialConfig.update({
      where: { orgId },
      data: { isActive },
    });

    revalidatePath("/crm/lead-sources");
    return { ok: true, data: config };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to toggle Justdial status" };
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports */
export async function saveQuoteAction(
  quoteId: string | undefined,
  values: any,
  isSubmit: boolean,
  linkedLeadId?: string
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "crm.invoice.manage");

    const {
      customerId,
      location,
      placeOfSupply,
      quoteNumber,
      referenceNumber,
      quoteDate,
      expiryDate,
      salesperson,
      discountValue,
      discountType,
      adjustment,
      roundOff,
      subtotal,
      total,
      customerNotes,
      terms,
      bankDetailsId,
      lineItems,
      portOfLoading,
      portOfLoadingCountry,
      portOfDischarge,
      portOfDestinationCountry,
      incoterm,
      containerType,
      numberOfContainers,
      commodity,
      weight,
    } = values;

    if (!quoteNumber) {
      return { ok: false, error: "Quote Number is required" };
    }

    const parsedItems = lineItems || [];
    const tax = parsedItems.reduce((sum: number, item: any) => {
      const rate = parseFloat(item.rate) || 0;
      const quantity = parseFloat(item.quantity) || 0;
      const taxPercent = parseFloat(item.tax) || 18;
      return sum + (rate * quantity * (taxPercent / 100));
    }, 0);

    const now = new Date();

    let matchedLeadId = linkedLeadId?.trim() || null;
    let resolvedReferenceNumber = referenceNumber?.trim() || null;

    if (matchedLeadId) {
      const linkedLead = await db.crmLead.findFirst({
        where: { id: matchedLeadId, orgId },
        select: { id: true, enquiryRef: true },
      });
      if (!linkedLead) {
        matchedLeadId = null;
      } else if (!resolvedReferenceNumber && linkedLead.enquiryRef) {
        resolvedReferenceNumber = linkedLead.enquiryRef;
      }
    }

    if (!matchedLeadId && customerId && customerId.trim()) {
      const matchedLead = await db.crmLead.findFirst({
        where: { orgId, convertedAccountId: customerId.trim() },
        select: { id: true, enquiryRef: true },
      });
      if (matchedLead) {
        matchedLeadId = matchedLead.id;
        if (!resolvedReferenceNumber && matchedLead.enquiryRef) {
          resolvedReferenceNumber = matchedLead.enquiryRef;
        }
      }
    }

    const data: any = {
      orgId,
      invoiceNumber: quoteNumber,
      type: "QUOTE",
      date: quoteDate ? new Date(quoteDate) : now,
      dueDate: expiryDate ? new Date(expiryDate) : null,
      status: isSubmit ? "PENDING_APPROVAL" : "DRAFT",
      approvalStatus: isSubmit ? "PENDING_APPROVAL" : "DRAFT",
      discount: parseFloat(discountValue) || 0,
      tax: tax,
      total: parseFloat(total) || 0,
      accountId: customerId && customerId.trim() ? customerId.trim() : null,
      crmLeadId: matchedLeadId,
      manualNotes: customerNotes || null,
      terms: terms || null,
      bankDetails: bankDetailsId || null,
      ownerId: salesperson || session.user.id,
      createdById: session.user.id,
      updatedById: session.user.id,
      referenceNumber: resolvedReferenceNumber,
      location: location || null,
      placeOfSupply: placeOfSupply || null,
      discountType: discountType || "percentage",
      portOfLoading: portOfLoading || null,
      portOfLoadingCountry: portOfLoadingCountry || null,
      portOfDischarge: portOfDischarge || null,
      portOfDestinationCountry: portOfDestinationCountry || null,
      incoterm: incoterm || null,
      containerType: containerType || null,
      numberOfContainers: numberOfContainers ? parseInt(numberOfContainers) : null,
      commodity: commodity || null,
      weight: weight || null,
    };

    let savedQuote;
    if (quoteId) {
      // Edit
      savedQuote = await db.crmInvoice.update({
        where: { id: quoteId },
        data: {
          ...data,
          updatedById: session.user.id,
          createdById: undefined,
        },
      });

      // delete and recreate items
      await db.crmInvoiceItem.deleteMany({
        where: { invoiceId: quoteId },
      });

      await db.crmInvoiceItem.createMany({
        data: parsedItems.map((item: any) => ({
          invoiceId: quoteId,
          productName: item.description || "Line Item",
          qty: parseFloat(item.quantity) || 1,
          rate: parseFloat(item.rate) || 0,
          taxPercent: parseFloat(String(item.tax ?? "18").match(/[\d.]+/)?.[0] ?? "18") || 18,
          taxLabel: item.tax || null,
          unit: item.unit || null,
          tds: item.tds || null,
          amount: parseFloat(item.amount) || 0,
          currency: item.currency || "INR",
          exchangeRate: parseFloat(item.exchangeRate) || 1,
        })),
      });
    } else {
      // Create
      savedQuote = await db.crmInvoice.create({
        data: {
          ...data,
          items: {
            create: parsedItems.map((item: any) => ({
              productName: item.description || "Line Item",
              qty: parseFloat(item.quantity) || 1,
              rate: parseFloat(item.rate) || 0,
              taxPercent: parseFloat(String(item.tax ?? "18").match(/[\d.]+/)?.[0] ?? "18") || 18,
              taxLabel: item.tax || null,
              unit: item.unit || null,
              tds: item.tds || null,
              amount: parseFloat(item.amount) || 0,
              currency: item.currency || "INR",
              exchangeRate: parseFloat(item.exchangeRate) || 1,
            })),
          },
        },
      });
    }

    if (isSubmit) {
      const { submitForApproval } = require("./approval-workflow");
      await submitForApproval({
        invoiceId: savedQuote.id,
        orgId,
        actorId: session.user.id,
        note: "Submitted from quote form.",
      });
    }

    revalidatePath("/crm/quotes");
    revalidatePath(`/crm/quotes/${savedQuote.id}`);
    return { ok: true, data: { id: savedQuote.id } };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to save quote" };
  }
}


export async function logWorkTimeAction(data: {
  leadId?: string;
  accountId?: string;
  invoiceId?: string;
  activityType: string;
  durationHours: number;
  description?: string;
  loggedAt?: string;
}): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    const { leadId, accountId, invoiceId, activityType, durationHours, description, loggedAt } = data;

    if (!activityType) return { ok: false, error: "Activity type is required" };
    if (!durationHours || durationHours <= 0) return { ok: false, error: "Duration must be greater than 0" };

    const logDate = loggedAt ? new Date(loggedAt) : new Date();

    const newLog = await db.crmWorkTimeLog.create({
      data: {
        orgId,
        userId: session.user.id,
        leadId: leadId || null,
        accountId: accountId || null,
        invoiceId: invoiceId || null,
        activityType,
        durationHours: parseFloat(durationHours as any),
        description: description || null,
        loggedAt: logDate,
      },
    });

    let relatedToType = "LEAD";
    let relatedToId = leadId;
    if (accountId) {
      relatedToType = "ACCOUNT";
      relatedToId = accountId;
    } else if (invoiceId) {
      relatedToType = "QUOTE";
      relatedToId = invoiceId;
    }

    if (relatedToId) {
      await crmService.addTimelineEvent(orgId, {
        relatedToType,
        relatedToId,
        eventType: "TIME_LOGGED",
        description: `Logged ${durationHours} hours for ${activityType.toLowerCase().replace("_", " ")}`,
        createdById: session.user.id,
      });
    }

    if (leadId) revalidatePath(`/crm/leads/${leadId}`);
    if (accountId) revalidatePath(`/crm/customers/${accountId}`);
    if (invoiceId) revalidatePath(`/crm/quotes/${invoiceId}`);
    revalidatePath("/crm/efficiency");

    return { ok: true, data: newLog };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to log work time" };
  }
}

export async function deleteWorkTimeAction(logId: string): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    const log = await db.crmWorkTimeLog.findFirst({
      where: { id: logId, orgId }
    });
    if (!log) return { ok: false, error: "Time log not found" };

    await db.crmWorkTimeLog.delete({
      where: { id: logId }
    });

    if (log.leadId) revalidatePath(`/crm/leads/${log.leadId}`);
    if (log.accountId) revalidatePath(`/crm/customers/${log.accountId}`);
    if (log.invoiceId) revalidatePath(`/crm/quotes/${log.invoiceId}`);
    revalidatePath("/crm/efficiency");

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to delete time log" };
  }
}

/* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports */

export async function assignLeadOwnerAction(leadId: string, ownerId: string): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "crm.lead.create");

    const lead = await db.crmLead.findFirst({
      where: { id: leadId, orgId },
    });
    if (!lead) return { ok: false, error: "Lead not found" };

    const updatedLead = await db.crmLead.update({
      where: { id: leadId },
      data: { ownerId },
    });

    // Also update any pending task ownership
    await db.crmActivity.updateMany({
      where: { relatedToType: "LEAD", relatedToId: leadId, status: "NOT_STARTED" },
      data: { ownerId },
    });

    await crmService.addTimelineEvent(orgId, {
      relatedToType: "LEAD",
      relatedToId: leadId,
      eventType: "LEAD_OWNER_ASSIGNED",
      description: `Lead owner assigned/transferred to user ${ownerId}`,
      createdById: session.user.id,
    });

    revalidatePath(`/crm/enquiries/${leadId}`);
    revalidatePath(`/crm/leads/${leadId}`);
    return { ok: true, data: updatedLead };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to assign lead owner" };
  }
}

export async function updatePerishableDetailsAction(
  leadId: string,
  isPerishable: boolean,
  details: any
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "crm.lead.create");

    const lead = await db.crmLead.update({
      where: { id: leadId },
      data: {
        isPerishable,
        perishableDetails: details,
      },
    });

    await crmService.addTimelineEvent(orgId, {
      relatedToType: "LEAD",
      relatedToId: leadId,
      eventType: "PERISHABLE_DETAILS_UPDATED",
      description: `Perishable cargo details updated. Active: ${isPerishable}`,
      createdById: session.user.id,
    });

    revalidatePath(`/crm/enquiries/${leadId}`);
    revalidatePath(`/crm/leads/${leadId}`);
    return { ok: true, data: lead };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to update perishable details" };
  }
}

export async function simulateInboundEmailAction(
  subject: string,
  body: string,
  fromEmail: string
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    // Find reference number in subject or body using regex
    // Format: ADR-ENQ-XXXXX
    const refRegex = /ADR-ENQ-[A-Z0-9]{5}/i;
    const matchSubject = subject.match(refRegex);
    const matchBody = body.match(refRegex);
    
    const matchedRef = (matchSubject ? matchSubject[0] : (matchBody ? matchBody[0] : null))?.toUpperCase();
    if (!matchedRef) {
      return { ok: false, error: "No original reference number (ADR-ENQ-XXXXX) found in subject or email content" };
    }

    const lead = await db.crmLead.findFirst({
      where: { orgId, enquiryRef: matchedRef },
    });
    if (!lead) {
      return { ok: false, error: `No active enquiry found with reference number ${matchedRef}` };
    }

    // Add email reply to history (as a note)
    const emailReplyText = `[Inbound Email Reply from ${fromEmail}]\nSubject: ${subject}\n\n${body}`;
    await crmService.addNote(orgId, {
      relatedToType: "LEAD",
      relatedToId: lead.id,
      body: emailReplyText,
      createdById: session.user.id,
    });

    // Parse rates from the email body
    const parsedRates = parseRatesFromEmail(body);
    
    // Save rates to Lead's enquiryDetails
    const currentEnquiry = (lead.enquiryDetails as any) || {};
    const updatedRates = {
      ...(currentEnquiry.rates || {}),
      ...parsedRates,
    };
    
    const updatedEnquiry = {
      ...currentEnquiry,
      rates: updatedRates,
    };

    const updatedLead = await db.crmLead.update({
      where: { id: lead.id },
      data: {
        enquiryDetails: updatedEnquiry,
      },
    });

    await crmService.addTimelineEvent(orgId, {
      relatedToType: "LEAD",
      relatedToId: lead.id,
      eventType: "RATES_AUTO_PARSED",
      description: `Rates automatically parsed from inbound email`,
      createdById: session.user.id,
    });

    revalidatePath(`/crm/enquiries/${lead.id}`);
    revalidatePath(`/crm/leads/${lead.id}`);
    
    return { ok: true, data: { leadId: lead.id, parsedRates } };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to process simulated inbound email" };
  }
}

// Rate parser helper
function parseRatesFromEmail(bodyText: string) {
  const rates: any = {};
  
  // Regex to match a keyword followed by optional symbols, spaces, colon, currency sign, and a number
  const findRate = (keywords: string[]) => {
    for (const kw of keywords) {
      const regex = new RegExp(`${kw}\\s*(?:charges|freight)?\\s*(?:[:=-]|\\bis\\b)\\s*(?:rs\\.?|inr|usd|\\$)?\\s*([\\d,]+(?:\\.\\d+)?)`, "i");
      const match = bodyText.match(regex);
      if (match) {
        return parseFloat(match[1].replace(/,/g, ""));
      }
    }
    return null;
  };

  // Sea rates
  const oceanFreight = findRate(["ocean freight", "ocean", "freight"]);
  if (oceanFreight !== null) rates.oceanFreight = oceanFreight;
  
  const cfsCharges = findRate(["cfs charges", "cfs"]);
  if (cfsCharges !== null) rates.cfsCharges = cfsCharges;
  
  const customsClearance = findRate(["customs clearance", "customs", "clearance"]);
  if (customsClearance !== null) rates.customsClearance = customsClearance;
  
  const blCharges = findRate(["bl charges", "bl", "b/l"]);
  if (blCharges !== null) rates.blCharges = blCharges;
  
  const vgmCharges = findRate(["vgm charges", "vgm"]);
  if (vgmCharges !== null) rates.vgmCharges = vgmCharges;
  
  const lclCharges = findRate(["lcl charges", "lcl"]);
  if (lclCharges !== null) rates.lclCharges = lclCharges;
  
  const doCharges = findRate(["do charges", "do", "delivery order"]);
  if (doCharges !== null) rates.doCharges = doCharges;
  
  const cfsCustoms = findRate(["cfs customs", "cfs-customs"]);
  if (cfsCustoms !== null) rates.cfsCustoms = cfsCustoms;

  // Air rates
  const airFreight = findRate(["air freight", "air"]);
  if (airFreight !== null) rates.airFreight = airFreight;

  const handlingCharges = findRate(["handling charges", "handling"]);
  if (handlingCharges !== null) rates.handlingCharges = handlingCharges;

  const awbCharges = findRate(["awb charges", "awb"]);
  if (awbCharges !== null) rates.awbCharges = awbCharges;

  const deliveryCharges = findRate(["delivery charges", "delivery"]);
  if (deliveryCharges !== null) rates.deliveryCharges = deliveryCharges;

  return rates;
}

export async function getCallAttemptsAction(leadId: string): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    const calls = await db.crmCallAttempt.findMany({
      where: {
        orgId,
        leadId,
      },
      include: {
        salesperson: { select: { id: true, name: true, email: true } },
        recordings: {
          include: {
            transcript: true,
            reviews: {
              include: {
                reviewer: { select: { id: true, name: true } },
              },
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
      orderBy: { callStartedAt: "desc" },
    });

    return { ok: true, data: calls };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to fetch calls" };
  }
}

export async function fetchGstDetailsAction(gstin: string): Promise<ActionResponse> {
  try {
    const data = await fetchGstPortalDetails(gstin);
    return { ok: true, data };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to fetch GST details" };
  }
}

export async function lookupIndianPincodeAction(
  pincode: string,
): Promise<ActionResponse> {
  try {
    const normalized = pincode.replace(/\D/g, "");
    if (!/^\d{6}$/.test(normalized)) {
      return { ok: false, error: "Enter a valid 6-digit PIN code." };
    }

    const response = await fetch(
      `https://api.postalpincode.in/pincode/${normalized}`,
      {
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`PIN lookup failed with HTTP ${response.status}`);
    }

    const payload = (await response.json()) as Array<{
      Status?: string;
      Message?: string;
      PostOffice?: Array<{
        District?: string;
        State?: string;
        Block?: string;
        Name?: string;
      }> | null;
    }>;

    const first = payload?.[0];
    const postOffice = first?.PostOffice?.[0];
    const city = postOffice?.District?.trim() || postOffice?.Block?.trim() || "";
    const state = postOffice?.State?.trim() || "";

    if (first?.Status !== "Success" || !city || !state) {
      return {
        ok: false,
        error: first?.Message || "No city/state mapping found for this PIN code.",
      };
    }

    return {
      ok: true,
      data: {
        pincode: normalized,
        city,
        state,
        postOffice: postOffice?.Name?.trim() || null,
      },
    };
  } catch (err: any) {
    return {
      ok: false,
      error: err.message || "Failed to look up PIN code details",
    };
  }
}

