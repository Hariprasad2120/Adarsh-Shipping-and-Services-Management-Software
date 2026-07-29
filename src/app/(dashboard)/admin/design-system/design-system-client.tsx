"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUpRight,
  Check,
  CheckCircle2,
  FileText,
  LayoutGrid,
  PackageCheck,
  Plus,
  ShieldCheck,
  Sparkles,
  Type,
  X,
} from "lucide-react";
import {
  MonolithIconAction,
  MonolithSpecLabel,
  WorkspaceAction,
  WorkspaceBadge,
  WorkspaceCheckbox,
  DropdownSelect,
  FilterMenu,
  WorkspaceField,
  WorkspaceInput,
  WorkspaceMetric,
  WorkspacePage,
  WorkspacePageHeader,
  WorkspacePanel,
  WorkspaceProgress,
  WorkspaceSectionHeading,
  WorkspaceTable,
  WorkspaceTextarea,
} from "@/components/monolith";

const changeLog = [
  {
    date: "2026-07-28",
    title: "Typography source of truth",
    detail:
      'Created docs/typography.md and mapped production typography to Inter, "Segoe UI", Arial, sans-serif.',
  },
  {
    date: "2026-07-28",
    title: "Centered page rhythm",
    detail:
      "Moved page width, gutters, and bottom spacing into shared Monolith layout tokens.",
  },
  {
    date: "2026-07-28",
    title: "Numeric text reset",
    detail:
      "Removed old mono-style numerals from metrics, counters, IDs, and compact numeric displays.",
  },
  {
    date: "2026-07-28",
    title: "Showcase reference",
    detail:
      "Added this production showcase page as the living UI reference for future redesign requests.",
  },
  {
    date: "2026-07-28",
    title: "Connected metric groups",
    detail:
      "Metric summaries now render as one divided surface; actionable metrics expose a top-right redirect cue.",
  },
  {
    date: "2026-07-28",
    title: "Graphic page headers",
    detail:
      "Workspace page headers can replace left icon tiles with a right-side token graphic when the route needs a stronger hero composition.",
  },
  {
    date: "2026-07-28",
    title: "Theme order and memory",
    detail:
      "Night is the default theme, followed by Violet, Light, and Purple; the selected theme is saved for the user.",
  },
];

const typeRows = [
  ["Display", "--mn-type-display-*", "64px", "360", "-4%", "High-impact hero statements"],
  ["Heading", "--mn-type-heading-*", "32px", "430", "-3%", "Page and section titles"],
  ["Body", "--mn-type-body-*", "15px", "400", "0", "Operational descriptions"],
  ["Label", "--mn-type-label-*", "11px", "760", "+12%", "Eyebrows, fields, table heads"],
  ["Numeric", "--mn-type-numeric-*", "32px", "440", "-5%", "Metrics and counters in Inter"],
];

const tokens = [
  ["Canvas", "--mn-color-canvas", "Page background", "canvas"],
  ["Surface", "--mn-color-surface", "Cards and panels", "surface"],
  ["Accent", "--mn-color-accent", "Primary active state", "accent"],
  ["Accent soft", "--mn-color-accent-soft", "Highlights", "accentSoft"],
  ["Text", "--mn-color-text", "Readable copy", "text"],
  ["Muted", "--mn-color-text-muted", "Secondary text", "muted"],
  ["Success", "--mn-color-success", "Approved state", "success"],
  ["Danger", "--mn-color-danger", "Errors and destructive actions", "danger"],
];

const componentMap = [
  ["Page shell", "WorkspacePage", "Centered 1200px content with shared gutters"],
  ["Page header", "WorkspacePageHeader", "Hero title with copy, actions, and optional icon or right-side graphic"],
  ["Section heading", "WorkspaceSectionHeading", "Numbered heading with right-side explanatory copy"],
  ["Panel", "WorkspacePanel", "Reusable surface for sections and grouped workflows"],
  ["Metric", "WorkspaceMetric", "Connected summary group with optional redirect affordance"],
  ["Forms", "WorkspaceField/Input/DropdownSelect/Textarea", "Shared labels, controls, hints, dropdown menus, and focus states"],
  ["Tables", "WorkspaceTable", "Operational data layout with readable compact rows"],
  ["People frame", "PeopleWorkspaceFrame", "HRMS and Attendance page shell"],
  ["People action", "PeopleControlButton", "Shared People Operations command control"],
  ["People table", "PeopleDataTable", "Operational people data table contract"],
  ["Dialog", "WorkspaceDialog", "Shared modal workflow surface"],
  ["People state", "PeopleLoadingState", "Shared HRMS and Attendance loading state"],
];

const peopleOperationsNav = ["people", "People ops", "HR"] as const;

const sampleRows = [
  ["MAA-IMP-260724", "Orion Retail Pvt Ltd", "Sea import", "Assessment", "On track"],
  ["DEL-AIR-260718", "Vertex Technologies", "Air export", "Documentation", "Attention"],
  ["MUM-IMP-260701", "Atlas Foods India", "Sea import", "Delivery", "Verified"],
];

function ShowcaseSection({
  children,
  description,
  eyebrow,
  id,
  index,
  title,
}: {
  children: React.ReactNode;
  description: string;
  eyebrow: string;
  id?: string;
  index: string;
  title: string;
}) {
  return (
    <section className="mnx-showcase-section" id={id}>
      <WorkspaceSectionHeading
        index={index}
        title={title}
        description={description}
      />
      <WorkspacePanel aria-label={`${eyebrow}: ${title}`}>
        {children}
      </WorkspacePanel>
    </section>
  );
}

export default function DesignSystemClient() {
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState(["Sea", "Air"]);
  const filterOptions = ["Sea", "Air", "Attention"];

  function toggleFilter(option: string) {
    setSelectedFilters((current) =>
      current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option],
    );
  }

  return (
    <WorkspacePage className="mnx-showcase-page">
      <WorkspacePageHeader
        eyebrow="MONOLITH DESIGN SYSTEM"
        title="Production UI showcase"
        description="The reusable reference for the current redesign: Inter typography, centered page spacing, shared Monolith components, and the decisions we will keep extending as the migration moves through the product."
        icon={<LayoutGrid size={24} />}
        actions={
          <>
            <WorkspaceBadge variant="accent">Living reference</WorkspaceBadge>
            <WorkspaceAction size="compact">
              <Sparkles size={14} />
              Migration ready
            </WorkspaceAction>
          </>
        }
      />

      <section className="mnx-workspace-metrics">
        <WorkspaceMetric
          icon={<Type size={16} />}
          label="Font stack"
          value="Inter"
          detail='"Segoe UI", Arial, sans-serif fallback'
        />
        <WorkspaceMetric
          icon={<LayoutGrid size={16} />}
          label="Content width"
          value="1200"
          detail="px centered page frame"
        />
        <WorkspaceMetric
          actionIcon={<ArrowUpRight size={14} />}
          actionLabel="Jump to reusable primitives"
          href="#component-reuse"
          icon={<PackageCheck size={16} />}
          label="Reusable primitives"
          value="12"
          detail="Shared components used here"
        />
        <WorkspaceMetric
          icon={<ShieldCheck size={16} />}
          label="Themes"
          value="04"
          detail="Night, Violet, Light, Purple"
        />
      </section>

      <ShowcaseSection
        eyebrow="01 / DECISION LOG"
        index="01"
        title="Tracked redesign decisions"
        description="Each future visual rule you confirm should be appended here and in docs/design-system-showcase.md before it is reused across routes."
      >
        <div className="mnx-showcase-log">
          {changeLog.map((entry) => (
            <article key={`${entry.date}-${entry.title}`}>
              <span>{entry.date}</span>
              <div>
                <h3>{entry.title}</h3>
                <p>{entry.detail}</p>
              </div>
            </article>
          ))}
        </div>
      </ShowcaseSection>

      <ShowcaseSection
        eyebrow="02 / TYPOGRAPHY"
        index="02"
        title="Inter type scale"
        description="Large, light headings; 15px body copy; compact uppercase labels; numeric text stays in the same Inter stack."
      >
        <div className="mnx-showcase-type-grid">
          <article className="mnx-showcase-type-specimen">
            <MonolithSpecLabel>DISPLAY / 64 / -4%</MonolithSpecLabel>
            <h2>Move with clarity.</h2>
            <MonolithSpecLabel>HEADING / 32 / -3%</MonolithSpecLabel>
            <h3>Shipment intelligence</h3>
            <MonolithSpecLabel>BODY / 15 / 150%</MonolithSpecLabel>
            <p>
              Every operational decision should be understandable at a glance,
              even when the workflow beneath it is complex.
            </p>
          </article>
          <div className="mnx-showcase-token-table">
            {typeRows.map(([role, token, size, weight, tracking, use]) => (
              <article key={role}>
                <span>{role}</span>
                <code>{token}</code>
                <b>{size}</b>
                <small>{weight} / {tracking}</small>
                <p>{use}</p>
              </article>
            ))}
          </div>
        </div>
      </ShowcaseSection>

      <ShowcaseSection
        eyebrow="03 / SPACING"
        index="03"
        title="Centered content frame"
        description="All migrated pages should inherit the shared page width and gutters instead of adding local wrappers."
      >
        <div className="mnx-showcase-spacing">
          <div>
            <span>Viewport</span>
            <strong>Full shell</strong>
          </div>
          <div>
            <span>Shared gutter</span>
            <strong>32-52px</strong>
          </div>
          <div>
            <span>Content max</span>
            <strong>1240px</strong>
          </div>
          <div>
            <span>Bottom room</span>
            <strong>80px</strong>
          </div>
        </div>
      </ShowcaseSection>

      <ShowcaseSection
        eyebrow="04 / TOKENS"
        index="04"
        title="Theme-aware foundations"
        description="Showcase swatches use semantic CSS variables so Night, Violet, Light, and Purple can shift without route-level color overrides."
      >
        <div className="mnx-showcase-token-grid">
          {tokens.map(([name, token, use, tone]) => (
            <article key={token}>
              <span className={`mnx-showcase-swatch mnx-showcase-swatch-${tone}`} />
              <div>
                <h3>{name}</h3>
                <code>{token}</code>
                <p>{use}</p>
              </div>
            </article>
          ))}
        </div>
      </ShowcaseSection>

      <div className="mnx-showcase-two-column">
        <ShowcaseSection
          eyebrow="05 / ACTIONS"
          index="05"
          title="Buttons and badges"
          description="Use shared actions for all command surfaces."
        >
          <div className="mnx-showcase-button-board">
            <div>
              <MonolithSpecLabel as="p">Button hierarchy</MonolithSpecLabel>
              <div className="mnx-showcase-action-stack">
                <WorkspaceAction>
                  Create shipment
                  <Plus aria-hidden="true" />
                </WorkspaceAction>
                <WorkspaceAction variant="accent">
                  Approve checklist
                  <Check aria-hidden="true" />
                </WorkspaceAction>
                <WorkspaceAction variant="secondary">Save draft</WorkspaceAction>
                <WorkspaceAction variant="outline">
                  Export report
                  <ArrowDown aria-hidden="true" />
                </WorkspaceAction>
                <WorkspaceAction variant="destructive">Delete job</WorkspaceAction>
                <WorkspaceAction disabled>Unavailable</WorkspaceAction>
              </div>
            </div>
            <div>
              <MonolithSpecLabel as="p">Text & icon actions</MonolithSpecLabel>
              <div className="mnx-showcase-link-actions">
                <a href="#shipments">
                  View shipment
                  <ArrowUpRight aria-hidden="true" />
                </a>
                <button type="button">Edit details</button>
                <MonolithIconAction aria-label="Add">
                  <Plus aria-hidden="true" />
                </MonolithIconAction>
                <MonolithIconAction aria-label="Next" disabled>
                  <ArrowUpRight aria-hidden="true" />
                </MonolithIconAction>
                <MonolithIconAction aria-label="Delete" className="mnx-text-danger">
                  <X aria-hidden="true" />
                </MonolithIconAction>
              </div>
            </div>
          </div>
          <div className="mnx-showcase-filter-board">
            <MonolithSpecLabel as="p">Filter controls</MonolithSpecLabel>
            <div className="mnx-showcase-filter-row">
              <div className="mnx-filter-row" role="group" aria-label="Shipment mode filter">
                <button type="button" className="is-active">All</button>
                <button type="button">Sea</button>
                <button type="button">Air</button>
              </div>
              <FilterMenu
                activeCount={selectedFilters.length}
                ariaLabel="Open shipment filters"
                contentClassName="mnx-showcase-filter-menu w-[280px]"
                onOpenChange={setFilterOpen}
                open={filterOpen}
              >
                <div className="mnx-showcase-filter-menu-content">
                  <div>
                    <MonolithSpecLabel as="p">Filter by</MonolithSpecLabel>
                    <p>Refine the shipment register without leaving the table.</p>
                  </div>
                  <div className="mnx-showcase-filter-menu-options">
                    {filterOptions.map((option) => {
                      const active = selectedFilters.includes(option);

                      return (
                        <button
                          key={option}
                          type="button"
                          className={`mnx-plain mnx-menu-option ${active ? "mnx-menu-option-active" : ""}`}
                          onClick={() => toggleFilter(option)}
                        >
                          <span>{option}</span>
                          {active ? <Check aria-hidden="true" /> : null}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mnx-showcase-filter-menu-actions">
                    <WorkspaceAction
                      size="compact"
                      type="button"
                      variant="outline"
                      onClick={() => setSelectedFilters([])}
                    >
                      Clear
                    </WorkspaceAction>
                    <WorkspaceAction
                      size="compact"
                      type="button"
                      onClick={() => setFilterOpen(false)}
                    >
                      Apply
                    </WorkspaceAction>
                  </div>
                </div>
              </FilterMenu>
            </div>
          </div>
        </ShowcaseSection>

        <ShowcaseSection
          eyebrow="06 / FORMS"
          index="06"
          title="Fields and controls"
          description="Labels, controls, hints, and focus states come from workspace primitives."
        >
          <div className="mnx-showcase-form">
            <WorkspaceField label="Job number" required hint="Branch-prefixed and readable in Inter.">
              <WorkspaceInput defaultValue="MAA-IMP-260724" />
            </WorkspaceField>
            <WorkspaceField label="Branch">
              <DropdownSelect
                defaultValue="chennai"
                options={[
                  { value: "chennai", label: "Chennai" },
                  { value: "mumbai", label: "Mumbai" },
                  { value: "delhi", label: "Delhi" },
                ]}
                placeholder="Select branch"
              />
            </WorkspaceField>
            <WorkspaceField label="Notes">
              <WorkspaceTextarea defaultValue="Keep descriptions compact and readable." />
            </WorkspaceField>
            <WorkspaceCheckbox label="Show this pattern in future route migrations" defaultChecked />
          </div>
        </ShowcaseSection>
      </div>

      <ShowcaseSection
        eyebrow="07 / DATA"
        index="07"
        title="Operational table"
        description="Dense data keeps gentle dividers, compact labels, and explicit row actions."
      >
        <WorkspaceTable>
          <thead>
            <tr>
              <th>Job number</th>
              <th>Customer</th>
              <th>Mode</th>
              <th>Stage</th>
              <th>Status</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {sampleRows.map(([job, customer, mode, stage, status]) => (
              <tr key={job}>
                <td><span className="mnx-data-mono">{job}</span></td>
                <td>{customer}</td>
                <td>{mode}</td>
                <td>{stage}</td>
                <td>
                  <WorkspaceBadge
                    variant={status === "Attention" ? "warning" : status === "Verified" ? "success" : "neutral"}
                  >
                    {status}
                  </WorkspaceBadge>
                </td>
                <td>
                  <div className="mnx-table-cell-actions">
                    <WorkspaceAction size="compact" variant="secondary">
                      Open
                    </WorkspaceAction>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </WorkspaceTable>
      </ShowcaseSection>

      <ShowcaseSection
        eyebrow="08 / REUSE MAP"
        index="08"
        title="What to use next"
        description="When redesigning a route, start with these shared primitives and extend the central CSS only when a reusable pattern is missing."
        id="component-reuse"
      >
        <div className="mnx-showcase-reuse-grid">
          {componentMap.map(([pattern, component, rule]) => (
            <article key={component}>
              <FileText size={16} />
              <div>
                <h3>{pattern}</h3>
                <code>{component}</code>
                <p>{rule}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="mnx-showcase-progress">
          <div>
            <MonolithSpecLabel>Migration baseline</MonolithSpecLabel>
            <p>
              Use this page as the visual source after the protected dashboard,
              including the {peopleOperationsNav[1]} catalogue entry.
            </p>
          </div>
          <WorkspaceProgress label="Reusable design-system readiness" value={82} />
          <CheckCircle2 size={18} />
        </div>
      </ShowcaseSection>
    </WorkspacePage>
  );
}
