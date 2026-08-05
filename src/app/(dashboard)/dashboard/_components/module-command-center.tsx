import {
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { WorkspaceSectionHeading } from "@/components/layout/workspace";
import type { DashboardModuleSnapshot } from "@/modules/dashboard/types";
import { AttendanceGraphic } from "../graphics/AttendanceGraphic";
import { CommunicationGraphic } from "../graphics/CommunicationGraphic";
import { CustomerPipelineGraphic } from "../graphics/CustomerPipelineGraphic";
import { ExpenseDeskGraphic } from "../graphics/ExpenseDeskGraphic";
import { FinancialControlGraphic } from "../graphics/FinancialControlGraphic";
import { LearningHubGraphic } from "../graphics/LearningHubGraphic";
import { PeopleOperationsGraphic } from "../graphics/PeopleOperationsGraphic";
import { PerformanceGraphic } from "../graphics/PerformanceGraphic";
import { ProductCatalogueGraphic } from "../graphics/ProductCatalogueGraphic";
import { ShipmentOperationsGraphic } from "../graphics/ShipmentOperationsGraphic";
import { TalentPipelineGraphic } from "../graphics/TalentPipelineGraphic";

interface ModuleCommandCenterProps {
  snapshot: DashboardModuleSnapshot;
}

const MODULE_LAYOUT_SEQUENCE = [
  "image-left",
  "image-right",
  "image-right",
  "image-left",
  "image-right",
  "image-left",
] as const;

type ModuleVisual = ReturnType<typeof getModuleVisual>;

function formatSnapshotTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getModuleVisual(moduleId: string) {
  if (moduleId === "product-catalogue") return "catalogue";
  if (moduleId === "hrms") return "people";
  if (moduleId === "attendance") return "attendance";
  if (moduleId === "ams") return "performance";
  if (moduleId === "lms") return "learning";
  if (moduleId === "crm") return "pipeline";
  if (moduleId === "freight-forwarding") return "shipment";
  if (moduleId === "communication") return "communication";
  if (moduleId === "expense") return "expense";
  if (moduleId === "cha") return "shipment";
  if (moduleId === "accounting") return "finance";
  if (moduleId === "recruit") return "recruit";

  return "operations";
}

function getModuleLayout(moduleId: string, index: number) {
  if (moduleId === "lms" || moduleId === "communication") {
    return "image-left";
  }

  if (moduleId === "attendance" || moduleId === "ams" || moduleId === "expense") {
    return "image-right";
  }

  return MODULE_LAYOUT_SEQUENCE[index % MODULE_LAYOUT_SEQUENCE.length];
}

function ModuleGraphic({ visual }: { visual: ModuleVisual }) {
  if (visual === "catalogue") {
    return <ProductCatalogueGraphic />;
  }

  if (visual === "people") {
    return <PeopleOperationsGraphic />;
  }

  if (visual === "recruit") {
    return <TalentPipelineGraphic />;
  }

  if (visual === "attendance") {
    return <AttendanceGraphic />;
  }

  if (visual === "performance") {
    return <PerformanceGraphic />;
  }

  if (visual === "finance") {
    return <FinancialControlGraphic />;
  }

  if (visual === "expense") {
    return <ExpenseDeskGraphic />;
  }

  if (visual === "learning") {
    return <LearningHubGraphic />;
  }

  if (visual === "pipeline") {
    return <CustomerPipelineGraphic />;
  }

  if (visual === "communication") {
    return <CommunicationGraphic />;
  }

  if (visual === "shipment") {
    return <ShipmentOperationsGraphic />;
  }

  return (
    <svg className="mnx-module-graphic" viewBox="0 0 240 180" aria-hidden="true" focusable="false">
      <path className="mnx-module-graphic-line" d="M54 118c28-42 56-28 78-62 22 34 50 20 78 62" />
      <path className="mnx-module-graphic-surface" d="M72 82h54v50H72zM132 64h36v68h-36z" />
      <path className="mnx-module-graphic-accent" d="M84 102h22M144 84h12M144 102h12M144 120h12" />
      <circle className="mnx-module-graphic-dot" cx="54" cy="118" r="5" />
      <circle className="mnx-module-graphic-dot" cx="132" cy="56" r="5" />
      <circle className="mnx-module-graphic-dot" cx="210" cy="118" r="5" />
    </svg>
  );
}

export function ModuleCommandCenter({ snapshot }: ModuleCommandCenterProps) {
  const availableCount = snapshot.modules.filter((module) => module.available).length;

  return (
    <section className="mnx-module-command-section" aria-label="Module command center">
      <header className="mnx-module-command-header">
        <WorkspaceSectionHeading
          index="03"
          title="Module command center"
          description="A live pulse from the workspaces enabled for your organization and available to your role."
        />
        <div className="mnx-module-command-status" title={`Updated at ${formatSnapshotTime(snapshot.generatedAt)}`}>
          <span><i />{availableCount} live</span>
          <small>{snapshot.modules.length} enabled</small>
        </div>
      </header>

      <div className="mnx-module-command">
        {snapshot.modules.length > 0 ? (
          <div className="mnx-module-grid">
            {snapshot.modules.map((module, index) => {
              const layout = getModuleLayout(module.id, index);
              const visual = getModuleVisual(module.id);
              return (
                <Link
                  className="mnx-module-card"
                  data-layout={layout}
                  data-visual={visual}
                  href={module.href}
                  key={module.id}
                >
                  <div className="mnx-module-card-art" aria-hidden="true">
                    <ModuleGraphic visual={visual} />
                  </div>
                  <div className="mnx-module-card-copy">
                    <header>
                      <span>{module.eyebrow}</span>
                      <h3>{module.title}</h3>
                    </header>

                    <p className="mnx-module-description">{module.description}</p>

                    <div className="mnx-module-primary-stat">
                      <strong>{String(module.primaryMetric.value).padStart(2, "0")}</strong>
                      <div>
                        <span>{module.primaryMetric.label}</span>
                        <small>{module.primaryMetric.detail}</small>
                      </div>
                    </div>

                    {module.supportingMetrics.length > 0 ? (
                      <dl className="mnx-module-supporting-stats">
                        {module.supportingMetrics.map((metric) => (
                          <div key={metric.label}>
                            <dt>{metric.label}</dt>
                            <dd>{String(metric.value).padStart(2, "0")}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : (
                      <div className="mnx-module-unavailable-note">
                        Live counts could not be loaded. You can still open the workspace.
                      </div>
                    )}

                    <footer>
                      <span className="mnx-module-open-link">
                        Open module <ArrowUpRight size={14} />
                      </span>
                      {module.actions.slice(1, 2).map((action) => (
                        <span className="mnx-module-secondary-link" key={action.href}>
                          {action.label}
                        </span>
                      ))}
                    </footer>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="mnx-module-empty">
            <ShieldCheck size={24} />
            <h3>Your core workspace is ready</h3>
            <p>Enable operational modules in Admin settings to add their live dashboard panels.</p>
            <Link href="/admin/settings">
              Review module settings <ArrowUpRight size={14} />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
