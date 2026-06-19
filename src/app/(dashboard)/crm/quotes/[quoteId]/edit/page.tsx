import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { MOCK_ITEMS } from "@/lib/items/mock-data";
import { NewQuotePage } from "../../_components/NewQuotePage";
import type { QuoteFormValues } from "../../_lib/types";

export default async function EditCrmQuotePage({
  params,
}: {
  params: Promise<{ quoteId: string }>;
}) {
  const { quoteId } = await params;
  
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const orgId = session.user.orgId;
  if (!orgId) redirect("/login");

  // Fetch the quote from the database
  const dbQuote = await db.crmInvoice.findFirst({
    where: { id: quoteId, orgId, type: "QUOTE" },
    include: {
      items: true,
    },
  });

  if (!dbQuote) notFound();

  // Map to QuoteFormValues
  const initialData: QuoteFormValues = {
    customerId: dbQuote.accountId || "",
    location: (dbQuote as any).location || "Chennai",
    placeOfSupply: (dbQuote as any).placeOfSupply || "33",
    quoteNumber: dbQuote.invoiceNumber,
    referenceNumber: (dbQuote as any).referenceNumber || "",
    quoteDate: dbQuote.date.toISOString().slice(0, 10),
    expiryDate: dbQuote.dueDate ? dbQuote.dueDate.toISOString().slice(0, 10) : "",
    salesperson: dbQuote.ownerId,
    projectId: dbQuote.dealId || "",
    portOfLoading: (dbQuote as any).portOfLoading || "",
    portOfLoadingCountry: (dbQuote as any).portOfLoadingCountry || "",
    portOfDischarge: (dbQuote as any).portOfDischarge || "",
    portOfDestinationCountry: (dbQuote as any).portOfDestinationCountry || "",
    incoterm: (dbQuote as any).incoterm || "",
    containerType: (dbQuote as any).containerType || "",
    numberOfContainers: (dbQuote as any).numberOfContainers || 0,
    commodity: (dbQuote as any).commodity || "",
    weight: (dbQuote as any).weight || "",
    lineItems: dbQuote.items.map((item) => ({
      id: item.id,
      description: item.productName,
      hsnSac: MOCK_ITEMS.find((catalogItem) => catalogItem.name === item.productName)?.hsnSac || "",
      unit: ((item as any).unit || "PCS") as "PCS" | "KG" | "TON" | "CBM" | "Container" | "Shipment",
      quantity: item.qty,
      rate: item.rate,
      tax: (item as any).taxLabel || (item.taxPercent ? `GST ${item.taxPercent}%` : "GST 18%"),
      tds: ((item as any).tds || "None") as "None" | "TDS 1%" | "TDS 2%" | "TDS 10%",
      amount: item.amount,
      currency: (item as any).currency || "INR",
      exchangeRate: (item as any).exchangeRate || 1,
    })),
    customerNotes: dbQuote.manualNotes || "",
    terms: (dbQuote as any).terms || "",
    bankDetailsId: dbQuote.bankDetails || "",
    discountType: ((dbQuote as any).discountType === "amount" ? "amount" : "percentage") as "percentage" | "amount",
    discountValue: dbQuote.discount || 0,
    adjustment: 0,
    roundOff: 0,
    subtotal: dbQuote.total - dbQuote.tax,
    total: dbQuote.total,
  };

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

  return <NewQuotePage initialData={initialData} quoteId={quoteId} salespersons={salespersons} accounts={accounts} />;
}
