import { CrmConfigurationState, CrmPermissionState } from "@/components/monolith/crm-workspace";
import React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listDeals } from "@/modules/crm/service";
import { requirePermission } from "@/lib/rbac";
import { DealsClient } from "./deals-client";
interface SearchParams {
  search?: string;
  stage?: string;
}

export default async function CrmDealsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) {
    return <CrmConfigurationState description="Missing organisation context." />;
  }

  // Permission Guard
  try {
    await requirePermission(session.user.id, "crm.deal.manage");
  } catch (e) {
    return <CrmPermissionState description="You do not have permission to view CRM deals." />;
  }

  const awaitedParams = await searchParams;
  const search = awaitedParams.search || "";
  const stage = awaitedParams.stage || "";

  // Fetch deals from db
  const deals = await listDeals(orgId, { search, stage });

  return <DealsClient initialDeals={deals} />;
}
