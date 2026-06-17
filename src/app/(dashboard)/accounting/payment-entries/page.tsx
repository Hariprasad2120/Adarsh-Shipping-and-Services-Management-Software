import React from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listPaymentEntries } from "@/modules/accounting/service";
import NextLink from "next/link";
import { Plus, Wallet, CheckCircle2, AlertCircle, XCircle } from "lucide-react";

export default async function PaymentEntriesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId!;
  const payments = await listPaymentEntries(orgId);

  return (
    <div className="p-8 space-y-6 max-w-[1500px] mx-auto animate-in fade-in duration-200">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-outline-variant/20 pb-5">
        <div>
          <h2 className="ds-h1 text-white">Payment Entries</h2>
          <p className="text-slate-400 text-xs mt-1">
            Record cash receipts or bank payouts, and map allocations to outstanding Sales/Purchase invoices.
          </p>
        </div>
        <NextLink
          href="/accounting/payment-entries/new"
          className="flex items-center gap-1.5 bg-[#00cec4] text-white hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-all cursor-pointer"
        >
          <Plus className="size-3.5" />
          <span>Record Payment</span>
        </NextLink>
      </div>

      {/* TABLE */}
      <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/55">
        {payments.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            No payments recorded yet. Click "Record Payment" above to register a payment receipt or disbursement.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ds-table">
              <thead>
                <tr>
                  <th>Voucher Ref</th>
                  <th>Posting Date</th>
                  <th>Payment Type</th>
                  <th>Party Class</th>
                  <th>Source Account</th>
                  <th>Destination Account</th>
                  <th>Disbursed Amount</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const labelRef = p.referenceNo || `PAY-${p.id.slice(-6).toUpperCase()}`;
                  return (
                    <tr key={p.id} className="hover:bg-[#161f28]/10 transition-all text-xs">
                      <td>
                        <NextLink
                          href={`/accounting/payment-entries/${p.id}`}
                          className="text-white hover:text-[#00cec4] font-mono font-bold hover:underline transition-colors"
                        >
                          {labelRef}
                        </NextLink>
                      </td>
                      <td className="text-slate-350">
                        {new Date(p.postingDate).toLocaleDateString("en-IN")}
                      </td>
                      <td className="font-semibold text-white uppercase">
                        {p.paymentType}
                      </td>
                      <td className="text-slate-400 font-semibold uppercase">
                        {p.partyType}
                      </td>
                      <td className="text-slate-300">
                        {p.paidFrom?.accountName || "—"}
                      </td>
                      <td className="text-slate-300">
                        {p.paidTo?.accountName || "—"}
                      </td>
                      <td className="ds-numeric font-bold text-[#00cec4]">
                        ₹{Number(p.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider ${
                          p.status === "SUBMITTED"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : p.status === "CANCELLED"
                            ? "bg-red-500/10 text-red-400"
                            : "bg-amber-500/10 text-amber-400"
                        }`}>
                          {p.status === "SUBMITTED" && <CheckCircle2 className="size-3" />}
                          {p.status === "CANCELLED" && <XCircle className="size-3" />}
                          {p.status === "DRAFT" && <AlertCircle className="size-3" />}
                          <span>{p.status}</span>
                        </span>
                      </td>
                      <td className="text-right">
                        <NextLink
                          href={`/accounting/payment-entries/${p.id}`}
                          className="inline-block bg-[#161f28] hover:bg-[#1f2d3a] border border-[#1c212a] text-slate-200 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                        >
                          Details
                        </NextLink>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
