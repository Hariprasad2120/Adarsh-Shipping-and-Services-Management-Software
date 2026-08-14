// BLOCKED: requires CrmInvoice.shareToken / shareExpiresAt columns, which are
// pending a Prisma migration (blocked on unrelated DB migration-history drift —
// see conversation/plan notes). Schema change for these fields already exists
// in prisma/schema.prisma; once the drift is resolved and the migration is
// applied + `prisma generate` re-run, restore the implementation below.

export async function createOrGetShareToken(
  _quoteId: string,
  _orgId: string,
): Promise<{ token: string; url: string } | null> {
  throw new Error("Quote sharing is not yet available (pending database migration).");
}

export async function revokeShareToken(_quoteId: string, _orgId: string): Promise<boolean> {
  throw new Error("Quote sharing is not yet available (pending database migration).");
}

export type PublicQuoteView = {
  quoteNumber: string;
  date: string;
  customerName: string;
  placeOfSupply: string;
  items: Array<{
    id: string;
    name: string;
    description: string;
    unit: string;
    quantity: number;
    price: number;
    amount: number;
    tax: string;
  }>;
  taxes: Array<{ label: string; amount: number }>;
  subtotal: number;
  discount: number;
  adjustment: number;
  roundOff: number;
  total: number;
  notes: string;
  terms: string;
};

export async function loadPublicQuoteView(_token: string): Promise<PublicQuoteView | null> {
  return null;
}
