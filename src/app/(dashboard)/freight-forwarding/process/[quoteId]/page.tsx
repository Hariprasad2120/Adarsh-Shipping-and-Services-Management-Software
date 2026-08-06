import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { buildFreightBookingReferenceData } from "@/modules/freight-forwarding/service";
import { FreightForwardingCreateBookingClient } from "@/modules/freight-forwarding/components";
import {
  buildFreightProcessDraftFromQuote,
  getQuoteProcessRecord,
  type QuoteProcessRecord,
} from "@/modules/crm/quote-process";

export default async function FreightForwardingProcessDetailPage({
  params,
}: {
  params: Promise<{ quoteId: string }>;
}) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");
  const orgId = session.user.orgId;
  if (!orgId) redirect("/login");

  const { quoteId } = await params;
  const [quote, reference] = await Promise.all([
    getQuoteProcessRecord(orgId, quoteId),
    buildFreightBookingReferenceData(orgId),
  ]);

  if (!quote || quote.workflowContext?.conversion?.freightStatus !== "PROCESSING_PENDING") {
    notFound();
  }

  const prefilledDraft = buildFreightProcessDraftFromQuote(quote);
  const initialTransactionDraft = {
    containers: createFreightProcessContainers(quote),
    equipmentTypes: quote.containerType ? [quote.containerType] : ["FCL"],
    formData: prefilledDraft,
  };

  return (
    <FreightForwardingCreateBookingClient
      initialMode={null}
      initialMblDraft={initialTransactionDraft}
      initialHblDraft={initialTransactionDraft}
      processQuoteId={quote.id}
      title={`Process ${quote.quoteNumber}`}
      description="Choose the freight transaction mode here. Quote details from CRM are already carried forward wherever they were available."
      submitLabel="Complete Freight Process"
      cancelHref="/freight-forwarding/process"
      reference={reference}
    />
  );
}

function createFreightProcessContainers(quote: QuoteProcessRecord) {
  return [
    {
      id: crypto.randomUUID(),
      containerNo: "",
      containerType: quote.containerType || "",
      harmonizedCode: "",
      hazardous: false,
    },
  ];
}
