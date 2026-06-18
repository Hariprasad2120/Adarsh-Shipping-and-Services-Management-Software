import React from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ReportsClient } from "./reports-client";

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId!;

  // Fetch partners for partner-related reports dropdown
  const partners = await db.partnerAccount.findMany({
    where: { orgId },
    select: { id: true, partnerName: true },
    orderBy: { partnerName: "asc" },
  });

  return (
    <div className="p-8 space-y-6 max-w-[1400px] mx-auto animate-in fade-in duration-200">
      <div>
        <h2 className="ds-h1 text-white">Reports Center</h2>
        <p className="text-slate-400 text-xs mt-1">
          Access financial statements, tax registers, cargo costing indices, and audit summaries.
        </p>
      </div>

      <ReportsClient partners={partners} />
    </div>
  );
}
