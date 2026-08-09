import { redirect } from "next/navigation";
import { Lock } from "lucide-react";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { WorkspaceState } from "@/components/monolith";
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
