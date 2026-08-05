import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import {
  CrmConfigurationState,
  CrmPermissionState,
} from "@/modules/crm/components/workspace/crm-workspace";
import { getServiceEnquiryDetail } from "@/modules/crm/services/service-enquiry-routing.service";
import { loadEnquiryDetailPageData } from "@/modules/crm/services/enquiry-detail-page.service";
import { EnquiryDetailClient } from "../../enquiries/[id]/enquiry-detail-client";

export default async function CrmFreightForwardingDetailPage({
  params,
}: {
  params: Promise<{ serviceEnquiryId: string }>;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) {
    return <CrmConfigurationState description="Missing organisation context." />;
  }

  try {
    await requirePermission(session.user.id, "crm.lead.read");
  } catch {
    return (
      <CrmPermissionState description="You do not have permission to view freight forwarding service enquiries." />
    );
  }

  const { serviceEnquiryId } = await params;
  const record = await getServiceEnquiryDetail({
    orgId,
    serviceEnquiryId,
    serviceType: "FREIGHT_FORWARDING",
  });

  if (!record) notFound();
  const detailData = await loadEnquiryDetailPageData({
    orgId,
    userId: session.user.id,
    leadId: record.lead.id,
  });
  if (!detailData) notFound();
  if (
    detailData.lead.status !== "INTERESTED" &&
    detailData.lead.status !== "FOLLOW_UP"
  ) {
    redirect(`/crm/leads/${record.lead.id}`);
  }

  return (
    <EnquiryDetailClient
      {...detailData}
      backHref="/crm/freight-forwarding"
      backLabel="Back to Freight Forwarding"
    />
  );
}
