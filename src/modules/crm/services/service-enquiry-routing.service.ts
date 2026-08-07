import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { timeBlock } from "@/lib/performance";

type LegacyServiceScope =
  | "BOTH_FREIGHT_AND_CLEARANCE"
  | "ONLY_FREIGHT"
  | "ONLY_CLEARANCE";

type RouteQualifiedEnquiryInput = {
  actorUserId: string;
  orgId: string;
  leadId: string;
  selectedScope: LegacyServiceScope;
  enquirySnapshot: Record<string, unknown>;
  origin: "LEAD_CONVERSION" | "DIRECT_ENQUIRY";
  customerId?: string | null;
  isPerishable?: boolean;
  isFutureFollowUp?: boolean;
  followUpReminderDate?: Date | null;
};

type NormalizedShipmentDetails = {
  movementDirection: "IMP" | "EXP";
  shipmentMode: "SEA" | "AIR";
  freightCode: "SF" | "AF";
  clearanceCode: "SC" | "AC";
};

const SERVICE_SCOPE_MAP: Record<
  LegacyServiceScope,
  Array<"FREIGHT_FORWARDING" | "CUSTOMS_CLEARANCE">
> = {
  BOTH_FREIGHT_AND_CLEARANCE: ["FREIGHT_FORWARDING", "CUSTOMS_CLEARANCE"],
  ONLY_FREIGHT: ["FREIGHT_FORWARDING"],
  ONLY_CLEARANCE: ["CUSTOMS_CLEARANCE"],
};

function buildServiceRoute(
  serviceType: "FREIGHT_FORWARDING" | "CUSTOMS_CLEARANCE",
  serviceEnquiryId: string,
) {
  return serviceType === "FREIGHT_FORWARDING"
    ? `/crm/freight-forwarding/${serviceEnquiryId}`
    : `/crm/customs-clearance/${serviceEnquiryId}`;
}

function formatSequenceDate(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function normalizeSequenceDate(input?: Date | null) {
  const base = input ? new Date(input) : new Date();
  return new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()),
  );
}

function normalizeShipmentDetails(
  snapshot: Record<string, unknown>,
): NormalizedShipmentDetails {
  const modeValue = String(snapshot.type ?? "").trim().toUpperCase();
  const movementValue = String(
    snapshot.seaType ?? snapshot.airType ?? snapshot.direction ?? "",
  )
    .trim()
    .toUpperCase();

  const shipmentMode =
    modeValue === "AIR"
      ? "AIR"
      : modeValue === "SEA"
        ? "SEA"
        : null;
  if (!shipmentMode) {
    throw new Error("Choose a shipment mode before creating the enquiry.");
  }

  const movementDirection =
    movementValue === "IMPORT"
      ? "IMP"
      : movementValue === "EXPORT"
        ? "EXP"
        : null;
  if (!movementDirection) {
    throw new Error("Choose whether the shipment is Import or Export.");
  }

  return {
    movementDirection,
    shipmentMode,
    freightCode: shipmentMode === "SEA" ? "SF" : "AF",
    clearanceCode: shipmentMode === "SEA" ? "SC" : "AC",
  };
}

function buildDepartmentReference(params: {
  movementDirection: "IMP" | "EXP";
  serviceCode: "SF" | "AF" | "SC" | "AC";
  sequenceDate: Date;
  serial: number;
}) {
  return `ASS-${params.movementDirection}-${params.serviceCode}-${formatSequenceDate(params.sequenceDate)}-${String(params.serial).padStart(4, "0")}`;
}

async function allocateSharedSerial(
  tx: Prisma.TransactionClient,
  orgId: string,
  sequenceDate: Date,
) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const existing = await tx.crmEnquirySequence.findUnique({
      where: {
        orgId_sequenceDate: {
          orgId,
          sequenceDate,
        },
      },
    });

    if (!existing) {
      try {
        await tx.crmEnquirySequence.create({
          data: {
            orgId,
            sequenceDate,
            nextSerial: 2,
          },
        });
        return 1;
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
          throw error;
        }
        if (error.code !== "P2002") {
          throw error;
        }
        continue;
      }
    }

    const updated = await tx.crmEnquirySequence.updateMany({
      where: {
        id: existing.id,
        nextSerial: existing.nextSerial,
      },
      data: {
        nextSerial: existing.nextSerial + 1,
      },
    });

    if (updated.count === 1) {
      return existing.nextSerial;
    }
  }

  throw new Error("Unable to allocate a unique enquiry serial for this date.");
}

function getTimelineDescription(
  serviceType: "FREIGHT_FORWARDING" | "CUSTOMS_CLEARANCE",
  status: "created" | "updated",
) {
  const label =
    serviceType === "FREIGHT_FORWARDING"
      ? "Freight forwarding service enquiry"
      : "Customs clearance service enquiry";

  return `${label} ${status} from CRM enquiry routing.`;
}

export async function routeQualifiedEnquiry(input: RouteQualifiedEnquiryInput) {
  const requestedServiceTypes = SERVICE_SCOPE_MAP[input.selectedScope];
  if (!requestedServiceTypes || requestedServiceTypes.length === 0) {
    throw new Error("Choose a valid service scope.");
  }

  const normalizedShipment = normalizeShipmentDetails(input.enquirySnapshot);

  return db.$transaction(
    async (tx) => {
      const lead = await tx.crmLead.findFirst({
        where: { id: input.leadId, orgId: input.orgId },
        select: {
          id: true,
          orgId: true,
          ownerId: true,
          status: true,
          enquiryRef: true,
          enquiryDetails: true,
          isPerishable: true,
          isFutureFollowUp: true,
          source: true,
        },
      });

      if (!lead) {
        throw new Error("Lead not found.");
      }

      if (input.customerId) {
        const customer = await tx.crmAccount.findFirst({
          where: {
            id: input.customerId,
            orgId: input.orgId,
          },
          select: { id: true },
        });
        if (!customer) {
          throw new Error("Selected customer does not belong to this organisation.");
        }
      }

      const existingServiceEnquiries = await tx.crmServiceEnquiry.findMany({
        where: {
          orgId: input.orgId,
          leadId: lead.id,
          serviceType: { in: requestedServiceTypes },
        },
        orderBy: { createdAt: "asc" },
      });

      const reusableDepartmentRefs =
        existingServiceEnquiries.length === requestedServiceTypes.length &&
        existingServiceEnquiries.every(
          (item) =>
            item.departmentRef &&
            item.sharedSequence &&
            item.sequenceDate &&
            item.movementDirection &&
            item.shipmentMode,
        );

      const sequenceDate =
        reusableDepartmentRefs && existingServiceEnquiries[0]?.sequenceDate
          ? existingServiceEnquiries[0].sequenceDate
          : normalizeSequenceDate();
      const sharedSequence =
        reusableDepartmentRefs && existingServiceEnquiries[0]?.sharedSequence
          ? existingServiceEnquiries[0].sharedSequence
          : await allocateSharedSerial(tx, input.orgId, sequenceDate);

      const currentEnquiryDetails =
        lead.enquiryDetails && typeof lead.enquiryDetails === "object"
          ? (lead.enquiryDetails as Record<string, unknown>)
          : {};

      const mergedSnapshot = {
        ...currentEnquiryDetails,
        ...input.enquirySnapshot,
        serviceScope: input.selectedScope,
        normalizedServiceTypes: requestedServiceTypes,
        enquiryOrigin: input.origin,
        leadSource: input.enquirySnapshot.leadSource ?? lead.source ?? null,
        movementDirection: normalizedShipment.movementDirection,
        shipmentMode: normalizedShipment.shipmentMode,
      } satisfies Record<string, unknown>;

      const serviceEnquiries = [];
      const departmentRefs: Record<string, string> = {};

      for (const serviceType of requestedServiceTypes) {
        const existing = existingServiceEnquiries.find(
          (item) => item.serviceType === serviceType,
        );
        const serviceCode =
          serviceType === "FREIGHT_FORWARDING"
            ? normalizedShipment.freightCode
            : normalizedShipment.clearanceCode;
        const departmentRef =
          existing?.departmentRef ||
          buildDepartmentReference({
            movementDirection: normalizedShipment.movementDirection,
            serviceCode,
            sequenceDate,
            serial: sharedSequence,
          });

        departmentRefs[serviceType] = departmentRef;

        const data = {
          enquiryRef: departmentRef,
          departmentRef,
          origin: input.origin,
          status: existing?.assignedToId ? "ASSIGNED" : "ASSIGNMENT_PENDING",
          sourceSnapshot: {
            ...mergedSnapshot,
            departmentRef,
            serviceCode,
          } as Prisma.InputJsonValue,
          updatedById: input.actorUserId,
          assignedToId: existing?.assignedToId ?? null,
          assignedManagerId: existing?.assignedManagerId ?? null,
          customerId: input.customerId ?? existing?.customerId ?? null,
          sequenceDate,
          sharedSequence,
          shipmentMode: normalizedShipment.shipmentMode,
          movementDirection: normalizedShipment.movementDirection,
          serviceCode,
        } as const;

        const serviceEnquiry = existing
          ? await tx.crmServiceEnquiry.update({
              where: { id: existing.id },
              data,
            })
          : await tx.crmServiceEnquiry.create({
              data: {
                orgId: input.orgId,
                leadId: lead.id,
                serviceType,
                createdById: input.actorUserId,
                ...data,
              },
            });

        await tx.crmTimelineEvent.create({
          data: {
            orgId: input.orgId,
            relatedToType: "LEAD",
            relatedToId: lead.id,
            eventType: existing ? "SERVICE_ENQUIRY_UPDATED" : "SERVICE_ENQUIRY_CREATED",
            description: getTimelineDescription(
              serviceType,
              existing ? "updated" : "created",
            ),
            details: {
              serviceEnquiryId: serviceEnquiry.id,
              serviceType,
              departmentRef,
              sharedSequence,
              sequenceDate: formatSequenceDate(sequenceDate),
              status: serviceEnquiry.status,
            } as Prisma.InputJsonValue,
            createdById: input.actorUserId,
          },
        });

        await tx.notification.create({
          data: {
            orgId: input.orgId,
            userId: lead.ownerId,
            kind: "CRM_SERVICE_ENQUIRY_ROUTED",
            title:
              serviceType === "FREIGHT_FORWARDING"
                ? "Freight forwarding enquiry routed"
                : "Customs clearance enquiry routed",
            body: `${departmentRef} is now visible in the ${serviceType === "FREIGHT_FORWARDING" ? "freight forwarding" : "customs clearance"} CRM queue.`,
            link: buildServiceRoute(serviceType, serviceEnquiry.id),
            payload: {
              leadId: lead.id,
              serviceEnquiryId: serviceEnquiry.id,
              departmentRef,
              serviceType,
            } as Prisma.InputJsonValue,
            source: "crm.service-enquiry-routing",
            priority: "normal",
          },
        });

        serviceEnquiries.push(serviceEnquiry);
      }

      const legacyEnquiryRef =
        departmentRefs.FREIGHT_FORWARDING ||
        departmentRefs.CUSTOMS_CLEARANCE ||
        lead.enquiryRef ||
        null;

      await tx.crmLead.update({
        where: { id: lead.id },
        data: {
          status: "INTERESTED",
          enquiryRef: legacyEnquiryRef,
          enquiryDetails: {
            ...mergedSnapshot,
            enquiryRef: legacyEnquiryRef,
            departmentRefs,
            sharedSequence,
            sequenceDate: formatSequenceDate(sequenceDate),
          } as Prisma.InputJsonValue,
          isPerishable: input.isPerishable ?? lead.isPerishable,
          isFutureFollowUp: input.isFutureFollowUp ?? lead.isFutureFollowUp,
          followUpReminderDate: input.followUpReminderDate ?? null,
          updatedById: input.actorUserId,
        },
      });

      return {
        enquiryRef: legacyEnquiryRef,
        leadId: lead.id,
        sharedSequence,
        sequenceDate,
        departmentRefs,
        serviceEnquiries,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function listServiceEnquiries(params: {
  orgId: string;
  serviceType: "FREIGHT_FORWARDING" | "CUSTOMS_CLEARANCE";
  search?: string;
}) {
  const where: Prisma.CrmServiceEnquiryWhereInput = {
    orgId: params.orgId,
    serviceType: params.serviceType,
  };

  if (params.search?.trim()) {
    where.OR = [
      { enquiryRef: { contains: params.search, mode: "insensitive" } },
      { departmentRef: { contains: params.search, mode: "insensitive" } },
      { lead: { company: { contains: params.search, mode: "insensitive" } } },
      { lead: { firstName: { contains: params.search, mode: "insensitive" } } },
      { lead: { lastName: { contains: params.search, mode: "insensitive" } } },
    ];
  }

  return db.crmServiceEnquiry.findMany({
    where,
    orderBy: [{ sequenceDate: "desc" }, { sharedSequence: "desc" }, { updatedAt: "desc" }],
    include: {
      lead: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          company: true,
          email: true,
          mobile: true,
          isPerishable: true,
          isFutureFollowUp: true,
          followUpReminderDate: true,
        },
      },
      assignedTo: { select: { id: true, name: true, email: true } },
      assignedManager: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function getServiceEnquiryDetail(params: {
  orgId: string;
  serviceEnquiryId: string;
  serviceType: "FREIGHT_FORWARDING" | "CUSTOMS_CLEARANCE";
}) {
  return timeBlock("crm:getServiceEnquiryDetail", () =>
    db.crmServiceEnquiry.findFirst({
      where: {
        id: params.serviceEnquiryId,
        orgId: params.orgId,
        serviceType: params.serviceType,
      },
      include: {
        lead: {
          include: {
            owner: { select: { id: true, name: true, email: true } },
          },
        },
        assignedTo: { select: { id: true, name: true, email: true } },
        assignedManager: { select: { id: true, name: true, email: true } },
        customer: { select: { id: true, name: true, email: true, phone: true } },
        quotation: { select: { id: true, quotationNumber: true, status: true } },
        chaJob: { select: { id: true, jobNumber: true, stage: true, status: true } },
      },
    }),
  );
}

