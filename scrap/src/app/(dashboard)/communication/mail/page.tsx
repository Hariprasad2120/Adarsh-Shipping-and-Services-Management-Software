"use client";

import React, { useEffect, useState, useTransition } from "react";
import { Mail, Send, Trash, Archive, Star, Plus, FileText, ChevronRight, User, RefreshCw } from "lucide-react";
import { useSession, signIn } from "next-auth/react";
import {
  listMailThreads,
  getMailThread,
  sendMailMessage,
  listMailAccounts,
  getCommunicationProfile,
} from "@/modules/communication/mail.service";
import { syncGmailInbox } from "@/modules/communication/gmail-sync.service";
import { searchGoogleContacts, disconnectGoogleAccount, searchGoogleDriveFiles } from "@/modules/communication/google-workspace.service";

export default function MailPage() {
  const { data: session } = useSession();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [folder, setFolder] = useState<"inbox" | "sent" | "starred" | "trash" | "archive" | "draft">("inbox");
  const [threads, setThreads] = useState<any[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [threadDetails, setThreadDetails] = useState<any>(null);
  const [signature, setSignature] = useState<string>("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [showContacts, setShowContacts] = useState(false);
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [showDriveSearch, setShowDriveSearch] = useState(false);
  const [driveQuery, setDriveQuery] = useState("");
  const [isSearchingDrive, setIsSearchingDrive] = useState(false);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  // Composer Form
  const [isComposing, setIsComposing] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [crmLeadId, setCrmLeadId] = useState("");
  const [isPending, startTransition] = useTransition();

  // Load Accounts & Signature
  useEffect(() => {
    const userId = session?.user?.id;
    const orgId = session?.user?.orgId;
    if (userId && orgId) {
      listMailAccounts(userId, orgId).then((accs) => {
        setAccounts(accs);
        if (accs.length > 0) setSelectedAccountId(accs[0].id);
      });
      getCommunicationProfile(userId, orgId).then((prof) => {
        if (prof?.emailSignatureEnabled) {
          setSignature(prof.emailSignature || "");
        }
      });
    }
  }, [session]);

  // Hook to fetch matching Google Contacts when typing in recipient list
  useEffect(() => {
    const userId = session?.user?.id;
    const orgId = session?.user?.orgId;
    if (userId && orgId && composeTo && composeTo.length >= 2) {
      const tokens = composeTo.split(",");
      const query = tokens[tokens.length - 1].trim();
      if (query.length >= 2) {
        searchGoogleContacts(userId, orgId, query).then((res) => {
          setContacts(res || []);
          setShowContacts((res || []).length > 0);
        });
      } else {
        setShowContacts(false);
      }
    } else {
      setShowContacts(false);
    }
  }, [composeTo, session]);

  // Hook to fetch matching Google Drive files when searching
  useEffect(() => {
    const userId = session?.user?.id;
    const orgId = session?.user?.orgId;
    if (userId && orgId && driveQuery && driveQuery.length >= 2) {
      setIsSearchingDrive(true);
      searchGoogleDriveFiles(userId, orgId, driveQuery).then((res) => {
        setDriveFiles(res || []);
        setIsSearchingDrive(false);
      }).catch(() => setIsSearchingDrive(false));
    } else {
      setDriveFiles([]);
    }
  }, [driveQuery, session]);

  const handleDisconnect = async () => {
    const userId = session?.user?.id;
    const orgId = session?.user?.orgId;
    if (!selectedAccountId || !userId || !orgId) return;

    if (confirm("Are you sure you want to disconnect this Google Account?")) {
      try {
        await disconnectGoogleAccount(userId, orgId, selectedAccountId);
        const accs = await listMailAccounts(userId, orgId);
        setAccounts(accs);
        if (accs.length > 0) {
          setSelectedAccountId(accs[0].id);
        } else {
          setSelectedAccountId("");
        }
      } catch (err) {
        console.error("Disconnect error:", err);
      }
    }
  };

  // Load Threads
  useEffect(() => {
    const userId = session?.user?.id;
    const orgId = session?.user?.orgId;
    if (userId && orgId) {
      listMailThreads(userId, orgId, folder).then((res) => {
        setThreads(res.threads);
      });
    }
  }, [session, folder, currentThreadId]);

  // Load Thread Details
  useEffect(() => {
    const userId = session?.user?.id;
    const orgId = session?.user?.orgId;
    if (currentThreadId && userId && orgId) {
      getMailThread(userId, orgId, currentThreadId).then((details) => {
        setThreadDetails(details);
      });
    } else {
      setThreadDetails(null);
    }
  }, [currentThreadId, session]);

  const handleSend = () => {
    const userId = session?.user?.id;
    const orgId = session?.user?.orgId;
    if (!selectedAccountId || !composeTo || !composeSubject || !composeBody || !userId || !orgId) return;

    startTransition(async () => {
      try {
        const fullBody = signature ? `${composeBody}<br/><br/>${signature}` : composeBody;
        await sendMailMessage(userId, orgId, {
          mailAccountId: selectedAccountId,
          to: composeTo.split(",").map((e) => e.trim()),
          subject: composeSubject,
          bodyHtml: fullBody,
          linkedRecordType: crmLeadId ? "CRM_LEAD" : undefined,
          linkedRecordId: crmLeadId || undefined,
        });

        setIsComposing(false);
        setComposeTo("");
        setComposeSubject("");
        setComposeBody("");
        setCrmLeadId("");
        // Reload folder
        setFolder("sent");
      } catch (err) {
        console.error(err);
      }
    });
  };

  const handleSyncGmail = () => {
    const userId = session?.user?.id;
    const orgId = session?.user?.orgId;
    if (!selectedAccountId || !userId || !orgId) return;

    setIsSyncing(true);
    startTransition(async () => {
      try {
        const res = await syncGmailInbox(userId, orgId, selectedAccountId);
        if (res.success) {
          const updated = await listMailThreads(userId, orgId, folder);
          setThreads(updated.threads);
        }
      } catch (err) {
        console.error("Gmail sync error:", err);
      } finally {
        setIsSyncing(false);
      }
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)] min-h-0">
      
      {/* 1. Folders Navigation */}
      <div className="w-full lg:w-60 shrink-0 flex flex-col gap-4 bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-xl p-4">
        <div>
          <span className="ds-label block mb-1">Mailing Account</span>
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="w-full text-xs bg-[var(--color-surface-container)] text-white"
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.email} ({acc.provider === "GOOGLE" ? "Gmail" : "SMTP/IMAP"})
              </option>
            ))}
            {accounts.length === 0 && <option>No Accounts Registered</option>}
          </select>

          {selectedAccount?.provider === "GOOGLE" && (
            <div className="space-y-4">
              <button
                onClick={handleSyncGmail}
                disabled={isSyncing}
                className="mt-2 w-full py-2.5 bg-[#00cec4] hover:bg-[#00b8af] text-white rounded-xl text-xs uppercase font-bold cursor-pointer relative transform-gpu transition-all duration-75 active:translate-y-[4px] active:shadow-[0_2px_0_0_#00857e] shadow-[0_6px_0_0_#00857e] border border-[#00b8af] flex items-center justify-center gap-2 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none disabled:bg-[#00cec4]/50"
              >
                <RefreshCw size={12} className={isSyncing ? "animate-spin" : ""} />
                {isSyncing ? "Syncing..." : "Sync Gmail Inbox"}
              </button>
              <button
                onClick={handleDisconnect}
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs uppercase font-bold cursor-pointer relative transform-gpu transition-all duration-75 active:translate-y-[4px] active:shadow-[0_2px_0_0_#7f1d1d] shadow-[0_6px_0_0_#7f1d1d] border border-red-700 flex items-center justify-center gap-2"
              >
                Disconnect Account
              </button>
            </div>
          )}

          {(!selectedAccount || selectedAccount.provider !== "GOOGLE") && (
            <button
              onClick={() => signIn("google", { callbackUrl: window.location.href })}
              className="mt-2 w-full py-2.5 bg-[#161f28] hover:bg-[#21262d] text-slate-200 hover:text-white rounded-xl text-xs uppercase font-semibold cursor-pointer relative transform-gpu transition-all duration-75 active:translate-y-[4px] active:shadow-[0_2px_0_0_#0f172a] shadow-[0_6px_0_0_#0f172a] border border-[var(--color-outline-variant)] flex items-center justify-center gap-2"
            >
              <img src="https://www.google.com/favicon.ico" className="w-3.5 h-3.5 object-contain" alt="Google" />
              Link Google Account
            </button>
          )}
        </div>

        <button
          onClick={() => setIsComposing(true)}
          className="bg-[#00cec4] text-white hover:bg-[#00b8af] w-full py-2.5 rounded-xl text-xs uppercase tracking-widest font-bold cursor-pointer relative transform-gpu transition-all duration-75 active:translate-y-[4px] active:shadow-[0_2px_0_0_#00857e] shadow-[0_6px_0_0_#00857e] border border-[#00b8af] flex items-center justify-center gap-2"
        >
          <Plus size={14} />
          Compose Mail
        </button>

        <div className="flex flex-col gap-1 mt-2">
          <span className="ds-label block mb-2 px-2">Folders</span>
          {[
            { key: "inbox", label: "Inbox", icon: Mail },
            { key: "sent", label: "Sent", icon: Send },
            { key: "starred", label: "Starred", icon: Star },
            { key: "trash", label: "Trash", icon: Trash },
            { key: "archive", label: "Archive", icon: Archive },
          ].map((f) => {
            const Icon = f.icon;
            const isActive = folder === f.key;
            return (
              <button
                key={f.key}
                onClick={() => {
                  setFolder(f.key as any);
                  setCurrentThreadId(null);
                }}
                className={`flex items-center justify-between px-3 py-2 text-xs rounded-xl font-medium tracking-wide transition-all cursor-pointer hover:scale-[1.03] active:scale-[0.97] duration-150 ${
                  isActive
                    ? "bg-[#00cec4]/10 text-[#00cec4] border border-[#00cec4]/25 shadow-sm"
                    : "text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon size={14} />
                  <span>{f.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Mail List / Thread List */}
      <div className="flex-1 lg:max-w-md shrink-0 flex flex-col bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-xl overflow-hidden min-h-0">
        <div className="p-4 border-b border-[var(--color-outline-variant)]">
          <h3 className="ds-h3 text-white text-sm font-bold uppercase tracking-wider">
            {folder} Threads
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--color-outline-variant)]/60">
          {threads.map((thread) => {
            const latestMsg = thread.messages[0];
            const isSelected = currentThreadId === thread.id;
            return (
              <div
                key={thread.id}
                onClick={() => setCurrentThreadId(thread.id)}
                className={`p-4 cursor-pointer flex justify-between items-start gap-3 hover:bg-[var(--color-surface-container-low)]/70 hover:translate-x-1.5 transition-all duration-150 ${
                  isSelected ? "border-l-4 border-[#00cec4] bg-[var(--color-surface-container-low)] shadow-inner" : ""
                }`}
              >
                <div className="min-w-0">
                  <span className="text-[10px] text-[var(--color-on-surface-variant)] font-semibold block uppercase">
                    {latestMsg?.from || "Unknown"}
                  </span>
                  <h4 className="text-white text-xs font-bold font-sans mt-0.5 truncate">
                    {thread.subject}
                  </h4>
                  <p className="text-[var(--color-on-surface-variant)] text-xs truncate mt-0.5">
                    {latestMsg?.bodyText || "No text body"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[9px] text-[var(--color-on-surface-variant)] font-mono">
                    {latestMsg ? new Date(latestMsg.createdAt).toLocaleDateString() : ""}
                  </span>
                </div>
              </div>
            );
          })}
          {threads.length === 0 && (
            <div className="p-8 text-center text-xs text-[var(--color-on-surface-variant)] uppercase tracking-wider">
              No threads found in this folder
            </div>
          )}
        </div>
      </div>

      {/* 3. Conversation Thread View / Composer */}
      <div className="flex-1 bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-xl overflow-hidden flex flex-col min-h-0">
        {isComposing ? (
          <div className="p-6 flex flex-col gap-4 flex-1 overflow-y-auto">
            <div className="border-b border-[var(--color-outline-variant)] pb-3 flex justify-between items-center">
              <h3 className="ds-h3 text-white text-sm font-bold flex items-center gap-2">
                <Plus size={16} className="text-[#00cec4]" />
                New Message
              </h3>
              <button
                onClick={() => setIsComposing(false)}
                className="text-xs text-[var(--color-on-surface-variant)] hover:text-white uppercase tracking-wider font-bold cursor-pointer hover:scale-105 active:scale-95 transition-transform duration-100"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="relative">
              <span className="ds-label block mb-1">Recipients (comma separated)</span>
              <input
                type="text"
                placeholder="name@company.com"
                value={composeTo}
                onChange={(e) => {
                  setComposeTo(e.target.value);
                  setShowContacts(true);
                }}
                className="w-full text-xs text-white"
              />
              {showContacts && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-xl max-h-40 overflow-y-auto shadow-xl">
                  {contacts.map((c, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        const tokens = composeTo.split(",");
                        tokens[tokens.length - 1] = ` ${c.email}`;
                        setComposeTo(tokens.join(",").trim());
                        setShowContacts(false);
                      }}
                      className="px-4 py-2 hover:bg-[#00cec4]/15 cursor-pointer text-xs text-white flex flex-col"
                    >
                      <span className="font-bold">{c.name || "No Name"}</span>
                      <span className="text-[10px] text-[var(--color-on-surface-variant)]">{c.email}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

              <div>
                <span className="ds-label block mb-1">Subject</span>
                <input
                  type="text"
                  placeholder="Meeting Agenda / Operational Report"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  className="w-full text-xs text-white"
                />
              </div>

              <div>
                <span className="ds-label block mb-1">CRM Lead ID Link (Optional)</span>
                <input
                  type="text"
                  placeholder="e.g. crm_lead_cuid"
                  value={crmLeadId}
                  onChange={(e) => setCrmLeadId(e.target.value)}
                  className="w-full text-xs text-white"
                />
              </div>

              {showDriveSearch && (
                <div className="border border-[#00cec4]/35 bg-[var(--color-surface-container)] rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="ds-label block text-[#00cec4]">Search Google Drive Files</span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDriveSearch(false);
                        setDriveQuery("");
                      }}
                      className="text-[10px] text-[var(--color-on-surface-variant)] hover:text-white uppercase tracking-wider font-bold cursor-pointer hover:scale-105 active:scale-95 transition-transform duration-100"
                    >
                      Close
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Enter file name keyword (e.g. report)..."
                    value={driveQuery}
                    onChange={(e) => setDriveQuery(e.target.value)}
                    className="w-full text-xs text-white"
                  />
                  {isSearchingDrive ? (
                    <p className="text-[10px] text-[var(--color-on-surface-variant)] uppercase tracking-wider">Searching Drive...</p>
                  ) : driveFiles.length > 0 ? (
                    <div className="max-h-40 overflow-y-auto divide-y divide-[var(--color-outline-variant)]/40 border border-[var(--color-outline-variant)]/40 rounded-lg">
                      {driveFiles.map((file, i) => (
                        <div
                          key={i}
                          onClick={() => {
                            setComposeBody(prev => prev + `\n<p><a href="${file.webViewLink}" target="_blank" style="color:#00cec4;text-decoration:underline;">Google Drive: ${file.name}</a></p>`);
                            setShowDriveSearch(false);
                            setDriveQuery("");
                          }}
                          className="p-2 hover:bg-[#00cec4]/15 cursor-pointer text-xs text-white flex flex-col gap-0.5"
                        >
                          <span className="font-bold truncate">{file.name}</span>
                          <span className="text-[9px] text-[var(--color-on-surface-variant)] uppercase font-mono">{file.mimeType} {file.size ? `(${Math.round(file.size / 1024)} KB)` : ""}</span>
                        </div>
                      ))}
                    </div>
                  ) : driveQuery.length >= 2 ? (
                    <p className="text-[10px] text-[var(--color-on-surface-variant)] uppercase tracking-wider">No matching files found</p>
                  ) : null}
                </div>
              )}

              <div className="flex-1 flex flex-col">
                <span className="ds-label block mb-1">Body (HTML format supported)</span>
                <textarea
                  rows={8}
                  placeholder="Type your message here..."
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  className="w-full text-xs text-white flex-1 min-h-[200px]"
                />
              </div>
            </div>

            <div className="flex justify-end items-center gap-3 mt-4">
              {selectedAccount?.provider === "GOOGLE" && (
                <button
                  type="button"
                  onClick={() => setShowDriveSearch(!showDriveSearch)}
                  className="mr-auto px-4 py-2 border border-[#00cec4]/35 text-[#00cec4] bg-[var(--color-surface)] hover:bg-[#00cec4]/10 rounded-xl text-xs uppercase font-semibold cursor-pointer relative transform-gpu transition-all duration-75 active:translate-y-[4px] active:shadow-[0_2px_0_0_#0e8995] shadow-[0_6px_0_0_#0e8995] flex items-center gap-2"
                >
                  <img src="https://www.google.com/favicon.ico" className="w-3.5 h-3.5 object-contain" alt="Google Drive" />
                  Attach Drive Link
                </button>
              )}
              <button
                disabled={isPending}
                onClick={handleSend}
                className="bg-[#00cec4] text-white hover:bg-[#00b8af] px-6 py-2.5 rounded-xl text-xs uppercase tracking-widest font-bold relative transform-gpu transition-all duration-75 active:translate-y-[4px] active:shadow-[0_2px_0_0_#00857e] shadow-[0_6px_0_0_#00857e] border border-[#00b8af] flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none disabled:bg-[#00cec4]/50"
              >
                <Send size={14} />
                {isPending ? "Sending..." : "Send Message"}
              </button>
            </div>
          </div>
        ) : threadDetails ? (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-4 border-b border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)]">
              <h3 className="text-white text-sm font-bold font-sans uppercase">
                {threadDetails.subject}
              </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {threadDetails.messages.map((msg: any) => (
                <div key={msg.id} className="card-left-accent bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)]/60 rounded-xl p-5 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-white text-xs font-bold flex items-center gap-1.5 font-sans">
                        <User size={13} className="text-[#00cec4]" />
                        {msg.from}
                      </span>
                      <span className="text-[9px] text-[var(--color-on-surface-variant)] uppercase tracking-wider block mt-0.5">
                        To: {msg.to}
                      </span>
                    </div>
                    <span className="text-[9px] text-[var(--color-on-surface-variant)] font-mono">
                      {new Date(msg.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="text-white text-xs whitespace-pre-wrap leading-relaxed border-t border-[var(--color-outline-variant)]/40 pt-3">
                    <div dangerouslySetInnerHTML={{ __html: msg.bodyHtml }} />
                  </div>

                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--color-outline-variant)]/20">
                      {msg.attachments.map((att: any) => (
                        <div key={att.id} className="ds-icon-badge flex items-center gap-2 px-3 py-1.5 bg-[#00cec4]/10 rounded-lg text-[#00cec4] text-[10px] font-mono">
                          <FileText size={12} />
                          <span>{att.fileName}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <Mail size={48} className="text-[var(--color-outline)] mb-3" />
            <h4 className="text-white font-bold text-xs uppercase tracking-wider">No Thread Selected</h4>
            <p className="text-[var(--color-on-surface-variant)] text-xs mt-1">
              Select an email thread from the inbox index to inspect history.
            </p>
          </div>
        )}
      </div>

      {/* Humorous 3D Live Loader */}
      <LiveHumorLoader active={isSyncing || isPending} type={isSyncing ? "sync" : "send"} />

    </div>
  );
}

const HUMOROUS_MESSAGES = {
  sync: [
    "Taming wild SMTP packets...",
    "Polishing Google servers with digital wax...",
    "Consulting the email oracle for guidance...",
    "De-duplicating spam sent by green aliens...",
    "Teaching carrier pigeons RFC 2822 protocols...",
    "Negotiating with spam filters in progress...",
    "Sorting unread emails by level of anxiety...",
    "Buffing 3D buttons for premium tactile feel...",
    "Waking up the database hamsters with coffee...",
    "Filtering out mail threads that could be Slack messages...",
    "Converting caffeinated thoughts into database rows...",
    "Constructing additional pylons for the mail sync engine...",
    "Intercepting reply-all chains before they cause chaos..."
  ],
  send: [
    "Launching digital paper airplane...",
    "Negotiating crossing coordinates with firewalls...",
    "Whispering sweet thoughts to the outgoing mail server...",
    "Fastening safety belts for the email attachment...",
    "Fending off malicious spam filters at the border...",
    "Warming up the fiber-optic cables...",
    "Encrypting with absolute secrecy...",
    "Bribing delivery routers along the path...",
    "Praying the recipient doesn't click 'reply-all'..."
  ]
};

function LiveHumorLoader({ active, type }: { active: boolean; type: "sync" | "send" }) {
  const [msgIndex, setMsgIndex] = useState(0);
  const messagesList = HUMOROUS_MESSAGES[type] || HUMOROUS_MESSAGES.sync;

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % messagesList.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [active, messagesList]);

  if (!active) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-bounce transition-all duration-300">
      <div className="bg-[var(--color-surface)] border-2 border-[#00cec4] rounded-2xl p-5 shadow-[0_10px_0_0_#00857e] flex items-center gap-4 max-w-sm transform hover:scale-105 transition-transform duration-200">
        <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-[#00cec4]/10 text-[#00cec4] border border-[#00cec4]/30 shrink-0">
          <RefreshCw size={24} className="animate-spin text-[#00cec4]" />
          <div className="absolute -top-1 -right-1 h-3 w-3 bg-[#00cec4] rounded-full animate-ping" />
        </div>
        <div>
          <span className="text-[10px] font-bold text-[#00cec4] uppercase tracking-widest block font-sans">
            {type === "sync" ? "LIVE SYNC RUNNING" : "SENDING DISPATCH"}
          </span>
          <p className="text-white text-xs font-semibold font-sans mt-0.5 animate-pulse">
            {messagesList[msgIndex]}
          </p>
        </div>
      </div>
    </div>
  );
}
