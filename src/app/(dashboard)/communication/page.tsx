import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listThreads } from "@/lib/google-gmail-client";
import { listUpcomingEvents } from "@/lib/google-calendar-client";
import Link from "next/link";
import { AlertCircle, CheckCircle2, RefreshCw, Mail, MessageSquare as ChatBubbleIcon, Calendar, Folder, Video, Settings, Search, Plus } from "lucide-react";

function parseGoogleApiError(errorMessage: string) {
  if (!errorMessage) return null;
  
  if (
    errorMessage.includes("API has not been used") || 
    errorMessage.includes("SERVICE_DISABLED") || 
    errorMessage.includes("accessNotConfigured")
  ) {
    const match = errorMessage.match(/https:\/\/console\.[^\s"'}]+/);
    const activationUrl = match ? match[0] : null;
    
    let apiName = "Google API";
    if (errorMessage.toLowerCase().includes("gmail")) {
      apiName = "Gmail API";
    } else if (errorMessage.toLowerCase().includes("calendar")) {
      apiName = "Google Calendar API";
    } else if (errorMessage.toLowerCase().includes("chat")) {
      apiName = "Google Chat API";
    } else if (errorMessage.toLowerCase().includes("drive")) {
      apiName = "Google Drive API";
    }
    
    return {
      type: "API_DISABLED",
      apiName,
      activationUrl: activationUrl || "https://console.cloud.google.com/apis/dashboard"
    };
  }
  
  return null;
}

export default async function CommunicationDashboard() {
  const session = await auth();
  if (!session?.user) return null;

  const connection = await db.googleWorkspaceConnection.findUnique({
    where: { userId: session.user.id }
  });

  const googleEmail = connection?.googleEmail || "";

  let threads: any[] = [];
  let meetings: any[] = [];
  let errorState = null;

  try {
    if (connection) {
      // Fetch Gmail threads (last 5)
      const mailRes = await listThreads({
        userId: session.user.id,
        maxResults: 5
      });
      threads = mailRes.threads || [];

      // Fetch Calendar meetings (last 5)
      meetings = await listUpcomingEvents({
        userId: session.user.id,
        maxResults: 5
      });
    }
  } catch (err: any) {
    console.error("[WorkspaceHome] Failed to load workspace data:", err);
    errorState = err.message || "Failed to load real-time Workspace data.";
  }

  // Count active job spaces
  const activeSpacesCount = await db.jobWorkspaceProfile.count({
    where: {
      orgId: session.user.orgId!,
      googleSpaceId: { not: null },
      job: { deletedAt: null },
    }
  });

  const parsedError = parseGoogleApiError(errorState || "");

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Welcome Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between p-6 rounded-2xl border border-mono-border bg-mono-card shadow-sm">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#F9D972]">Workspace Dashboard</span>
          <h1 className="text-xl font-bold text-mono-text mt-1">Hello, {session.user.name}</h1>
          <p className="text-xs text-mono-muted mt-0.5">
            Connected via <span className="font-semibold text-mono-text">{googleEmail}</span>
          </p>
        </div>

        {/* Sync Status Badge */}
        <div className="flex items-center space-x-2 mt-4 md:mt-0 p-2 bg-mono-soft rounded-xl border border-mono-border">
          <CheckCircle2 size={16} className={errorState ? "text-[#D88700]" : "text-[#F9D972]"} />
          <span className="text-xs font-semibold uppercase tracking-wider text-mono-muted">
            API Sync: {errorState ? "Issue Detected" : "Active"}
          </span>
        </div>
      </div>

      {errorState && (
        parsedError ? (
          <div className="flex items-start space-x-3 p-5 rounded-2xl border border-[#D88700]/25 bg-mono-card shadow-md">
            <span className="monolith-icon-badge mt-0.5 shrink-0" style={{ background: "rgba(251,146,60,0.10)", color: "#D88700" }}>
              <AlertCircle size={20} />
            </span>
            <div className="text-left space-y-2">
              <h3 className="monolith-h3 text-mono-text font-bold">Google API Enabling Required</h3>
              <p className="text-xs text-mono-muted max-w-xl">
                The <span className="font-bold text-mono-text">{parsedError.apiName}</span> is not yet enabled for your Google Cloud Project. To use these workspace features, you must enable this API in the developers console.
              </p>
              <div className="pt-1.5">
                <a
                  href={parsedError.activationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 bg-[#F9D972] text-white hover:bg-[#E8C85D] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all font-semibold"
                >
                  <span>Enable {parsedError.apiName}</span>
                  <span>→</span>
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-3 p-4 rounded-xl border border-[#D88700]/20 bg-[#D88700]/5 text-[#D88700]">
            <AlertCircle size={18} />
            <div className="text-xs">
              <span className="font-bold">Sync Issue: </span> {errorState}
            </div>
          </div>
        )
      )}

      {/* Grid of Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="monolith-card monolith-accent rounded-xl border border-mono-border bg-mono-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-mono-muted">Unread Mail</span>
              <h2 className="text-2xl font-bold monolith-numeric text-mono-text mt-1">
                {threads.filter(t => t.isUnread).length}
              </h2>
            </div>
            <span className="monolith-icon-badge">
              <span className="text-[#F9D972] font-bold text-sm">✉</span>
            </span>
          </div>
        </div>

        <div className="monolith-card monolith-accent rounded-xl border border-mono-border bg-mono-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-mono-muted">Job Channels</span>
              <h2 className="text-2xl font-bold monolith-numeric text-mono-text mt-1">{activeSpacesCount}</h2>
            </div>
            <span className="monolith-icon-badge">
              <span className="text-[#F9D972] font-bold text-sm">💬</span>
            </span>
          </div>
        </div>

        <div className="monolith-card monolith-accent rounded-xl border border-mono-border bg-mono-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-mono-muted">Upcoming Meets</span>
              <h2 className="text-2xl font-bold monolith-numeric text-mono-text mt-1">{meetings.length}</h2>
            </div>
            <span className="monolith-icon-badge">
              <span className="text-[#F9D972] font-bold text-sm">📅</span>
            </span>
          </div>
        </div>

        <div className="monolith-card monolith-accent rounded-xl border border-mono-border bg-mono-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-mono-muted">Workspace Health</span>
              <h2 className="text-sm font-bold text-[#F9D972] uppercase mt-1.5">100% OK</h2>
            </div>
            <span className="monolith-icon-badge">
              <span className="text-[#F9D972] font-bold text-sm">♥</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Dashboard Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent emails & chat spaces (span 2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Emails */}
          <div className="rounded-xl border border-mono-border bg-mono-card shadow-sm overflow-hidden">
            <div className="p-4 border-b border-mono-border flex items-center justify-between">
              <h3 className="monolith-h3 text-mono-text flex items-center gap-2">
                <span>Recent Emails</span>
              </h3>
              <Link href="/communication/mail" className="text-xs font-semibold text-[#F9D972] uppercase tracking-wider hover:underline">
                View Mailbox
              </Link>
            </div>
            <div className="p-4">
              {threads.length === 0 ? (
                <div className="text-center py-6 text-mono-muted text-xs">No recent threads found.</div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-mono-border bg-mono-card shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="monolith-table">
                      <thead>
                        <tr>
                          <th className="px-4 py-2.5">Sender</th>
                          <th className="px-4 py-2.5">Subject</th>
                          <th className="px-4 py-2.5">Snippet</th>
                        </tr>
                      </thead>
                      <tbody>
                        {threads.map((t) => (
                          <tr key={t.id} className="monolith-row-link monolith-hover">
                            <td className="px-4 py-3 text-xs font-medium text-mono-text truncate max-w-[120px]">
                              {t.isUnread && <span className="inline-block w-2 h-2 rounded-full bg-[#F9D972] mr-2"></span>}
                              {t.from.split(" <")[0]}
                            </td>
                            <td className="px-4 py-3 text-xs text-mono-text truncate max-w-[200px]">{t.subject}</td>
                            <td className="px-4 py-3 text-xs text-mono-muted truncate max-w-[300px]">{t.snippet}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="rounded-xl border border-mono-border bg-mono-card p-5 shadow-sm">
            <h3 className="monolith-h3 text-mono-text mb-4">Quick Workspace Actions</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Link href="/communication/mail" className="flex flex-col items-center p-4 rounded-xl border border-mono-border bg-mono-soft hover:bg-mono-soft transition-colors text-center">
                <span className="text-lg mb-1">✉</span>
                <span className="text-xs font-semibold text-mono-text uppercase tracking-wider">Compose Mail</span>
              </Link>
              <Link href="/communication/chat" className="flex flex-col items-center p-4 rounded-xl border border-mono-border bg-mono-soft hover:bg-mono-soft transition-colors text-center">
                <span className="text-lg mb-1">💬</span>
                <span className="text-xs font-semibold text-mono-text uppercase tracking-wider">Start Chat</span>
              </Link>
              <Link href="/communication/meetings" className="flex flex-col items-center p-4 rounded-xl border border-mono-border bg-mono-soft hover:bg-mono-soft transition-colors text-center">
                <span className="text-lg mb-1">📹</span>
                <span className="text-xs font-semibold text-mono-text uppercase tracking-wider">New Meeting</span>
              </Link>
              <Link href="/communication/search" className="flex flex-col items-center p-4 rounded-xl border border-mono-border bg-mono-soft hover:bg-mono-soft transition-colors text-center">
                <span className="text-lg mb-1">🔎</span>
                <span className="text-xs font-semibold text-mono-text uppercase tracking-wider">Search Hub</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column: Upcoming meetings & Admin Settings */}
        <div className="space-y-6">
          {/* Upcoming Meetings */}
          <div className="rounded-xl border border-mono-border bg-mono-card shadow-sm overflow-hidden">
            <div className="p-4 border-b border-mono-border flex items-center justify-between">
              <h3 className="monolith-h3 text-mono-text">Upcoming Meetings</h3>
            </div>
            <div className="p-4 space-y-4">
              {meetings.length === 0 ? (
                <div className="text-center py-6 text-mono-muted text-xs">No upcoming meetings.</div>
              ) : (
                meetings.map((m) => (
                  <div key={m.id} className="monolith-card monolith-accent p-3 rounded-xl border border-mono-border bg-mono-soft space-y-2">
                    <div className="flex items-start justify-between">
                      <h4 className="text-xs font-bold text-mono-text truncate max-w-[150px]">{m.summary}</h4>
                      {m.meetLink && (
                        <a
                          href={m.meetLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-bold uppercase text-[#F9D972] hover:underline"
                        >
                          Join Meet
                        </a>
                      )}
                    </div>
                    <p className="text-[10px] text-mono-muted monolith-numeric">
                      {new Date(m.start.dateTime).toLocaleString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "2-digit",
                        month: "short"
                      })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick AI Help section */}
          <div className="rounded-xl border border-mono-border bg-mono-card p-5 shadow-sm space-y-3">
            <h3 className="monolith-h3 text-mono-text">Mono AI Assistant</h3>
            <p className="text-xs text-mono-muted">Ask queries about shipping jobs, document verification, or compile status summaries instantly.</p>
            <Link href="/communication/chat" className="inline-flex w-full items-center justify-center bg-[#F9D972] text-white hover:bg-[#E8C85D] px-4 py-2 rounded-xl text-xs uppercase tracking-wider font-semibold transition-all">
              Chat with Mono AI
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
