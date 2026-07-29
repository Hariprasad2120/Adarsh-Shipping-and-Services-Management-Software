import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  CrmPanel,
  CrmSection,
  CrmStatus,
} from "@/components/monolith/crm-workspace";
import { getCrmWorkspaceDetails } from "../_components/crm-workspace-page";

interface CatchAllPageProps {
  params: Promise<{ slug: string[] }>;
}

export default async function CrmCatchAllPage({ params }: CatchAllPageProps) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const { slug } = await params;
  const details = getCrmWorkspaceDetails(slug[0] || "workspace");
  const Icon = details.icon;

  return (
    <CrmSection
      eyebrow={details.badge}
      title={details.title ?? "Active workspace"}
      description={details.description}
    >
      <CrmPanel className="mnx-crm-placeholder">
        <span className="mnx-crm-placeholder-icon">
          <Icon aria-hidden="true" />
        </span>
        <div>
          <CrmStatus variant="success">Synchronised and live</CrmStatus>
          <h3>{details.summary}</h3>
          <p>
            Records remain organisation-scoped and permission-aware while this
            operational register is active.
          </p>
        </div>
      </CrmPanel>
    </CrmSection>
  );
}
