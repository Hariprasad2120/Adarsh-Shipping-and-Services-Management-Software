"use client";

/**
 * CHA UI Showcase — visual inventory of every element style found in the CHA
 * module. Each block recreates the exact markup/classes used in the source
 * file it cites. Nothing here is imported from the CHA module itself, so the
 * real module is untouched.
 *
 * The "CHA neon override layer" toggle wraps the demos in `.cha-module`
 * (exactly what `cha/layout.tsx` does), so you can compare how buttons and
 * inputs render with and without the globals.css override cascade.
 */

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Briefcase,
  CalendarPlus,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronRight,
  CreditCard,
  DollarSign,
  ExternalLink,
  FileText,
  FileUp,
  Filter,
  Minus,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  Workflow,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";

/* ────────────────────────── meta helpers ────────────────────────── */

type SourceKind = "shared" | "cha-specific" | "inline-tailwind" | "globals.css";

const SOURCE_STYLES: Record<SourceKind, string> = {
  shared: "bg-[#00cec4]/10 text-[#00857e] border-[#00cec4]/30",
  "cha-specific": "bg-violet-500/10 text-violet-500 border-violet-500/30",
  "inline-tailwind": "bg-blue-500/10 text-blue-500 border-blue-500/30",
  "globals.css": "bg-amber-500/10 text-amber-600 border-amber-500/30",
};

function Tag({ children, tone }: { children: React.ReactNode; tone: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] ${tone}`}>
      {children}
    </span>
  );
}

const NeonContext = createContext(true);

/* ────────────────────────── live-edit tooling ────────────────────────── */

const HISTORY_EVENT = "cha-showcase-history-updated";

function notifyHistoryChanged() {
  window.dispatchEvent(new Event(HISTORY_EVENT));
}

/**
 * Copy / paste / apply toolbar attached to each element card.
 * "Apply" performs an exact-string replacement across every CHA source file
 * (plus this showcase and design.md) via /api/cha-ui-showcase, so a style
 * decision propagates to all code that uses it. Every apply is recorded and
 * undoable from the history panel.
 */
function CodeTools({ specName, classes }: { specName: string; classes: string }) {
  const [open, setOpen] = useState(false);
  const [find, setFind] = useState(classes);
  const [replace, setReplace] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(classes);
      toast.success("Classes copied to clipboard.");
    } catch {
      toast.error("Clipboard unavailable — copy manually from the Classes line.");
    }
  };

  const pasteReplace = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        toast.error("Clipboard is empty.");
        return;
      }
      setReplace(text);
    } catch {
      toast.error("Clipboard read blocked by the browser — paste into the field manually (Ctrl+V).");
    }
  };

  const apply = async () => {
    if (!find.trim() || !replace.trim()) {
      toast.error("Both find and replace are required.");
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const response = await fetch("/api/cha-ui-showcase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "apply", label: specName, find, replace }),
      });
      const data = await response.json();
      if (!data.ok) {
        toast.error(data.error || "Apply failed.");
        setResult(data.error || "Apply failed.");
        return;
      }
      const summary = data.entry.files
        .map((file: { path: string; count: number }) => `${file.path} (${file.count}×)`)
        .join(", ");
      setResult(`Applied to ${data.entry.files.length} file(s): ${summary}`);
      toast.success(`Style change applied to ${data.entry.files.length} file(s). Recorded in history + design.md.`);
      notifyHistoryChanged();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Apply failed.";
      toast.error(message);
      setResult(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => void copyCode()}>
          Copy code
        </Button>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setOpen(!open)}>
          {open ? "Close editor" : "Paste / edit code"}
        </Button>
      </div>
      {open ? (
        <div className="space-y-2 rounded-xl border border-outline-variant/40 bg-surface-container-low/50 p-3">
          <label className="block space-y-1">
            <span className="ds-label">Find (exact string as it appears in source)</span>
            <textarea
              value={find}
              onChange={(event) => setFind(event.target.value)}
              rows={2}
              spellCheck={false}
              className="w-full font-mono text-[11px]"
            />
          </label>
          <label className="block space-y-1">
            <span className="ds-label">Replace with</span>
            <textarea
              value={replace}
              onChange={(event) => setReplace(event.target.value)}
              rows={2}
              spellCheck={false}
              placeholder="Paste or type the new classes/code…"
              className="w-full font-mono text-[11px]"
            />
          </label>
          {replace.trim() ? (
            <div className="space-y-1">
              <span className="ds-label">Preview (new classes on a sample block)</span>
              <div className={replace}>Sample content — preview is best-effort; unknown utility classes render after rebuild.</div>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => void pasteReplace()}>
              Paste from clipboard
            </Button>
            <Button size="sm" className="h-8 text-xs" disabled={busy} onClick={() => void apply()}>
              {busy ? "Applying…" : "Apply to all CHA code"}
            </Button>
          </div>
          {result ? <p className="text-[11px] text-on-surface-variant break-all">{result}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

type HistoryEntry = {
  id: string;
  timestamp: string;
  label: string;
  find: string;
  replace: string;
  files: { path: string; count: number }[];
  undone: boolean;
};

function HistoryPanel() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const [reloadTick, setReloadTick] = useState(0);
  const load = useCallback(() => setReloadTick((tick) => tick + 1), []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/cha-ui-showcase")
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled && data.ok) setEntries(data.history);
      })
      .catch(() => {
        /* panel stays empty */
      });
    return () => {
      cancelled = true;
    };
  }, [reloadTick]);

  useEffect(() => {
    window.addEventListener(HISTORY_EVENT, load);
    return () => window.removeEventListener(HISTORY_EVENT, load);
  }, [load]);

  const undo = async (id: string) => {
    setBusyId(id);
    try {
      const response = await fetch("/api/cha-ui-showcase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "undo", id }),
      });
      const data = await response.json();
      if (!data.ok) {
        toast.error(data.error || "Undo failed.");
        return;
      }
      toast.success("Change reverted across all files.");
      void load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Undo failed.");
    } finally {
      setBusyId(null);
    }
  };

  const active = entries.filter((entry) => !entry.undone).length;

  return (
    <div className="rounded-2xl border border-outline-variant/30 bg-surface p-5 shadow-sm">
      <button
        type="button"
        className="flex w-full items-center justify-between bg-transparent border-0 cursor-pointer text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div>
          <h2 className="ds-h3 text-on-surface">Change History</h2>
          <p className="mt-1 text-xs text-on-surface-variant">
            {entries.length === 0
              ? "No style changes applied yet. Use “Paste / edit code” on any element to apply one."
              : `${entries.length} change(s) recorded · ${active} active · every change is also logged in design.md §16`}
          </p>
        </div>
        <ChevronRight size={16} className={`shrink-0 text-on-surface-variant transition-transform ${expanded ? "rotate-90" : ""}`} />
      </button>
      {expanded && entries.length > 0 ? (
        <div className="mt-4 space-y-2">
          {entries.map((entry) => (
            <div key={entry.id} className={`rounded-xl border border-outline-variant/40 p-3 text-xs ${entry.undone ? "opacity-55" : ""}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-on-surface">
                  {entry.label}
                  {entry.undone ? <span className="ml-2 text-on-surface-variant">(undone)</span> : null}
                </span>
                <span className="flex items-center gap-2">
                  <span className="ds-numeric text-on-surface-variant">{new Date(entry.timestamp).toLocaleString("en-IN")}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px]"
                    disabled={entry.undone || busyId === entry.id}
                    onClick={() => void undo(entry.id)}
                  >
                    {busyId === entry.id ? "Undoing…" : "Undo"}
                  </Button>
                </span>
              </div>
              <p className="mt-1.5 break-all text-on-surface-variant">
                <code className="rounded bg-red-500/10 px-1 py-0.5 font-mono text-[10px] text-red-500 line-through">{entry.find}</code>
                <span className="mx-1.5">→</span>
                <code className="rounded bg-[#00cec4]/10 px-1 py-0.5 font-mono text-[10px] text-[#00857e]">{entry.replace}</code>
              </p>
              <p className="mt-1 text-[10px] text-on-surface-variant">
                {entry.files.map((file) => `${file.path} (${file.count}×)`).join(" · ")}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Spec({
  name,
  file,
  source,
  reusable,
  inconsistent,
  classes,
  notes,
  ds,
  dsNotes,
  children,
}: {
  name: string;
  file: string;
  source: SourceKind;
  reusable: boolean;
  inconsistent?: boolean;
  classes?: string;
  notes?: string;
  /** Design-system-compliant equivalent, rendered side by side with the current CHA version */
  ds?: React.ReactNode;
  dsNotes?: string;
  children: React.ReactNode;
}) {
  const neonOn = useContext(NeonContext);
  return (
    <div className={`overflow-hidden rounded-xl border border-outline-variant/40 bg-surface shadow-sm ${ds ? "xl:col-span-2" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant/25 bg-surface-container-low/60 px-4 py-2.5">
        <span className="text-sm font-medium text-on-surface">{name}</span>
        <span className="flex flex-wrap items-center gap-1.5">
          <Tag tone={SOURCE_STYLES[source]}>{source}</Tag>
          <Tag tone={reusable ? "bg-green-500/10 text-green-600 border-green-500/30" : "bg-surface-container-high text-on-surface-variant border-outline-variant"}>
            {reusable ? "reusable" : "one-off"}
          </Tag>
          {inconsistent ? (
            <Tag tone="bg-red-500/10 text-red-500 border-red-500/30">off-system</Tag>
          ) : (
            <Tag tone="bg-[#00cec4]/10 text-[#00857e] border-[#00cec4]/30">matches design.md</Tag>
          )}
        </span>
      </div>
      {ds ? (
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className={`border-b border-outline-variant/25 lg:border-b-0 lg:border-r ${neonOn ? "cha-module" : ""}`}>
            <div className="flex items-center gap-2 border-b border-dashed border-outline-variant/30 px-4 py-2">
              <Tag tone="bg-amber-500/10 text-amber-600 border-amber-500/30">current — CHA</Tag>
            </div>
            <div className="p-4">{children}</div>
          </div>
          <div>
            <div className="flex items-center gap-2 border-b border-dashed border-outline-variant/30 px-4 py-2">
              <Tag tone="bg-[#00cec4]/10 text-[#00857e] border-[#00cec4]/30">design system — design.md</Tag>
            </div>
            <div className="p-4">{ds}</div>
            {dsNotes ? <p className="px-4 pb-3 text-xs text-on-surface-variant"><span className="ds-label mr-2">DS recipe</span>{dsNotes}</p> : null}
          </div>
        </div>
      ) : (
        <div className={`p-4 ${neonOn ? "cha-module" : ""}`}>{children}</div>
      )}
      <div className="space-y-1.5 border-t border-outline-variant/25 px-4 py-3 text-xs">
        <p className="text-on-surface-variant">
          <span className="ds-label mr-2">Used in</span>
          <span className="ds-numeric break-all">{file}</span>
        </p>
        {classes ? (
          <>
            <p className="text-on-surface-variant">
              <span className="ds-label mr-2">Classes</span>
              <code className="break-all rounded bg-surface-container px-1.5 py-0.5 font-mono text-[11px] text-on-surface">{classes}</code>
            </p>
            <CodeTools specName={name} classes={classes} />
          </>
        ) : null}
        {notes ? (
          <p className="text-on-surface-variant">
            <span className="ds-label mr-2">Notes</span>
            {notes}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Section({ id, title, blurb, children }: { id: string; title: string; blurb: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <div className="border-b border-outline-variant/30 pb-2">
        <h2 className="ds-h2 text-on-surface">{title}</h2>
        <p className="mt-1 text-sm text-on-surface-variant">{blurb}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">{children}</div>
    </section>
  );
}

const SECTIONS = [
  ["typography", "Typography"],
  ["buttons", "Buttons"],
  ["cards", "Cards"],
  ["badges", "Badges & Status"],
  ["tables", "Tables"],
  ["forms", "Forms"],
  ["filters", "Filter Bar"],
  ["tabs", "Tabs & Segmented"],
  ["modals", "Modals & Overlays"],
  ["states", "Empty / Loading / Error"],
  ["workflow", "Workflow / Canvas"],
  ["animations", "Animations & Effects"],
  ["misc", "Miscellaneous"],
] as const;

/* ────────────────────────── demo fragments ────────────────────────── */

function WorkspaceTabsDemo() {
  const [active, setActive] = useState("docs");
  const tabs = [
    { key: "docs", label: "Documents", count: 8 },
    { key: "checklist", label: "Checklist" },
    { key: "filing", label: "Filing" },
    { key: "advances", label: "Advances" },
  ];
  return (
    <nav className="overflow-x-auto border-y border-outline-variant/25 bg-surface/95 px-1 py-2 backdrop-blur">
      <div className="flex min-w-max items-center gap-1">
        {tabs.map((tab) => {
          const isActive = active === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActive(tab.key)}
              className={`rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-wide transition-all ${
                isActive
                  ? "bg-[#00cec4]/10 text-[#00cec4] shadow-[inset_0_0_0_1px_rgba(0,206,196,0.35)]"
                  : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
              }`}
            >
              {tab.label}
              {tab.count !== undefined ? <span className="ml-1 ds-numeric">({tab.count})</span> : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function SettingsTabsDemo() {
  const [active, setActive] = useState("overview");
  const tabs = [
    { key: "overview", label: "Overview", description: "Health summary" },
    { key: "numbering", label: "Numbering", description: "Job number rules" },
    { key: "access", label: "Access", description: "Creator roles" },
  ];
  return (
    <div className="grid w-full grid-cols-3 gap-2 py-1">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => setActive(tab.key)}
          className={`group relative flex min-h-[50px] min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-all duration-300 ease-out motion-reduce:transition-none ${
            active === tab.key
              ? "border-[#00cec4] bg-[#00cec4] text-white shadow-[0_16px_32px_-22px_rgba(0,206,196,0.95)]"
              : "border-[#00cec4]/25 bg-surface text-on-surface-variant shadow-sm hover:-translate-y-0.5 hover:border-[#00cec4]/70 hover:text-on-surface hover:shadow-[0_0_0_3px_rgba(0,206,196,0.12),0_14px_30px_-24px_rgba(0,206,196,0.9)] active:scale-[0.99]"
          }`}
        >
          <span
            className={`h-2 w-2 shrink-0 rounded-full transition-all duration-200 ${
              active === tab.key ? "bg-white shadow-[0_0_0_4px_rgba(255,255,255,0.18)]" : "bg-[#00cec4]/55 group-hover:bg-[#00cec4]"
            }`}
          />
          <span className="min-w-0 flex-1 overflow-hidden">
            <span className="block truncate text-[11px] font-semibold uppercase tracking-[0.1em]">{tab.label}</span>
            <span className={`block truncate text-[10px] ${active === tab.key ? "text-white/80" : "text-on-surface-variant"}`}>
              {tab.description}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}

function ToggleDemo() {
  const [on, setOn] = useState(true);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label="Demo toggle"
      onClick={() => setOn(!on)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
        on ? "bg-[#00cec4]" : "bg-surface-container"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          on ? "translate-x-[18px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function StepperDemo() {
  const stages = ["Documents", "Additional Data", "Checklist Prep", "Approval", "Filing", "Filed"];
  const activeIndex = 2;
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {stages.map((label, index) => {
        const isCompleted = index < activeIndex;
        const isActive = index === activeIndex;
        return (
          <div key={label} className="flex min-w-fit items-center gap-2">
            <span
              className={`flex size-6 items-center justify-center rounded-full border text-[10px] font-bold ${
                isCompleted
                  ? "border-[#00cec4] bg-[#00cec4] text-white"
                  : isActive
                    ? "border-[#00cec4] bg-surface text-[#00cec4] shadow-[0_0_0_3px_rgba(0,206,196,0.12)]"
                    : "border-outline-variant bg-surface text-on-surface-variant"
              }`}
            >
              {isCompleted ? <Check size={13} /> : index + 1}
            </span>
            <span className={`whitespace-nowrap text-[10px] uppercase tracking-wide ${isActive ? "text-[#00cec4]" : "text-on-surface-variant"}`}>
              {label}
            </span>
            {index < stages.length - 1 ? <span className="h-px w-5 bg-outline-variant/50" /> : null}
          </div>
        );
      })}
    </div>
  );
}

function CanvasNode({ selected, name, meta }: { selected?: boolean; name: string; meta: string }) {
  return (
    <div
      className={`relative w-[268px] rounded-2xl border bg-surface/95 p-4 text-left shadow-sm backdrop-blur transition-all ${
        selected
          ? "border-[#00cec4] shadow-[0_0_0_3px_rgba(0,206,196,0.18),0_18px_42px_-28px_rgba(0,206,196,0.75)]"
          : "border-outline-variant hover:border-[#00cec4]/60 hover:shadow-[0_0_0_3px_rgba(0,206,196,0.12)]"
      }`}
    >
      <div className="absolute left-[126px] -top-2 h-4 w-4 rounded-full border-2 border-outline bg-surface" title="Target handle" />
      <div className="absolute -left-2 top-[58px] h-4 w-4 rounded-full border-2 border-outline bg-surface" title="Target handle" />
      <div className="absolute bottom-[-8px] left-[126px] h-4 w-4 rounded-full border-2 border-[#00cec4] bg-surface shadow-[0_0_0_3px_rgba(0,206,196,0.12)]" title="Source handle" />
      <div className="absolute -right-2 top-[58px] h-4 w-4 rounded-full border-2 border-[#00cec4] bg-surface shadow-[0_0_0_3px_rgba(0,206,196,0.12)]" title="Source handle" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-on-surface">{name}</p>
          <p className="mt-1 truncate text-xs text-on-surface-variant">{meta}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {selected ? <Badge variant="success">START</Badge> : <Badge variant="secondary">IMPORT</Badge>}
        </div>
      </div>
      <p className="mt-3 line-clamp-2 text-xs text-on-surface-variant">No stage description configured.</p>
      <div className="mt-4 flex items-center justify-between border-t border-outline-variant pt-3 text-xs text-on-surface-variant">
        <span>Main stage</span>
        <span className="ds-numeric">2 BD</span>
      </div>
    </div>
  );
}

function WarningPopoverDemo({ severity }: { severity: "expired" | "expiring" }) {
  const panelTone = severity === "expired" ? "border-red-500/40 text-red-400" : "border-[#fb923c]/45 text-[#fb923c]";
  const iconTone =
    severity === "expired"
      ? "border-red-500/20 bg-red-500/10 text-red-400"
      : "border-[#fb923c]/20 bg-[#fb923c]/10 text-[#fb923c]";
  const actionTone =
    severity === "expired"
      ? "flex-1 border border-red-500/25 bg-red-500/12 text-red-500 hover:bg-red-500/18 hover:text-red-600"
      : "flex-1 border border-[#fb923c]/25 bg-[#fb923c]/12 text-[#fb923c] hover:bg-[#fb923c]/18 hover:text-[#f97316]";
  return (
    <div className="w-72">
      <div
        className={`rounded-xl border p-4 shadow-lg bg-surface ${panelTone}`}
        style={{
          backgroundImage:
            severity === "expired"
              ? "linear-gradient(rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.1))"
              : "linear-gradient(rgba(251, 146, 60, 0.1), rgba(251, 146, 60, 0.1))",
        }}
      >
        <div className="flex items-start gap-3">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${iconTone}`}>
            <AlertTriangle size={16} />
          </span>
          <div className="min-w-0 space-y-1">
            <p className="ds-label">{severity === "expired" ? "DO Validity Expired" : "DO Validity Expiring"}</p>
            <p className="text-sm text-on-surface">
              {severity === "expired"
                ? "Delivery Order Validity expired on 01/07/2026."
                : "Delivery Order Validity is expiring in 3 day(s) on 08/07/2026."}
            </p>
            <p className="text-xs text-on-surface-variant">Validity date: 08/07/2026</p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Button type="button" size="sm" className={actionTone}>
            {severity === "expired" ? "Update Validity" : "Review Job"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1 border-outline-variant/50 bg-surface text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
          >
            Acknowledge
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1 border-[#00cec4]/40 bg-[#00cec4]/10 text-[#00cec4] hover:bg-[#00cec4]/15"
          >
            <CalendarPlus size={13} />
            Extension
          </Button>
        </div>
      </div>
    </div>
  );
}

function TimelineDemo() {
  const runs = [
    { name: "First Check", status: "COMPLETED", when: "02/07/2026, 10:15", current: false },
    { name: "Duty Payment", status: "ACTIVE", when: "04/07/2026, 16:40", current: true },
  ];
  return (
    <div className="relative pl-5 space-y-4 before:absolute before:left-[8px] before:top-2 before:bottom-2 before:w-[2px] before:bg-outline-variant/40">
      {runs.map((run) => (
        <div key={run.name} className="relative space-y-1 text-xs">
          <span
            className={`absolute -left-[21px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-surface ${
              run.current ? "bg-[#00cec4] animate-pulse" : "bg-outline-variant"
            }`}
          />
          <div className="flex flex-wrap items-center justify-between gap-1">
            <span className={`font-semibold ${run.current ? "text-[#00cec4]" : "text-on-surface"}`}>{run.name}</span>
            <span
              className={`text-[10px] font-medium uppercase px-1.5 py-0.5 rounded-md ${
                run.current ? "bg-[#00cec4]/10 text-[#00cec4]" : "bg-surface-container-high text-on-surface-variant"
              }`}
            >
              {run.status}
            </span>
          </div>
          <p className="text-[10px] text-on-surface-variant ds-numeric">Started: {run.when}</p>
          {run.current ? (
            <p className="text-on-surface-variant bg-surface-container-low p-2 rounded-lg mt-1 font-sans text-xs italic">
              &quot;Awaiting duty challan confirmation.&quot;
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/* ────────────────────────── main page ────────────────────────── */

export function ShowcaseClient() {
  const [neonOn, setNeonOn] = useState(true);
  const [sharedModalOpen, setSharedModalOpen] = useState(false);
  const [chaDialogOpen, setChaDialogOpen] = useState(false);
  const [successOverlayOpen, setSuccessOverlayOpen] = useState(false);

  return (
    <div className="space-y-10">
      {/* Intro + controls (kept OUTSIDE the .cha-module wrapper) */}
      <div className="rounded-2xl border border-outline-variant/30 bg-surface p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h1 className="ds-h1 text-on-surface">CHA UI Showcase</h1>
            <p className="text-sm text-on-surface-variant">
              Every visual element currently used in the CHA module, recreated 1:1 for review. Off-system elements
              show a side-by-side comparison: <span className="font-medium text-amber-600">current — CHA</span> vs{" "}
              <span className="font-medium text-[#00857e]">design system — design.md</span>. Full written inventory:{" "}
              <code className="rounded bg-surface-container px-1.5 py-0.5 font-mono text-xs">cha-ui-elements-audit.md</code>.
              Use <span className="font-medium">Copy code</span> / <span className="font-medium">Paste &amp; edit code</span> on any element to
              apply a style change to <span className="font-medium">every CHA file that uses it</span> — changes are logged to design.md §16 and
              undoable from the history panel below.
            </p>
          </div>
          <label className="flex shrink-0 items-center gap-3 rounded-xl border border-outline-variant/40 bg-surface-container-low px-4 py-3">
            <span className="text-xs text-on-surface">
              <span className="block font-medium">CHA .cha-module cascade</span>
              <span className="text-on-surface-variant">applies the real <code className="font-mono">.cha-module</code> rules (neon buttons + input padding) to the <em>current — CHA</em> panels</span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={neonOn}
              onClick={() => setNeonOn(!neonOn)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                neonOn ? "bg-[#00cec4]" : "bg-surface-container"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  neonOn ? "translate-x-[18px]" : "translate-x-0.5"
                }`}
              />
            </button>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-outline-variant/25 pt-4">
          {SECTIONS.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="rounded-full border border-outline-variant/40 bg-surface-container-low px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-on-surface-variant transition-colors hover:border-[#00cec4]/50 hover:text-[#00cec4]"
            >
              {label}
            </a>
          ))}
        </div>
      </div>

      <HistoryPanel />

      {/* Current-CHA demo panels are individually wrapped in .cha-module (via NeonContext);
          design-system panels are never wrapped, so comparisons stay honest. */}
      <NeonContext.Provider value={neonOn}>
      <div className="space-y-10">
        {/* ── TYPOGRAPHY ── */}
        <Section id="typography" title="Typography" blurb="Heading, label, body, helper, error and numeric text styles found across CHA pages.">
          <Spec
            name="Design-system headings"
            file="all CHA pages"
            source="shared"
            reusable
            classes="ds-h1 / ds-h2 / ds-h3 text-on-surface"
          >
            <div className="space-y-3">
              <h1 className="ds-h1 text-on-surface">Page Title (ds-h1)</h1>
              <h2 className="ds-h2 text-on-surface">Section Title (ds-h2)</h2>
              <h3 className="ds-h3 text-on-surface">Card Title (ds-h3)</h3>
              <h1 className="ds-h1 ds-numeric text-on-surface">CHA-MAA-2026-0001</h1>
            </div>
          </Spec>
          <Spec
            name="Labels — migrated to ds-label ✓"
            file="expenses-client.tsx, job-workspace-client.tsx (26 occurrences normalized 2026-07-05)"
            source="shared"
            reusable
            classes="ds-label / ds-label block"
            notes="MIGRATED: all ad-hoc 9px/10px font-bold micro-labels replaced with ds-label across the CHA module (13-entry change set, undoable from the history panel; logged in design.md §16)."
          >
            <div className="space-y-2">
              <span className="ds-label block">Amount Paid (₹)</span>
              <span className="ds-label block">Stage</span>
              <span className="ds-label block">Extension History</span>
            </div>
          </Spec>
          <Spec
            name="Body, helper and error text"
            file="all CHA pages"
            source="inline-tailwind"
            reusable
            classes="text-sm / text-xs text-on-surface-variant · text-xs text-[#fb923c]"
          >
            <div className="space-y-2">
              <p className="text-sm text-on-surface">Primary body copy — text-sm text-on-surface.</p>
              <p className="text-xs text-on-surface-variant">Helper text — text-xs text-on-surface-variant.</p>
              <p className="text-xs text-[#fb923c]">Validation hint — this branch needs an active numbering rule before a job can be created.</p>
              <p className="text-xs text-red-600 leading-relaxed font-medium">Delay reason text (reports table) — red-600 + font-medium.</p>
            </div>
          </Spec>
          <Spec
            name="Numerics & stat values — migrated to ds-numeric ✓"
            file="cha/page.tsx, reports/page.tsx, expenses-client.tsx, job-workspace-client.tsx (21 occurrences normalized 2026-07-05)"
            source="shared"
            reusable
            classes="text-3xl ds-numeric · text-2xl ds-numeric · ds-numeric"
            notes="MIGRATED: font-bold dropped from all ds-numeric values and redundant font-mono removed — ds-numeric enforces weight 400 + Geist Mono itself (change set undoable from the history panel; logged in design.md §16)."
          >
            <div className="flex flex-wrap items-end gap-6">
              <p className="text-3xl ds-numeric text-on-surface">128</p>
              <p className="text-2xl ds-numeric text-on-surface">₹4,52,600</p>
              <p className="ds-numeric text-on-surface">₹12,500</p>
            </div>
          </Spec>
        </Section>

        {/* ── BUTTONS ── */}
        <Section id="buttons" title="Buttons" blurb="The neon look + hover lift is the canonical design.md §6.1 spec, baked into the shared Button and mirrored by the .cha-module cascade.">
          <Spec
            name="Shared Button — default / outline / destructive / disabled / sm / icon ✓"
            file="src/components/ui/button-1.tsx (used everywhere)"
            source="shared"
            reusable
            classes='<Button variant="default|outline|destructive" size="sm|md|lg" mode="icon">'
            notes="CANONICAL (design.md §6.1, confirmed 2026-07-06): cyan/red neon borders, glow + pulse hover, translateY(-1px) hover lift on every button (active: scale 0.96). Baked natively into the shared Button; the .cha-module cascade mirrors it."
          >
            <div className="flex flex-wrap items-center gap-3">
              <Button>Primary Action</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="destructive">Delete</Button>
              <Button disabled>Disabled</Button>
              <Button size="sm">Small</Button>
              <Button variant="outline" mode="icon" size="sm" aria-label="Settings"><Settings size={16} /></Button>
            </div>
          </Spec>
          <Spec
            name="Orange outline button — sanctioned CHA default ✓"
            file="job-workspace-client.tsx:2549, 2457, 2579 · design.md §6.1.1"
            source="shared"
            reusable
            classes="border-[#fb923c]/50 text-[#fb923c] hover:bg-[#fb923c]/10 (on Button variant=outline)"
            notes="ADOPTED 2026-07-05, confirmed 2026-07-06: documented CHA default for warning-state actions (design.md §6.1.1). Orange neon hover (glow + tint) via the cascade; lifts -1px on hover like every button."
          >
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" className="border-[#fb923c]/50 text-[#fb923c] hover:bg-[#fb923c]/10">Mark All N/A</Button>
              <Button variant="outline" className="border-[#fb923c]/50 text-[#fb923c] hover:bg-[#fb923c]/10">Assign Manager</Button>
              <Button variant="outline" className="border-[#00cec4]/50 text-[#00cec4] hover:bg-[#00cec4]/10">Deactivate Section 49</Button>
            </div>
          </Spec>
          <Spec
            name="Tonal tinted buttons (warning popovers) — sanctioned with standard sizing ✓"
            file="_components/job-*-warning-indicator.tsx · design.md §6.1.1"
            source="shared"
            reusable
            classes='Button size="sm" + flex-1 border {tone}/25 bg-{tone}/12 text-{tone} hover:bg-{tone}/18'
            notes="ADOPTED 2026-07-05, confirmed 2026-07-06: tint colors kept as-is; size, padding and 12px text come from the standard sm button token; neon hover + lift per §6.1 (design.md §6.1.1)."
          >
            <div className="flex flex-wrap gap-3">
              <Button size="sm" className="border border-red-500/25 bg-red-500/12 text-red-500 hover:bg-red-500/18">Update Validity</Button>
              <Button size="sm" className="border border-[#fb923c]/25 bg-[#fb923c]/12 text-[#fb923c] hover:bg-[#fb923c]/18">Review Job</Button>
              <Button variant="outline" size="sm" className="border-outline-variant/50 bg-surface text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface">Acknowledge</Button>
              <Button variant="outline" size="sm" className="border-[#00cec4]/40 bg-[#00cec4]/10 text-[#00cec4] hover:bg-[#00cec4]/15"><CalendarPlus size={13} />Extension</Button>
            </div>
          </Spec>
          <Spec
            name="Text-link buttons — cha-link ✓"
            file="expenses-client.tsx · job-workspace-client.tsx · globals.css button.cha-link · design.md §6.1.2"
            source="shared"
            reusable
            classes="ds-plain cha-link + own size/weight classes (globals.css button.cha-link)"
            notes="ADOPTED 2026-07-07: text-link buttons use the cha-link class — no background fill, cyan text (#00cec4, hover #00b8af + underline), and the neon hover animation kept (pulse glow + 1px lift). ds-plain keeps the button cascade off them. Hover the demos."
          >
            <div className="flex flex-wrap items-center gap-6 text-xs">
              <button type="button" className="ds-plain cha-link hover:underline font-bold">Register Payout</button>
              <button type="button" className="ds-plain cha-link hover:underline font-semibold">Audit Status</button>
              <button type="button" className="ds-plain cha-link ds-label hover:underline">Change</button>
            </div>
          </Spec>
          <Spec
            name="Nonstandard button heights ✓"
            file="approvals, expenses, job workspace · design.md §6.1.2"
            source="shared"
            reusable
            classes='size="sm" — no overrides'
            notes="DESIGN SYSTEM APPLIED 2026-07-06: every h-7 / h-8 text-xs / text-[10px] override stripped; all small buttons use the standard sm token (h-8, 12px) (design.md §6.1.2)."
          >
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Audit &amp; Review <ArrowRight size={12} /></Button>
              <Button size="sm" variant="outline">Cancel</Button>
              <Button size="sm">Confirm Resolution</Button>
            </div>
          </Spec>
          <Spec
            name="Upload dropzone buttons — unified ✓"
            file="do-extension-modal.tsx · job-workspace-client.tsx · design.md §6.1.2"
            source="shared"
            reusable
            classes="rounded-xl border-dashed border-outline-variant/50 bg-surface hover:border-[#00cec4]/60 hover:bg-surface-container-low/40"
            notes="DESIGN SYSTEM (updated 2026-07-07): untinted bg-surface at rest with a neutral dashed border — the old-UI look; border turns cyan with a faint tint on hover. One recipe for all 5 dropzones (design.md §6.1.2). ds-plain + narrowed label selector keep the neon cascade off them."
          >
            <div className="space-y-3">
              <button type="button" className="ds-plain flex w-full cursor-pointer items-center gap-2 rounded-xl border border-dashed border-outline-variant/50 bg-surface px-4 py-3 text-sm text-on-surface-variant transition hover:border-[#00cec4]/60 hover:bg-surface-container-low/40">
                <FileUp size={15} className="text-[#00cec4]" /> Choose extension file (PDF or image)
              </button>
              <button type="button" className="ds-plain flex w-full min-h-20 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-outline-variant/50 bg-surface px-4 py-4 text-sm text-on-surface-variant transition hover:border-[#00cec4]/60 hover:bg-surface-container-low/40">
                <FileUp size={16} className="text-[#00cec4]" /> Workspace dropzone (same recipe)
              </button>
            </div>
          </Spec>
        </Section>

        {/* ── CARDS ── */}
        <Section id="cards" title="Cards" blurb="Card shells in CHA. Section panels and inset panels follow the design-system recipes (✓); remaining off-system items still show side-by-side comparisons.">
          <Spec
            name="KPI / stat card (with orange icon override)"
            file="cha/page.tsx:189-248 · reports/page.tsx:101"
            source="shared"
            reusable
            classes="card-top-accent rounded-xl bg-surface border border-outline-variant/30 p-5 space-y-2 hover-cyan transition-all"
            notes="Matches the design-system stat card. The inline style orange override on ds-icon-badge is the AGENTS.md-documented pattern. font-bold on the value breaks the numeric weight rule."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="card-top-accent rounded-xl bg-surface border border-outline-variant/30 p-5 space-y-2 hover-cyan transition-all">
                <div className="flex items-center justify-between text-on-surface-variant">
                  <span className="ds-label">Active Clearance Jobs</span>
                  <span className="ds-icon-badge"><Briefcase size={16} /></span>
                </div>
                <p className="text-3xl ds-numeric text-on-surface">18</p>
                <span className="text-[10px] text-on-surface-variant">Jobs currently in operations</span>
              </div>
              <div className="card-top-accent rounded-xl bg-surface border border-outline-variant/30 p-5 space-y-2 hover-cyan transition-all">
                <div className="flex items-center justify-between text-on-surface-variant">
                  <span className="ds-label">Urgent Expenses</span>
                  <span className="ds-icon-badge" style={{ background: "rgba(251,146,60,0.1)", color: "#fb923c" }}><AlertCircle size={16} /></span>
                </div>
                <p className="text-3xl ds-numeric text-[#fb923c]">3</p>
                <span className="text-[10px] text-on-surface-variant">Immediate payouts required</span>
              </div>
            </div>
          </Spec>
          <Spec
            name="Section panel — unified ✓"
            file="reports, approvals, expenses, jobs, workspace · design.md §7.2"
            source="shared"
            reusable
            classes="rounded-xl border border-outline-variant/60 bg-surface shadow-sm"
            notes="DESIGN SYSTEM APPLIED 2026-07-06 (strict): ALL section panels use the Card recipe — including the workflow-builder shell (its rounded-3xl exception was removed; design.md §7.2 allows no 2xl/3xl panels)."
          >
            <div className="space-y-3">
              <div className="rounded-xl border border-outline-variant/60 bg-surface p-6 shadow-sm text-xs text-on-surface-variant">rounded-xl + outline-variant/60 — reports, approvals, expenses</div>
              <div className="rounded-xl border border-outline-variant/60 bg-surface p-4 shadow-sm text-xs text-on-surface-variant">Same recipe — job workspace, jobs filter card, workflow-builder shell</div>
            </div>
          </Spec>
          <Spec
            name="Nested inset panels — unified ✓"
            file="job-workspace-client.tsx, do-validity-panel.tsx · design.md §7.2"
            source="shared"
            reusable
            classes="rounded-xl border border-outline-variant bg-surface-container-low"
            notes="DESIGN SYSTEM APPLIED 2026-07-06: all border/bg opacity permutations replaced with the single inset recipe (design.md §7.2)."
          >
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-outline-variant bg-surface-container-low p-3 text-[11px] text-on-surface-variant">Inset panel</div>
              <div className="rounded-xl border border-outline-variant bg-surface-container-low p-3 text-[11px] text-on-surface-variant">Same recipe, every nesting level</div>
            </div>
          </Spec>
          <Spec
            name="Document requirement card (upload card)"
            file="job-workspace-client.tsx:2628-2660"
            source="shared"
            reusable
            classes="p-4 rounded-2xl border card-left-accent(-orange) border-outline-variant/30 bg-[var(--color-surface)]"
            notes="Left accent encodes state: cyan = uploaded, orange = pending. Good pattern; bg-[var(--color-surface)] should just be bg-surface."
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="p-4 rounded-2xl border flex flex-col justify-between bg-surface card-left-accent border-outline-variant/30">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-on-surface">Bill of Lading</span>
                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#00cec4]/10 text-[#00cec4]">UPLOADED</span>
                </div>
                <div className="mt-3 rounded-lg border border-outline-variant/40 bg-surface p-2.5 text-xs">
                  <div className="flex items-center gap-2"><FileText size={16} className="text-green-600 shrink-0" /><span className="text-[#00cec4]">bol_final_v2.pdf</span></div>
                </div>
              </div>
              <div className="p-4 rounded-2xl border flex flex-col justify-between bg-surface card-left-accent-orange border-outline-variant/30">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-on-surface">Commercial Invoice</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-50 text-red-500 border border-red-200">MANDATORY</span>
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant">PENDING</span>
                  </div>
                </div>
                <p className="text-xs text-on-surface-variant mt-2">Awaiting upload from operations.</p>
              </div>
            </div>
          </Spec>
          <Spec
            name="Settings tiles — health card & quick-action card ✓"
            file="settings-form.tsx · design.md §7.2"
            source="shared"
            reusable
            classes="border-outline-variant/60 bg-surface p-4 · card-left-accent hover-cyan"
            notes="DESIGN SYSTEM APPLIED 2026-07-06: health tiles use the neutral section-panel border; quick-action rows use card-left-accent + hover-cyan and carry ds-plain so the neon cascade skips them (design.md §7.2)."
          >
            <div className="space-y-3">
              <div className="rounded-xl border border-outline-variant/60 bg-surface p-4 shadow-sm">
                <p className="ds-label text-on-surface-variant">Job Creation</p>
                <p className="mt-1 text-sm text-on-surface">4 role(s) and 2 user(s) can create CHA jobs.</p>
              </div>
              <button type="button" className="ds-plain card-left-accent hover-cyan flex w-full items-center justify-between rounded-xl border border-outline-variant/60 bg-surface px-4 py-3 text-left shadow-sm transition-all">
                <span>
                  <span className="block text-sm font-medium text-on-surface">Numbering</span>
                  <span className="block text-xs text-on-surface-variant">Branch job number rules</span>
                </span>
                <ChevronRight size={16} className="text-on-surface-variant" />
              </button>
              <div className="rounded-xl border border-outline-variant/60 bg-surface p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <ShieldCheck size={18} className="mt-0.5 text-[#00cec4]" />
                  <div>
                    <p className="text-sm font-medium text-on-surface">Recommended setup order</p>
                    <p className="mt-1 text-xs text-on-surface-variant">Finish numbering, then clearance data, then document requirements.</p>
                  </div>
                </div>
              </div>
            </div>
          </Spec>
          <Spec
            name="Expense request card (urgent tint) + audit log item ✓"
            file="expenses-client.tsx · reports/page.tsx:229 · design.md §7.2"
            source="shared"
            reusable
            classes="card-left-accent-orange border-red-500/35 (urgent) · justification: border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-200 · status/urgency via Badge"
            notes="DESIGN SYSTEM APPLIED 2026-07-07: light-only red-200/red-50 replaced with theme-safe alpha tints; status pill and URGENT chip converted to the shared Badge; red-tinted justification copy now uses red text for stronger contrast and consistent urgency signaling."
          >
            <div className="space-y-3">
              <div className="card-left-accent-orange bg-surface p-4 rounded-xl border border-red-500/35 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#00cec4]">Job: CHA-MAA-2026-0007</span>
                  <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">URGENT PAYMENT REQUIRED</Badge>
                </div>
                <span className="text-xl ds-numeric text-on-surface flex items-center gap-2">₹42,500 <Badge variant="destructive" className="text-[10px] uppercase">URGENT</Badge></span>
                <div className="p-3 rounded-lg border border-red-500/25 bg-red-500/10 text-xs leading-relaxed text-red-700 dark:text-red-200">
                  <strong>Disbursement urgency justification:</strong> &quot;Vessel berthing tomorrow morning.&quot;
                </div>
              </div>
              <div className="text-xs p-3 bg-surface-container-low border border-outline-variant/40 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between border-b border-outline-variant/20 pb-1">
                  <span className="font-medium text-[#00cec4]">CHA-MAA-2026-0003</span>
                  <span className="text-[9px] text-on-surface-variant font-mono">05/07/2026</span>
                </div>
                <p className="text-[11px] uppercase tracking-wide text-on-surface leading-tight">CHECKLIST APPROVED</p>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">&quot;Approved after BOE value verification.&quot;</p>
              </div>
            </div>
          </Spec>
        </Section>

        {/* ── BADGES ── */}
        <Section id="badges" title="Badges & Status Indicators" blurb="CHA stage, document state, and priority chips are now normalized to the shared Badge component with one shared mapping layer.">
          <Spec
            name="One status, five implementations"
            file="src/lib/cha-badges.ts · cha/page.tsx:365 · jobs-client.tsx:264 · expenses-client.tsx:270 · job-workspace-client.tsx:2346 · job-workspace-client.tsx:2648"
            source="shared"
            reusable
            classes='Badge + getChaStageBadgeVariant|getChaDocumentStatusBadgeVariant + formatChaBadgeLabel'
            notes="Normalized on 2026-07-07. Dashboard, jobs list, workspace header/doc cards, and expense states now all resolve through the shared Badge primitive instead of inline pills."
          >
            <div className="space-y-2.5 text-on-surface">
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-28 text-[10px] text-on-surface-variant shrink-0">1 · dashboard</span>
                <Badge variant="warning">CHECKLIST APPROVAL</Badge>
                <Badge>FILING</Badge>
                <Badge variant="success">FILED</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-28 text-[10px] text-on-surface-variant shrink-0">2 · jobs list</span>
                <Badge variant="warning">CHECKLIST APPROVAL</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-28 text-[10px] text-on-surface-variant shrink-0">3 · expenses</span>
                <Badge variant="success">RECEIPT ACKNOWLEDGED</Badge>
                <Badge variant="warning">QUERY RAISED</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-28 text-[10px] text-on-surface-variant shrink-0">4 · job header</span>
                <Badge variant="secondary">IMPORT BOE</Badge>
                <Badge variant="success">ACTIVE</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-28 text-[10px] text-on-surface-variant shrink-0">5 · doc cards</span>
                <Badge variant="success">UPLOADED</Badge>
                <Badge variant="secondary">NOT AVAILABLE</Badge>
                <Badge variant="destructive">MANDATORY</Badge>
              </div>
            </div>
          </Spec>
          <Spec
            name="Shared Badge component (now used across workflow builder + CHA)"
            file="src/components/ui/badge.tsx · src/lib/cha-badges.ts · workflows-client.tsx:1688+ · cha/page.tsx · jobs-client.tsx · job-workspace-client.tsx"
            source="shared"
            reusable
            classes='<Badge variant="default|secondary|success|warning|destructive">'
            notes="Canonical badge primitive. Its typography was updated on 2026-07-07 to lighter weight + wider tracking, and it now drives workflow builder plus CHA stage/status/priority treatments."
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge>DEFAULT</Badge>
              <Badge variant="secondary">SYNCED</Badge>
              <Badge variant="success">PUBLISHED V3</Badge>
              <Badge variant="warning">UNSAVED CHANGES</Badge>
              <Badge variant="destructive">REJECTED</Badge>
            </div>
          </Spec>
          <Spec
            name="Priority — two treatments of the same field"
            file="src/lib/cha-badges.ts · cha/page.tsx:373 · jobs-client.tsx:268"
            source="shared"
            reusable
            classes='Badge + getChaPriorityBadgeVariant("HIGH"|"MEDIUM"|"LOW")'
            notes="Normalized on 2026-07-07. Dashboard and jobs list now use the same priority treatment: HIGH→destructive, MEDIUM→warning, LOW→secondary."
          >
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="destructive">HIGH</Badge>
              <Badge variant="warning">MEDIUM</Badge>
              <Badge variant="secondary">LOW</Badge>
            </div>
          </Spec>
          <Spec
            name="Warning indicator triggers (with pulse rings)"
            file="_components/job-*-warning-indicator.tsx:143"
            source="cha-specific"
            reusable
            classes="h-7 w-7 rounded-lg border + tone classes + hover:scale-105 · animate-pulse-orange / animate-pulse-red (globals.css)"
            notes="Consistent across the three indicator components. The three components themselves are near-identical copies (~550 combined lines)."
          >
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border shadow-sm transition-transform hover:scale-105 border-[#fb923c]/45 bg-[#fb923c]/10 text-[#fb923c]"><AlertTriangle size={14} /></span>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border shadow-sm transition-transform hover:scale-105 border-red-500/40 bg-red-500/10 text-red-400"><AlertTriangle size={14} /></span>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#fb923c]/45 bg-[#fb923c]/10 text-[#fb923c] animate-pulse-orange"><AlertTriangle size={14} /></span>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-500/40 bg-red-500/10 text-red-400 animate-pulse-red"><AlertTriangle size={14} /></span>
            </div>
          </Spec>
        </Section>

        {/* ── TABLES ── */}
        <Section id="tables" title="Tables" blurb="Four table wrapper strategies exist in CHA. design.md §7.1 defines exactly one canonical hierarchy.">
          <Spec
            name="Canonical ds-table shell (design.md §7.1)"
            file="customers/page.tsx:47 · do-validity-panel.tsx:210"
            source="shared"
            reusable
            classes="overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm > overflow-x-auto > table.ds-table"
          >
            <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm">
              <div className="overflow-x-auto">
                <table className="ds-table">
                  <thead>
                    <tr><th className="px-6 py-3">Customer</th><th className="px-6 py-3">Email</th><th className="px-6 py-3">Updated</th></tr>
                  </thead>
                  <tbody>
                    <tr className="ds-row-link"><td className="px-6 py-4 font-medium">Meridian Exports</td><td className="px-6 py-4">ops@meridian.in</td><td className="px-6 py-4 ds-numeric">02/07/2026</td></tr>
                    <tr className="ds-row-link"><td className="px-6 py-4 font-medium">Coastal Freight Co</td><td className="px-6 py-4">desk@coastal.in</td><td className="px-6 py-4 ds-numeric">28/06/2026</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </Spec>
          <Spec
            name="ds-table inside a padded card (non-canonical)"
            file="reports/page.tsx:180-217 · approvals/page.tsx:52"
            source="inline-tailwind"
            reusable={false}
            inconsistent
            classes="bg-surface … rounded-xl p-6 > overflow-x-auto > table.ds-table (no shell, no th padding, colored bold td)"
            notes="Table floats inside card padding — header band does not reach the card edge. td uses font-semibold + brand/red colors, breaking cell weight rules."
            dsNotes="design.md §7.1 shell: overflow-hidden rounded-xl border shell → overflow-x-auto → ds-table with px-6 py-3/4 cells. Identifier column font-medium only; status via Badge, not colored bold text."
            ds={
              <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm">
                <div className="overflow-x-auto">
                  <table className="ds-table">
                    <thead>
                      <tr><th className="px-6 py-3">Job Number</th><th className="px-6 py-3">Customer</th><th className="px-6 py-3">Delay Reason</th></tr>
                    </thead>
                    <tbody>
                      <tr className="ds-row-link"><td className="px-6 py-4 font-medium text-[#00cec4]">CHA-MAA-2026-0002</td><td className="px-6 py-4">Meridian Exports</td><td className="px-6 py-4 text-xs">Awaiting duty clarification</td></tr>
                      <tr className="ds-row-link"><td className="px-6 py-4 font-medium text-[#00cec4]">CHA-MAA-2026-0009</td><td className="px-6 py-4">Coastal Freight Co</td><td className="px-6 py-4 text-xs">Vessel rollover</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            }
          >
            <div className="bg-surface border border-outline-variant/30 rounded-xl p-6 shadow-sm">
              <div className="overflow-x-auto">
                <table className="ds-table">
                  <thead>
                    <tr><th>Job Number</th><th>Customer</th><th>Delay Reason</th></tr>
                  </thead>
                  <tbody>
                    <tr><td className="font-semibold text-[#00cec4]">CHA-MAA-2026-0002</td><td>Meridian Exports</td><td className="text-xs text-red-600 font-medium">Awaiting duty clarification</td></tr>
                    <tr><td className="font-semibold text-red-500">CHA-MAA-2026-0009</td><td>Coastal Freight Co</td><td className="text-xs text-red-600 font-medium">Vessel rollover</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </Spec>
          <Spec
            name="cha-jobs-table override + tfoot pagination"
            file="jobs-client.tsx:206, 279 · globals.css:680-696"
            source="globals.css"
            reusable={false}
            inconsistent
            classes=".cha-jobs-table-shell / .cha-jobs-table (softened border rgba values, separate light+dark rules)"
            notes="One-off CSS that only softens border colors — duplicates what border-outline-variant/25 utilities already do."
            dsNotes="Plain ds-table in the canonical shell — no custom CSS classes; ds-table th/td already use outline-variant borders that theme-switch correctly. Stage via Badge."
            ds={
              <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm">
                <div className="overflow-x-auto">
                  <table className="ds-table">
                    <thead>
                      <tr><th className="px-6 py-3">Job Number</th><th className="px-6 py-3">Stage</th><th className="px-6 py-3">Priority</th></tr>
                    </thead>
                    <tbody>
                      <tr className="ds-row-link">
                        <td className="px-6 py-4 font-medium text-[#00cec4]">CHA-MAA-2026-0004</td>
                        <td className="px-6 py-4"><Badge>FILING</Badge></td>
                        <td className="px-6 py-4"><Badge variant="warning">MEDIUM</Badge></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between border-t border-outline-variant px-6 py-4">
                  <span className="text-xs text-on-surface-variant">Page <span className="text-on-surface">1</span> of <span className="text-on-surface">4</span> (37 jobs)</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled>Previous</Button>
                    <Button variant="outline" size="sm">Next</Button>
                  </div>
                </div>
              </div>
            }
          >
            <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm">
              <div className="overflow-x-auto">
                <table className="ds-table">
                  <thead>
                    <tr><th className="py-4 px-6">Job Number</th><th className="py-4 px-6">Stage</th><th className="py-4 px-6">Priority</th></tr>
                  </thead>
                  <tbody>
                    <tr className="ds-row-link">
                      <td className="py-5 px-6 font-medium text-[#00cec4]">CHA-MAA-2026-0004</td>
                      <td className="py-5 px-6"><span className="inline-flex rounded-full border border-outline-variant/35 bg-surface-container-low px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-on-surface-variant">FILING</span></td>
                      <td className="py-5 px-6"><span className="text-xs uppercase tracking-[0.12em] text-on-surface-variant">MEDIUM</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-outline-variant px-6 py-4">
                <span className="text-xs text-on-surface-variant">Page <span className="text-on-surface">1</span> of <span className="text-on-surface">4</span> (37 jobs)</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled>Previous</Button>
                  <Button variant="outline" size="sm">Next</Button>
                </div>
              </div>
            </div>
          </Spec>
        </Section>

        {/* ── FORMS ── */}
        <Section id="forms" title="Forms" blurb="Shared Input, DateInput and DropdownSelect now define the standard single-line field contract: outlined, surface-backed, h-11, rounded-xl. CHA still adds a padding layer in globals.css, but create-job-dialog now relies on the shared primitives instead of inline field clones.">
          <Spec
            name="Standard inputs (global cyan styling)"
            file="jobs-client.tsx:322 · expenses-client.tsx:175 (relies on globals.css main input rules)"
            source="shared"
            reusable
            classes="h-11 w-full pl-10 pr-4 text-sm (only sizing — border/focus come from globals.css)"
          >
            <div className="space-y-3">
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-on-surface-variant"><Search size={16} /></span>
                <input type="text" placeholder="Search job #, customer, or title..." className="h-11 w-full pl-10 pr-4 text-sm" />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input type="text" placeholder="Plain text input" className="w-full text-sm" />
                <input type="date" className="w-full text-sm ds-numeric" defaultValue="2026-07-05" />
              </div>
              <textarea rows={2} placeholder="Textarea — same global treatment" className="w-full text-sm" />
            </div>
          </Spec>
          <Spec
            name="Create-job dialog field contract"
            file="src/components/cha/create-job-dialog.tsx · src/components/ui/input.tsx"
            source="shared"
            reusable
            classes="Input / DateInput / DropdownSelect = h-11 rounded-xl px-4 py-2.5"
            notes="Design system applied: create-job dialog now uses the shared single-line field primitives instead of hand-styled inline clones."
            dsNotes="Canonical rule: all primary single-line form fields stay outlined and surface-backed with matching height and padding."
            ds={<input type="text" placeholder="e.g. CHA-MAA-2026-0001" className="w-full text-sm" />}
          >
            <input
              type="text"
              placeholder="e.g. CHA-MAA-2026-0001"
              className="w-full text-sm"
            />
          </Spec>
          <Spec
            name="Native select vs shared DropdownSelect"
            file="expenses-client.tsx:184 · workflows-client.tsx:1699 (native) vs jobs-client.tsx:347 (DropdownSelect)"
            source="inline-tailwind"
            reusable
            inconsistent
            notes="Two select experiences still coexist, but DropdownSelect is now explicitly the shared outlined field trigger with the same h-11 geometry as Input."
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <select className="w-full text-sm" defaultValue="">
                <option value="">All Statuses (native select)</option>
                <option>SUBMITTED</option>
                <option>APPROVED</option>
              </select>
              <div className="flex h-11 items-center rounded-xl border border-[rgba(0,206,196,0.55)] bg-surface px-4 py-2.5 text-xs text-on-surface-variant">
                DropdownSelect (shared, outlined, h-11) — see /cha/jobs filters and create-job dialog
              </div>
            </div>
          </Spec>
          <Spec
            name="Neon checkbox + custom toggle switch"
            file="globals.css:1092 (checkbox, app-wide) · do-validity-panel.tsx:33-63 (toggle, CHA-only)"
            source="cha-specific"
            reusable={false}
            inconsistent
            classes="Toggle: h-5 w-9 rounded-full bg-[#00cec4]|bg-surface-container + h-4 w-4 bg-white thumb"
            notes="Toggle is a one-off (thumb is light-only bg-white). Checkbox is the app-wide neon style from globals.css."
            dsNotes="design.md has no Switch primitive yet — gap to formalize. Token-safe version: same geometry, thumb bg-surface (theme-aware) instead of bg-white; promote to src/components/ui/switch.tsx."
            ds={
              <div className="flex flex-wrap items-center gap-6">
                <label className="flex items-center gap-3 rounded-xl border border-outline-variant px-4 py-3 text-sm text-on-surface">
                  <input type="checkbox" defaultChecked className="h-4 w-4 rounded" /> Assigned to me
                </label>
                <div className="flex items-center gap-3 text-sm text-on-surface">
                  <span className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full bg-[#00cec4]">
                    <span className="inline-block h-4 w-4 translate-x-[18px] transform rounded-full bg-surface shadow" />
                  </span>
                  DO Document Upload (thumb = bg-surface)
                </div>
              </div>
            }
          >
            <div className="flex flex-wrap items-center gap-6">
              <label className="flex items-center gap-3 rounded-xl border border-outline-variant/30 px-4 py-3 text-sm text-on-surface">
                <input type="checkbox" defaultChecked className="h-4 w-4 rounded" /> Assigned to me
              </label>
              <div className="flex items-center gap-3 text-sm text-on-surface">
                <ToggleDemo /> DO Document Upload
              </div>
            </div>
          </Spec>
          <Spec
            name="Form section with cyan bar"
            file="do-validity-panel.tsx:123 · job-workspace-client.tsx:3646"
            source="shared"
            reusable
            classes="ds-form-section (auto ::before cyan bar on child heading) + ds-h3"
          >
            <div className="ds-form-section space-y-3">
              <h3 className="ds-h3 text-on-surface">Shipment Details</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="ds-label block">Shipment Type</label>
                  <input value="SEA — FCL" readOnly className="w-full text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="ds-label block">Bill Of Entry Number</label>
                  <input placeholder="Enter Bill Of Entry Number" className="w-full text-xs" />
                </div>
              </div>
            </div>
          </Spec>
        </Section>

        {/* ── FILTER BAR ── */}
        <Section id="filters" title="Filter Bar" blurb="The jobs-list filter card is the most complete filter pattern in CHA; expenses uses a different inline-grid variant.">
          <Spec
            name="Jobs filter card (search + FilterMenu + primary CTA)"
            file="jobs-client.tsx:316-451"
            source="shared"
            reusable
            classes="rounded-2xl border border-outline-variant/25 bg-surface p-4 shadow-sm + FilterMenu + DropdownSelect"
            notes="Uses shared FilterMenu with active-count badge. Recreated statically here."
          >
            <div className="rounded-2xl border border-outline-variant/25 bg-surface p-4 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative min-w-0 flex-1">
                  <span className="absolute inset-y-0 left-3 flex items-center text-on-surface-variant"><Search size={16} /></span>
                  <input type="text" placeholder="Search job #, customer, or title..." className="h-11 w-full pl-10 pr-4 text-sm" />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button variant="outline" className="gap-2"><Filter size={15} /> Filters <span className="ds-numeric rounded-full bg-[#00cec4]/10 px-1.5 text-[10px] text-[#00cec4]">2</span></Button>
                  <Button className="flex items-center justify-center gap-2 whitespace-nowrap"><Plus className="size-4" /> Create Job</Button>
                </div>
              </div>
            </div>
          </Spec>
          <Spec
            name="Expenses filter card (inline grid variant)"
            file="expenses-client.tsx:164-212"
            source="inline-tailwind"
            reusable={false}
            inconsistent
            classes="bg-surface border-outline-variant/30 p-5 rounded-xl + grid md:grid-cols-4 + inline selects"
            notes="Second filter pattern: label row with Filter icon, native selects, Reset/Apply right-aligned. Differs from jobs list in radius, layout and select control."
            dsNotes="Reuse the jobs-list pattern: single row, search input + FilterMenu (dropdown holds the selects) + primary CTA. One filter experience module-wide."
            ds={
              <div className="rounded-xl border border-outline-variant/60 bg-surface p-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <div className="relative min-w-0 flex-1">
                    <span className="absolute inset-y-0 left-3 flex items-center text-on-surface-variant"><Search size={16} /></span>
                    <input type="text" placeholder="Search job #, customer, requester..." className="h-11 w-full pl-10 pr-4 text-sm" />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="outline" className="gap-2"><Filter size={15} /> Filters</Button>
                    <Button>Apply</Button>
                  </div>
                </div>
              </div>
            }
          >
            <div className="bg-surface border border-outline-variant/30 p-5 rounded-xl space-y-4 shadow-sm">
              <div className="flex items-center gap-2 text-[#00cec4]">
                <Filter size={16} />
                <span className="ds-label tracking-wider font-semibold">Queue Filters</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative col-span-1 md:col-span-2">
                  <span className="absolute inset-y-0 left-3 flex items-center text-on-surface-variant"><Search size={16} /></span>
                  <input type="text" placeholder="Search job #, customer, requester..." className="h-11 pl-10 pr-4 w-full text-sm font-sans" />
                </div>
                <select className="w-full text-sm font-sans" defaultValue=""><option value="">All Statuses</option></select>
                <select className="w-full text-sm font-sans" defaultValue=""><option value="">All Urgency levels</option></select>
                <div className="flex gap-2 col-span-1 md:col-span-4 justify-end">
                  <Button variant="outline" className="text-xs">Reset Filters</Button>
                  <Button className="text-xs px-6">Apply Filters</Button>
                </div>
              </div>
            </div>
          </Spec>
        </Section>

        {/* ── TABS ── */}
        <Section id="tabs" title="Tabs & Segmented Controls" blurb="Two opposite 'active tab' treatments live in the same module.">
          <Spec
            name="Workspace sticky tabs — tinted inset active"
            file="job-workspace-client.tsx:2507-2528"
            source="inline-tailwind"
            reusable
            classes="rounded-lg text-[11px] font-bold uppercase · active: bg-[#00cec4]/10 text-[#00cec4] shadow-[inset_0_0_0_1px_rgba(0,206,196,0.35)]"
            notes="Sticky with backdrop-blur on the real page. Interactive demo."
          >
            <WorkspaceTabsDemo />
          </Spec>
          <Spec
            name="Settings pill tabs — solid cyan active + lift hover"
            file="settings-form.tsx:639-674"
            source="inline-tailwind"
            reusable={false}
            inconsistent
            classes="min-h-[50px] rounded-xl border · active: bg-[#00cec4] text-white shadow-[0_16px_32px_-22px_rgba(0,206,196,0.95)] · hover:-translate-y-0.5"
            notes="Same control type as the workspace tabs but with an opposite visual language and non-token shadows. Interactive demo."
            dsNotes="design.md defines no tab primitive — gap to formalize. The workspace tinted-inset treatment (cyan/10 + inset ring) is the candidate: token-based, no lift, no oversized shadows."
            ds={<WorkspaceTabsDemo />}
          >
            <SettingsTabsDemo />
          </Spec>
          <Spec
            name="Canvas zoom segmented control"
            file="workflows-client.tsx:1864"
            source="inline-tailwind"
            reusable
            classes="flex items-center gap-1 rounded-xl border border-outline-variant bg-surface p-1"
          >
            <div className="inline-flex items-center gap-1 rounded-xl border border-outline-variant bg-surface p-1">
              <Button variant="outline" mode="icon" size="sm" aria-label="Zoom out"><ZoomOut size={14} /></Button>
              <span className="px-2 text-xs ds-numeric text-on-surface-variant">100%</span>
              <Button variant="outline" mode="icon" size="sm" aria-label="Zoom in"><ZoomIn size={14} /></Button>
              <Button variant="outline" mode="icon" size="sm" aria-label="Reset"><Minus size={14} /></Button>
            </div>
          </Spec>
        </Section>

        {/* ── MODALS ── */}
        <Section id="modals" title="Modals & Overlays" blurb="A shared Modal exists, but the create-job dialog hand-rolls its own overlay, and job creation success shows a fullscreen 3D animation with hard-coded dark hex colors.">
          <Spec
            name="Shared Modal (ui/modal.tsx)"
            file="do-extension-modal.tsx · job-delete-inline-button.tsx · workspace modals (max-w-xl/2xl/4xl)"
            source="shared"
            reusable
            classes="ds-shell-lg + bg-black/45 backdrop · header bg-surface-container-low"
          >
            <Button onClick={() => setSharedModalOpen(true)}>Open shared Modal</Button>
            <Modal
              open={sharedModalOpen}
              title="Apply Delivery Order Extension"
              description="Enter the new extension date and upload the extension document."
              onClose={() => setSharedModalOpen(false)}
              className="max-w-lg"
            >
              <div className="space-y-4">
                <label className="block space-y-1.5">
                  <span className="ds-label">New Extension Date</span>
                  <input type="date" className="w-full" />
                </label>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setSharedModalOpen(false)}>Cancel</Button>
                  <Button size="sm"><CalendarPlus size={13} /> Apply Extension</Button>
                </div>
              </div>
            </Modal>
          </Spec>
          <Spec
            name="Hand-rolled create-job dialog"
            file="src/components/cha/create-job-dialog.tsx:688-711"
            source="cha-specific"
            reusable={false}
            inconsistent
            classes="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in · max-w-3xl rounded-2xl shadow-xl"
            notes="Duplicate modal implementation — different backdrop (60% vs 45%), radius (2xl vs ds-shell-lg 24px), z-index and header styling from the shared Modal."
            dsNotes="Use the shared Modal (ui/modal.tsx): ds-shell-lg 24px radius, bg-black/45 backdrop, standard header band + close button. Static replica of its shell shown here."
            ds={
              <div className="ds-shell-lg overflow-hidden border border-outline-variant/50 bg-surface text-on-surface shadow-[0_24px_80px_-24px_rgba(15,23,42,0.55)]">
                <div className="flex items-start justify-between gap-4 border-b border-outline-variant/35 bg-surface-container-low px-6 py-5">
                  <div>
                    <h2 className="ds-h2 text-on-surface">Initialize Customs Clearance Job</h2>
                    <p className="mt-1 text-sm text-on-surface-variant">Shared Modal — same shell for every dialog.</p>
                  </div>
                  <span className="rounded-xl border border-outline-variant/35 bg-surface p-2 text-on-surface-variant">✕</span>
                </div>
                <div className="space-y-4 px-6 py-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="ds-label block">Customs Branch Office *</label>
                      <select className="w-full text-sm"><option>Chennai (MAA)</option></select>
                    </div>
                    <div className="space-y-1">
                      <label className="ds-label block">Job Ref Number</label>
                      <input type="text" placeholder="e.g. CHA-MAA-2026-0001" className="w-full text-sm" />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-3 border-t border-outline-variant/30 pt-4">
                    <Button variant="outline">Cancel</Button>
                    <Button>Confirm &amp; Launch</Button>
                  </div>
                </div>
              </div>
            }
          >
            <Button onClick={() => setChaDialogOpen(true)}>Open create-job dialog replica</Button>
            {chaDialogOpen ? (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200" onClick={() => setChaDialogOpen(false)}>
                <div className="bg-[var(--color-surface)] border border-outline-variant/50 w-full max-w-3xl rounded-2xl shadow-xl overflow-hidden my-8" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between bg-surface-container-low px-6 py-4 border-b border-outline-variant/30">
                    <h2 className="ds-h2 text-on-surface flex items-center gap-2 m-0">
                      <FileText className="text-[#00cec4]" size={20} /> Initialize Customs Clearance Job
                    </h2>
                    <Button variant="outline" size="sm" onClick={() => setChaDialogOpen(false)}>Close</Button>
                  </div>
                  <div className="p-7 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-1">
                        <label className="ds-label block">Customs Branch Office *</label>
                        <select className="w-full text-sm"><option>Chennai (MAA)</option></select>
                      </div>
                      <div className="space-y-1">
                        <label className="ds-label block">Job Ref Number</label>
                        <input type="text" placeholder="e.g. CHA-MAA-2026-0001" className="w-full px-3.5 py-2.5 bg-[var(--color-surface)] border border-[rgba(0,206,196,0.55)] rounded-xl text-sm focus:outline-none focus:ring-3 focus:ring-[rgba(14,137,149,0.14)] transition-all font-sans" />
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/30">
                      <Button variant="outline" onClick={() => setChaDialogOpen(false)} className="rounded-xl">Cancel</Button>
                      <Button className="rounded-xl">Confirm &amp; Launch</Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </Spec>
          <Spec
            name="3D success overlay (job created)"
            file="src/components/cha/create-job-dialog.tsx:1288-1393"
            source="cha-specific"
            reusable={false}
            inconsistent
            classes="fixed inset-0 bg-slate-950/90 z-[100] + embedded <style> block with hard-coded #161b22/#30363d/#0d1117 + text-slate-400"
            notes='One-off 3D cabinet/folder animation. Hard-coded dark hexes render dark even in light theme; copy has a typo ("IS SUCCESSFULLY!"). Click anywhere to close the replica.'
            dsNotes="In-system confirmation: sonner toast (already used module-wide) or a simple success card in the shared Modal shell — token colors, both themes, corrected copy."
            ds={
              <div className="ds-shell-lg overflow-hidden border border-outline-variant/50 bg-surface p-8 text-center shadow-[0_24px_80px_-24px_rgba(15,23,42,0.55)]">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#00cec4]/30 bg-[#00cec4]/10 text-[#00cec4]">
                  <CheckCircle2 size={26} />
                </span>
                <h3 className="ds-h3 mt-4 text-on-surface">Job Created Successfully</h3>
                <p className="mx-auto mt-2 max-w-sm text-sm text-on-surface-variant">
                  The clearance job has been initialized and assignments mapped. Redirecting to the jobs dashboard…
                </p>
                <p className="mt-4 text-xs text-on-surface-variant">or simply: <code className="rounded bg-surface-container px-1.5 py-0.5 font-mono text-[11px]">toast.success(&quot;Clearance job created.&quot;)</code></p>
              </div>
            }
          >
            <Button onClick={() => setSuccessOverlayOpen(true)}>Preview success overlay</Button>
            {successOverlayOpen ? (
              <div
                className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center z-[100] text-white animate-in fade-in duration-200 cursor-pointer"
                onClick={() => setSuccessOverlayOpen(false)}
              >
                <style>{`
                  .sc-cabinet { perspective: 1000px; display: flex; flex-direction: column; align-items: center; gap: 4px; }
                  .sc-cabinet-body { width: 140px; height: 180px; background: #161b22; border: 4px solid #30363d; border-radius: 12px; position: relative; transform-style: preserve-3d; box-shadow: 0 20px 40px rgba(0,0,0,0.6); transform: rotateX(15deg) rotateY(-15deg); }
                  .sc-drawer { height: 48px; background: #0d1117; border: 3px solid #30363d; margin: 6px; border-radius: 8px; position: relative; display: flex; align-items: center; justify-content: center; }
                  .sc-drawer::after { content: ''; width: 32px; height: 6px; background: #8b949e; border-radius: 3px; }
                  .sc-drawer-active { animation: sc-drawer-open 2.5s infinite ease-in-out; }
                  .sc-folder { width: 64px; height: 80px; background: #00cec4; border: 3px solid #fff; border-radius: 6px; position: absolute; top: -65px; left: 38px; box-shadow: 0 10px 20px rgba(0,0,0,0.4); animation: sc-folder-drop 2.5s infinite ease-in-out; z-index: 10; display: flex; align-items: center; justify-content: center; }
                  @keyframes sc-drawer-open { 0%, 100% { transform: translateZ(0) scale(1); } 25%, 75% { transform: translateZ(40px) translateY(8px) rotateX(-5deg); background: #21262d; } }
                  @keyframes sc-folder-drop { 0% { transform: translateY(-70px) rotate(15deg) scale(0.6); opacity: 0; } 25% { transform: translateY(-15px) rotate(-5deg) scale(1.05); opacity: 1; } 50% { transform: translateY(15px) rotate(0deg) scale(1); opacity: 1; } 75%, 100% { transform: translateY(55px) scale(0); opacity: 0; } }
                  .sc-float { animation: sc-float 3s infinite ease-in-out; }
                  @keyframes sc-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
                `}</style>
                <div className="relative mb-8">
                  <div className="sc-cabinet">
                    <div className="sc-cabinet-body">
                      <div className="sc-folder"><span className="text-2xl font-bold text-white">✓</span></div>
                      <div className="sc-drawer sc-drawer-active"></div>
                      <div className="sc-drawer"></div>
                      <div className="sc-drawer"></div>
                    </div>
                  </div>
                </div>
                <div className="text-center space-y-4 max-w-md px-6">
                  <h2 className="ds-h1 text-[#00cec4] text-2xl tracking-widest sc-float m-0">YOUR JOB CREATION IS SUCCESSFULLY!</h2>
                  <p className="text-sm text-slate-400">The clearance job has been initialized… (click anywhere to close)</p>
                </div>
              </div>
            ) : null}
          </Spec>
          <Spec
            name="Warning indicator popovers (portal panels)"
            file="src/components/ui/warning-indicator-popover.tsx + CHA wrappers"
            source="cha-specific"
            reusable
            classes="fixed z-[500] w-80 · rounded-2xl border bg-surface shadow-[var(--shadow-ambient-hover)] + accent rail"
            notes="Shared portal warning shell with measured viewport-aware positioning, severity presets, and wrapper-level action slots."
          >
            <div className="flex flex-wrap gap-4">
              <WarningPopoverDemo severity="expiring" />
              <WarningPopoverDemo severity="expired" />
            </div>
          </Spec>
        </Section>

        {/* ── STATES ── */}
        <Section id="states" title="Empty / Loading / Error States" blurb="Four empty-state variants, one custom spinner, no skeletons.">
          <Spec
            name="Empty states — four variants"
            file="jobs-client.tsx:225 · approvals/page.tsx:46,106 · expenses-client.tsx:217 · reports/page.tsx:186"
            source="inline-tailwind"
            reusable={false}
            inconsistent
            notes="Icon 48 vs 42, p-12 vs p-10, plain vs font-semibold titles, plus a dashed-border text variant."
            dsNotes="One EmptyState recipe: p-12, icon 48 text-outline-variant, title text-sm text-on-surface (weight 400), hint text-xs on-surface-variant, optional CTA."
            ds={
              <div className="flex flex-col items-center justify-center rounded-xl border border-outline-variant/60 bg-surface p-12 text-center text-on-surface-variant">
                <Briefcase size={48} className="mb-3 text-outline-variant" />
                <p className="text-sm text-on-surface">No active jobs match the current filters.</p>
                <p className="mt-1 text-xs">Adjust the filters or create a new job.</p>
                <Button size="sm" className="mt-4"><Plus size={14} /> Create Job</Button>
              </div>
            }
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col items-center justify-center p-8 text-center text-on-surface-variant border border-outline-variant/30 rounded-xl">
                <Briefcase size={48} className="mb-3 text-outline-variant" />
                <p className="text-sm text-on-surface">No active jobs match the current filters.</p>
                <p className="mt-1 text-xs">Adjust the filters or create a new job.</p>
              </div>
              <div className="flex flex-col items-center justify-center p-8 text-center text-on-surface-variant border border-outline-variant/30 rounded-xl">
                <Trash2 size={42} className="text-outline-variant mb-3" />
                <p className="text-sm font-semibold">No pending CHA deletion requests.</p>
                <p className="text-xs mt-1">Deletion approvals assigned to you will appear here.</p>
              </div>
              <div className="bg-surface border border-outline-variant/30 p-8 text-center text-on-surface-variant rounded-xl shadow-sm">
                <CreditCard size={48} className="text-outline-variant mx-auto mb-3" />
                <p className="text-sm font-semibold">Disbursement queue is currently empty.</p>
              </div>
              <p className="text-xs text-on-surface-variant italic p-4 border border-dashed rounded-lg self-start">
                No filing delays reported in this organization. Excellent timeline compliance!
              </p>
            </div>
          </Spec>
          <Spec
            name="Loading — custom spinner + busy buttons"
            file="job-workspace-client.tsx:5693 · all forms"
            source="inline-tailwind"
            reusable={false}
            inconsistent
            classes="w-8 h-8 rounded-full border-2 border-t-[#00cec4] border-r-transparent border-b-[#00cec4] border-l-transparent animate-spin"
            notes="Single hand-built spinner; everywhere else loading is a text swap on the button. No skeletons anywhere in CHA."
            dsNotes="design.md §11: skeleton or spinner, never empty containers. Add skeletons for list/table loads (animate-pulse on surface-container blocks); keep one shared spinner for inline waits."
            ds={
              <div className="w-full space-y-3">
                <div className="space-y-2">
                  <div className="h-4 w-1/3 animate-pulse rounded-md bg-surface-container" />
                  <div className="h-4 w-2/3 animate-pulse rounded-md bg-surface-container" />
                  <div className="h-4 w-1/2 animate-pulse rounded-md bg-surface-container" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full border-2 border-t-[#00cec4] border-r-transparent border-b-[#00cec4] border-l-transparent animate-spin" />
                  <span className="text-xs text-on-surface-variant">Shared spinner (single size, single place)</span>
                </div>
              </div>
            }
          >
            <div className="flex flex-wrap items-center gap-6">
              <div className="w-8 h-8 rounded-full border-2 border-t-[#00cec4] border-r-transparent border-b-[#00cec4] border-l-transparent animate-spin" />
              <Button disabled>Saving...</Button>
              <Button variant="outline" disabled>Creating Job...</Button>
            </div>
          </Spec>
          <Spec
            name="Error state — access denied card"
            file="jobs/[jobId]/page.tsx:121-139"
            source="inline-tailwind"
            reusable={false}
            inconsistent
            classes="max-w-3xl rounded-2xl border-outline-variant bg-surface p-8 text-center + h-16 w-16 border-red-200 bg-red-50 text-red-500 icon tile"
            notes="Icon tile uses light-only red tokens."
            dsNotes="Same layout, theme-safe alpha red: border-red-500/25 + bg-red-500/10 render correctly in dark mode; card radius back to xl."
            ds={
              <div className="mx-auto max-w-md rounded-xl border border-outline-variant/60 bg-surface p-8 text-center shadow-sm">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/25 bg-red-500/10 text-red-500">
                  <AlertTriangle size={28} />
                </div>
                <h3 className="ds-h3 mt-4 text-on-surface">Access Prohibited</h3>
                <p className="mx-auto mt-3 text-sm text-on-surface-variant">Access Denied: you are not assigned to this job.</p>
                <div className="mt-6"><Button>Back to Catalog</Button></div>
              </div>
            }
          >
            <div className="mx-auto max-w-md rounded-2xl border border-outline-variant bg-surface p-8 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-red-500">
                <AlertTriangle size={28} />
              </div>
              <h3 className="ds-h3 mt-4 text-on-surface">Access Prohibited</h3>
              <p className="mx-auto mt-3 text-sm text-on-surface-variant">Access Denied: you are not assigned to this job.</p>
              <div className="mt-6"><Button>Back to Catalog</Button></div>
            </div>
          </Spec>
          <Spec
            name="Alert banners (orange family)"
            file="job-workspace-client.tsx:2443, 2468, 3605, 3617"
            source="inline-tailwind"
            reusable
            inconsistent
            classes="border-[#fb923c]/35 bg-[#fb923c]/10 rounded-2xl p-4 · card-left-accent-orange variant · bg-[#fb923c]/8 variant"
            notes="Token-based orange (good) but three slightly different recipes for the same banner role."
            dsNotes="One banner recipe: card-left-accent-orange (the ds-* class built for this) + rounded-xl + bg-surface, icon + ds-label header, weight-400 body."
            ds={
              <div className="card-left-accent-orange rounded-xl border border-outline-variant/60 bg-surface p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={20} className="mt-0.5 shrink-0 text-[#fb923c]" />
                  <div className="space-y-1">
                    <span className="ds-label text-[#fb923c]">Job Settings Alert</span>
                    <p className="text-sm text-on-surface">No manager assigned for this job.</p>
                    <p className="text-xs text-on-surface-variant">An assigned manager is required to proceed with checklist upload and approval.</p>
                  </div>
                </div>
              </div>
            }
          >
            <div className="space-y-3">
              <div className="rounded-2xl border border-[#fb923c]/35 bg-[#fb923c]/10 p-4">
                <span className="ds-label text-[#fb923c]">Job Settings Alert</span>
                <p className="mt-1 text-sm font-semibold text-on-surface">No manager assigned for this job.</p>
              </div>
              <div className="card-left-accent-orange rounded-2xl border border-[#fb923c]/45 bg-surface p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={20} className="mt-0.5 shrink-0 text-[#fb923c]" />
                  <div>
                    <h4 className="ds-h3 text-[#fb923c]">OVERDUE FILING CHECKLIST ITEMS</h4>
                    <p className="text-xs text-on-surface-variant mt-1">Delay remarks are required before overdue items can be completed.</p>
                  </div>
                </div>
              </div>
            </div>
          </Spec>
        </Section>

        {/* ── WORKFLOW ── */}
        <Section id="workflow" title="Workflow / Canvas UI" blurb="The filing workflow builder's visual language — internally the most consistent part of CHA.">
          <Spec
            name="Canvas nodes + connection handles"
            file="workflows-client.tsx:2012-2107"
            source="inline-tailwind"
            reusable
            classes="rounded-2xl border bg-surface/95 p-4 shadow-sm backdrop-blur · selected: border-[#00cec4] shadow-[0_0_0_3px_rgba(0,206,196,0.18),0_18px_42px_-28px_rgba(0,206,196,0.75)]"
            notes="Cyan handles = sources, outline handles = targets. Selected node gets a double cyan glow."
          >
            <div
              className="relative overflow-x-auto rounded-2xl border border-outline-variant/40 p-8"
              style={{
                backgroundColor: "var(--color-surface-container-low)",
                backgroundImage: "radial-gradient(var(--color-outline-variant) 1px, transparent 1px)",
                backgroundSize: "22px 22px",
              }}
            >
              <div className="flex flex-wrap items-center gap-10">
                <CanvasNode selected name="First Check" meta="MAIN_STAGE" />
                <CanvasNode name="Duty Payment" meta="MAIN_STAGE / IMPORT" />
              </div>
            </div>
          </Spec>
          <Spec
            name="Edges / connectors (SVG)"
            file="workflows-client.tsx:1943-2009"
            source="inline-tailwind"
            reusable
            classes="stroke currentColor · text-[#00cec4] forward, text-[#fb923c] back-route/selected · strokeDasharray 8 7 · arrow marker · pill label"
          >
            <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-low p-4">
              <svg viewBox="0 0 560 120" className="h-28 w-full max-w-xl">
                <defs>
                  <marker id="sc-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
                  </marker>
                </defs>
                <g className="text-[#00cec4]">
                  <path d="M 20 40 C 120 40, 160 40, 260 40" fill="none" stroke="currentColor" strokeWidth="2" markerEnd="url(#sc-arrow)" className="drop-shadow-sm" />
                </g>
                <g className="text-[#fb923c]">
                  <path d="M 260 90 C 180 90, 100 90, 20 90" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="8 7" markerEnd="url(#sc-arrow)" className="drop-shadow-sm" />
                </g>
                <foreignObject x="90" y="18" width="140" height="28">
                  <div className="truncate rounded-full border border-outline-variant bg-surface/95 px-2 py-1 text-center text-[10px] uppercase tracking-[0.1em] text-on-surface-variant shadow-sm">ON APPROVE</div>
                </foreignObject>
                <foreignObject x="90" y="96" width="140" height="28">
                  <div className="truncate rounded-full border border-outline-variant bg-surface/95 px-2 py-1 text-center text-[10px] uppercase tracking-[0.1em] text-on-surface-variant shadow-sm">BACK-ROUTE</div>
                </foreignObject>
              </svg>
            </div>
          </Spec>
          <Spec
            name="Job stage stepper"
            file="job-workspace-client.tsx:2413-2439"
            source="inline-tailwind"
            reusable
            classes="size-6 rounded-full border text-[10px] font-bold · done: solid cyan · active: cyan ring shadow-[0_0_0_3px_rgba(0,206,196,0.12)]"
            notes="Strong candidate to promote to a shared Stepper component."
          >
            <StepperDemo />
          </Spec>
          <Spec
            name="Execution timeline"
            file="job-workspace-client.tsx:4585-4646"
            source="inline-tailwind"
            reusable
            classes="pl-5 before:w-[2px] before:bg-outline-variant/40 rail · h-3.5 w-3.5 dots · active: bg-[#00cec4] animate-pulse"
            notes="Strong candidate to promote to a shared Timeline component."
          >
            <TimelineDemo />
          </Spec>
          <Spec
            name="Palette / properties drawers + workflow toolbar"
            file="workflows-client.tsx:1679-1798, 2118, 2155"
            source="shared"
            reusable
            classes="absolute inset-y-0 w-[min(330px,…)] shadow-2xl transition-transform · Card + card-left-accent · Badge status chips"
            notes="Uses shared Card/Badge correctly. Header shown here in miniature."
          >
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-outline-variant bg-surface px-4 py-3">
                <div className="flex items-center gap-2">
                  <Workflow size={16} className="text-[#00cec4]" />
                  <span className="ds-h3 text-on-surface">FILING WORKFLOW BLUEPRINT</span>
                  <Badge variant="success">PUBLISHED V3</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">Fork Draft</Button>
                  <Badge variant="secondary">SYNCED</Badge>
                </div>
              </div>
            </div>
          </Spec>
        </Section>

        {/* ── ANIMATIONS ── */}
        <Section id="animations" title="Animations & Effects" blurb="Hover the samples. The neon button pulse only appears with the override layer ON.">
          <Spec
            name="hover-cyan glow (design-system)"
            file="cha/page.tsx:189 (stat cards) · globals.css"
            source="shared"
            reusable
            classes="hover-cyan transition-all"
          >
            <div className="hover-cyan rounded-xl border border-outline-variant/30 bg-surface p-4 text-sm text-on-surface-variant transition-all">Hover me — sanctioned cyan glow</div>
          </Spec>
          <Spec
            name="Neon button hover (canonical) ✓"
            file="src/components/ui/button-1.tsx + globals.css .cha-module cascade · design.md §6.1"
            source="shared"
            reusable
            classes="neon-pulse-approve/reject keyframes + glow shadow + translateY(-1px) lift + active scale 0.96"
            notes="CANONICAL (design.md §6.1, confirmed 2026-07-06): glow + pulse + 1px lift on hover is the sanctioned button motion, baked into the shared Button and mirrored by the cascade."
          >
            <div className="flex flex-wrap gap-3">
              <Button>Hover — approve pulse + lift</Button>
              <Button variant="destructive">Hover — reject pulse + lift</Button>
              <Button variant="outline">Hover — cyan outline glow + lift</Button>
            </div>
          </Spec>
          <Spec
            name="pulse-ring attention animations"
            file="globals.css:1016-1046 (defined twice) · used by warning indicators"
            source="globals.css"
            reusable
            classes="animate-pulse-orange / animate-pulse-red (2.2s expanding ring)"
            notes="Keyframes are duplicated in globals.css. Related neon-checkbox keyframes (borderFlow1-4, particleExplosion, ringPulse, sparkFlash) appear unused."
          >
            <div className="flex items-center gap-6 py-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#fb923c]/45 bg-[#fb923c]/10 text-[#fb923c] animate-pulse-orange"><AlertTriangle size={14} /></span>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-500/40 bg-red-500/10 text-red-400 animate-pulse-red"><AlertTriangle size={14} /></span>
            </div>
          </Spec>
          <Spec
            name="Row hover + micro-interactions"
            file="ds-row-link (globals.css) · indicators hover:scale-105 · settings tabs hover:-translate-y-0.5"
            source="shared"
            reusable
            classes="ds-row-link: bg rgba(0,206,196,0.04) + inset ring on hover"
          >
            <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface">
              <table className="ds-table">
                <tbody>
                  <tr className="ds-row-link"><td className="px-6 py-3">Hover this row — ds-row-link cyan inset</td></tr>
                  <tr className="ds-row-link"><td className="px-6 py-3">Rows navigate on click in the real tables</td></tr>
                </tbody>
              </table>
            </div>
          </Spec>
        </Section>

        {/* ── MISC ── */}
        <Section id="misc" title="Miscellaneous" blurb="Icon language, icon badges and remaining odds and ends.">
          <Spec
            name="Icon badges (ds-icon-badge)"
            file="cha/page.tsx:192, 204 (orange via inline style)"
            source="shared"
            reusable
            classes="ds-icon-badge · orange: style={{background:'rgba(251,146,60,0.10)',color:'#fb923c'}}"
          >
            <div className="flex items-center gap-4">
              <span className="ds-icon-badge"><Briefcase size={18} /></span>
              <span className="ds-icon-badge"><DollarSign size={18} /></span>
              <span className="ds-icon-badge" style={{ background: "rgba(251,146,60,0.10)", color: "#fb923c" }}><AlertCircle size={18} /></span>
            </div>
          </Spec>
          <Spec
            name="Icon size scale in use"
            file="all CHA files (lucide-react throughout)"
            source="shared"
            reusable
            classes="sizes found: 10, 12, 13, 14, 15, 16, 18, 20, 24, 42, 48"
            notes="Single icon library (good). Eleven size steps in use — could be tightened to ~4."
          >
            <div className="flex flex-wrap items-end gap-3 text-[#00cec4]">
              <CheckSquare size={10} /><CheckSquare size={12} /><CheckSquare size={14} /><CheckSquare size={16} /><CheckSquare size={18} /><CheckSquare size={20} /><CheckSquare size={24} /><CheckSquare size={42} /><CheckSquare size={48} />
            </div>
          </Spec>
          <Spec
            name="Inline link patterns"
            file="do-validity-panel.tsx:166 · customers/page.tsx:79 · expenses-client.tsx:244"
            source="inline-tailwind"
            reusable
            classes="text-[#00cec4] hover:underline (+ ExternalLink icon)"
          >
            <div className="flex flex-wrap items-center gap-6 text-sm">
              <a href="#misc" className="inline-flex items-center gap-1.5 font-medium text-[#00cec4] hover:underline"><ExternalLink size={13} /> delivery_order_v3.pdf</a>
              <a href="#misc" className="text-[#00cec4] hover:underline text-sm">Edit</a>
              <a href="#misc" className="text-xs font-bold text-[#00cec4] hover:underline flex items-center gap-1">Job: CHA-MAA-2026-0007 <ExternalLink size={10} /></a>
            </div>
          </Spec>
          <Spec
            name="Filing complete summary block"
            file="job-workspace-client.tsx:4550-4567"
            source="inline-tailwind"
            reusable={false}
            classes="grid grid-cols-2 rounded-2xl border-outline-variant/30 bg-surface-container-low p-4"
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 size={24} className="shrink-0" />
                <h4 className="font-bold text-base uppercase tracking-wide">Customs Filing Workflow Complete</h4>
              </div>
              <div className="grid grid-cols-2 gap-4 rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4 text-xs max-w-md">
                <div>
                  <span className="ds-label block text-on-surface-variant">Actual Filing Date</span>
                  <span className="font-medium text-on-surface ds-numeric">04/07/2026</span>
                </div>
                <div>
                  <span className="ds-label block text-on-surface-variant">Filing Reference ID</span>
                  <span className="font-medium text-on-surface ds-numeric">BOE-8841207</span>
                </div>
              </div>
            </div>
          </Spec>
        </Section>
      </div>
      </NeonContext.Provider>
    </div>
  );
}
