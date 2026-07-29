import React from "react";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getJournalEntry } from "@/modules/accounting/service";
import { JournalEntryDetailClient } from "./detail-client";
import {
  AccountingActionLink,
  AccountingRoutePageHeader,
} from "@/components/monolith/accounting-workspace";

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
    <>
      <AccountingRoutePageHeader
        title={`Voucher ${jv.voucherNo}`}
        actions={
          <AccountingActionLink href="/accounting/journal-entries">
            Back to journal
          </AccountingActionLink>
        }
      />
      <JournalEntryDetailClient jv={serializedJV} />
    </>
  );
}
