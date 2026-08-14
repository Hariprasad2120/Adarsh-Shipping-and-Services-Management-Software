"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Command, Search, Sparkles, X } from "lucide-react";
import type { SearchCommandEntry } from "@/lib/navigation";
import { cn } from "@/lib/utils";

type MonolithSearchCommandProps = {
  entries: SearchCommandEntry[];
  embedded?: boolean;
  open: boolean;
  query: string;
  onClose: () => void;
  onOpenChange: (open: boolean) => void;
  onQueryChange: (query: string) => void;
};

function getEmptyMessage(query: string) {
  if (!query.trim()) {
    return "Search every workspace and role-visible page from one command surface.";
  }

  return "No role-visible workspace or page matches this search yet.";
}

export function MonolithSearchCommand({
  entries,
  embedded = false,
  open,
  query,
  onClose,
  onOpenChange,
  onQueryChange,
}: MonolithSearchCommandProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const workspaceResults = useMemo(
    () => entries.filter((entry) => entry.kind === "workspace"),
    [entries],
  );
  const pageResults = useMemo(
    () => entries.filter((entry) => entry.kind === "page"),
    [entries],
  );

  useEffect(() => {
    if (!open) return;

    const frameId = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [open]);

  if (!open && !embedded) return null;

  const primaryResults = pageResults.slice(0, 14);
  const workspaceSuggestions = workspaceResults.slice(0, query.trim() ? 6 : 8);
  const hasResults = primaryResults.length > 0 || workspaceSuggestions.length > 0;
  const flattenedResults = [...primaryResults, ...workspaceSuggestions];
  const activeEntry = flattenedResults[activeIndex] ?? null;

  return (
    <div
      className={cn("mnx-command-layer", embedded && "is-embedded")}
      role="presentation"
      onMouseDown={() => {
        if (!embedded) onClose();
      }}
    >
      <section
        className="mnx-command-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Search Monolith"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <label className="mnx-command-input-shell">
          <Search size={18} />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setActiveIndex(0);
              onQueryChange(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                onClose();
                return;
              }

              if (flattenedResults.length === 0) return;

              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex((current) => (current + 1) % flattenedResults.length);
              }

              if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((current) =>
                  current === 0 ? flattenedResults.length - 1 : current - 1,
                );
              }

              if (event.key === "Enter" && activeEntry) {
                event.preventDefault();
                router.push(activeEntry.href);
                onClose();
              }
            }}
            placeholder="Search modules, pages, settings, and operations"
          />
          <div className="mnx-command-input-actions">
            <kbd>
              <Command size={11} />
              <span>K</span>
            </kbd>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Close search"
            >
              <X size={16} />
            </button>
          </div>
        </label>

        <div className="mnx-command-meta">
          <span>
            <Sparkles size={14} />
            Role-aware results only
          </span>
          <small>{entries.length} searchable destinations</small>
        </div>

        {hasResults ? (
          <div className="mnx-command-results">
            {primaryResults.length > 0 ? (
              <div className="mnx-command-group">
                <p>Pages</p>
                <div>
                  {primaryResults.map((entry, index) => {
                    const Icon = entry.icon;
                    const isActive = flattenedResults[activeIndex]?.id === entry.id;

                    return (
                      <Link
                        href={entry.href}
                        key={entry.id}
                        className={cn("mnx-command-link", isActive && "is-active")}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => onClose()}
                      >
                        <span className="mnx-command-link-icon">
                          <Icon size={16} />
                        </span>
                        <span className="mnx-command-link-copy">
                          <b>{entry.label}</b>
                          <small>
                            {entry.sectionLabel}
                            {" • "}
                            {entry.description}
                          </small>
                        </span>
                        <span className="mnx-command-link-meta">
                          <span>#{index + 1}</span>
                          <ArrowUpRight size={14} />
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {workspaceSuggestions.length > 0 ? (
              <div className="mnx-command-group">
                <p>Workspaces</p>
                <div>
                  {workspaceSuggestions.map((entry, index) => {
                    const Icon = entry.icon;
                    const isActive = flattenedResults[activeIndex]?.id === entry.id;

                    return (
                      <Link
                        href={entry.href}
                        key={entry.id}
                        className={cn("mnx-command-link", isActive && "is-active")}
                        onMouseEnter={() => setActiveIndex(primaryResults.length + index)}
                        onClick={() => onClose()}
                      >
                        <span className="mnx-command-link-icon">
                          <Icon size={16} />
                        </span>
                        <span className="mnx-command-link-copy">
                          <b>{entry.label}</b>
                          <small>{entry.description}</small>
                        </span>
                        <span className="mnx-command-link-meta">
                          <span>Open</span>
                          <ArrowUpRight size={14} />
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mnx-command-empty">
            <span>
              <Search size={18} />
            </span>
            <b>Nothing matched</b>
            <small>{getEmptyMessage(query)}</small>
          </div>
        )}
      </section>
    </div>
  );
}
