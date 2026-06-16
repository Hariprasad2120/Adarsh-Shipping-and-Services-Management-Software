import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button-1";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  Zap,
  Users,
  BarChart2,
  Settings,
  Bell,
  Star,
} from "lucide-react";

// ─── Section wrapper ─────────────────────────────────────────────────────────
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2 className="ds-h2 border-b border-outline-variant/40 pb-3">{title}</h2>
      {children}
    </section>
  );
}

// ─── Color swatch ─────────────────────────────────────────────────────────────
function Swatch({
  color,
  label,
  textClass = "text-white",
}: {
  color: string;
  label: string;
  textClass?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className={`h-14 w-full rounded-xl flex items-end p-2 ${textClass}`}
        style={{ backgroundColor: color }}
      >
        <span className="text-[10px] font-mono opacity-80">{color}</span>
      </div>
      <span className="text-xs text-on-surface-variant font-medium">{label}</span>
    </div>
  );
}

// ─── Token row ────────────────────────────────────────────────────────────────
function TokenRow({ name, value }: { name: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-outline-variant/30 py-2 last:border-0">
      <span className="font-mono text-xs text-on-surface-variant">{name}</span>
      <span className="font-mono text-xs text-on-surface">{value}</span>
    </div>
  );
}

export default function DesignSystemPage() {
  return (
    <div className="space-y-14 pb-20">
      {/* Page header */}
      <div className="space-y-1">
        <p className="text-on-surface-variant text-sm">
          Tokens, components, and patterns for Monolith Engine.
        </p>
      </div>

      {/* ── COLORS ─────────────────────────────────────────────────────── */}
      <Section title="Colors">
        <div className="space-y-6">
          {/* Accent */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-3">
              Brand Accent
            </p>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              <Swatch color="#00cec4" label="accent" />
              <Swatch color="#00b8af" label="accent-hover" />
              <Swatch
                color="rgba(0,206,196,0.1)"
                label="accent-subtle"
                textClass="text-[#00857e]"
              />
            </div>
          </div>

          {/* Surfaces */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-3">
              Surface Hierarchy
            </p>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              <Swatch color="#f7f9fb" label="background" textClass="text-[#191c1e]" />
              <Swatch color="#ffffff" label="surface" textClass="text-[#191c1e]" />
              <Swatch color="#f2f4f6" label="surface-container-low" textClass="text-[#191c1e]" />
              <Swatch color="#eceef0" label="surface-container" textClass="text-[#191c1e]" />
              <Swatch color="#e6e8ea" label="surface-container-high" textClass="text-[#191c1e]" />
              <Swatch color="#d8dadc" label="surface-dim" textClass="text-[#191c1e]" />
            </div>
          </div>

          {/* Module identity */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-3">
              Module Identity
            </p>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              <Swatch color="#00c4b6" label="dashboard" />
              <Swatch color="#818cf8" label="hrms" />
              <Swatch color="#fbbf24" label="attendance" textClass="text-white/80" />
              <Swatch color="#22c55e" label="todo" />
              <Swatch color="#c084fc" label="ams" />
              <Swatch color="#8b5cf6" label="admin" />
            </div>
          </div>

          {/* Status colors */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-3">
              Status / Stage Colors
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {[
                { label: "DUE NOTIFIED", bg: "#fefce8", text: "#a16207", border: "#fde68a" },
                { label: "REVIEWERS ASSIGNED", bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
                { label: "SELF ASSESSMENT", bg: "#faf5ff", text: "#7e22ce", border: "#e9d5ff" },
                { label: "REVIEWER RATING", bg: "#eef2ff", text: "#4338ca", border: "#c7d2fe" },
                { label: "MGMT REVIEW", bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
                { label: "MEETING PENDING", bg: "#ecfeff", text: "#0e7490", border: "#a5f3fc" },
                { label: "MEETING LIVE", bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
                { label: "HIKE FINALISATION", bg: "#fdf2f8", text: "#be185d", border: "#f9a8d4" },
                { label: "CLOSED", bg: "#f3f4f6", text: "#6b7280", border: "#e5e7eb" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-full border px-3 py-1 text-center text-[11px] font-semibold"
                  style={{
                    backgroundColor: s.bg,
                    color: s.text,
                    borderColor: s.border,
                  }}
                >
                  {s.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ── TYPOGRAPHY ─────────────────────────────────────────────────── */}
      <Section title="Typography">
        <Card>
          <CardContent className="space-y-6 pt-5">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                Display — Kiona Sans
              </p>
              <h1 className="ds-h1 heading-icon-none">Heading One / ds-h1</h1>
              <h2 className="ds-h2">Heading Two / ds-h2</h2>
              <h3 className="ds-h3">Heading Three / ds-h3</h3>
            </div>

            <div className="h-px bg-outline-variant/40" />

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                Body — Geist Sans
              </p>
              <div className="space-y-1">
                {[
                  ["text-[30px]", "30px — 4xl"],
                  ["text-[24px]", "24px — 3xl"],
                  ["text-[20px]", "20px — 2xl"],
                  ["text-[18px]", "18px — xl"],
                  ["text-[16px]", "16px — lg"],
                  ["text-[15px]", "15px — md"],
                  ["text-[14px]", "14px — base (default)"],
                  ["text-[12px]", "12px — sm"],
                  ["text-[10px]", "10px — xs"],
                ].map(([cls, label]) => (
                  <p key={cls} className={`${cls} text-on-surface`}>
                    {label} — The quick brown fox jumps over the lazy dog
                  </p>
                ))}
              </div>
            </div>

            <div className="h-px bg-outline-variant/40" />

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                Mono — Geist Mono
              </p>
              <p className="ds-numeric text-2xl text-on-surface">1,234,567.89</p>
              <p className="ds-numeric text-base text-on-surface">
                01 02 03 04 05 — tabular numerals
              </p>
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* ── SPACING & RADIUS ───────────────────────────────────────────── */}
      <Section title="Tokens">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Border radius */}
          <Card>
            <CardHeader>
              <CardTitle>Border Radius</CardTitle>
            </CardHeader>
            <CardContent>
              {[
                ["--radius-sm", "6px"],
                ["--radius-md", "8px"],
                ["--radius-lg", "10px"],
                ["--radius-xl", "12px"],
                ["--radius-2xl", "16px"],
                ["--radius-3xl", "20px"],
                ["--radius-full", "9999px"],
              ].map(([name, value]) => (
                <TokenRow key={name} name={name} value={value} />
              ))}
            </CardContent>
          </Card>

          {/* Font size */}
          <Card>
            <CardHeader>
              <CardTitle>Font Size</CardTitle>
            </CardHeader>
            <CardContent>
              {[
                ["--text-xs", "10px"],
                ["--text-sm", "12px"],
                ["--text-base", "14px"],
                ["--text-md", "15px"],
                ["--text-lg", "16px"],
                ["--text-xl", "18px"],
                ["--text-2xl", "20px"],
                ["--text-3xl", "24px"],
                ["--text-4xl", "30px"],
              ].map(([name, value]) => (
                <TokenRow key={name} name={name} value={value} />
              ))}
            </CardContent>
          </Card>

          {/* Shadows */}
          <Card>
            <CardHeader>
              <CardTitle>Shadows</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                ["ambient", "0 1px 3px rgba(0,0,0,0.06)"],
                ["ambient-hover", "0 4px 12px rgba(0,0,0,0.08)"],
                ["card", "0 14px 28px -24px …"],
                ["card-hover", "0 20px 36px -20px …"],
              ].map(([name, value]) => (
                <TokenRow key={name} name={name} value={value} />
              ))}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div
                  className="h-16 rounded-xl bg-surface border border-outline-variant/40"
                  style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06),0 1px 2px rgba(0,0,0,0.04)" }}
                />
                <div
                  className="h-16 rounded-xl bg-surface border border-outline-variant/40"
                  style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.08),0 2px 4px rgba(0,0,0,0.04)" }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </Section>

      {/* ── BUTTONS ────────────────────────────────────────────────────── */}
      <Section title="Buttons">
        <Card>
          <CardContent className="space-y-6 pt-5">
            {/* Variants */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-3">
                Variants
              </p>
              <div className="flex flex-wrap gap-3">
                <Button variant="default">Default</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="inverse">Inverse</Button>
                <Button variant="default" disabled>
                  Disabled
                </Button>
              </div>
            </div>

            {/* Sizes */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-3">
                Sizes
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
              </div>
            </div>

            {/* Icon mode */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-3">
                Icon Mode
              </p>
              <div className="flex flex-wrap gap-3">
                <Button variant="default" mode="icon" size="sm">
                  <Settings size={14} />
                </Button>
                <Button variant="default" mode="icon" size="md">
                  <Bell size={16} />
                </Button>
                <Button variant="outline" mode="icon" size="md">
                  <Star size={16} />
                </Button>
              </div>
            </div>

            {/* With icons */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-3">
                With Icon
              </p>
              <div className="flex flex-wrap gap-3">
                <Button variant="default">
                  <Zap size={14} />
                  Action
                </Button>
                <Button variant="outline">
                  <Users size={14} />
                  People
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* ── BADGES ─────────────────────────────────────────────────────── */}
      <Section title="Badges">
        <Card>
          <CardContent className="flex flex-wrap gap-3 pt-5">
            <Badge variant="default">Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="success">
              <CheckCircle size={10} className="mr-1" />
              Success
            </Badge>
            <Badge variant="warning">
              <AlertTriangle size={10} className="mr-1" />
              Warning
            </Badge>
            <Badge variant="destructive">
              <XCircle size={10} className="mr-1" />
              Destructive
            </Badge>
          </CardContent>
        </Card>
      </Section>

      {/* ── CARDS ──────────────────────────────────────────────────────── */}
      <Section title="Cards">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Standard card */}
          <Card>
            <CardHeader>
              <CardTitle>Standard Card</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-on-surface-variant">
                Uses the standard shared card shell with rounded corners, surface background, and ambient shadow.
              </p>
            </CardContent>
          </Card>

          {/* Alternate card example */}
          <Card className="card-top-accent-violet">
            <CardHeader>
              <CardTitle>Alternate Card</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-on-surface-variant">
                Alternate example using the same card shell for module-specific layouts.
              </p>
            </CardContent>
          </Card>

          {/* Stat card pattern */}
          <div className="rounded-[24px] border border-outline-variant/20 bg-white p-5 shadow-[0_14px_28px_-24px_rgba(0,0,0,0.12)] transition-transform duration-200 hover:-translate-y-1 dark:bg-surface">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-on-surface-variant">
                  Stat Card
                </p>
                <p className="ds-numeric text-[28px] font-semibold leading-none text-on-surface">
                  42
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00cec4]/10">
                <BarChart2 size={18} className="text-[#00857e]" />
              </div>
            </div>
            <p className="mt-3 text-xs text-on-surface-variant">
              Module home stat card pattern
            </p>
          </div>
        </div>

        {/* Tones reference */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-3">
            Stat Card Tones
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { tone: "Teal", iconBg: "bg-[#00cec4]/10", iconText: "text-[#00857e]", accent: "#00cec4" },
              { tone: "Blue", iconBg: "bg-blue-50", iconText: "text-blue-600", accent: "#3b82f6" },
              { tone: "Amber", iconBg: "bg-amber-50", iconText: "text-amber-600", accent: "#f59e0b" },
              { tone: "Violet", iconBg: "bg-violet-50", iconText: "text-violet-600", accent: "#8a52ff" },
              { tone: "Green", iconBg: "bg-green-50", iconText: "text-green-600", accent: "#22c55e" },
              { tone: "Slate", iconBg: "bg-slate-100", iconText: "text-slate-500", accent: "#94a3b8" },
            ].map((t) => (
              <div
                key={t.tone}
                className="flex flex-col items-center gap-2 rounded-xl border border-outline-variant/20 bg-white p-3 dark:bg-surface"
                style={{ borderTopColor: t.accent, borderTopWidth: 3 }}
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${t.iconBg}`}>
                  <Zap size={16} className={t.iconText} />
                </div>
                <span className="text-xs font-medium text-on-surface">{t.tone}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── INPUTS ─────────────────────────────────────────────────────── */}
      <Section title="Form Inputs">
        <Card>
          <CardContent className="space-y-4 pt-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Text input</label>
                <input
                  type="text"
                  placeholder="Placeholder text…"
                  className="h-11 w-full rounded-xl border border-[#00cec4]/55 bg-surface px-4 py-2.5 text-sm text-on-surface outline-none placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary/15"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Select</label>
                <select className="h-11 w-full rounded-xl border border-[#00cec4]/55 bg-surface px-4 py-2.5 text-sm text-on-surface outline-none">
                  <option>Option one</option>
                  <option>Option two</option>
                </select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-sm font-medium text-gray-700">Textarea</label>
                <textarea
                  rows={3}
                  placeholder="Multi-line input…"
                  className="w-full rounded-xl border border-[#00cec4]/55 bg-surface px-4 py-2.5 text-sm text-on-surface outline-none placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary/15"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Range slider</label>
              <input
                type="range"
                min={0}
                max={100}
                defaultValue={60}
                className="cyan-range-slider h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#00cec4]/20 accent-[#00cec4]"
              />
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* ── ICON BACKGROUNDS ───────────────────────────────────────────── */}
      <Section title="Icon Containers">
        <Card>
          <CardContent className="pt-5">
            <div className="flex flex-wrap gap-3">
              {[
                { bg: "bg-[#00cec4]/10", text: "text-[#00857e]", label: "teal" },
                { bg: "bg-indigo-100", text: "text-indigo-700", label: "indigo" },
                { bg: "bg-amber-100", text: "text-amber-700", label: "amber" },
                { bg: "bg-violet-100", text: "text-violet-700", label: "violet" },
                { bg: "bg-green-100", text: "text-green-700", label: "green" },
                { bg: "bg-blue-100", text: "text-blue-700", label: "blue" },
                { bg: "bg-pink-100", text: "text-pink-700", label: "pink" },
                { bg: "bg-slate-100", text: "text-slate-600", label: "slate" },
              ].map((c) => (
                <div key={c.label} className="flex flex-col items-center gap-1.5">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.bg}`}
                  >
                    <Info size={16} className={c.text} />
                  </div>
                  <span className="text-[10px] text-on-surface-variant">{c.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* ── SIDEBAR ACCENT COLORS ──────────────────────────────────────── */}
      <Section title="Sidebar Navigation Colors">
        <Card>
          <CardContent className="pt-5">
            <div className="overflow-hidden rounded-xl border border-outline-variant/40">
              <div
                className="p-4 space-y-1"
                style={{ backgroundColor: "#0f1319" }}
              >
                {[
                  { label: "Dashboard", color: "#00c4b6", active: true },
                  { label: "HRMS", color: "#818cf8", active: false },
                  { label: "Attendance", color: "#fbbf24", active: false },
                  { label: "To-Do", color: "#22c55e", active: false },
                  { label: "AMS", color: "#c084fc", active: false },
                  { label: "Admin", color: "#8b5cf6", active: false },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 rounded-lg px-3 py-2"
                    style={{
                      backgroundColor: item.active ? "#161f28" : "transparent",
                      borderLeft: item.active ? `4px solid ${item.color}` : "4px solid transparent",
                    }}
                  >
                    <div
                      className="h-5 w-5 rounded-md flex items-center justify-center"
                      style={{ backgroundColor: `${item.color}20` }}
                    >
                      <div
                        className="h-2 w-2 rounded-sm"
                        style={{ backgroundColor: item.color }}
                      />
                    </div>
                    <span
                      className="text-sm font-medium"
                      style={{ color: item.active ? item.color : "#8b949e" }}
                    >
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* ── UTILITY CLASSES ────────────────────────────────────────────── */}
      <Section title="Utility Classes">
        <Card>
          <CardContent className="pt-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                  Typography
                </p>
                <div className="space-y-1 text-sm text-on-surface">
                  <p><code className="rounded bg-surface-container px-1 py-0.5 text-xs">.ds-h1</code> — Kiona 24px light uppercase 0.04em</p>
                  <p><code className="rounded bg-surface-container px-1 py-0.5 text-xs">.ds-h2</code> — Kiona 20px light uppercase 0.03em</p>
                  <p><code className="rounded bg-surface-container px-1 py-0.5 text-xs">.ds-h3</code> — Kiona 18px regular uppercase 0.04em</p>
                  <p><code className="rounded bg-surface-container px-1 py-0.5 text-xs">.ds-numeric</code> — Geist Mono, tabular nums</p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                  Card Shell
                </p>
                <div className="space-y-1 text-sm text-on-surface">
                  <p>Cards now rely on border, radius, surface color, and shadow instead of a colored top accent.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Section>
    </div>
  );
}
