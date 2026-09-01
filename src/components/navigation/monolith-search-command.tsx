"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";

import type { SearchCommandEntry } from "@/lib/navigation";
import { cn } from "@/lib/utils";

type CommandPaletteProps = {
  entries: SearchCommandEntry[];
  embedded?: boolean;
  open: boolean;
  query: string;
  onClose: () => void;
  onOpenChange: (open: boolean) => void;
  onQueryChange: (query: string) => void;
};

const SUGGESTED_LABELS = [
  "Dashboard",
  "Employees",
  "Attendance",
  "Payroll",
  "CRM",
  "CHA",
  "Settings",
];

function getEmptyMessage(query: string) {
  if (!query.trim()) {
    return "Search every workspace and role-visible page from one command surface.";
  }

  return "No role-visible workspace or page matches this search yet.";
}

function getResultPath(entry: SearchCommandEntry) {
  if (entry.kind === "workspace") return "Workspace";
  if (entry.sectionLabel === entry.label) return entry.description;
  return `${entry.sectionLabel} › ${entry.label}`;
}

function getSuggestedEntries(entries: SearchCommandEntry[]) {
  const usedIds = new Set<string>();
  const suggested = SUGGESTED_LABELS.flatMap((label) => {
    const match = entries.find((entry) => {
      if (usedIds.has(entry.id)) return false;
      return entry.label.toLowerCase() === label.toLowerCase();
    });

    if (!match) return [];
    usedIds.add(match.id);
    return [match];
  });

  return suggested.length > 0 ? suggested.slice(0, 7) : entries.slice(0, 7);
}

export function CommandPalette({
  entries,
  embedded = false,
  open,
  query,
  onClose,
}: CommandPaletteProps) {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const hasQuery = query.trim().length > 0;
  const visibleResults = useMemo(
    () => (hasQuery ? entries.slice(0, 12) : getSuggestedEntries(entries)),
    [entries, hasQuery],
  );
  const selectedIndex = Math.min(activeIndex, Math.max(visibleResults.length - 1, 0));
  const activeEntry = visibleResults[selectedIndex] ?? null;

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (visibleResults.length === 0) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((current) => (current + 1) % visibleResults.length);
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((current) =>
          current === 0 ? visibleResults.length - 1 : current - 1,
        );
      }

      if (event.key === "Enter" && activeEntry) {
        event.preventDefault();
        router.push(activeEntry.href);
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeEntry, onClose, open, router, visibleResults.length]);

  if (!open && !embedded) return null;

  return (
    <div className={cn("mnx-command-layer", embedded && "is-embedded")} role="presentation">
      <section
        className="mnx-command-dialog"
        role="dialog"
        aria-modal={!embedded}
        aria-label="Search Monolith"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {visibleResults.length > 0 ? (
          <div className="mnx-command-results">
            <div className="mnx-command-group">
              <p>{hasQuery ? "Results" : "Recent / Suggested"}</p>
              <div>
                {visibleResults.map((entry, index) => {
                  const Icon = entry.icon;
                  const isActive = index === selectedIndex;

                  return (
                    <Link
                      href={entry.href}
                      key={entry.id}
                      className={cn("mnx-command-link", isActive && "is-active")}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => onClose()}
                    >
                      <span className="mnx-command-link-icon">
                        <Icon size={15} />
                      </span>
                      <span className="mnx-command-link-copy">
                        <b>{entry.label}</b>
                        <small>{getResultPath(entry)}</small>
                      </span>
                      <span className="mnx-command-link-meta">
                        <ArrowUpRight size={13} />
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="mnx-command-empty">
            <span>
              <Search size={16} />
            </span>
            <b>Nothing matched</b>
            <small>{getEmptyMessage(query)}</small>
          </div>
        )}
      </section>
    </div>
  );
}

export const MonolithSearchCommand = CommandPalette;
