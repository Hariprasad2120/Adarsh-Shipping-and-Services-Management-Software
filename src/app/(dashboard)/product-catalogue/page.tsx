"use client";

import type { KeyboardEvent } from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as LucideIcons from "lucide-react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Code2,
  Filter,
  GitMerge,
  Layers3,
  Printer,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { WorkspaceAction, WorkspaceBadge, WorkspaceField, WorkspaceInput, WorkspaceMetric, WorkspacePage, WorkspacePageHeader, WorkspacePanel, WorkspacePanelHeader, WorkspaceSelect } from "@/components/layout/workspace";
import { WorkspaceEmptyState } from "@/components/feedback/workspace-states";
import {
  benefits,
  ctaContent,
  detailedWorkflowStages,
  moduleInteractions,
  modules,
  problems,
  productOverview,
  solutions,
} from "@/lib/catalogue-data";

type CatalogueView = "timeline" | "blueprint";

function moduleStatusVariant(status: string) {
  if (status === "Implemented") return "success" as const;
  if (status === "Partial") return "warning" as const;
  return "neutral" as const;
}

function DynamicIcon({
  name,
  size = 18,
}: {
  name: string;
  size?: number;
}) {
  const icons = LucideIcons as unknown as Record<
    string,
    LucideIcons.LucideIcon
  >;
  const Icon = icons[name] ?? Layers3;
  return <Icon size={size} aria-hidden="true" />;
}

export default function ProductCataloguePage() {
  const router = useRouter();
  const [activeModuleId, setActiveModuleId] = useState("ams");
  const [activeStageId, setActiveStageId] = useState("due_notified");
  const [view, setView] = useState<CatalogueView>("timeline");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredModules = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return modules.filter((module) => {
      if (statusFilter !== "all" && module.status !== statusFilter) return false;
      if (!query) return true;
      return (
        module.name.toLowerCase().includes(query)
        || module.shortDescription.toLowerCase().includes(query)
        || module.keyFeatures.some((feature) =>
          feature.toLowerCase().includes(query),
        )
        || module.lifecycleGuide.functions.some((fn) =>
          fn.name.toLowerCase().includes(query),
        )
      );
    });
  }, [searchQuery, statusFilter]);

  const activeModule =
    modules.find((module) => module.id === activeModuleId) ?? modules[0]!;
  const currentStages = detailedWorkflowStages.filter(
    (stage) => stage.moduleId === activeModule.id,
  );
  const activeStage =
    currentStages.find((stage) => stage.stageId === activeStageId)
    ?? currentStages[0]
    ?? detailedWorkflowStages[0]!;

  function selectModule(moduleId: string) {
    setActiveModuleId(moduleId);
    const firstStage = detailedWorkflowStages.find(
      (stage) => stage.moduleId === moduleId,
    );
    if (firstStage) setActiveStageId(firstStage.stageId);
  }

  function selectFilteredModule(moduleId: string) {
    selectModule(moduleId);
    setSearchQuery("");
    setStatusFilter("all");
    window.requestAnimationFrame(() => {
      document
        .getElementById("catalogue-workflow")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function handleModuleCardKeyDown(
    event: KeyboardEvent<HTMLElement>,
    moduleId: string,
  ) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    selectFilteredModule(moduleId);
  }

  return (
    <WorkspacePage className="mnx-catalogue-page">
      <WorkspacePageHeader
        className="mnx-catalogue-page-header"
        eyebrow="Enterprise system manual"
        title="Product Catalogue"
        icon={<BookOpen size={21} aria-hidden="true" />}
        description="Browse modules, workflows, controls, and outcomes."
        actions={
          <WorkspaceAction
            className="mnx-no-print"
            onClick={() => window.print()}
          >
            <Printer size={15} aria-hidden="true" />
            Export brochure
          </WorkspaceAction>
        }
      />

      <WorkspacePanel className="mnx-catalogue-index-panel mnx-no-print">
        <WorkspacePanelHeader
          eyebrow="Catalogue index"
          title="Find a module"
          description={`${filteredModules.length} of ${modules.length} modules match the current view.`}
          actions={<Filter size={17} aria-hidden="true" />}
        />
        <div className="mnx-catalogue-filter-grid">
          <WorkspaceField label="Search" htmlFor="catalogue-search">
            <div className="mnx-search-field">
              <Search size={15} aria-hidden="true" />
              <WorkspaceInput
                id="catalogue-search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Modules, features, or functions"
              />
            </div>
          </WorkspaceField>
          <WorkspaceField label="Delivery status" htmlFor="catalogue-status">
            <WorkspaceSelect
              id="catalogue-status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="Implemented">Implemented</option>
              <option value="Partial">Partial</option>
              <option value="Planned">Planned</option>
            </WorkspaceSelect>
          </WorkspaceField>
        </div>

        {filteredModules.length === 0 ? (
          <div className="mnx-panel-state">
            <WorkspaceEmptyState
              title="No modules found"
              description="Try a broader search or change the delivery-status filter."
            />
          </div>
        ) : (
          <div className="mnx-catalogue-module-grid">
            {filteredModules.map((module) => (
              <WorkspacePanel
                interactive
                key={module.id}
                className="mnx-catalogue-module-card"
                onClick={() => selectFilteredModule(module.id)}
                onKeyDown={(event) => handleModuleCardKeyDown(event, module.id)}
                role="button"
                tabIndex={0}
              >
                <span>
                  <DynamicIcon name={module.iconName} />
                </span>
                <div>
                  <WorkspaceBadge variant={moduleStatusVariant(module.status)}>
                    {module.status}
                  </WorkspaceBadge>
                  <h2>{module.name}</h2>
                  <p>{module.shortDescription}</p>
                  <small>{module.keyFeatures.slice(0, 2).join(" · ")}</small>
                </div>
                <ArrowRight size={16} aria-hidden="true" />
              </WorkspacePanel>
            ))}
          </div>
        )}
      </WorkspacePanel>

      <WorkspacePanel className="mnx-catalogue-intro">
        <div className="mnx-catalogue-intro-copy">
          <WorkspaceBadge variant="accent">{productOverview.tagline}</WorkspaceBadge>
          <h2>{productOverview.name}</h2>
          <p>{productOverview.description}</p>
          <blockquote>
            <b>Business outcome</b>
            {productOverview.keyBusinessValue}
          </blockquote>
          <div className="mnx-catalogue-intro-actions mnx-no-print">
            <ButtonLink href="#catalogue-workflow" variant="default">
              Explore workflows
              <ArrowRight size={14} aria-hidden="true" />
            </ButtonLink>
            <ButtonLink href="#catalogue-benefits" variant="outline">
              Review outcomes
            </ButtonLink>
          </div>
        </div>
        <div className="mnx-catalogue-engine" aria-hidden="true">
          <span><Layers3 size={31} /></span>
          <i /><i /><i />
          {modules.slice(0, 4).map((module) => (
            <b key={module.id}>
              <DynamicIcon name={module.iconName} size={15} />
            </b>
          ))}
        </div>
      </WorkspacePanel>

      <section className="mnx-workspace-metrics mnx-catalogue-capability-grid">
        {productOverview.highlightCards.map((card, index) => (
          <WorkspaceMetric
            key={card.title}
            icon={
              index % 2 === 0
                ? <ShieldCheck size={17} aria-hidden="true" />
                : <Sparkles size={17} aria-hidden="true" />
            }
            label={`Capability ${String(index + 1).padStart(2, "0")}`}
            value={card.title}
            detail={card.description}
            className="mnx-catalogue-capability"
          />
        ))}
      </section>

      <section className="mnx-catalogue-split">
        <WorkspacePanel className="mnx-catalogue-audit-panel">
          <WorkspacePanelHeader
            eyebrow="Operational friction"
            title="Problems the platform removes"
          />
          <div className="mnx-catalogue-audit-list">
            {problems.map((problem) => (
              <article key={problem.id}>
                <WorkspaceBadge variant="danger">{problem.metric}</WorkspaceBadge>
                <h3>{problem.title}</h3>
                <p>{problem.description}</p>
              </article>
            ))}
          </div>
        </WorkspacePanel>
        <WorkspacePanel className="mnx-catalogue-audit-panel">
          <WorkspacePanelHeader
            eyebrow="Platform response"
            title="Monolith resolutions"
          />
          <div className="mnx-catalogue-audit-list">
            {solutions.map((solution) => (
              <article key={solution.id}>
                <WorkspaceBadge variant="success">Connected</WorkspaceBadge>
                <h3>{solution.title}</h3>
                <p>{solution.description}</p>
              </article>
            ))}
          </div>
        </WorkspacePanel>
      </section>

      <WorkspacePanel id="catalogue-workflow" className="mnx-catalogue-workflow">
        <WorkspacePanelHeader
          eyebrow="Interactive technical manual"
          title={activeModule.name}
          description={activeModule.shortDescription}
          actions={
            <div className="mnx-catalogue-view-actions mnx-no-print">
              <Button
                size="sm"
                variant={view === "timeline" ? "default" : "inverse"}
                onClick={() => setView("timeline")}
              >
                Workflow
              </Button>
              <Button
                size="sm"
                variant={view === "blueprint" ? "default" : "inverse"}
                onClick={() => setView("blueprint")}
              >
                Blueprint
              </Button>
            </div>
          }
        />

        <div className="mnx-catalogue-tabs mnx-no-print" role="tablist">
          {modules.map((module) => (
            <Button
              key={module.id}
              role="tab"
              aria-selected={activeModule.id === module.id}
              size="sm"
              variant={activeModule.id === module.id ? "default" : "inverse"}
              className={activeModule.id === module.id ? "is-active" : ""}
              onClick={() => selectModule(module.id)}
            >
              <DynamicIcon name={module.iconName} size={15} />
              {module.name.replace(" MODULE", "").replace(" SYSTEM", "")}
            </Button>
          ))}
        </div>

        {view === "timeline" ? (
          <div className="mnx-catalogue-workflow-grid">
            <nav aria-label={`${activeModule.name} workflow stages`}>
              {currentStages.map((stage, index) => (
                <Button
                  key={stage.stageId}
                  variant={activeStage.stageId === stage.stageId ? "default" : "inverse"}
                  className={[
                    "mnx-catalogue-stage-button",
                    activeStage.stageId === stage.stageId ? "is-active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => setActiveStageId(stage.stageId)}
                >
                  <span className="mnx-catalogue-stage-button-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="mnx-catalogue-stage-button-copy">
                    <b>{stage.stageName}</b>
                    <small>{stage.durationLabel}</small>
                  </span>
                  <span className="mnx-catalogue-stage-button-icon" aria-hidden="true">
                    <DynamicIcon name={stage.iconName} size={15} />
                  </span>
                </Button>
              ))}
            </nav>

            <article className="mnx-catalogue-stage">
              <header>
                <span><DynamicIcon name={activeStage.iconName} size={21} /></span>
                <div>
                  <WorkspaceBadge variant="accent">
                    {activeStage.durationLabel}
                  </WorkspaceBadge>
                  <h2>{activeStage.stageName}</h2>
                  <p>{activeStage.summary}</p>
                </div>
              </header>
              <p>{activeStage.description}</p>

              <section>
                <h3><Code2 size={15} /> Backend functions</h3>
                <div className="mnx-catalogue-function-list">
                  {activeStage.backendFunctions.map((fn) => (
                    <article key={fn.name}>
                      <b>{fn.name}</b>
                      <code>{fn.signature}</code>
                      <p>{fn.description}</p>
                      <div className="mnx-chip-row">
                        {fn.mutations.map((mutation) => (
                          <WorkspaceBadge variant="neutral" key={mutation}>
                            {mutation}
                          </WorkspaceBadge>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <div className="mnx-catalogue-stage-grid">
                <section>
                  <h3><ShieldCheck size={15} /> RBAC governance</h3>
                  <div className="mnx-stack">
                    {activeStage.userActions.map((action) => (
                      <article key={`${action.role}-${action.permission}`}>
                        <b>{action.role}</b>
                        <WorkspaceBadge variant="warning">
                          {action.permission}
                        </WorkspaceBadge>
                        <p>{action.description}</p>
                      </article>
                    ))}
                  </div>
                </section>
                <section>
                  <h3><GitMerge size={15} /> Integrations</h3>
                  <div className="mnx-chip-row">
                    {activeStage.integrations.map((integration) => (
                      <WorkspaceBadge variant="accent" key={integration}>
                        {integration}
                      </WorkspaceBadge>
                    ))}
                  </div>
                </section>
              </div>
            </article>
          </div>
        ) : (
          <div className="mnx-catalogue-blueprint">
            <article className="mnx-catalogue-blueprint-summary">
              <WorkspaceBadge variant={moduleStatusVariant(activeModule.status)}>
                {activeModule.status}
              </WorkspaceBadge>
              <h2>{activeModule.lifecycleGuide.summary}</h2>
              {activeModule.lifecycleGuide.fullProcessExplanation
                .split("\n\n")
                .map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </article>

            <section>
              <h3>Start-to-end lifecycle</h3>
              <div className="mnx-catalogue-step-grid">
                {activeModule.lifecycleGuide.steps.map((step, index) => (
                  <article key={`${step.stepNumber}-${step.title}`}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <b>{step.title}</b>
                      <p>{step.description}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section>
              <h3>Core backend logic</h3>
              <div className="mnx-catalogue-function-list">
                {activeModule.lifecycleGuide.functions.map((fn) => (
                  <article key={fn.name}>
                    <b>{fn.name}</b>
                    <code>{fn.signature}</code>
                    <div className="mnx-catalogue-function-grid">
                      <p><strong>Behavior</strong>{fn.behavior}</p>
                      <p><strong>Usage</strong>{fn.usage}</p>
                    </div>
                    <div className="mnx-chip-row">
                      {fn.mutations.map((mutation) => (
                        <WorkspaceBadge variant="neutral" key={mutation}>
                          {mutation}
                        </WorkspaceBadge>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}
      </WorkspacePanel>

      <WorkspacePanel className="mnx-catalogue-dossier">
        <WorkspacePanelHeader
          eyebrow="Module dossier"
          title={activeModule.name}
          description={activeModule.detailedDescription}
          actions={
            <WorkspaceBadge variant={moduleStatusVariant(activeModule.status)}>
              {activeModule.status}
            </WorkspaceBadge>
          }
        />
        <div className="mnx-catalogue-dossier-grid">
          <DossierList title="Key features" items={activeModule.keyFeatures} />
          <DossierList title="How it works" items={activeModule.howItWorks} numbered />
          <DossierList title="Primary users" items={activeModule.users} />
          <DossierList title="Business benefits" items={activeModule.businessBenefits} />
          <DossierList title="Integrations" items={activeModule.integrations} />
          <article>
            <h3>Example workflow</h3>
            <p>{activeModule.exampleWorkflow}</p>
            <WorkspaceBadge variant="accent">{activeModule.ctaLabel}</WorkspaceBadge>
          </article>
        </div>
      </WorkspacePanel>

      {activeModule.setupGuide ? (
        <WorkspacePanel>
          <WorkspacePanelHeader
            eyebrow="Implementation guide"
            title={`${activeModule.name} setup and first-month launch`}
            description={activeModule.setupGuide.summary}
          />
          <div className="mnx-catalogue-dossier-grid">
            <DossierList
              title="Prerequisites"
              items={activeModule.setupGuide.prerequisites}
              numbered
            />
            <DossierList
              title="Setup sequence"
              items={activeModule.setupGuide.setupSteps}
              numbered
            />
            <DossierList
              title="July 2026 demo runbook"
              items={activeModule.setupGuide.firstMonthRunbook}
              numbered
            />
            <DossierList
              title="Working checks"
              items={activeModule.setupGuide.workingChecks}
            />
          </div>
        </WorkspacePanel>
      ) : null}

      <WorkspacePanel>
        <WorkspacePanelHeader
          eyebrow="Cross-module connectivity"
          title="Platform data interactions"
          description="Operational records move between modules without duplicate entry."
        />
        <div className="mnx-catalogue-interaction-grid">
          {moduleInteractions.map((interaction) => (
            <article key={`${interaction.fromModule}-${interaction.toModule}`}>
              <div>
                <WorkspaceBadge variant="accent">{interaction.fromModule}</WorkspaceBadge>
                <GitMerge size={14} aria-hidden="true" />
                <WorkspaceBadge variant="neutral">{interaction.toModule}</WorkspaceBadge>
              </div>
              <p>{interaction.description}</p>
            </article>
          ))}
        </div>
      </WorkspacePanel>

      <WorkspacePanel id="catalogue-benefits" className="mnx-catalogue-benefits">
        <header>
          <span>Economic outcomes</span>
          <h2>Operational value delivered</h2>
        </header>
        <div>
          {benefits.map((benefit) => (
            <article key={benefit.title}>
              <CheckCircle2 size={18} aria-hidden="true" />
              <h3>{benefit.title}</h3>
              <p>{benefit.description}</p>
              <WorkspaceBadge variant="success">{benefit.highlight}</WorkspaceBadge>
            </article>
          ))}
        </div>
      </WorkspacePanel>

      <WorkspacePanel className="mnx-catalogue-cta mnx-no-print">
        <WorkspaceBadge variant="accent">One engine · Total control</WorkspaceBadge>
        <h2>{ctaContent.title}</h2>
        <p>{ctaContent.text}</p>
        <div className="mnx-catalogue-cta-actions">
          <WorkspaceAction variant="primary" onClick={() => router.push("/crm/leads/new")}>
            {ctaContent.primaryCta}
            <ArrowRight size={14} aria-hidden="true" />
          </WorkspaceAction>
          <ButtonLink
            href="mailto:solutions@monolithengine.internal"
            variant="outline"
          >
            {ctaContent.secondaryCta}
          </ButtonLink>
        </div>
      </WorkspacePanel>
    </WorkspacePage>
  );
}

function DossierList({
  items,
  numbered = false,
  title,
}: {
  items: string[];
  numbered?: boolean;
  title: string;
}) {
  return (
    <article>
      <h3>{title}</h3>
      <ol className={numbered ? "is-numbered" : undefined}>
        {items.map((item, index) => (
          <li key={item}>
            {numbered ? <span>{String(index + 1).padStart(2, "0")}</span> : null}
            {item}
          </li>
        ))}
      </ol>
    </article>
  );
}
