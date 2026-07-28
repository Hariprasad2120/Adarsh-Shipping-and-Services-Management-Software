import {
  ArrowUpRight,
  CheckCircle2,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import type { DashboardModuleSnapshot } from "@/modules/dashboard/types";

interface ModuleCommandCenterProps {
  snapshot: DashboardModuleSnapshot;
}

function formatSnapshotTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function ModuleCommandCenter({ snapshot }: ModuleCommandCenterProps) {
  const availableCount = snapshot.modules.filter((module) => module.available).length;

  return (
    <section className="mnx-module-command" aria-labelledby="module-command-title">
      <header className="mnx-module-command-header">
        <div>
          <span className="mnx-dashboard-spec-label">ENABLED OPERATIONS</span>
          <h2 id="module-command-title">Module command center</h2>
          <p>
            A live pulse from the workspaces enabled for your organization and available to your
            role.
          </p>
        </div>
        <div className="mnx-module-command-status" title={`Updated at ${formatSnapshotTime(snapshot.generatedAt)}`}>
          <span><i />{availableCount} live</span>
          <small>{snapshot.modules.length} enabled</small>
        </div>
      </header>

      {snapshot.modules.length > 0 ? (
        <div className="mnx-module-grid">
          {snapshot.modules.map((module) => {
            return (
              <article
                className="mnx-module-card"
                data-tone={module.tone}
                key={module.id}
              >
                <header>
                  <div>
                    <span>{module.eyebrow}</span>
                    <h3>{module.title}</h3>
                  </div>
                  <span
                    className={`mnx-module-health ${module.available ? "is-live" : "is-unavailable"}`}
                  >
                    {module.available ? <CheckCircle2 size={13} /> : <TriangleAlert size={13} />}
                    {module.available ? "Live" : "Unavailable"}
                  </span>
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
                  <Link className="mnx-module-open-link" href={module.href}>
                    Open module <ArrowUpRight size={14} />
                  </Link>
                  {module.actions.slice(1, 2).map((action) => (
                    <Link className="mnx-module-secondary-link" href={action.href} key={action.href}>
                      {action.label}
                    </Link>
                  ))}
                </footer>
              </article>
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
    </section>
  );
}
