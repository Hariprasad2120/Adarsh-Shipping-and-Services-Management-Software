import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { JobsClient } from "./jobs-client";
import { AccountingRoutePageHeader } from "@/components/monolith/accounting-workspace";

export default async function JobsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId!;

  // Fetch jobs and customers
  const [jobs, customers] = await Promise.all([
    db.jobCosting.findMany({
      where: { orgId },
      include: {
        customer: { select: { name: true } },
        glEntries: {
          where: { isCancelled: false },
          include: {
            account: { select: { rootType: true } },
          },
        },
      },
      orderBy: { startDate: "desc" },
    }),
    db.crmAccount.findMany({
      where: { orgId, type: "Customer" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const jobsWithMetrics = jobs.map((job) => {
    let actualRevenue = 0;
    let actualExpense = 0;

    job.glEntries.forEach((ent) => {
      const dbVal = Number(ent.debit);
      const crVal = Number(ent.credit);

      if (ent.account.rootType === "INCOME") {
        actualRevenue += crVal - dbVal;
      } else if (ent.account.rootType === "EXPENSE") {
        actualExpense += dbVal - crVal;
      }
    });

    const netProfit = actualRevenue - actualExpense;
    const contractVal = Number(job.contractValue);
    const marginPercent = contractVal > 0 ? (netProfit / contractVal) * 100 : 0;

    return {
      id: job.id,
      jobCode: job.jobCode,
      jobName: job.jobName,
      customerName: job.customer?.name || "Unknown Customer",
      startDate: job.startDate,
      expectedEndDate: job.expectedEndDate,
      contractValue: contractVal,
      actualRevenue,
      actualExpense,
      netProfit,
      marginPercent,
      status: job.status,
    };
  });

  return (
    <>
      <AccountingRoutePageHeader />
      <JobsClient
        jobs={jobsWithMetrics}
        customers={customers}
      />
    </>
  );
}
