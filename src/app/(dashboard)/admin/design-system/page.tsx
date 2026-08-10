import { redirect } from "next/navigation";
import {
  CircleDashed,
  Loader2,
  Lock,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { WorkspaceState } from "@/components/monolith";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { ActionFilterSpecimen } from "./action-filter-specimen";
import { AlertSpecimen } from "./alert-specimen";
import { DataTableSpecimen } from "./data-table-specimen";
import { InputFieldSpecimen } from "./input-field-specimen";
import { SidebarLayoutSpecimen } from "./sidebar-layout-specimen";
import "./design-system.css";

const typographySpec = [
  {
    role: "Heading",
    token: "--ds-type-heading-size",
    className: "ds-type-heading",
    sample: "Heading",
  },
  {
    role: "Body",
    token: "--ds-type-body-size",
    className: "ds-type-body",
    sample: "Body",
  },
  {
    role: "Label",
    token: "--ds-type-label-size",
    className: "ds-type-label",
    sample: "Label",
  },
  {
    role: "Numeric",
    token: "--ds-type-numeric-size",
    className: "ds-type-numeric",
    sample: "1,024",
  },
] as const;

const cardSystemOptions = [
  {
    title: "Recommended",
    raisedCardClassName: "ds-card-sample ds-card-sample-soft",
  },
] as const;

const badgeSpec: Array<{ variant: BadgeVariant; label: string }> = [
  { variant: "default", label: "Accent" },
  { variant: "secondary", label: "Neutral" },
  { variant: "success", label: "Success" },
  { variant: "warning", label: "Warning" },
  { variant: "destructive", label: "Danger" },
];

const workspaceStateSpec = [
  {
    variant: "empty" as const,
    icon: CircleDashed,
    eyebrow: "Nothing here",
    title: "No records yet",
    description: "Data will appear here once available.",
  },
  {
    variant: "loading" as const,
    icon: Loader2,
    eyebrow: "Loading",
    title: "Fetching records",
    description: "This should only take a moment.",
  },
  {
    variant: "danger" as const,
    icon: XCircle,
    eyebrow: "Something went wrong",
    title: "Could not load data",
    description: "Try again or contact support if this persists.",
  },
  {
    variant: "permission" as const,
    icon: ShieldAlert,
    eyebrow: "Permission required",
    title: "Restricted",
    description: "You need additional access to view this.",
  },
] as const;

const semanticColorTokens = [
  { label: "Canvas", cssVar: "--ds-color-canvas" },
  { label: "Sidebar", cssVar: "--ds-color-sidebar" },
  { label: "Surface", cssVar: "--ds-color-surface" },
  { label: "Surface muted", cssVar: "--ds-color-surface-muted" },
  { label: "Border", cssVar: "--ds-color-border" },
  { label: "Text", cssVar: "--ds-color-text" },
  { label: "Text muted", cssVar: "--ds-color-text-muted" },
  { label: "Accent", cssVar: "--ds-color-icon-accent" },
  { label: "Accent inverse", cssVar: "--ds-color-icon-inverse" },
  { label: "Success surface", cssVar: "--ds-color-success-surface" },
  { label: "Success text", cssVar: "--ds-color-success-text" },
  { label: "Highlight", cssVar: "--ds-color-highlight-surface" },
] as const;

export default async function AdminDesignSystemPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const allowed = await can(session.user.id, "admin.org.manage");
  if (!allowed) {
    return (
      <WorkspaceState
        variant="permission"
        eyebrow="Permission required"
        title="Design system"
        description="You need administrator access to view the standalone design system page."
        icon={<Lock size={22} />}
      />
    );
  }

  return (
    <main className="ds-page">
      <h1 className="ds-page-title">Typography</h1>
      <p className="ds-font-family">
        Font family: <code>--ds-font-sans</code>. Scale kept to heading,
        body, label, and numeric only.
      </p>

      <section className="ds-type-list" aria-label="Typography scale">
        {typographySpec.map((item) => (
          <div className="ds-type-row" key={item.role}>
            <p className={item.className}>{item.sample}</p>
            <p className="ds-type-size">
              {item.role} · <code>{item.token}</code>
            </p>
          </div>
        ))}
      </section>

      <h2 className="ds-page-title">Cards</h2>
      <section className="ds-options-grid" aria-label="Card system options">
        {cardSystemOptions.map((option) => (
          <section className="ds-option-column" key={option.title}>
            <p className="ds-type-heading">{option.title}</p>
            <div className="ds-card-stack">
              <div className={option.raisedCardClassName}>
                <p className="ds-type-other">Raised card</p>
                <p className="ds-type-body">Soft shadow</p>
                <p className="ds-type-other">12px radius</p>
              </div>
            </div>
          </section>
        ))}
      </section>

      <h2 className="ds-page-title">Colors</h2>
      <p className="ds-font-family">
        These are the only local surface and text colors used by this page in
        light and dark mode.
      </p>
      <section className="ds-theme-panel" aria-label="Theme colors">
        <div className="ds-theme-preview">
          <div className="ds-theme-sidebar" />
          <div className="ds-theme-main">
            <div className="ds-theme-topbar" />
            <div className="ds-theme-surface">
              <div className="ds-theme-chip" />
              <div className="ds-theme-copy">
                <p className="ds-type-body">Surface preview</p>
                <p className="ds-type-other">Local page palette</p>
              </div>
            </div>
          </div>
        </div>

        <div className="ds-color-list">
          {semanticColorTokens.map((color) => (
            <div className="ds-color-row" key={color.cssVar}>
              <div
                className="ds-color-swatch"
                style={{ background: `var(${color.cssVar})` }}
                aria-hidden="true"
              />
              <p className="ds-type-body">{color.label}</p>
              <p className="ds-type-other">
                <code>{color.cssVar}</code>
              </p>
            </div>
          ))}
        </div>
      </section>

      <h2 className="ds-page-title">Actions and filters</h2>
      <p className="ds-font-family">
        Keep only the controls we actually need from the ERP-style list view:
        icon actions, the primary add button, filters, clear, sort, and the
        open filter panel.
      </p>
      <ActionFilterSpecimen />

      <h2 className="ds-page-title">Inputs</h2>
      <p className="ds-font-family">
        Rebuilt canonical form controls: text input, dropdown/combobox,
        date picker, and checkbox.
      </p>
      <InputFieldSpecimen />

      <h2 className="ds-page-title">Data tables</h2>
      <p className="ds-font-family">
        Shared table primitives arranged into an ERP-style register with column
        filters, select rows, status pills, and trailing row metadata.
      </p>
      <DataTableSpecimen />

      <h2 className="ds-page-title">Sidebar</h2>
      <p className="ds-font-family">
        Shared reference sidebar recreated from the supplied video and driven by the
        real Monolith navigation structure.
      </p>
      <SidebarLayoutSpecimen />

      <h2 className="ds-page-title">Badges</h2>
      <section className="ds-badge-row" aria-label="Badge variants">
        {badgeSpec.map((spec) => (
          <div className="ds-badge-item" key={spec.variant}>
            <Badge variant={spec.variant}>{spec.label}</Badge>
          </div>
        ))}
      </section>

      <h2 className="ds-page-title">Alerts</h2>
      <AlertSpecimen />

      <h2 className="ds-page-title">Highlighted row</h2>
      <p className="ds-font-family">
        Used to draw attention to a specific record, e.g. deep-linking to a
        task or expanding a row. Applies <code>--ds-color-highlight-surface</code>{" "}
        as a soft wash over the row background.
      </p>
      <section className="ds-highlight-demo" aria-label="Highlighted row example">
        <div className="ds-highlight-row">
          <p className="ds-type-body">Regular row</p>
          <p className="ds-type-other">Default background</p>
        </div>
        <div className="ds-highlight-row is-highlighted">
          <p className="ds-type-body">Highlighted row</p>
          <p className="ds-type-other">is-highlighted</p>
        </div>
      </section>

      <h2 className="ds-page-title">Workspace states</h2>
      <p className="ds-font-family">
        Full-page states for empty, loading, error, and permission-denied
        conditions.
      </p>
      <section className="ds-options-grid" aria-label="Workspace state variants">
        {workspaceStateSpec.map((spec) => (
          <div className="ds-state-preview" key={spec.variant}>
            <WorkspaceState
              variant={spec.variant}
              eyebrow={spec.eyebrow}
              title={spec.title}
              description={spec.description}
              icon={<spec.icon size={22} aria-hidden="true" />}
            />
          </div>
        ))}
      </section>
    </main>
  );
}
