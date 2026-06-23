"use client";

import { useState } from "react";
import { Search, Mail, Folder, Briefcase, ExternalLink, ArrowRight, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function UnifiedSearchPortal() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ emails: any[]; files: any[]; jobs: any[] }>({
    emails: [],
    files: [],
    jobs: []
  });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/communication/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults({
        emails: data.emails || [],
        files: data.files || [],
        jobs: data.jobs || []
      });
    } catch (err) {
      console.error("Unified search failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const totalResults = results.emails.length + results.files.length + results.jobs.length;

  return (
    <div className="space-y-6">
      {/* Search Bar and Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between p-6 rounded-2xl border border-outline-variant bg-surface shadow-sm gap-4 text-left">
        <div className="flex-1">
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#00cec4]">Hub Search</span>
          <h1 className="text-xl font-bold text-on-surface mt-1">Unified Search Center</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Query across Gmail threads, Google Shared Drive files, and internal Monolith jobs.
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex items-center space-x-2 w-full md:max-w-md">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search keyword..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full text-xs bg-surface border border-outline-variant rounded-xl pl-8 pr-3 py-2.5 focus:outline-none"
              required
            />
            <Search className="absolute left-2.5 top-3.5 size-4 text-on-surface-variant" />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-1.5 bg-[#00cec4] text-white hover:bg-[#00b8af] disabled:opacity-50 px-4 py-2.5 rounded-xl text-xs font-bold uppercase transition-all shrink-0"
          >
            {loading ? <RefreshCw className="size-4 animate-spin" /> : <span>Search</span>}
          </button>
        </form>
      </div>

      {/* Query statistics */}
      {query && !loading && (
        <div className="text-left text-xs text-on-surface-variant px-2">
          Found <span className="font-bold text-on-surface ds-numeric">{totalResults}</span> matches for query "{query}"
        </div>
      )}

      {/* Search results panels */}
      {totalResults > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
          {/* 1. Job Matches */}
          <div className="rounded-xl border border-outline-variant bg-surface p-5 shadow-sm space-y-4">
            <h3 className="ds-h3 text-on-surface flex items-center gap-2">
              <Briefcase size={16} className="text-[#00cec4]" />
              <span>Jobs & Shipments ({results.jobs.length})</span>
            </h3>

            <div className="space-y-3">
              {results.jobs.length === 0 ? (
                <div className="text-center py-6 text-on-surface-variant text-xs">No matching jobs.</div>
              ) : (
                results.jobs.map((job) => (
                  <div key={job.id} className="card-left-accent p-3 rounded-xl border border-outline-variant bg-surface-container-low flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-on-surface">{job.jobNumber}</h4>
                      <p className="text-[10px] text-on-surface-variant mt-0.5 truncate max-w-[150px]">{job.title}</p>
                    </div>
                    <Link
                      href={`/cha/jobs/${job.id}`}
                      className="text-[10px] font-bold uppercase text-[#00cec4] hover:underline flex items-center gap-1"
                    >
                      <span>Open</span>
                      <ArrowRight size={10} />
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 2. Emails Matches */}
          <div className="rounded-xl border border-outline-variant bg-surface p-5 shadow-sm space-y-4">
            <h3 className="ds-h3 text-on-surface flex items-center gap-2">
              <Mail size={16} className="text-[#818cf8]" />
              <span>Emails ({results.emails.length})</span>
            </h3>

            <div className="space-y-3">
              {results.emails.length === 0 ? (
                <div className="text-center py-6 text-on-surface-variant text-xs">No matching emails.</div>
              ) : (
                results.emails.map((t) => (
                  <div key={t.id} className="card-left-accent p-3 rounded-xl border border-outline-variant bg-surface-container-low flex flex-col gap-1 text-left" style={{ borderLeftColor: '#818cf8' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-on-surface truncate max-w-[120px]">{t.from.split(" <")[0]}</span>
                      <a
                        href={`https://mail.google.com/mail/u/0/#inbox/${t.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[8px] font-bold text-[#00cec4] hover:underline flex items-center gap-0.5"
                      >
                        <ExternalLink size={8} />
                      </a>
                    </div>
                    <h4 className="text-xs font-semibold text-on-surface truncate">{t.subject}</h4>
                    <p className="text-[10px] text-on-surface-variant truncate">{t.snippet}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 3. Drive Files Matches */}
          <div className="rounded-xl border border-outline-variant bg-surface p-5 shadow-sm space-y-4">
            <h3 className="ds-h3 text-on-surface flex items-center gap-2">
              <Folder size={16} className="text-[#fb923c]" />
              <span>Shared Drive Files ({results.files.length})</span>
            </h3>

            <div className="space-y-3">
              {results.files.length === 0 ? (
                <div className="text-center py-6 text-on-surface-variant text-xs">No matching files.</div>
              ) : (
                results.files.map((file) => (
                  <div key={file.id} className="card-left-accent p-3 rounded-xl border border-outline-variant bg-surface-container-low flex items-center justify-between" style={{ borderLeftColor: '#fb923c' }}>
                    <div className="truncate max-w-[160px]">
                      <h4 className="text-xs font-bold text-on-surface truncate">{file.name}</h4>
                      <p className="text-[8px] text-on-surface-variant mt-0.5">{file.mimeType.split(".").pop()}</p>
                    </div>
                    {file.webViewLink && (
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-bold uppercase text-[#00cec4] hover:underline flex items-center gap-1"
                      >
                        <span>View</span>
                        <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        query && !loading && (
          <div className="flex flex-col items-center justify-center p-12 border border-outline-variant bg-surface rounded-2xl">
            <Search className="size-12 text-on-surface-variant/40 mb-2 animate-bounce" />
            <span className="text-xs text-on-surface-variant font-semibold">No results found matching your query.</span>
          </div>
        )
      )}
    </div>
  );
}
