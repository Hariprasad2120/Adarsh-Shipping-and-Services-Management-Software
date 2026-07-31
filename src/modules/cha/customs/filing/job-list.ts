import "server-only";

import { db } from "@/lib/db";
import { listJobs, type ChaJobListFilters } from "@/modules/cha/jobs/queries";

import type { ChaCustomsWorkspaceDirection } from "./workspace";

export type CustomsJobListRow = {
  id: string;
  jobNumber: string;
  jobDate: Date;
  customerName: string;
  jobTypeName: string;
  status: string;
  priority: string;
  branchName: string;
  referenceNo: string | null;
  referenceDate: Date | null;
  filingType: string | null;
  mode: string | null;
  customsHouse: string | null;
  customsCode: string | null;
  primaryPartyName: string | null;
  branchSerialNo: string | null;
  consigneeOrSupplier: string | null;
  consigneeOrSupplierCountry: string | null;
  buyerOrOriginCountry: string | null;
  portPrimary: string | null;
  portSecondary: string | null;
  invoiceNo: string | null;
  scheme: string | null;
  totalInvoices: number;
  totalItems: number;
  profileId: string | null;
};

export async function listCustomsJobViewRows(params: {
  actorId: string;
  orgId: string;
  direction: ChaCustomsWorkspaceDirection;
  filters: Omit<ChaJobListFilters, "movementDirection" | "jobGroup"> & {
    jobGroup?: "ACTIVE" | "COMPLETED";
  };
}) {
  const jobs = await listJobs(params.actorId, params.orgId, {
    ...params.filters,
    movementDirection: params.direction,
  });
  const jobIds = jobs.items.map((job) => job.id);

  const profiles = jobIds.length
    ? await db.chaCustomsFilingProfile.findMany({
        where: { jobId: { in: jobIds }, job: { orgId: params.orgId, deletedAt: null } },
        select: {
          id: true,
          jobId: true,
          movementDirection: true,
          transportMode: true,
          customsHouse: true,
          customsHouseCode: true,
          filingType: true,
          importHeader: {
            select: {
              beNumber: true,
              beDate: true,
              filingType: true,
              importerNameSnapshot: true,
              importerBranchSerialNo: true,
              countryOfOrigin: true,
              countryOfShipment: true,
              portOfShipment: true,
              portOfOrigin: true,
            },
          },
          importIgm: {
            select: {
              igmNo: true,
              igmDate: true,
              gatewayMode: true,
              gatewayPort: true,
            },
          },
          importInvoices: {
            orderBy: { sequenceNo: "asc" },
            take: 1,
            select: { invoiceNo: true },
          },
          importItems: {
            orderBy: { sequenceNo: "asc" },
            take: 1,
            select: { schemeCode: true },
          },
          exportHeader: {
            select: {
              sbNumber: true,
              sbDate: true,
              sbType: true,
              exporterNameSnapshot: true,
              exporterBranchSerialNo: true,
              consigneeNameSnapshot: true,
              consigneeCountrySnapshot: true,
              buyerNameSnapshot: true,
              buyerCountrySnapshot: true,
              portOfDischarge: true,
              portOfDestination: true,
            },
          },
          exportInvoices: {
            orderBy: { sequenceNo: "asc" },
            take: 1,
            select: { invoiceNo: true },
          },
          exportItems: {
            orderBy: { sequenceNo: "asc" },
            take: 1,
            select: { schemeCode: true },
          },
          _count: {
            select: {
              importInvoices: true,
              importItems: true,
              exportInvoices: true,
              exportItems: true,
            },
          },
        },
      })
    : [];

  const profileByJobId = new Map(profiles.map((profile) => [profile.jobId, profile]));

  return {
    ...jobs,
    items: jobs.items.map<CustomsJobListRow>((job) => {
      const profile = profileByJobId.get(job.id);
      if (params.direction === "EXPORT") {
        const header = profile?.exportHeader;
        return {
          id: job.id,
          jobNumber: job.jobNumber,
          jobDate: job.createdAt,
          customerName: job.customer.name,
          jobTypeName: job.jobType.name,
          status: job.status,
          priority: job.priority,
          branchName: job.branch.name,
          referenceNo: header?.sbNumber ?? job.filing?.shippingBillNumber ?? null,
          referenceDate: header?.sbDate ?? null,
          filingType: header?.sbType ?? profile?.filingType ?? null,
          mode: profile?.transportMode ?? null,
          customsHouse: profile?.customsHouse ?? null,
          customsCode: profile?.customsHouseCode ?? null,
          primaryPartyName: header?.exporterNameSnapshot ?? job.customer.name,
          branchSerialNo: header?.exporterBranchSerialNo ?? null,
          consigneeOrSupplier: header?.consigneeNameSnapshot ?? null,
          consigneeOrSupplierCountry: header?.consigneeCountrySnapshot ?? null,
          buyerOrOriginCountry: header?.buyerCountrySnapshot ?? null,
          portPrimary: header?.portOfDischarge ?? null,
          portSecondary: header?.portOfDestination ?? null,
          invoiceNo: profile?.exportInvoices[0]?.invoiceNo ?? null,
          scheme: profile?.exportItems[0]?.schemeCode ?? null,
          totalInvoices: profile?._count.exportInvoices ?? 0,
          totalItems: profile?._count.exportItems ?? 0,
          profileId: profile?.id ?? null,
        };
      }

      const header = profile?.importHeader;
      return {
        id: job.id,
        jobNumber: job.jobNumber,
        jobDate: job.createdAt,
        customerName: job.customer.name,
        jobTypeName: job.jobType.name,
        status: job.status,
        priority: job.priority,
        branchName: job.branch.name,
        referenceNo: header?.beNumber ?? job.filing?.billOfEntryNumber ?? profile?.importIgm?.igmNo ?? null,
        referenceDate: header?.beDate ?? profile?.importIgm?.igmDate ?? null,
        filingType: header?.filingType ?? profile?.filingType ?? null,
        mode: profile?.transportMode ?? profile?.importIgm?.gatewayMode ?? null,
        customsHouse: profile?.customsHouse ?? null,
        customsCode: profile?.customsHouseCode ?? null,
        primaryPartyName: header?.importerNameSnapshot ?? job.customer.name,
        branchSerialNo: header?.importerBranchSerialNo ?? null,
        consigneeOrSupplier: null,
        consigneeOrSupplierCountry: header?.countryOfShipment ?? null,
        buyerOrOriginCountry: header?.countryOfOrigin ?? null,
        portPrimary: header?.portOfShipment ?? profile?.importIgm?.gatewayPort ?? null,
        portSecondary: header?.portOfOrigin ?? null,
        invoiceNo: profile?.importInvoices[0]?.invoiceNo ?? null,
        scheme: profile?.importItems[0]?.schemeCode ?? null,
        totalInvoices: profile?._count.importInvoices ?? 0,
        totalItems: profile?._count.importItems ?? 0,
        profileId: profile?.id ?? null,
      };
    }),
  };
}
