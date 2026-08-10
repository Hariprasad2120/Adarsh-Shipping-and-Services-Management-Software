import { redirect } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Info,
  Loader2,
  Lock,
  Plus,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { WorkspaceState } from "@/components/monolith";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
  AlertTitle,
} from "@/components/ui/alert";
import { SidebarLayoutSpecimen } from "./sidebar-layout-specimen";
import { TokenPaletteEditor } from "./token-palette-editor";
import "./design-system.css";

const typographySpec = [
  {
    role: "Display",
    cssVar: "--mn-type-display-size",
    className: "ds-type-display",
    sample: "Display",
  },
  {
    role: "Heading",
    cssVar: "--mn-type-heading-size",
    className: "ds-type-heading",
    sample: "Heading",
  },
  {
    role: "Section heading",
    cssVar: "--mn-type-section-heading-size-desktop",
    className: "ds-type-section-heading",
    sample: "Section heading",
  },
  {
    role: "Title",
    cssVar: "--mn-type-title-size",
    className: "ds-type-title",
    sample: "Title",
  },
  {
    role: "Body",
    cssVar: "--mn-type-body-size",
    className: "ds-type-body",
    sample: "Body",
  },
  {
    role: "Control",
    cssVar: "--mn-type-control-size",
    className: "ds-type-control",
    sample: "Control",
  },
  {
    role: "Label",
    cssVar: "--mn-type-label-size",
    className: "ds-type-label",
    sample: "Label",
  },
  {
    role: "Helper",
    cssVar: "--mn-type-helper-size",
    className: "ds-type-other",
    sample: "Helper",
  },
  {
    role: "Numeric",
    cssVar: "--mn-type-numeric-size",
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

const buttonSpec = [
  { variant: "default" as const, label: "Primary", note: "Solid, theme accent (e.g. \"New draft\")" },
  { variant: "accent" as const, label: "Accent", note: "Soft accent fill" },
  { variant: "inverse" as const, label: "Secondary", note: "Neutral surface" },
  { variant: "outline" as const, label: "Outline", note: "Bordered, transparent" },
  { variant: "destructive" as const, label: "Destructive", note: "Danger actions" },
] as const;

const badgeSpec: Array<{ variant: BadgeVariant; label: string }> = [
  { variant: "default", label: "Accent" },
  { variant: "secondary", label: "Neutral" },
  { variant: "success", label: "Success" },
  { variant: "warning", label: "Warning" },
  { variant: "destructive", label: "Danger" },
];

const alertSpec = [
  {
    variant: "info" as const,
    icon: Info,
    title: "Info",
    body: "Neutral, informational callout for context or tips.",
  },
  {
    variant: "success" as const,
    icon: CheckCircle2,
    title: "Success",
    body: "Confirms a completed action, e.g. a saved record.",
  },
  {
    variant: "warning" as const,
    icon: AlertTriangle,
    title: "Warning",
    body: "Flags something that needs attention before continuing.",
  },
  {
    variant: "destructive" as const,
    icon: XCircle,
    title: "Destructive",
    body: "Blocking error or a destructive action's consequence.",
  },
] as const;

const cardVariantSpec = [
  { className: "mnx-panel", label: "Panel (Card)", note: "Base bordered surface — the real Card component" },
  { className: "mnx-inset-card", label: "Inset card", note: "Translucent background block inside a panel" },
  { className: "mnx-metric-card", label: "Metric card", note: "KPI tile used in metric strips" },
  { className: "mnx-module-card", label: "Module card", note: "Feature tile with hover elevation" },
] as const;

const workspaceStateSpec = [
  { variant: "empty" as const, icon: CircleDashed, eyebrow: "Nothing here", title: "No records yet", description: "Data will appear here once available." },
  { variant: "loading" as const, icon: Loader2, eyebrow: "Loading", title: "Fetching records", description: "This should only take a moment." },
  { variant: "danger" as const, icon: XCircle, eyebrow: "Something went wrong", title: "Could not load data", description: "Try again or contact support if this persists." },
  { variant: "permission" as const, icon: ShieldAlert, eyebrow: "Permission required", title: "Restricted", description: "You need additional access to view this." },
] as const;

const semanticColorTokens = [
  { label: "Canvas", cssVar: "--mn-color-canvas" },
  { label: "Sidebar", cssVar: "--frappe-sidebar-bg" },
  { label: "Surface", cssVar: "--mn-color-surface" },
  { label: "Surface soft", cssVar: "--mn-color-surface-soft" },
  { label: "Surface muted", cssVar: "--mn-color-surface-muted" },
  { label: "Border", cssVar: "--mn-color-border" },
  { label: "Text", cssVar: "--mn-color-text" },
  { label: "Text muted", cssVar: "--mn-color-text-muted" },
  { label: "Primary", cssVar: "--mn-color-primary" },
  { label: "Accent", cssVar: "--mn-color-accent" },
  { label: "Success", cssVar: "--mn-color-success" },
  { label: "Warning", cssVar: "--mn-color-warning" },
  { label: "Danger", cssVar: "--mn-color-danger" },
  { label: "Info", cssVar: "--mn-color-info" },
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
        description="You need administrator access to view the Monolith production component catalogue."
        icon={<Lock size={22} />}
      />
    );
  }

  return (
    <main className="ds-page">
      <h1 className="ds-page-title">Typography</h1>
      <p className="ds-font-family">
        Font family: &quot;Inter Variable&quot;, Inter, &quot;Segoe UI&quot;, Roboto, Arial,
        sans-serif
      </p>

      <section className="ds-type-list" aria-label="Typography scale">
        {typographySpec.map((item) => (
          <div className="ds-type-row" key={item.role}>
            <p
              className={item.className}
              style={{ fontSize: `var(${item.cssVar})` }}
            >
              {item.sample}
            </p>
            <p className="ds-type-size">
              {item.role} &middot; <code>{item.cssVar}</code>
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
                <p className="ds-type-body">
                  {option.title === "Recommended" ? "Soft shadow" : "Base shadow"}
                </p>
                <p className="ds-type-other">
                  12px radius
                </p>
              </div>
            </div>
          </section>
        ))}
      </section>

      <h2 className="ds-page-title">Colors</h2>
      <p className="ds-font-family">
        Live semantic tokens from the active theme. Switching theme in the
        app shell updates these swatches automatically.
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
                <p className="ds-type-other">Live theme tokens</p>
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

      <h2 className="ds-page-title">Buttons</h2>
      <p className="ds-font-family">
        Solid variants use <code>var(--frappe-primary)</code>, which follows
        both the light/dark theme and the accent color picker automatically.
      </p>
      <section className="ds-button-grid" aria-label="Button variants">
        {buttonSpec.map((spec) => (
          <div className="ds-button-row" key={spec.variant}>
            <Button variant={spec.variant}>
              {spec.variant === "default" ? <Plus size={16} aria-hidden="true" /> : null}
              {spec.label}
            </Button>
            <p className="ds-type-other">
              {spec.label} &middot; {spec.note}
            </p>
          </div>
        ))}
      </section>

      <h2 className="ds-page-title">Badges</h2>
      <section className="ds-badge-row" aria-label="Badge variants">
        {badgeSpec.map((spec) => (
          <div className="ds-badge-item" key={spec.variant}>
            <Badge variant={spec.variant}>{spec.label}</Badge>
          </div>
        ))}
      </section>

      <h2 className="ds-page-title">Alerts</h2>
      <section className="ds-alert-stack" aria-label="Alert variants">
        {alertSpec.map((spec) => {
          const Icon = spec.icon;
          return (
            <Alert variant={spec.variant} key={spec.variant}>
              <AlertIcon>
                <Icon size={16} aria-hidden="true" />
              </AlertIcon>
              <AlertContent>
                <AlertTitle>{spec.title}</AlertTitle>
                <AlertDescription>{spec.body}</AlertDescription>
              </AlertContent>
            </Alert>
          );
        })}
      </section>

      <h2 className="ds-page-title">Highlighted row</h2>
      <p className="ds-font-family">
        Used to draw attention to a specific record, e.g. deep-linking to a
        task or expanding a row. Applies <code>--mnx-highlight-surface</code>{" "}
        as a soft accent wash over the row background.
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

      <h2 className="ds-page-title">Card variants</h2>
      <section className="ds-card-variant-grid" aria-label="Card variant examples">
        {cardVariantSpec.map((spec) => (
          <div className="ds-card-swatch" key={spec.className}>
            <div className={spec.className}>
              <p className="ds-type-heading">{spec.label}</p>
              <p className="ds-type-other">
                <code>{spec.className}</code>
              </p>
            </div>
            <p className="ds-type-body">{spec.note}</p>
          </div>
        ))}
      </section>

      <h2 className="ds-page-title">Workspace states</h2>
      <p className="ds-font-family">
        Full-page states for empty, loading, error, and permission-denied
        conditions.
      </p>
      <section className="ds-options-grid" aria-label="Workspace state variants">
        {workspaceStateSpec.map((spec) => (
          <div className="mnx-catalogue-state-preview" key={spec.variant}>
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

      <h2 className="ds-page-title">Edit color palette</h2>
      <p className="ds-font-family">
        Edit raw palette colors and preview live. Saving applies the change
        for the whole organisation.
      </p>
      <TokenPaletteEditor />

      <h2 className="ds-page-title">Page layout and sidebar</h2>
      <SidebarLayoutSpecimen />
    </main>
  );
}
