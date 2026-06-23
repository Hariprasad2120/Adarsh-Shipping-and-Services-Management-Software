import React from "react";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getJournalEntry } from "@/modules/accounting/service";
import { JournalEntryDetailClient } from "./detail-client";
import { ArrowLeft } from "lucide-react";
import NextLink from "next/link";

interface JvDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function JvDetailPage({ params }: JvDetailPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId!;
  const { id } = await params;

  const jv = await getJournalEntry(orgId, id);
  if (!jv) notFound();

  // Serialize Prisma Decimals and Dates for serialization safety
  const serializedJV = {
    ...jv,
    totalDebit: Number(jv.totalDebit),
    totalCredit: Number(jv.totalCredit),
    postingDate: jv.postingDate.toISOString(),
    createdAt: jv.createdAt.toISOString(),
    updatedAt: jv.updatedAt.toISOString(),
    lines: jv.lines.map(l => ({
      ...l,
      debit: Number(l.debit),
      credit: Number(l.credit),
    })),
    glEntries: jv.glEntries.map(gl => ({
      ...gl,
      debit: Number(gl.debit),
      credit: Number(gl.credit),
      postingDate: gl.postingDate.toISOString(),
    })),
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* HEADER */}
      <div className="flex items-center gap-3 border-b border-outline-variant/20 pb-5">
        <NextLink
          href="/accounting/journal-entries"
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/40 rounded-xl transition-all cursor-pointer border border-[#1c212a]/30"
          title="Back to Journal Vouchers"
        >
          <ArrowLeft className="size-5" />
        </NextLink>
        <div>
          <h2 className="text-xl font-bold text-white uppercase tracking-wider">Voucher: {jv.voucherNo}</h2>
        </div>
      </div>

      <JournalEntryDetailClient jv={serializedJV} />
    </div>
  );
}
