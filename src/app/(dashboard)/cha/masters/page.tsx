import Link from "next/link";
import { redirect } from "next/navigation";
import { Database, ShieldAlert } from "lucide-react";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { WorkspacePanelHeader, WorkspaceState } from "@/components/monolith/workspace";
import { ChaPanel } from "@/components/monolith/cha-workspace";
import { getChaCustomsFeatureFlags, isChaCustomsFeatureEnabled } from "@/modules/cha/customs/feature-flags";
import { CUSTOMS_MASTER_PAGE_CONFIGS } from "@/modules/cha/customs/masters/page-config";

export default async function CustomsMastersIndexPage() {
  const session = await getSession();
  if (!session?.user?.id || !session.user.orgId) redirect("/login");

  const flags = await getChaCustomsFeatureFlags(session.user.orgId);
  if (!isChaCustomsFeatureEnabled(flags, "CHA_CUSTOMS_MASTER_DATA")) {
    return (
      <WorkspaceState
        variant="permission"
        eyebrow="Feature disabled"
        title="Customs master data is disabled"
        description="The customs master registers remain hidden until the server-side feature flag is enabled."
        icon={<ShieldAlert size={22} aria-hidden="true" />}
      />
    );
  }

  if (!(await can(session.user.id, "cha.customs.master.view"))) {
    return (
      <WorkspaceState
        variant="permission"
        eyebrow="Permission required"
        title="Customs master permission required"
        description="Ask an administrator to assign customs master view access before opening these registers."
        icon={<ShieldAlert size={22} aria-hidden="true" />}
      />
    );
  }

  return (
    <div className="mnx-customs-master-page">
      <ChaPanel>
        <WorkspacePanelHeader
          eyebrow="Customs Masters"
          title="Export and Shared Master Registers"
          description="Server-paginated customs master data for tariff, incentive, drawback, and scheme lookups."
        />
      </ChaPanel>
      <div className="mnx-customs-master-index-grid">
        {Object.values(CUSTOMS_MASTER_PAGE_CONFIGS).map((config) => (
          <ChaPanel key={config.key}>
            <WorkspacePanelHeader
              eyebrow={config.modelName}
              title={config.title}
              description={config.description}
              actions={
                <Link href={`/cha/masters/${config.slug}`} className="mnx-button mnx-button-secondary mnx-button-compact">
                  <Database size={14} aria-hidden="true" />
                  Open
                </Link>
              }
            />
          </ChaPanel>
        ))}
      </div>
    </div>
  );
}
