import { CrmConfigurationState, CrmPermissionState } from "@/modules/crm/components/workspace/crm-workspace";
import React from "react";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { EnquiryDetailClient } from "./enquiry-detail-client";
import { loadEnquiryDetailPageData } from "@/modules/crm/services/enquiry-detail-page.service";

interface EnquiryDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function EnquiryDetailPage({ params }: EnquiryDetailPageProps) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) {
    return <CrmConfigurationState description="Missing organisation context." />;
  }

  // Permission check
  try {
    await requirePermission(session.user.id, "crm.lead.read");
  } catch {
    return <CrmPermissionState description="You do not have permission to view CRM enquiries." />;
  }

  const { id } = await params;
  const detailData = await loadEnquiryDetailPageData({
    orgId,
    userId: session.user.id,
    leadId: id,
  });
  if (!detailData) notFound();
  const { lead } = detailData;

  if (lead.status !== "INTERESTED" && lead.status !== "FOLLOW_UP") {
    redirect(`/crm/leads/${id}`);
  }

  return (
    <EnquiryDetailClient
      {...detailData}
      backHref="/crm/enquiries"
      backLabel="Back to Enquiries"
    />
  );
}
