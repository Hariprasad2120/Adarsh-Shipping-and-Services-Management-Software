import { db } from "@/lib/db";
import { addTimelineEvent } from "./service";

export function normalizeMobileNumber(mobile: string): string {
  // Remove all non-numeric characters
  const cleaned = mobile.replace(/\D/g, "");
  // If it starts with 91 and has 12 digits, take last 10 digits
  if (cleaned.length === 12 && cleaned.startsWith("91")) {
    return cleaned.slice(2);
  }
  if (cleaned.length > 10) {
    return cleaned.slice(-10);
  }
  return cleaned;
}

export function generateLeadKey(mobile: string, name: string, category: string, dateStr?: string): string {
  const normMobile = normalizeMobileNumber(mobile);
  const normName = name.trim().toLowerCase();
  const normCategory = (category || "").trim().toLowerCase();
  
  let datePart = "";
  if (dateStr) {
    try {
      datePart = "_" + new Date(dateStr).toISOString().split("T")[0]; // group by day
    } catch {
      datePart = "_" + dateStr.trim().toLowerCase().replace(/\s+/g, "");
    }
  }
  
  return `${normMobile}_${normName}_${normCategory}${datePart}`;
}

async function getNextSalesPersonId(orgId: string, fallbackId: string): Promise<string> {
  try {
    const salesUsers = await db.user.findMany({
      where: {
        orgId,
        active: true,
        OR: [
          { name: { contains: "Poornima", mode: "insensitive" } },
          { name: { contains: "Bhuvaneshwari", mode: "insensitive" } },
          { email: { in: ["poornima.v@adarshshipping.in", "poornivenki1909@gmail.com", "bhubhuvi529@gmail.com", "bhuvaneshwari.s@adarshshipping.in"] } }
        ]
      }
    });

    if (salesUsers.length === 0) {
      return fallbackId;
    }
    if (salesUsers.length === 1) {
      return salesUsers[0].id;
    }

    // Count leads created from Justdial assigned to each of these users
    const userIds = salesUsers.map(u => u.id);
    const leadCounts = await Promise.all(
      userIds.map(async (userId) => {
        const count = await db.crmLead.count({
          where: {
            orgId,
            ownerId: userId,
            source: "Justdial"
          }
        });
        return { userId, count };
      })
    );

    // Sort by count ascending
    leadCounts.sort((a, b) => a.count - b.count);
    return leadCounts[0].userId;
  } catch (e) {
    console.error("[RoundRobin Assignment] Failed to resolve sales person:", e);
    return fallbackId;
  }
}

export async function processJustdialLead(
  orgId: string,
  sysUserId: string,
  rawLead: {
    customerName: string;
    mobileNumber: string;
    city?: string;
    category?: string;
    queryText?: string;
    enquirySource?: string;
    enquiryStatus?: string;
    enquiryDateTime?: string;
    jdLeadStatus?: string;
    isHot?: boolean;
    rawPayload: any;
  },
  config: {
    duplicateHandling: string;
    defaultOwnerId: string;
    defaultStage: string;
  }
): Promise<{ ok: boolean; status: "NEW_LEAD" | "DUPLICATE_UPDATED" | "DUPLICATE_SKIPPED" | "FAILED"; leadId?: string; error?: string }> {
  try {
    const mobile = rawLead.mobileNumber;
    if (!mobile || mobile.trim() === "") {
      return { ok: false, status: "FAILED", error: "Missing mobile number" };
    }

    const leadKey = generateLeadKey(mobile, rawLead.customerName, rawLead.category || "", rawLead.enquiryDateTime);

    // Check if snapshot with this key already exists
    const existingSnapshot = await db.crmExternalLeadSnapshot.findFirst({
      where: { orgId, externalLeadKey: leadKey },
      include: { crmLead: true }
    });

    if (existingSnapshot) {
      if (config.duplicateHandling === "SKIP") {
        await db.crmExternalLeadSnapshot.update({
          where: { id: existingSnapshot.id },
          data: {
            lastSeenAt: new Date(),
            jdLeadStatus: rawLead.jdLeadStatus || existingSnapshot.jdLeadStatus
          }
        });
        return { ok: true, status: "DUPLICATE_SKIPPED", leadId: existingSnapshot.crmLeadId || undefined };
      } else {
        // UPDATE_EXISTING
        await db.crmExternalLeadSnapshot.update({
          where: { id: existingSnapshot.id },
          data: {
            lastSeenAt: new Date(),
            jdLeadStatus: rawLead.jdLeadStatus || existingSnapshot.jdLeadStatus,
            duplicateStatus: "DUPLICATE_UPDATED",
            rawPayload: rawLead.rawPayload,
            queryText: rawLead.queryText || existingSnapshot.queryText,
            enquiryStatus: rawLead.enquiryStatus || existingSnapshot.enquiryStatus,
            enquirySource: rawLead.enquirySource || existingSnapshot.enquirySource,
            category: rawLead.category || existingSnapshot.category,
          }
        });

        // Also update the linked CRM lead status/stage if applicable
        if (existingSnapshot.crmLeadId) {
          await db.crmLead.update({
            where: { id: existingSnapshot.crmLeadId },
            data: {
              rating: rawLead.isHot ? "Hot" : undefined,
              updatedById: sysUserId
            }
          });
          
          await addTimelineEvent(orgId, {
            relatedToType: "LEAD",
            relatedToId: existingSnapshot.crmLeadId,
            eventType: "LEAD_UPDATED",
            description: `Lead checked in again from Justdial. Status: ${rawLead.jdLeadStatus || "Updated"}`,
            createdById: sysUserId
          });
        }

        return { ok: true, status: "DUPLICATE_UPDATED", leadId: existingSnapshot.crmLeadId || undefined };
      }
    }

    // Process name split
    const parts = rawLead.customerName.trim().split(/\s+/);
    const firstName = parts.length > 1 ? parts[0] : null;
    const lastName = parts.length > 1 ? parts.slice(1).join(" ") : rawLead.customerName;

    // Determine the owner dynamically
    const ownerId = await getNextSalesPersonId(orgId, config.defaultOwnerId);

    // Build the CRM Lead fields
    const leadData = {
      firstName,
      lastName,
      company: rawLead.category ? `Justdial - ${rawLead.category}` : `Justdial Lead - ${rawLead.customerName}`,
      mobile: normalizeMobileNumber(mobile),
      phone: mobile,
      city: rawLead.city || null,
      address: rawLead.city ? `${rawLead.city}, India` : null,
      country: "India",
      source: "Justdial",
      status: config.defaultStage || "NEW",
      rating: rawLead.isHot ? "Hot" : "Warm",
      description: `Justdial Query: ${rawLead.queryText || rawLead.category || "Not provided"}\nEnquiry Source: ${rawLead.enquirySource || "Unknown"}\nDate/Time: ${rawLead.enquiryDateTime || "N/A"}\nOriginal Status: ${rawLead.enquiryStatus || "N/A"}`,
      tags: ["Justdial", rawLead.isHot ? "Hot Enquiry" : null].filter(Boolean) as string[],
      ownerId: ownerId,
    };

    // Create the CrmLead
    const newLead = await db.crmLead.create({
      data: {
        orgId,
        createdById: sysUserId,
        updatedById: sysUserId,
        ...leadData
      }
    });

    let enquiryDateObj: Date | null = null;
    if (rawLead.enquiryDateTime) {
      try {
        enquiryDateObj = new Date(rawLead.enquiryDateTime);
      } catch {
        enquiryDateObj = null;
      }
    }

    // Create the Snapshot
    await db.crmExternalLeadSnapshot.create({
      data: {
        orgId,
        source: "JUSTDIAL",
        externalLeadKey: leadKey,
        customerName: rawLead.customerName,
        mobileNumber: mobile,
        city: rawLead.city || null,
        category: rawLead.category || null,
        queryText: rawLead.queryText || null,
        enquirySource: rawLead.enquirySource || null,
        enquiryStatus: rawLead.enquiryStatus || null,
        enquiryDateTime: enquiryDateObj,
        jdLeadStatus: rawLead.jdLeadStatus || null,
        rawPayload: rawLead.rawPayload,
        duplicateStatus: "NEW_LEAD",
        crmLeadId: newLead.id,
        assignedToUserId: ownerId
      }
    });

    // Write timeline event
    await addTimelineEvent(orgId, {
      relatedToType: "LEAD",
      relatedToId: newLead.id,
      eventType: "LEAD_CREATED",
      description: "Lead automatically captured and imported from Justdial",
      createdById: sysUserId
    });

    return { ok: true, status: "NEW_LEAD", leadId: newLead.id };
  } catch (err: any) {
    return { ok: false, status: "FAILED", error: err.message || "Failed to process Justdial lead" };
  }
}
