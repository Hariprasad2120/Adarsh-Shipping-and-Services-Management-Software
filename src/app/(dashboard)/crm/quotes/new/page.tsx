import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NewQuotePage } from "../_components/NewQuotePage";

interface SearchParams {
  leadId?: string;
}

export default async function NewCrmQuotePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const orgId = session.user.orgId;
  if (!orgId) redirect("/login");

  const awaitedParams = await searchParams;
  const leadId = awaitedParams.leadId;

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

  let initialData: any = undefined;

  if (leadId) {
    const lead = await db.crmLead.findFirst({
      where: { id: leadId, orgId },
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
      const enquiry = (lead.enquiryDetails as any) || {};
      const rates = enquiry.rates || {};
      const isSea = enquiry.type === "Sea";
      const isLcl = isSea && enquiry.seaLclFcl === "LCL";
      
      const quantityVal = isSea
        ? (isLcl ? (parseFloat(enquiry.cbm) || 1) : (parseInt(enquiry.containerCount) || 1))
        : (parseFloat(enquiry.weight) || 1);

      const unitVal = isSea
        ? (isLcl ? "CBM" : "Container")
        : "KG";

      const lineItems: any[] = [];
      const addLineItem = (desc: string, rateVal: number, hsn: string, u: string, q: number) => {
        if (!rateVal) return;
        lineItems.push({
          id: `line_${Math.random().toString(36).slice(2, 10)}`,
          description: desc,
          hsnSac: hsn,
          unit: u,
          quantity: q,
          rate: rateVal,
          tax: "GST 18%",
          tds: "None",
          amount: q * rateVal
        });
      };

      if (isSea) {
        addLineItem("Ocean Freight Charges", rates.oceanFreight, "996719", unitVal, quantityVal);
        addLineItem("CFS Handling Charges", rates.cfsCharges, "996712", "Shipment", 1);
        addLineItem("CHA Custom Clearance Charges", rates.customsClearance, "996712", "Shipment", 1);
        addLineItem("Documentation & BL Fees", rates.blCharges, "996712", "Shipment", 1);
        addLineItem("VGM Verification Fee", rates.vgmCharges, "996712", "Shipment", 1);
        addLineItem("LCL De-stuffing & Handling", rates.lclCharges, "996712", "Shipment", 1);
        addLineItem("Delivery Order Issuance Charges", rates.doCharges, "996712", "Shipment", 1);
        addLineItem("CFS Customs Examination Fee", rates.cfsCustoms, "996712", "Shipment", 1);
      } else {
        addLineItem("Air Freight Charges", rates.airFreight, "996719", "KG", quantityVal);
        addLineItem("Airport Terminal Handling", rates.handlingCharges, "996712", "Shipment", 1);
        addLineItem("CHA Airport Custom Clearance", rates.customsClearance, "996712", "Shipment", 1);
        addLineItem("AWB Issuance Documentation Fee", rates.awbCharges, "996712", "Shipment", 1);
        addLineItem("Local Delivery Charges", rates.deliveryCharges, "996712", "Shipment", 1);
      }

      // If no rates mapped, add one empty line item as default values expect it
      if (lineItems.length === 0) {
        lineItems.push({
          id: `line_${Math.random().toString(36).slice(2, 10)}`,
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

      initialData = {
        customerId,
        location: "Chennai",
        placeOfSupply: "33",
        quoteNumber: `QT-2026-${Math.floor(Math.random() * 900 + 100)}`,
        referenceNumber: lead.enquiryRef || "",
        quoteDate: new Date().toISOString().slice(0, 10),
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), // 30 days expiry
        salesperson: lead.ownerId || session.user.id,
        projectId: "",
        portOfLoading: enquiry.pol || enquiry.aol || "",
        portOfLoadingCountry: "India", // Default, editable
        portOfDischarge: enquiry.pod || enquiry.aod || "",
        portOfDestinationCountry: "", // Default, editable
        incoterm: enquiry.incoterm || "",
        containerType: isSea ? (isLcl ? "LCL" : (enquiry.containerType || "20FT")) : "Air Cargo",
        numberOfContainers: isSea ? (parseInt(enquiry.containerCount) || 1) : 1,
        commodity: enquiry.commodity || "",
        weight: enquiry.weight || "",
        lineItems,
        customerNotes: `Pre-populated from Enquiry Ref ${lead.enquiryRef || "N/A"}.`,
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

  return <NewQuotePage salespersons={salespersons} accounts={accounts} initialData={initialData} />;
}
