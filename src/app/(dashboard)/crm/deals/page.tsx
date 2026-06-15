import React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listDeals } from "@/modules/crm/service";
import { requirePermission } from "@/lib/rbac";
import { DealsClient } from "./deals-client";
import { ShieldAlert } from "lucide-react";

interface SearchParams {
  search?: string;
  stage?: string;
}

export default async function CrmDealsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
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
    await requirePermission(session.user.id, "crm.deal.manage");
  } catch (e) {
    return (
      <div className="p-8 text-center text-red-400">
        <ShieldAlert className="size-12 mx-auto mb-4" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-sm mt-1">You do not have permission to view CRM deals.</p>
      </div>
    );
  }

  const awaitedParams = await searchParams;
  const search = awaitedParams.search || "";
  const stage = awaitedParams.stage || "";

  // Fetch deals from db
  const deals = await listDeals(orgId, { search, stage });

  return <DealsClient initialDeals={deals} />;
}
