import React from "react";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { getLead } from "@/modules/crm/service";
import { LeadForm } from "../../lead-form";
import { ShieldAlert } from "lucide-react";

interface EditLeadPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditLeadPage({ params }: EditLeadPageProps) {
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
    await requirePermission(session.user.id, "crm.lead.create");
  } catch (e) {
    return (
      <div className="p-8 text-center text-red-400">
        <ShieldAlert className="size-12 mx-auto mb-4" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-sm mt-1">You do not have permission to edit CRM leads.</p>
      </div>
    );
  }

  const { id } = await params;
  const lead = await getLead(orgId, id);
  if (!lead) notFound();

  // Fetch organization users for ownership dropdown
  const employees = await db.user.findMany({
    where: { orgId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      <LeadForm initialData={lead} employees={employees} />
    </div>
  );
}
