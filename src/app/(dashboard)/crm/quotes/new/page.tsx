import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { NewQuotePage } from "@/modules/crm/components/quotes/NewQuotePage";
import type { QuoteFormValues } from "@/modules/crm/components/quotes/lib/types";
import { getQuoteEnquiryNumber } from "@/modules/crm/service-enquiry-reference";
import {
  buildQuoteLineItemsFromWorkflow,
  getBaseQuoteNumber,
  getRateWorkflowSnapshot,
  type CrmQuoteWorkflowMode,
} from "@/modules/crm/rate-workflow";
import type { QuoteWorkflowContext } from "@/modules/crm/components/quotes/lib/types";

interface SearchParams {
  leadId?: string;
  mode?: CrmQuoteWorkflowMode;
  department?: "FREIGHT_FORWARDING" | "CUSTOMS_CLEARANCE";
}

type QuoteSeedLineItem = {
  id: string;
  description: string;
  hsnSac: string;
  unit: string;
  quantity: number;
  rate: number;
  tax: string;
  tds: string;
  amount: number;
};

export default async function NewCrmQuotePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");
  const orgId = session.user.orgId;
  if (!orgId) redirect("/login");

  const awaitedParams = await searchParams;
  const leadId = awaitedParams.leadId;
  const mode = awaitedParams.mode || "combined";

  const [dbUsers, dbAccounts] = await Promise.all([
    db.user.findMany({
      where: { orgId, active: true },
      select: { id: true, name: true, email: true },
    }),
    db.crmAccount.findMany({
      where: { orgId },
      select: { id: true, name: true, email: true, phone: true, billingAddress: true, gstin: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const salespersons = dbUsers.map((u) => ({
    id: u.id,
    label: u.name || u.email,
  }));

  const accounts = dbAccounts.map((a) => ({
    id: a.id,
    label: a.name,
    description: a.email ?? undefined,
    billingAddress: a.billingAddress ?? undefined,
    contactEmail: a.email ?? undefined,
    phone: a.phone ?? undefined,
    gstin: a.gstin ?? undefined,
  }));

  let initialData: QuoteFormValues | undefined = undefined;
  let workflowContext: QuoteWorkflowContext | undefined = undefined;

  if (leadId) {
    const lead = await db.crmLead.findFirst({
      where: { id: leadId, orgId },
      select: {
        id: true,
        ownerId: true,
        company: true,
        email: true,
        phone: true,
        address: true,
        convertedAccountId: true,
        enquiryRef: true,
        enquiryDetails: true,
        serviceEnquiries: {
          select: {
            serviceType: true,
            enquiryRef: true,
            departmentRef: true,
          },
        },
      },
    });

    if (lead) {
      // 1. Resolve or Create the customer account
      let customerId = lead.convertedAccountId || "";
      if (!customerId && lead.company) {
        const existingAccount = await db.crmAccount.findFirst({
          where: { orgId, name: { equals: lead.company, mode: "insensitive" } }
        });
        if (existingAccount) {
          customerId = existingAccount.id;
        } else {
          // Create the Account automatically
          const newAcc = await db.crmAccount.create({
            data: {
              orgId,
              ownerId: lead.ownerId || session.user.id,
              name: lead.company,
              email: lead.email,
              phone: lead.phone,
              billingAddress: lead.address || "",
              createdById: session.user.id,
              updatedById: session.user.id
            }
          });
          customerId = newAcc.id;

          // Link the lead
          await db.crmLead.update({
            where: { id: leadId },
            data: { convertedAccountId: customerId }
          });

          // Add to local accounts list so RHF dropdown finds it
          accounts.push({
            id: newAcc.id,
            label: newAcc.name,
            description: newAcc.email ?? undefined,
            billingAddress: newAcc.billingAddress ?? undefined,
            contactEmail: newAcc.email ?? undefined,
            phone: newAcc.phone ?? undefined,
            gstin: undefined,
          });
        }
      }

      // 2. Parse enquiry & rates details
      const enquiry =
        lead.enquiryDetails && typeof lead.enquiryDetails === "object"
          ? (lead.enquiryDetails as Record<string, unknown>)
          : {};
      const portOfLoading = typeof enquiry.pol === "string" ? enquiry.pol : typeof enquiry.aol === "string" ? enquiry.aol : "";
      const portOfDischarge = typeof enquiry.pod === "string" ? enquiry.pod : typeof enquiry.aod === "string" ? enquiry.aod : "";
      const incoterm = typeof enquiry.incoterm === "string" ? enquiry.incoterm : "";
      const containerType = typeof enquiry.containerType === "string" ? enquiry.containerType : "20FT";
      const containerCount =
        typeof enquiry.containerCount === "string" || typeof enquiry.containerCount === "number"
          ? Number.parseInt(String(enquiry.containerCount), 10) || 1
          : 1;
      const commodity = typeof enquiry.commodity === "string" ? enquiry.commodity : "";
      const weight = typeof enquiry.weight === "string" ? enquiry.weight : "";
      const rateBuild = buildQuoteLineItemsFromWorkflow({
        enquiryDetails: enquiry,
        mode,
      });
      const workflow = getRateWorkflowSnapshot(enquiry);
      const isSea = enquiry.type === "Sea";
      const isLcl = isSea && enquiry.seaLclFcl === "LCL";
      
      const stableQuoteSeed = (lead.enquiryRef || lead.id).replace(/[^A-Za-z0-9]/g, "").slice(-10);
      const lineItems: QuoteSeedLineItem[] = rateBuild.items.map((item, index) => ({
        id: `line_${stableQuoteSeed}_${index + 1}`,
        ...item,
      }));

      // If no rates mapped, add one empty line item as default values expect it
      if (lineItems.length === 0) {
        lineItems.push({
          id: `line_${stableQuoteSeed}_1`,
          description: "Sea Freight Charges",
          hsnSac: "996719",
          unit: "Container",
          quantity: 1,
          rate: 0,
          tax: "GST 18%",
          tds: "None",
          amount: 0
        });
      }

      // Calculate totals
      const subtotalVal = lineItems.reduce((sum, item) => sum + item.amount, 0);
      const enquiryNumber = getQuoteEnquiryNumber(lead);
      const baseQuoteNumber =
        workflow.quoteBaseNumber || `QT-${stableQuoteSeed || "20260001"}`;
      const today = new Date();
      const expiry = new Date(today);
      expiry.setDate(expiry.getDate() + 30);

      workflowContext = {
        mode,
        includedDepartments: rateBuild.includedDepartments,
        pendingDepartments: rateBuild.pendingDepartments,
        latestQuoteId: workflow.latestQuoteId,
        latestQuoteVersion: workflow.latestQuoteVersion,
        quoteBaseNumber: baseQuoteNumber,
        recreateRequired: mode === "newly-added-only",
      };

      initialData = {
        customerId,
        location: "Chennai",
        placeOfSupply: "33",
        quoteNumber: getBaseQuoteNumber(baseQuoteNumber),
        referenceNumber: enquiryNumber,
        quoteDate: today.toISOString().slice(0, 10),
        expiryDate: expiry.toISOString().slice(0, 10),
        salesperson: lead.ownerId || session.user.id,
        projectId: "",
        portOfLoading,
        portOfLoadingCountry: "India", // Default, editable
        portOfDischarge,
        portOfDestinationCountry: "", // Default, editable
        incoterm,
        containerType: isSea ? (isLcl ? "LCL" : containerType) : "Air Cargo",
        numberOfContainers: isSea ? containerCount : 1,
        commodity,
        weight,
        lineItems,
        customerNotes: `Pre-populated from Enquiry ${enquiryNumber || "N/A"} using ${mode.replace(/-/g, " ")} rates.`,
        terms: "Standard payment terms apply.",
        bankDetailsId: "",
        discountType: "percentage",
        discountValue: 0,
        adjustment: 0,
        roundOff: 0,
        subtotal: subtotalVal,
        total: subtotalVal
      };
    }
  }

  return (
    <NewQuotePage
      salespersons={salespersons}
      accounts={accounts}
      initialData={initialData}
      linkedLeadId={leadId}
      workflowContext={workflowContext}
    />
  );
}
