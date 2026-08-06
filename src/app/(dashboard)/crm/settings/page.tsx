import {
  Boxes,
  CircleDollarSign,
  FileText,
  Gauge,
  Settings2,
  Sparkles,
  Truck,
  Users,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { WorkspacePanelHeader } from "@/components/layout/workspace";
import {
  CrmMetric,
  CrmMetrics,
  CrmPanel,
  CrmSection,
} from "@/modules/crm/components/workspace/crm-workspace";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

const controlAreas = [
  {
    href: "/crm/masters",
    title: "Master data",
    description:
      "Maintain shared commercial masters that feed core CRM registers and quote preparation flows.",
    icon: Settings2,
  },
  {
    href: "/crm/lead-sources",
    title: "Lead sources",
    description:
      "Control inbound source configuration, ingestion health, and the intake routes that feed qualification work.",
    icon: Sparkles,
  },
  {
    href: "/crm/price-books",
    title: "Price books",
    description:
      "Maintain reusable tariffs, negotiated schedules, and commercial pricing foundations.",
    icon: CircleDollarSign,
  },
  {
    href: "/crm/products",
    title: "Products and services",
    description:
      "Review the commercial catalogue used by opportunities, quotes, invoices, and service workflows.",
    icon: Boxes,
  },
  {
    href: "/crm/vendors",
    title: "Vendors and partners",
    description:
      "Maintain supplier, carrier, and operating partner records tied to commercial and delivery workflows.",
    icon: Truck,
  },
  {
    href: "/crm/solutions",
    title: "Solutions and knowledge",
    description:
      "Keep reusable sales and service guidance aligned with the commercial operating model.",
    icon: FileText,
  },
];

export default async function CrmSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <>
      <CrmMetrics aria-label="CRM settings summary">
        <CrmMetric
          icon={<Settings2 aria-hidden="true" />}
          label="Control areas"
          value={controlAreas.length}
          detail="Sources, catalogue, pricing, partners, and knowledge"
        />
        <CrmMetric
          icon={<Gauge aria-hidden="true" />}
          label="Workspace model"
          value="Operational"
          detail="Settings route links to the active owner surfaces"
        />
        <CrmMetric
          icon={<Users aria-hidden="true" />}
          label="Relationship data"
          value="Shared"
          detail="Masters and sources influence every downstream register"
        />
      </CrmMetrics>

      <CrmSection
        eyebrow="Configuration workspace"
        title="CRM settings and commercial foundations"
        description="Use these settings areas to manage the records and policies that shape CRM intake, pricing, commercial documents, and customer-service delivery."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {controlAreas.map((area) => {
            const Icon = area.icon;
            return (
              <CrmPanel key={area.href} className="h-full">
                <WorkspacePanelHeader
                  eyebrow="Linked control"
                  title={area.title}
                  description={area.description}
                  actions={
                    <ButtonLink href={area.href} variant="inverse">
                      Open
                    </ButtonLink>
                  }
                />
                <div className="px-5 pb-5">
                  <span className="mnx-crm-placeholder-icon">
                    <Icon aria-hidden="true" />
                  </span>
                </div>
              </CrmPanel>
            );
          })}
        </div>
      </CrmSection>
    </>
  );
}
