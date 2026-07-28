"use client";

import { useState, useEffect } from "react";

const navItems = [
  ["overview", "Overview", "⌂"],
  ["foundations", "Foundations", "◐"],
  ["typography", "Typography", "Aa"],
  ["actions", "Actions", "↗"],
  ["forms", "Forms", "⌑"],
  ["surfaces", "Surfaces", "□"],
  ["feedback", "Feedback", "!"],
  ["data", "Data display", "≡"],
  ["navigation", "Navigation", "◇"],
  ["motion", "Motion", "∿"],
];

const colors = [
  ["Ink", "#11120E", "Primary text · strong surfaces"],
  ["Paper", "#F7F7F2", "Page and card background"],
  ["Signal Yellow", "#F9D972", "Primary accent · active states"],
  ["Soft Yellow", "#FCE8A8", "Highlights · secondary emphasis"],
  ["Mist", "#E8E9E2", "Borders · disabled fills"],
  ["Slate", "#77786F", "Secondary text · icons"],
  ["Success", "#E6F3EA", "Completed · approved"],
  ["Danger", "#FCECEB", "Errors · destructive actions"],
];

const shipments = [
  ["MAA-IMP-260724", "Orion Retail Pvt Ltd", "Sea Import", "Assessment", "On track"],
  ["DEL-AIR-260718", "Vertex Technologies", "Air Export", "Documentation", "Attention"],
  ["MUM-IMP-260701", "Atlas Foods India", "Sea Import", "Delivery", "Completed"],
];

const themes = [
  { id: "light", label: "Light", icon: "○" },
  { id: "night", label: "Night", icon: "●" },
  { id: "violet", label: "Violet", icon: "◆" },
] as const;

type Theme = (typeof themes)[number]["id"];

const themePalettes = [
  { name: "Light", note: "Warm operational", colors: ["#EFF0EB", "#FFFEF9", "#11120E", "#F9D972"] },
  { name: "Night", note: "True neutral black", colors: ["#000000", "#090909", "#F7F7F7", "#F9D972"] },
  { name: "Violet Night", note: "Reference palette", colors: ["#0A0B13", "#181827", "#F8F7FF", "#B5AAF5"] },
];

function SectionTitle({
  eyebrow,
  title,
  copy,
}: {
  eyebrow: string;
  title: string;
  copy: string;
}) {
  return (
    <header className="section-heading">
      <div>
        <span className="section-index">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      <p>{copy}</p>
    </header>
  );
}

function CopyToken({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="copy-token"
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1000);
      }}
      aria-label={`Copy ${value}`}
    >
      {copied ? "Copied" : value}
    </button>
  );
}

export default function Home() {
  const [theme, setTheme] = useState<Theme>("light");
  const [active, setActive] = useState("overview");
  const [enabled, setEnabled] = useState(true);
  const [filter, setFilter] = useState("All");
  const [selectOpen, setSelectOpen] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("theme") as Theme | null;
    if (saved && ["light", "night", "violet"].includes(saved)) {
      setTheme(saved);
    }
  }, []);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.remove("theme-light", "theme-night", "theme-violet");
    document.documentElement.classList.add(`theme-${newTheme}`);
  };

  const activeColors = theme === "violet"
    ? [
        ["Night Ink", "#0A0B13", "Primary canvas · deep surfaces"],
        ["Violet Surface", "#181827", "Cards · navigation surfaces"],
        ["Violet Primary", "#B5AAF5", "Primary actions · active states"],
        ["Violet Highlight", "#CBBDE1", "Highlights · secondary emphasis"],
        ["Violet Mist", "#282A34", "Borders · disabled fills"],
        ["Violet Slate", "#9493A2", "Secondary text · icons"],
        ["Success", "#E6F3EA", "Completed · approved"],
        ["Danger", "#FCECEB", "Errors · destructive actions"],
      ]
    : colors;

  function navigate(id: string) {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <main className={`system-page theme-${theme}`}>
      <aside className="sidebar">
        <a className="brand" href="#overview" onClick={() => setActive("overview")}>
          <span className="brand-mark"><i /><i /></span>
          <span><b>MONOLITH</b><small>Design system · v1.0</small></span>
        </a>

        <nav aria-label="Design system sections">
          <p>LIBRARY</p>
          {navItems.map(([id, label, icon]) => (
            <button
              key={id}
              type="button"
              className={active === id ? "active" : ""}
              onClick={() => navigate(id)}
            >
              <span>{icon}</span>{label}
            </button>
          ))}
        </nav>

        <div className="side-note">
          <span className="pulse-dot" />
          <div><b>System status</b><small>42 components ready</small></div>
        </div>
      </aside>

      <div className="shell">
        <header className="topbar">
          <div className="breadcrumbs"><span>Monolith</span><i>/</i><b>Design system</b></div>
          <div className="top-actions">
            <div className="search">
              <span>⌕</span>
              <input
                aria-label="Search components"
                placeholder="Search components…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <kbd>⌘ K</kbd>
            </div>
            <button className="icon-button notification" aria-label="Notifications">♢<i /></button>
            <div className="theme-picker" role="group" aria-label="Preview theme">
              {themes.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={theme === item.id ? "active" : ""}
                  onClick={() => handleThemeChange(item.id)}
                  aria-pressed={theme === item.id}
                  title={`${item.label} theme`}
                >
                  <i>{item.icon}</i><span>{item.label}</span>
                </button>
              ))}
            </div>
            <button className="avatar" aria-label="Open profile">PJ</button>
          </div>
        </header>

        <div className="content">
          <section id="overview" className="hero">
            <div className="hero-copy">
              <span className="kicker"><i /> MONOLITH INTERFACE LANGUAGE</span>
              <h1>Quiet structure.<br /><em>Decisive action.</em></h1>
              <p>A warm, precise system for building logistics software that feels intelligent, calm and unmistakably Monolith.</p>
              <div className="hero-actions">
                <button className="btn primary" onClick={() => navigate("foundations")}>Explore components <span>↗</span></button>
                <button className="btn ghost">Implementation guide</button>
              </div>
            </div>

            <div className="hero-board">
              <div className="hero-stat">
                <span>COMPONENT COVERAGE</span><strong>94<sup>%</sup></strong>
                <div className="progress"><i /></div>
                <small>Production-ready patterns</small>
              </div>
              <div className="hero-mini">
                <div><span>42</span><small>Components</small></div>
                <div><span>08</span><small>Core tokens</small></div>
              </div>
              <div className="orbit" aria-hidden="true"><i /><b>◆</b><span /></div>
            </div>
          </section>

          <section id="foundations" className="system-section">
            <SectionTitle eyebrow="01" title="Colour system" copy="A restrained palette built around operational clarity, warm contrast and a single high-energy accent." />
            <div className="color-grid">
              {activeColors.map(([name, hex, use], index) => (
                <article className={`color-card color-${index}`} key={name}>
                  <div className="swatch" style={{ background: hex }}><span>{index < 4 ? "Aa" : "01"}</span></div>
                  <div><b>{name}</b><CopyToken value={hex} /><p>{use}</p></div>
                </article>
              ))}
            </div>
            <div className="theme-palette-grid">
              {themePalettes.map((palette) => (
                <article key={palette.name}>
                  <div><b>{palette.name}</b><small>{palette.note}</small></div>
                  <span>
                    {palette.colors.map((color) => <i key={color} style={{ background: color }} title={color} />)}
                  </span>
                </article>
              ))}
            </div>
            <div className="token-strip">
              <span><b>4 px</b><small>Base unit</small></span>
              <span><b>12 px</b><small>Input radius</small></span>
              <span><b>20 px</b><small>Card radius</small></span>
              <span><b>32 px</b><small>Section gap</small></span>
              <span><b>160 ms</b><small>Micro motion</small></span>
              <span><b>640 ms</b><small>Spring motion</small></span>
            </div>
          </section>

          <section id="typography" className="system-section">
            <SectionTitle eyebrow="02" title="Typography" copy="Large, light headlines carry confidence. Compact labels and tabular figures keep complex workflows readable." />
            <div className="type-layout">
              <div className="type-specimen">
                <div><small>DISPLAY / 64 / −4%</small><h3>Move with clarity.</h3></div>
                <div><small>HEADING / 32 / −3%</small><h4>Shipment intelligence</h4></div>
                <div><small>BODY / 15 / 150%</small><p>Every operational decision should be understandable at a glance, even when the workflow beneath it is complex.</p></div>
              </div>
              <div className="text-states">
                <label>FORM LABEL <span>Required</span></label>
                <div className="mock-input">MAA-IMP-260724</div>
                <p className="helper">Use the branch-prefixed job number.</p>
                <p className="error">● Job number already exists.</p>
                <a href="#actions">View naming guidelines <span>↗</span></a>
              </div>
            </div>
            <div className="numeric-row">
              <article><span>Active jobs</span><strong>1,284</strong><small className="up">↑ 12.4%</small></article>
              <article><span>Clearance SLA</span><strong>04:18</strong><small>Hours avg.</small></article>
              <article><span>Documents</span><strong>98.6<sup>%</sup></strong><small className="up">Verified</small></article>
              <article><span>Exceptions</span><strong>07</strong><small className="down">Needs action</small></article>
            </div>
          </section>

          <section id="actions" className="system-section">
            <SectionTitle eyebrow="03" title="Actions & links" copy="Actions are explicit, tactile and ordered by consequence. The active theme accent is reserved for the primary path." />
            <div className="component-board actions-board">
              <div>
                <p className="spec-label">BUTTON HIERARCHY</p>
                <div className="button-showcase">
                  <button className="btn primary">Create shipment <span>＋</span></button>
                  <button className="btn dark">Approve checklist <span>✓</span></button>
                  <button className="btn secondary">Save draft</button>
                  <button className="btn outline">Export report <span>↓</span></button>
                  <button className="btn destructive">Delete job</button>
                  <button className="btn disabled" disabled>Unavailable</button>
                </div>
              </div>
              <div>
                <p className="spec-label">TEXT & ICON ACTIONS</p>
                <div className="link-showcase">
                  <a href="#forms">View shipment <span>↗</span></a>
                  <a href="#forms" className="subtle-link">Edit details</a>
                  <button className="icon-button">＋</button>
                  <button className="icon-button dark-icon">→</button>
                  <button className="icon-button danger-icon">×</button>
                </div>
              </div>
            </div>
          </section>

          <section id="forms" className="system-section">
            <SectionTitle eyebrow="04" title="Forms & inputs" copy="Field states communicate before validation text does. Controls remain calm, legible and keyboard-friendly." />
            <div className="forms-grid">
              <article className="form-card">
                <div className="card-title"><div><span>CREATE JOB</span><h3>Shipment details</h3></div><span className="step-pill">Step 1 of 3</span></div>
                <div className="fields">
                  <label className="field"><span>Job number <b>*</b></span><input defaultValue="MAA-IMP-260724" /><small>Generated from the selected branch.</small></label>
                  <label className="field"><span>Customer <b>*</b></span><div className="select-control">Orion Retail Pvt Ltd <i>⌄</i></div></label>
                  <div className="field-pair">
                    <label className="field"><span>Shipment type</span><div className="select-control">Sea <i>⌄</i></div></label>
                    <label className="field error-field"><span>IGM number</span><input placeholder="Enter IGM" /><small>IGM number is required.</small></label>
                  </div>
                  <label className="field"><span>Description</span><textarea defaultValue="Import clearance for electronic components" /></label>
                </div>
                <div className="form-footer"><button className="btn secondary">Cancel</button><button className="btn primary">Continue <span>→</span></button></div>
              </article>

              <div className="form-extras">
                <article className={`dropzone ${uploaded ? "uploaded" : ""}`} onClick={() => setUploaded(!uploaded)}>
                  <div className="upload-icon">{uploaded ? "✓" : "↑"}</div>
                  <b>{uploaded ? "Invoice_260724.pdf" : "Drop shipment documents"}</b>
                  <p>{uploaded ? "2.4 MB · Ready to verify" : "Drag & drop, or click to browse"}</p>
                  <small>{uploaded ? "Click to remove" : "PDF, DOCX, XLSX · Up to 25 MB"}</small>
                </article>

                <article className="control-card">
                  <p className="spec-label">TOGGLES & SELECTION</p>
                  <div className="control-line"><span><b>Customer portal</b><small>Allow live shipment tracking</small></span><button className={`switch ${enabled ? "enabled" : ""}`} onClick={() => setEnabled(!enabled)} aria-label="Toggle customer portal"><i /></button></div>
                  <div className="control-line"><span><b>Clearance mode</b><small>Choose one workflow</small></span><div className="segmented"><button className="active">Import</button><button>Export</button></div></div>
                  <div className="custom-select">
                    <button onClick={() => setSelectOpen(!selectOpen)}>Select branch <span>⌄</span></button>
                    {selectOpen && <div><button>Chennai</button><button>Mumbai</button><button>Delhi</button></div>}
                  </div>
                </article>
              </div>
            </div>
          </section>

          <section id="surfaces" className="system-section">
            <SectionTitle eyebrow="05" title="Cards & panels" copy="Surfaces group related work through scale, tone and spacing—without adding visual noise." />
            <div className="card-gallery">
              <article className="metric-card">
                <header><span>ACTIVE SHIPMENTS</span><button>↗</button></header>
                <strong>284</strong><p><i>↑ 18</i> since last week</p>
                <div className="spark-bars">{[42, 56, 48, 72, 66, 88, 78, 96].map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}</div>
              </article>
              <article className="progress-card">
                <header><div><span>CUSTOMS CLEARANCE</span><h3>MAA-IMP-260724</h3></div><span className="badge neutral">In progress</span></header>
                <div className="route-progress"><i className="done">✓</i><span /><i className="done">✓</i><span /><i className="current">3</i><span /><i>4</i></div>
                <div className="route-labels"><span>Documents</span><span>Checklist</span><span>Assessment</span><span>Delivery</span></div>
              </article>
              <article className="dark-task-card">
                <header><span>OPEN ACTIONS</span><strong>3/7</strong></header>
                {["Approve checklist", "Upload duty receipt", "Confirm delivery"].map((item, i) => (
                  <div className="task" key={item}><span>{i === 0 ? "⌑" : i === 1 ? "↓" : "◇"}</span><p><b>{item}</b><small>{i === 0 ? "Due today · High priority" : "MAA-IMP-260724"}</small></p><i className={i === 0 ? "checked" : ""}>{i === 0 ? "✓" : ""}</i></div>
                ))}
              </article>
              <article className="section-panel">
                <header><div><span>DOCUMENTS</span><h3>Supplier documents</h3></div><button>•••</button></header>
                <p>6 of 8 documents have been verified for this shipment.</p>
                <div className="panel-progress"><i /></div>
                <footer><span><b>6</b> verified</span><span><b>1</b> pending</span><span><b>1</b> unavailable</span></footer>
              </article>
            </div>
          </section>

          <section id="feedback" className="system-section">
            <SectionTitle eyebrow="06" title="Status & feedback" copy="Badges, alerts and loaders communicate operational state without taking over the interface." />
            <div className="feedback-grid">
              <article className="badge-panel">
                <p className="spec-label">BADGES</p>
                <div className="badges">
                  <span className="badge success-badge">● Approved</span>
                  <span className="badge warning-badge">● Attention</span>
                  <span className="badge danger-badge">● Overdue</span>
                  <span className="badge info-badge">● In review</span>
                  <span className="badge neutral">Draft</span>
                </div>
                <p className="spec-label second">WARNING INDICATORS</p>
                <div className="warning-icons"><button className="warning-dot">!<i /></button><button className="warning-pill">⚠ 3 exceptions</button><button className="notification-bell">♢<i>4</i></button></div>
              </article>
              <div className="alerts">
                <article className="alert success-alert"><span>✓</span><div><b>Checklist approved</b><p>The customer has been notified automatically.</p></div><button>×</button></article>
                <article className="alert warning-alert"><span>!</span><div><b>Delivery order expires soon</b><p>Extend the validity before 30 July 2026.</p></div><button>Review</button></article>
                <article className="alert error-alert"><span>×</span><div><b>Document upload failed</b><p>The file exceeds the 25 MB limit.</p></div><button>Retry</button></article>
              </div>
              <article className="loader-panel">
                <p className="spec-label">LOADING STATES</p>
                <div className="loaders"><span className="spinner" /><span className="pulse-loader"><i /><i /><i /></span><span className="route-loader"><i /></span></div>
                <div className="skeleton"><i /><i /><i /></div>
              </article>
            </div>
          </section>

          <section id="data" className="system-section">
            <SectionTitle eyebrow="07" title="Tables & filters" copy="Dense operational data remains approachable through gentle dividers, fixed hierarchy and explicit row actions." />
            <div className="table-card">
              <header>
                <div><span>SHIPMENT REGISTER</span><h3>Active clearance jobs</h3></div>
                <div className="table-actions">
                  <div className="filter-group">{["All", "Sea", "Air"].map(item => <button key={item} onClick={() => setFilter(item)} className={filter === item ? "active" : ""}>{item}</button>)}</div>
                  <button className="filter-button">≡ Filter <i>2</i></button>
                  <button className="btn primary small">＋ New job</button>
                </div>
              </header>
              <div className="table-wrap">
                <table>
                  <thead><tr><th><input type="checkbox" aria-label="Select all" /></th><th>Job number</th><th>Customer</th><th>Mode</th><th>Current stage</th><th>Status</th><th /></tr></thead>
                  <tbody>
                    {shipments.filter(row => filter === "All" || row[2].includes(filter)).map((row, i) => (
                      <tr key={row[0]}><td><input type="checkbox" aria-label={`Select ${row[0]}`} /></td><td><b>{row[0]}</b><small>{i === 0 ? "Created today" : `${i + 1} days ago`}</small></td><td>{row[1]}</td><td><span className="mode-icon">{row[2].includes("Sea") ? "≈" : "✈"}</span>{row[2]}</td><td>{row[3]}</td><td><span className={`table-status status-${i}`}>● {row[4]}</span></td><td><button className="row-action">•••</button></td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <footer><span>Showing 1–3 of 284 jobs</span><div><button disabled>←</button><button className="active">1</button><button>2</button><button>3</button><button>→</button></div></footer>
            </div>
          </section>

          <section id="navigation" className="system-section">
            <SectionTitle eyebrow="08" title="Navigation" copy="Navigation stays quiet and predictable, giving the current operational context the strongest visual weight." />
            <div className="nav-showcase">
              <div className="mini-navbar">
                <span className="mini-logo">M</span>
                <nav><button className="active">Dashboard</button><button>Shipments</button><button>Customers</button><button>Documents</button><button>Reports</button></nav>
                <div><button>⌕</button><button>♢</button><span>PJ</span></div>
              </div>
              <div className="mini-sidebar">
                <header><span className="mini-logo">M</span><b>MONOLITH</b></header>
                <nav>
                  <button className="active"><span>⌂</span>Dashboard</button>
                  <button><span>◇</span>CHA module <i>24</i></button>
                  <button><span>□</span>Customers</button>
                  <button><span>⌑</span>Documents</button>
                  <button><span>≡</span>Reports</button>
                </nav>
                <footer><span>PJ</span><p><b>Purushothaman</b><small>Administrator</small></p><button>⌄</button></footer>
              </div>
            </div>
          </section>

          <section id="motion" className="system-section motion-section">
            <SectionTitle eyebrow="09" title="Motion language" copy="Movement should explain state, reward completion and preserve continuity—not decorate idle screens." />
            <div className="motion-grid">
              <article><span className="motion-dot ease" /><b>Micro response</b><small>160 ms · ease-out</small><p>Hover, focus and toggle feedback.</p></article>
              <article><span className="motion-dot spring" /><b>Spring response</b><small>640 ms · expressive</small><p>Cards, mascots and success states.</p></article>
              <article><span className="motion-dot progress-motion" /><b>Progress</b><small>1200 ms · linear</small><p>Loading and background activity.</p></article>
            </div>
          </section>

          <footer className="page-footer"><span className="brand-mark"><i /><i /></span><p><b>Monolith Design System</b><small>One system. Limitless possibilities.</small></p><span>Version 1.0 · July 2026</span></footer>
        </div>
      </div>
    </main>
  );
}
