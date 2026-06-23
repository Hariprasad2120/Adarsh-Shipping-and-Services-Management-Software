"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Send, Video, ExternalLink, Hash, User, Briefcase, Folder, Users, AlertCircle, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function MonolithMessenger() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active space state
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>("");
  const [selectedSpaceTitle, setSelectedSpaceTitle] = useState<string>("");
  const [selectedSpaceType, setSelectedSpaceType] = useState<string>(""); // JOB or DM
  const [selectedJob, setSelectedJob] = useState<any>(null);

  // Messages timeline state
  const [messages, setMessages] = useState<any[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessageText, setNewMessageText] = useState("");
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchChannelsAndDMs();
  }, []);

  useEffect(() => {
    if (selectedSpaceId) {
      fetchMessages(selectedSpaceId);
    }
  }, [selectedSpaceId]);

  useEffect(() => {
    // Scroll to bottom on new messages
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchChannelsAndDMs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/communication/chat/list");
      const data = await res.json();
      setJobs(data.jobs || []);
      setEmployees(data.employees || []);

      // Default select channel from query parameters if available, otherwise first channel
      const urlParams = new URLSearchParams(window.location.search);
      const querySpaceId = urlParams.get("spaceId");
      let selected = false;

      if (querySpaceId && data.jobs) {
        const match = data.jobs.find((j: any) => j.spaceId === querySpaceId);
        if (match) {
          handleSelectSpace(match.spaceId, `JOB-${match.jobNumber} Space`, "JOB", match);
          selected = true;
        }
      }

      if (!selected && data.jobs && data.jobs.length > 0) {
        handleSelectSpace(data.jobs[0].spaceId, `JOB-${data.jobs[0].jobNumber} Space`, "JOB", data.jobs[0]);
      }
    } catch (err) {
      console.error("Failed to load spaces list:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (spaceId: string) => {
    setMessagesLoading(true);
    try {
      const res = await fetch(`/api/communication/chat/messages?spaceId=${encodeURIComponent(spaceId)}`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleSelectSpace = (spaceId: string, title: string, type: string, jobData?: any) => {
    setSelectedSpaceId(spaceId);
    setSelectedSpaceTitle(title);
    setSelectedSpaceType(type);
    setSelectedJob(jobData || null);
    setMessages([]);
  };

  const handleSelectEmployeeDM = async (emp: any) => {
    if (!emp.workspaceConnection?.googleUserId) {
      alert(`${emp.name} does not have a linked Google Workspace account for messaging.`);
      return;
    }

    setMessagesLoading(true);
    try {
      const res = await fetch("/api/communication/chat/dm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetGoogleUserId: emp.workspaceConnection.googleUserId })
      });
      const data = await res.json();
      if (data.success && data.spaceId) {
        handleSelectSpace(data.spaceId, emp.name, "DM", null);
      } else {
        alert("Failed to initialize Direct Message space.");
      }
    } catch (err) {
      console.error("Error creating DM space:", err);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !selectedSpaceId) return;

    setSending(true);
    try {
      const res = await fetch("/api/communication/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spaceId: selectedSpaceId,
          text: newMessageText
        })
      });
      const data = await res.json();
      if (data.success) {
        setNewMessageText("");
        fetchMessages(selectedSpaceId);
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[80vh] border border-outline-variant bg-surface rounded-2xl overflow-hidden shadow-sm text-left">
      
      {/* Panel 1: Conversation Navigation */}
      <div className="border-r border-outline-variant flex flex-col bg-surface-container-low h-full">
        {/* Search bar */}
        <div className="p-4 border-b border-outline-variant">
          <div className="relative">
            <input
              type="text"
              placeholder="Filter chat..."
              className="w-full text-xs bg-surface border border-outline-variant rounded-xl pl-8 pr-3 py-2 focus:outline-none"
            />
            <Search className="absolute left-2.5 top-2.5 size-4 text-on-surface-variant" />
          </div>
        </div>

        {/* Channels / Spaces lists */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Job channels */}
          <div className="space-y-1">
            <span className="ds-label text-on-surface-variant block px-2 mb-1">Job Workspaces</span>
            {loading ? (
              <div className="text-[10px] text-on-surface-variant px-2">Loading...</div>
            ) : jobs.length === 0 ? (
              <div className="text-[10px] text-on-surface-variant px-2 italic">No active channels.</div>
            ) : (
              jobs.map((job) => (
                <button
                  key={job.id}
                  onClick={() => handleSelectSpace(job.spaceId, `JOB-${job.jobNumber} Space`, "JOB", job)}
                  className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition-colors ${
                    selectedSpaceId === job.spaceId
                      ? "bg-[#00cec4]/15 text-[#00cec4]"
                      : "text-on-surface hover:bg-surface-container hover:text-on-surface"
                  }`}
                >
                  <Hash className="size-4 shrink-0" />
                  <span className="truncate">JOB-{job.jobNumber}</span>
                </button>
              ))
            )}
          </div>

          {/* Direct Messages list */}
          <div className="space-y-1">
            <span className="ds-label text-on-surface-variant block px-2 mb-1">Direct Messages</span>
            {loading ? (
              <div className="text-[10px] text-on-surface-variant px-2">Loading...</div>
            ) : employees.length === 0 ? (
              <div className="text-[10px] text-on-surface-variant px-2 italic">No employees found.</div>
            ) : (
              employees.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => handleSelectEmployeeDM(emp)}
                  className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition-colors ${
                    selectedSpaceTitle === emp.name
                      ? "bg-[#00cec4]/15 text-[#00cec4]"
                      : "text-on-surface hover:bg-surface-container hover:text-on-surface"
                  }`}
                >
                  <User className="size-4 shrink-0" />
                  <span className="truncate">{emp.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Panel 2: Active Conversation timeline */}
      <div className="md:col-span-2 flex flex-col h-full bg-surface border-r border-outline-variant">
        {selectedSpaceId ? (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Space Header */}
            <div className="p-4 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
              <div>
                <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                  {selectedSpaceType === "JOB" ? <Hash className="size-4 text-[#00cec4]" /> : <User className="size-4 text-[#818cf8]" />}
                  <span>{selectedSpaceTitle}</span>
                </h3>
                {selectedSpaceId && (
                  selectedSpaceId.includes("mock") ? (
                    <span className="text-[9px] font-bold text-[#fb923c] uppercase tracking-wide mt-0.5">
                      Development Mock Space
                    </span>
                  ) : (
                    <a
                      href={`https://chat.google.com/room/${selectedSpaceId.replace("spaces/", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[9px] font-bold text-[#00cec4] hover:underline uppercase tracking-wide mt-0.5"
                    >
                      <span>Open in Google Chat</span>
                      <ExternalLink className="size-3" />
                    </a>
                  )
                )}
              </div>

              {/* Chat action shortcuts */}
              <div className="flex items-center space-x-2">
                <Link
                  href="/communication/meetings"
                  className="p-1.5 border border-outline-variant rounded-xl hover:bg-surface-container transition-colors"
                  title="Schedule Google Meet"
                >
                  <Video className="size-4 text-[#00cec4]" />
                </Link>
              </div>
            </div>

            {/* Conversation Messages Timeline */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface-container-low">
              {messagesLoading && messages.length === 0 ? (
                <div className="text-center py-12 text-xs text-on-surface-variant">Loading timeline...</div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12 text-xs text-on-surface-variant flex flex-col items-center">
                  <span className="text-3xl mb-1">💬</span>
                  <span>Timeline is empty. Send a message to start conversation.</span>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div key={idx} className="flex flex-col text-left space-y-1 max-w-[85%]">
                    <div className="flex items-baseline space-x-2">
                      <span className="text-xs font-bold text-on-surface">
                        {msg.sender?.displayName || "Google Chat User"}
                      </span>
                      <span className="text-[9px] text-on-surface-variant ds-numeric">
                        {msg.createTime
                          ? new Date(msg.createTime).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit"
                            })
                          : ""}
                      </span>
                    </div>
                    <div className="p-3 bg-surface border border-outline-variant rounded-2xl rounded-tl-none shadow-sm text-xs text-on-surface">
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input Composer */}
            <div className="p-3 border-t border-outline-variant bg-surface">
              <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Type message..."
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  className="flex-1 text-xs bg-surface border border-outline-variant rounded-xl px-3 py-2.5 focus:outline-none"
                  required
                />
                <button
                  type="submit"
                  disabled={sending || !newMessageText.trim()}
                  className="bg-[#00cec4] text-white hover:bg-[#00b8af] disabled:opacity-50 px-4 py-2.5 rounded-xl text-xs font-bold uppercase transition-all"
                >
                  <Send className="size-4" />
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-on-surface-variant text-xs">
            <span className="text-4xl mb-2 animate-bounce">💬</span>
            <span>Choose a channel or employee DM from the sidebar to chat.</span>
          </div>
        )}
      </div>

      {/* Panel 3: Details / Context Actions */}
      <div className="hidden md:flex flex-col bg-surface h-full p-4 space-y-4">
        {selectedSpaceId && selectedSpaceType === "JOB" && selectedJob ? (
          <div className="space-y-4">
            <h4 className="ds-h3 text-on-surface">Job Context</h4>
            
            <div className="card-left-accent p-3.5 rounded-xl border border-outline-variant bg-surface-container-low space-y-2">
              <h5 className="text-xs font-bold text-on-surface">JOB-{selectedJob.jobNumber}</h5>
              <p className="text-[10px] text-on-surface-variant leading-relaxed">{selectedJob.title}</p>
            </div>

            <div className="space-y-2 pt-2">
              <Link
                href={`/cha/jobs/${selectedJob.id}`}
                className="flex items-center space-x-2 text-xs font-semibold text-on-surface hover:text-[#00cec4] transition-colors"
              >
                <Briefcase className="size-4 text-[#00cec4]" />
                <span>View Job File</span>
              </Link>
              
              {selectedJob.spaceId && (
                <Link
                  href={`/communication/drive?jobId=${selectedJob.id}`}
                  className="flex items-center space-x-2 text-xs font-semibold text-on-surface hover:text-[#00cec4] transition-colors"
                >
                  <Folder className="size-4 text-[#fb923c]" />
                  <span>Google Drive Folder</span>
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-xs text-on-surface-variant italic">
            No contextual details for direct messages.
          </div>
        )}
      </div>

    </div>
  );
}
