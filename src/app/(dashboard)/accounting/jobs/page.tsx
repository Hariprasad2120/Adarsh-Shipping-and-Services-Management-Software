import React from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { JobsClient } from "./jobs-client";

export default async function JobsPage() {
  const session = await auth();
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
    <div className="p-8 space-y-6 max-w-[1200px] mx-auto animate-in fade-in duration-200">
      <div>
        <h2 className="ds-h1 text-white">Cargo Job Costing &amp; Register</h2>
        <p className="text-slate-400 text-xs mt-1">
          Monitor profitability of freight forwardings and shipping contracts. Track contract value against actual direct expenses.
        </p>
      </div>

      <JobsClient
        jobs={jobsWithMetrics}
        customers={customers}
      />
    </div>
  );
}
