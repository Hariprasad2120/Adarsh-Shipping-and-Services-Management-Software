import { notFound } from "next/navigation";
import { FileText } from "lucide-react";
import {
  PublicBrand,
  PublicMonolithShell,
  PublicPanel,
  PublicStage,
} from "@/modules/auth/components/public-workspace";
import { loadPublicQuoteView } from "@/modules/crm/share";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export default async function QuoteSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const quote = await loadPublicQuoteView(token);

  if (!quote) notFound();

  return (
    <PublicMonolithShell workspace>
      <PublicStage>
        <PublicBrand subtitle="Quotation" />
        <PublicPanel className="max-w-[880px]">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--mnx-text-muted)]">
                Quotation
              </p>
              <h1 className="text-2xl font-semibold text-[var(--mnx-text-strong)]">
                {quote.quoteNumber}
              </h1>
            </div>
            <FileText className="size-8 text-[var(--mnx-accent)]" />
          </div>

          <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--mnx-text-muted)]">
                Date
              </p>
              <p className="font-medium text-[var(--mnx-text-strong)]">{quote.date}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--mnx-text-muted)]">
                Customer
              </p>
              <p className="font-medium text-[var(--mnx-text-strong)]">{quote.customerName}</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[var(--mnx-border)]">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="bg-[var(--mnx-surface)] text-left text-[11px] uppercase tracking-[0.1em] text-[var(--mnx-text-muted)]">
                <tr>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-right">Rate</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {quote.items.map((item) => (
                  <tr key={item.id} className="border-t border-[var(--mnx-border)]">
                    <td className="px-3 py-2">{item.name}</td>
                    <td className="px-3 py-2 text-right">{item.quantity.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">{formatMoney(item.price)}</td>
                    <td className="px-3 py-2 text-right">{formatMoney(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ml-auto mt-4 w-full max-w-[320px] space-y-1.5 text-sm">
            <div className="flex justify-between text-[var(--mnx-text-muted)]">
              <span>Sub Total</span>
              <span>{formatMoney(quote.subtotal)}</span>
            </div>
            {quote.taxes.map((tax) => (
              <div key={tax.label} className="flex justify-between text-[var(--mnx-text-muted)]">
                <span>{tax.label}</span>
                <span>{formatMoney(tax.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-[var(--mnx-border)] pt-2 text-base font-semibold text-[var(--mnx-text-strong)]">
              <span>Total</span>
              <span>{formatMoney(quote.total)}</span>
            </div>
          </div>

          {quote.terms ? (
            <div className="mt-6 border-t border-[var(--mnx-border)] pt-4 text-sm">
              <p className="mb-1 font-semibold text-[var(--mnx-text-strong)]">Terms and Conditions</p>
              <p className="text-[var(--mnx-text-muted)]">{quote.terms}</p>
            </div>
          ) : null}
        </PublicPanel>
      </PublicStage>
    </PublicMonolithShell>
  );
}
