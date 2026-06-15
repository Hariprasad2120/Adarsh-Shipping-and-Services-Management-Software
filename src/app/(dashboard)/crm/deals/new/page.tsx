import React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { DealForm } from "../deal-form";
import { ShieldAlert } from "lucide-react";

export default async function NewDealPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) {
    return (
      <div className="p-8 text-center text-red-400">
        <ShieldAlert className="size-12 mx-auto mb-4" />
        <h2 className="text-xl font-bold">Configuration Error</h2>
        <p className="text-sm mt-1">Missing organisation context.</p>
      </div>
    );
  }

  // Permission check
  try {
    await requirePermission(session.user.id, "crm.deal.manage");
  } catch (e) {
    return (
      <div className="p-8 text-center text-red-400">
        <ShieldAlert className="size-12 mx-auto mb-4" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-sm mt-1">You do not have permission to manage Deals.</p>
      </div>
    );
  }

  // Fetch accounts, contacts, and employees in parallel
  const [accounts, contacts, employees] = await Promise.all([
    db.crmAccount.findMany({
      where: { orgId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.crmContact.findMany({
      where: { orgId },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { lastName: "asc" },
    }),
    db.user.findMany({
      where: { orgId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const formattedContacts = contacts.map(c => ({
    id: c.id,
    name: `${c.firstName || ""} ${c.lastName}`.trim(),
  }));

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Create Deal</h2>
        <p className="text-slate-400 text-sm mt-1">Record a new sales deal, logistics contract, or custom shipping opportunity.</p>
      </div>
      <DealForm accounts={accounts} contacts={formattedContacts} employees={employees} />
    </div>
  );
}
