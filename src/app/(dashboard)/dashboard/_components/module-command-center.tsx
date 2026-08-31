import { ArrowUpRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { WorkspaceSectionHeading } from "@/components/layout/workspace";
import type { DashboardModuleSnapshot } from "@/modules/dashboard/types";

interface ModuleCommandCenterProps {
  snapshot: DashboardModuleSnapshot;
}

export function ModuleCommandCenter({ snapshot }: ModuleCommandCenterProps) {
  const availableCount = snapshot.modules.filter(
    (module) => module.available,
  ).length;

  return (
    <section
      className="mnx-module-command-section"
      aria-label="Module launcher"
    >
      <header className="mnx-module-command-header">
        <WorkspaceSectionHeading
          index={
            <span className="mnx-section-heading-marker" aria-hidden="true">
              &rsaquo;
            </span>
          }
          title="Modules"
          description="Live pulse from workspaces enabled for your role."
        />
        <div className="mnx-module-command-status">
          <span>
            <i />
            {availableCount} live
          </span>
          <small>{snapshot.modules.length} enabled</small>
        </div>
      </header>

      <div className="mnx-module-command">
        {snapshot.modules.length > 0 ? (
          <div className="mnx-module-grid">
            {snapshot.modules.map((module) => (
              <Link
                className="mnx-module-card mnx-module-card-compact"
                data-available={module.available ? "true" : "false"}
                href={module.href}
                key={module.id}
              >
                <header className="mnx-module-card-head">
                  <div className="mnx-module-badge-wrap">
                    <span className="mnx-module-eyebrow-tag">
                      {module.eyebrow}
                    </span>
                    <strong
                      className="mnx-module-stat-badge"
                      title={module.primaryMetric.label}
                    >
                      {module.primaryMetric.value}
                    </strong>
                  </div>
                  <h3>{module.title}</h3>
                </header>

                <p className="mnx-module-description">{module.description}</p>

                {module.supportingMetrics.length > 0 ? (
                  <div className="mnx-module-compact-metrics">
                    {module.supportingMetrics.slice(0, 2).map((metric) => (
                      <span key={metric.label}>
                        <small>{metric.label}:</small>
                        <b>{metric.value}</b>
                      </span>
                    ))}
                  </div>
                ) : null}

                <footer className="mnx-module-compact-footer">
                  <span className="mnx-module-status-pill">
                    {module.available ? "Live" : "Unavailable"}
                  </span>
                  <span className="mnx-module-open-link">
                    Open <ArrowUpRight size={14} />
                  </span>
                </footer>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mnx-module-empty">
            <ShieldCheck size={24} />
            <h3>No modules are enabled yet</h3>
            <p>
              Enable operational modules in Admin settings before this launcher
              can surface live workspaces.
            </p>
            <Link href="/admin/settings">
              Review module settings <ArrowUpRight size={14} />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
