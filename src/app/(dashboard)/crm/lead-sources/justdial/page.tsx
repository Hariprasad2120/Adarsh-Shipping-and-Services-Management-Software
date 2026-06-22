import React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { getJustdialConfig } from "@/modules/crm/lead-source.service";
import { db } from "@/lib/db";
import { JustdialForm } from "./justdial-form";
import { ShieldAlert } from "lucide-react";

export default async function JustdialConfigPage() {
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

  // Permission Guard
  try {
    await requirePermission(session.user.id, "crm.leadSource.manage");
  } catch (e) {
    return (
      <div className="p-8 text-center text-red-400">
        <ShieldAlert className="size-12 mx-auto mb-4" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-sm mt-1">You do not have permission to configure CRM Lead Sources.</p>
      </div>
    );
  }

  // Fetch employees list
  const employees = await db.user.findMany({
    where: { orgId, active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" }
  });

  const config = await getJustdialConfig(orgId);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <JustdialForm initialConfig={config} employees={employees} />
    </div>
  );
}
