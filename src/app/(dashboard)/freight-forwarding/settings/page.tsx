import {
  FileText,
  Route,
  Settings2,
  ShipWheel,
  Truck,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import {
  WorkspaceMetric,
  WorkspacePage,
  WorkspacePageHeader,
  WorkspacePanel,
  WorkspacePanelHeader,
  WorkspaceSectionHeading,
} from "@/components/layout/workspace";

const controlAreas = [
  {
    href: "/freight-forwarding/create-booking",
    title: "Booking worksheet defaults",
    description:
      "Review the booking sheet used to capture shipment, vessel, party, cargo, and attachment context.",
    icon: FileText,
  },
  {
    href: "/freight-forwarding/mbl",
    title: "MBL register controls",
    description:
      "Inspect the master bill operational register that governs line-level freight visibility.",
    icon: ShipWheel,
  },
  {
    href: "/freight-forwarding/hbl",
    title: "HBL register controls",
    description:
      "Inspect the house bill operational register used to manage customer-facing shipment records.",
    icon: Truck,
  },
  {
    href: "/freight-forwarding/settings/data",
    title: "Data",
    description:
      "Review Freight Forwarding record volume and, for administrators, delete all transactions and booking data from one guarded route.",
    icon: Settings2,
  },
];

export const metadata = {
  title: "Freight Forwarding Settings | Adarsh Shipping",
};

export default function FreightForwardingSettingsPage() {
  return (
    <WorkspacePage>
      <WorkspacePageHeader
        eyebrow="Freight forwarding configuration"
        title="Freight Forwarding settings"
        description="Review the operational control areas that shape booking capture, master-bill handling, and house-bill execution."
      />

      <section className="mnx-workspace-metrics" aria-label="Freight forwarding settings summary">
        <WorkspaceMetric
          icon={<Settings2 size={17} aria-hidden="true" />}
          label="Control areas"
          value={controlAreas.length}
          detail="Booking capture, register control, and data management"
        />
        <WorkspaceMetric
          icon={<Route size={17} aria-hidden="true" />}
          label="Operating model"
          value="Dual bill"
          detail="Separate master and house workflows stay first-class"
        />
        <WorkspaceMetric
          icon={<ShipWheel size={17} aria-hidden="true" />}
          label="Register coverage"
          value="MBL + HBL"
          detail="Both transaction views remain linked from settings"
        />
      </section>

      <WorkspaceSectionHeading
        index="01"
        title="Configuration areas"
        description="Use these linked workspaces to review the current freight-forwarding defaults and operational control surfaces."
      />

      <WorkspacePanel>
        <WorkspacePanelHeader
          eyebrow="Owner surfaces"
          title="Freight settings workspace"
          description="The current freight-forwarding configuration lives inside the active booking and register surfaces below."
        />
        <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
          {controlAreas.map((area) => {
            const Icon = area.icon;
            return (
              <WorkspacePanel key={area.href} className="h-full">
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
                  <Icon aria-hidden="true" />
                </div>
              </WorkspacePanel>
            );
          })}
        </div>
      </WorkspacePanel>
    </WorkspacePage>
  );
}
