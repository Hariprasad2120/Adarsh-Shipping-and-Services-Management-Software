"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useSession } from "next-auth/react";
import { Search, Mail, MessageSquare, Calendar, FileText, File, ExternalLink, HelpCircle, Loader2 } from "lucide-react";
import { universalSearch, SearchResult } from "@/modules/communication/communication-search.service";

export default function SearchPage() {
  const { data: session } = useSession();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "MAIL" | "CHAT" | "FILE" | "EVENT" | "DOCUMENT">("ALL");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isPending, startTransition] = useTransition();

  const handleSearch = (searchVal: string) => {
    setQuery(searchVal);
    if (!searchVal || searchVal.trim().length < 2) {
      setResults([]);
      return;
    }

    const userId = session?.user?.id;
    const orgId = session?.user?.orgId;
    if (userId && orgId) {
      startTransition(async () => {
        try {
          const res = await universalSearch(userId, orgId, searchVal);
          setResults(res);
        } catch (err) {
          console.error("Search failed:", err);
        }
      });
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "MAIL":
        return <Mail size={16} className="text-[#00cec4]" />;
      case "CHAT":
        return <MessageSquare size={16} className="text-[#38bdf8]" />;
      case "EVENT":
        return <Calendar size={16} className="text-orange-400" />;
      case "FILE":
        return <File size={16} className="text-[#22c55e]" />;
      case "DOCUMENT":
        return <FileText size={16} className="text-[#c084fc]" />;
      default:
        return <HelpCircle size={16} className="text-slate-400" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "MAIL":
        return "Mail Box";
      case "CHAT":
        return "Internal Chat";
      case "EVENT":
        return "Calendar event";
      case "FILE":
        return "Drive File";
      case "DOCUMENT":
        return "Workspace Document";
      default:
        return type;
    }
  };

  const filteredResults = results.filter((res) => {
    if (activeTab === "ALL") return true;
    return res.type === activeTab;
  });

  return (
    <div className="py-6 px-4 max-w-[1200px] mx-auto space-y-6 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-xl p-6 shadow-sm">
        <span className="text-[10px] font-bold text-[#00cec4] uppercase tracking-widest block font-sans">
          CROSS-VECTOR INTELLIGENCE
        </span>
        <h1 className="ds-h1 text-white text-2xl font-bold mt-1 uppercase">
          Universal Search
        </h1>
        <p className="text-[var(--color-on-surface-variant)] text-xs mt-0.5">
          Scan mails, chat rooms, calendar events, documents, and assets across the entire Monolith Workspace.
        </p>
      </div>

      {/* Search Input Card */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-xl p-5 space-y-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Type at least 2 characters to search..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full text-sm text-white pl-10 pr-4 py-3"
            autoFocus
          />
          <div className="absolute left-3.5 top-3.5 text-[#00cec4]/70">
            {isPending ? (
              <Loader2 size={18} className="animate-spin text-[#00cec4]" />
            ) : (
              <Search size={18} />
            )}
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex flex-wrap gap-2 pt-1 border-t border-[var(--color-outline-variant)]/40">
          {(["ALL", "MAIL", "CHAT", "FILE", "EVENT", "DOCUMENT"] as const).map((tab) => {
            const count = tab === "ALL" ? results.length : results.filter(r => r.type === tab).length;
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#00cec4]/15 text-[#00cec4] border border-[#00cec4]/35"
                    : "bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)] border border-transparent hover:text-white"
                }`}
              >
                {tab === "ALL" ? "All Results" : tab}
                {query.length >= 2 && <span className="ml-1.5 font-mono text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-white">{count}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Container */}
      <div className="space-y-3">
        {query.length < 2 ? (
          <div className="bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-xl p-12 text-center text-[var(--color-on-surface-variant)]">
            <Search size={40} className="mx-auto mb-3 text-slate-500 opacity-60" />
            <p className="text-xs uppercase tracking-wider font-bold text-white">Enter a Search Query</p>
            <p className="text-[11px] mt-1 text-[var(--color-on-surface-variant)]">
              Begin typing in the field above to locate emails, chat transcripts, database items, files, or tasks.
            </p>
          </div>
        ) : filteredResults.length > 0 ? (
          filteredResults.map((item) => (
            <a
              key={item.id}
              href={item.link}
              className="card-left-accent bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-xl p-4 flex justify-between items-center hover:border-[#00cec4]/40 hover:bg-[var(--color-surface-container-low)] transition-all cursor-pointer block"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="ds-icon-badge shrink-0">
                  {getIcon(item.type)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[8px] font-mono font-bold tracking-widest text-[var(--color-on-surface-variant)] uppercase border border-[var(--color-outline-variant)]">
                      {getTypeLabel(item.type)}
                    </span>
                    <span className="text-[9px] text-[var(--color-on-surface-variant)] font-mono">
                      {new Date(item.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <h4 className="text-white text-xs font-bold font-sans mt-1.5 truncate">
                    {item.title}
                  </h4>
                  <p className="text-[var(--color-on-surface-variant)] text-[11px] truncate mt-0.5">
                    {item.subtitle}
                  </p>
                </div>
              </div>
              <div className="text-[var(--color-on-surface-variant)] hover:text-[#00cec4] shrink-0 ml-4">
                <ExternalLink size={14} />
              </div>
            </a>
          ))
        ) : (
          <div className="bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-xl p-12 text-center text-[var(--color-on-surface-variant)]">
            <Search size={40} className="mx-auto mb-3 text-slate-500 opacity-60" />
            <p className="text-xs uppercase tracking-wider font-bold text-white">No Results Found</p>
            <p className="text-[11px] mt-1 text-[var(--color-on-surface-variant)]">
              No matching records found for "{query}" in type {activeTab}. Please verify spelling or try another category.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
