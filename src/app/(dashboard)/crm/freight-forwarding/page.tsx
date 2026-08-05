import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import {
  CrmConfigurationState,
  CrmPermissionState,
} from "@/modules/crm/components/workspace/crm-workspace";
import {
  ServiceEnquiryQueue,
  type ServiceEnquiryQueueItem,
} from "@/modules/crm/components/service-enquiries/service-enquiry-queue";
import { listServiceEnquiries } from "@/modules/crm/services/service-enquiry-routing.service";

export default async function CrmFreightForwardingQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
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

  const { search = "" } = await searchParams;
  const items = await listServiceEnquiries({
    orgId,
    serviceType: "FREIGHT_FORWARDING",
    search,
  });

  return (
    <ServiceEnquiryQueue
      items={items as unknown as ServiceEnquiryQueueItem[]}
      search={search}
      serviceLabel="Freight Forwarding"
      basePath="/crm/freight-forwarding"
    />
  );
}
