"use client";

import { useState, useEffect } from "react";
import { Search, Mail, Star, Trash, Inbox, Send, Paperclip, ExternalLink, Link2, Download, RefreshCw, Plus, AlertCircle } from "lucide-react";
import DOMPurify from "isomorphic-dompurify";

export default function MailPortal() {
  const [threads, setThreads] = useState<any[]>();
  const [selectedThread, setSelectedThread] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [folder, setFolder] = useState("INBOX");
  const [error, setError] = useState<string | null>(null);
  
  // Compose Mail Modal State
  const [showCompose, setShowCompose] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  
  // Job Linking State
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [linkCategory, setLinkCategory] = useState("02 Job Documents");

  useEffect(() => {
    fetchThreads();
    fetchJobs();
  }, [folder]);

  const parseGoogleApiError = (msg: string) => {
    if (!msg) return null;
    if (msg.includes("API has not been used") || msg.includes("SERVICE_DISABLED") || msg.includes("accessNotConfigured")) {
      const match = msg.match(/https:\/\/console\.[^\s"'}]+/);
      return match ? match[0] : "https://console.cloud.google.com/apis/dashboard";
    }
    return null;
  };

  const fetchThreads = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = folder === "STARRED" ? "is:starred" : folder === "SENT" ? "is:sent" : "label:INBOX";
      const queryParam = searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : q ? `&q=${encodeURIComponent(q)}` : "";
      const res = await fetch(`/api/communication/mail/list?${queryParam}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load threads");
      }
      setThreads(data.threads || []);
    } catch (err: any) {
      console.error("Failed to load threads:", err);
      setError(err.message || "Failed to load threads.");
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = async () => {
    try {
      const res = await fetch("/api/communication/mail/link");
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch (err) {
      console.error("Failed to load jobs:", err);
    }
  };

  const handleThreadSelect = async (threadId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/communication/mail/thread?id=${threadId}`);
      const data = await res.json();
      setSelectedThread(data.thread);
    } catch (err) {
      console.error("Failed to load thread details:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/communication/mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: composeTo,
          subject: composeSubject,
          body: composeBody,
          threadId: selectedThread?.id
        })
      });
      if (res.ok) {
        setShowCompose(false);
        setComposeTo("");
        setComposeSubject("");
        setComposeBody("");
        fetchThreads();
      }
    } catch (err) {
      console.error("Failed to send email:", err);
    }
  };

  const handleLinkJob = async () => {
    if (!selectedJobId || !selectedThread) return;
    try {
      const res = await fetch("/api/communication/mail/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId: selectedThread.id,
          jobId: selectedJobId,
          category: linkCategory,
          subject: selectedThread.subject
        })
      });
      if (res.ok) {
        alert("Email successfully linked to the job!");
        setSelectedJobId("");
      }
    } catch (err) {
      console.error("Failed to link job:", err);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[80vh] border border-outline-variant bg-surface rounded-2xl overflow-hidden shadow-sm">
      {/* Folder Navigation */}
      <div className="border-r border-outline-variant p-4 space-y-4 bg-surface-container-low">
        <button
          onClick={() => setShowCompose(true)}
          className="w-full flex items-center justify-center space-x-2 bg-[#00cec4] text-white hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
        >
          <Plus className="size-4" />
          <span>Compose</span>
        </button>

        <div className="space-y-1">
          <button
            onClick={() => setFolder("INBOX")}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors ${
              folder === "INBOX" ? "bg-primary/10 text-primary" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
            }`}
          >
            <Inbox className="size-4 text-[#00cec4]" />
            <span>Inbox</span>
          </button>
          <button
            onClick={() => setFolder("STARRED")}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors ${
              folder === "STARRED" ? "bg-primary/10 text-primary" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
            }`}
          >
            <Star className="size-4 text-[#fb923c]" />
            <span>Starred</span>
          </button>
          <button
            onClick={() => setFolder("SENT")}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors ${
              folder === "SENT" ? "bg-primary/10 text-primary" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
            }`}
          >
            <Send className="size-4 text-[#818cf8]" />
            <span>Sent</span>
          </button>
        </div>
      </div>

      {/* Threads List */}
      <div className="md:col-span-1 border-r border-outline-variant flex flex-col h-full bg-surface">
        <div className="p-3 border-b border-outline-variant flex items-center space-x-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search mail..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchThreads()}
              className="w-full text-xs bg-surface border border-outline-variant rounded-xl pl-8 pr-3 py-2 focus:outline-none"
            />
            <Search className="absolute left-2.5 top-2.5 size-4 text-on-surface-variant" />
          </div>
          <button onClick={fetchThreads} className="p-2 border border-outline-variant rounded-xl hover:bg-surface-container transition-colors">
            <RefreshCw className="size-4 text-on-surface-variant" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-outline-variant">
          {error ? (
            (() => {
              const url = parseGoogleApiError(error);
              if (url) {
                return (
                  <div className="p-5 text-center space-y-3">
                    <span className="ds-icon-badge mx-auto" style={{ background: "rgba(251,146,60,0.10)", color: "#fb923c" }}>
                      <AlertCircle size={20} />
                    </span>
                    <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">Gmail API Disabled</h4>
                    <p className="text-[10px] text-on-surface-variant leading-relaxed">
                      The Gmail API is disabled in your Google Cloud Project console. Please enable it to sync your inbox.
                    </p>
                    <div className="pt-1">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex bg-[#00cec4] text-white hover:bg-[#00b8af] px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-wider transition-all"
                      >
                        Enable API
                      </a>
                    </div>
                  </div>
                );
              }
              return (
                <div className="p-4 text-center space-y-2">
                  <span className="text-[#fb923c] font-bold text-sm">⚠</span>
                  <p className="text-xs font-semibold text-on-surface">Sync Issue</p>
                  <p className="text-[10px] text-on-surface-variant leading-relaxed">{error}</p>
                </div>
              );
            })()
          ) : loading && !threads ? (
            <div className="text-center py-8 text-xs text-on-surface-variant">Loading threads...</div>
          ) : threads?.length === 0 ? (
            <div className="text-center py-8 text-xs text-on-surface-variant">No threads found.</div>
          ) : (
            threads?.map((t) => (
              <div
                key={t.id}
                onClick={() => handleThreadSelect(t.id)}
                className={`p-3 space-y-1 cursor-pointer transition-colors text-left ${
                  selectedThread?.id === t.id ? "bg-surface-container" : "hover:bg-surface-container-low"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-on-surface truncate max-w-[120px]">{t.from.split(" <")[0]}</span>
                  <span className="text-[10px] text-on-surface-variant ds-numeric">{t.date.split(", ")[1]?.slice(0, 11) || t.date}</span>
                </div>
                <h4 className="text-xs font-semibold text-on-surface truncate max-w-[180px]">{t.subject}</h4>
                <p className="text-[10px] text-on-surface-variant truncate max-w-[200px]">{t.snippet}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Reading & Action Pane */}
      <div className="md:col-span-2 flex flex-col h-full bg-surface">
        {selectedThread ? (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Thread Action Bar */}
            <div className="p-3 border-b border-outline-variant bg-surface-container-low flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-on-surface uppercase tracking-wide truncate max-w-[250px]">{selectedThread.subject}</h3>
                <a
                  href={`https://mail.google.com/mail/u/0/#inbox/${selectedThread.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-[#00cec4] hover:underline"
                >
                  <span>Open Full Gmail</span>
                  <ExternalLink className="size-3" />
                </a>
              </div>

              {/* Link to Job Option */}
              <div className="flex items-center space-x-2">
                <select
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="text-xs bg-surface border border-outline-variant rounded-xl p-1.5 focus:outline-none"
                >
                  <option value="">Select Job...</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>{job.jobNumber} - {job.title}</option>
                  ))}
                </select>

                <select
                  value={linkCategory}
                  onChange={(e) => setLinkCategory(e.target.value)}
                  className="text-xs bg-surface border border-outline-variant rounded-xl p-1.5 focus:outline-none"
                >
                  <option value="01 Customer KYC">KYC</option>
                  <option value="02 Job Documents">Documents</option>
                  <option value="03 User Uploads">Uploads</option>
                  <option value="06 Invoices and Billing">Billing</option>
                </select>

                <button
                  onClick={handleLinkJob}
                  disabled={!selectedJobId}
                  className="flex items-center space-x-1 bg-[#00cec4] text-white hover:bg-[#00b8af] disabled:opacity-50 px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all"
                >
                  <Link2 className="size-3.5" />
                  <span>Link</span>
                </button>
              </div>
            </div>

            {/* Conversation Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface-container-low">
              {selectedThread.messages.map((msg: any) => (
                <div key={msg.id} className="p-4 rounded-xl border border-outline-variant bg-surface space-y-3 shadow-sm text-left">
                  <div className="flex items-start justify-between border-b border-outline-variant/30 pb-2">
                    <div>
                      <span className="text-xs font-bold text-on-surface block">{msg.from}</span>
                      <span className="text-[10px] text-on-surface-variant block">To: {msg.to}</span>
                    </div>
                    <span className="text-[10px] text-on-surface-variant ds-numeric">{msg.date}</span>
                  </div>

                  {/* Sanitized HTML Body */}
                  <div
                    className="text-xs text-on-surface space-y-2 overflow-x-auto whitespace-pre-line"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(msg.bodyHtml || msg.bodyText)
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Quick Reply Form */}
            <div className="p-3 border-t border-outline-variant bg-surface">
              <form onSubmit={handleSendEmail} className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Type reply..."
                  value={composeBody}
                  onChange={(e) => {
                    setComposeBody(e.target.value);
                    setComposeTo(selectedThread.messages[selectedThread.messages.length - 1].from);
                    setComposeSubject(`Re: ${selectedThread.subject}`);
                  }}
                  className="flex-1 text-xs bg-surface border border-outline-variant rounded-xl px-3 py-2 focus:outline-none"
                  required
                />
                <button
                  type="submit"
                  className="bg-[#00cec4] text-white hover:bg-[#00b8af] px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all"
                >
                  Reply
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-on-surface-variant text-xs">
            <Mail className="size-12 text-[#00cec4]/40 mb-2 animate-pulse" />
            <span>Select an email thread to read conversation.</span>
          </div>
        )}
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-surface border border-outline-variant rounded-xl shadow-xl overflow-hidden animate-page-enter">
            <div className="p-4 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
              <h3 className="ds-h3 text-on-surface">Compose New Email</h3>
              <button onClick={() => setShowCompose(false)} className="text-on-surface-variant hover:text-on-surface font-bold text-sm">✕</button>
            </div>
            <form onSubmit={handleSendEmail} className="p-4 space-y-3 text-left">
              <div>
                <label className="ds-label text-on-surface-variant block mb-1">To</label>
                <input
                  type="email"
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  className="w-full text-xs bg-surface border border-outline-variant rounded-xl px-3 py-2 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="ds-label text-on-surface-variant block mb-1">Subject</label>
                <input
                  type="text"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  className="w-full text-xs bg-surface border border-outline-variant rounded-xl px-3 py-2 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="ds-label text-on-surface-variant block mb-1">Message</label>
                <textarea
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  rows={6}
                  className="w-full text-xs bg-surface border border-outline-variant rounded-xl px-3 py-2 focus:outline-none"
                  required
                />
              </div>
              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCompose(false)}
                  className="px-4 py-2 border border-outline-variant rounded-xl text-xs font-semibold uppercase hover:bg-surface-container-low text-on-surface-variant transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#00cec4] text-white hover:bg-[#00b8af] px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all"
                >
                  Send Email
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
