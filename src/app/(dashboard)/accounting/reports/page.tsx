import React from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ReportsClient } from "./reports-client";
import { AccountingRoutePageHeader } from "@/components/monolith/accounting-workspace";

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
    <>
      <AccountingRoutePageHeader />
      <ReportsClient partners={partners} />
    </>
  );
}
