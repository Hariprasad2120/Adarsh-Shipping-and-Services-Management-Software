import { renderToBuffer } from "@react-pdf/renderer";
import { loadQuoteDetailRecord } from "@/modules/crm/quote-loader";
import { QuotePdfDocument } from "@/modules/crm/pdf/quote-pdf-document";

export async function generateQuotePdfBuffer(
  quoteId: string,
  orgId: string,
): Promise<{ buffer: Buffer; quoteNumber: string } | null> {
  const quote = await loadQuoteDetailRecord(quoteId, orgId);
  if (!quote) return null;

  const buffer = await renderToBuffer(<QuotePdfDocument quote={quote} />);
  return { buffer, quoteNumber: quote.quoteNumber };
}
