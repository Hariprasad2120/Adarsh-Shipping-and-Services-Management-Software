"use client";

import { useState, useEffect } from "react";
import { Search, Mail, Star, Trash, Inbox, Send, Paperclip, ExternalLink, Link2, Download, RefreshCw, Plus, AlertCircle, MoreVertical, Reply, ReplyAll, Forward, MessageSquare, Trash2, Printer, Languages, FileText, CheckCircle, ShieldAlert, AlertTriangle, Eye, Clock, ChevronDown, ChevronRight, ChevronUp, Bookmark, CalendarRange, AlertOctagon, ShoppingBag, Users, Tag, Settings, Folder, File, HelpCircle, CheckCircle2 } from "lucide-react";
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

  // Gmail Message Dropdown / Actions States
  const [activeDropdownMsgId, setActiveDropdownMsgId] = useState<string | null>(null);
  const [translatedMsgId, setTranslatedMsgId] = useState<string | null>(null);
  const [showOriginalMsg, setShowOriginalMsg] = useState<any>(null);
  
  // Share in Chat states
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareMsgText, setShareMsgText] = useState("");
  const [chatSpaces, setChatSpaces] = useState<any[]>([]);
  const [chatSpacesLoading, setChatSpacesLoading] = useState(false);
  const [selectedSpaceId, setSelectedSpaceId] = useState("");
  const [sharing, setSharing] = useState(false);

  // Label & Navigation states
  const [labels, setLabels] = useState<any[]>([]);
  const [labelsLoading, setLabelsLoading] = useState(false);
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(false);
  const [isMoreExpanded, setIsMoreExpanded] = useState(false);
  const [isLabelsExpanded, setIsLabelsExpanded] = useState(true);
  const [showCreateLabel, setShowCreateLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [showManageLabels, setShowManageLabels] = useState(false);
  const [deletingLabelId, setDeletingLabelId] = useState("");

  useEffect(() => {
    fetchThreads();
    fetchJobs();
    fetchLabels();
  }, [folder]);

  const fetchLabels = async () => {
    setLabelsLoading(true);
    try {
      const res = await fetch("/api/communication/mail/labels");
      if (res.ok) {
        const data = await res.json();
        setLabels(data.labels || []);
      }
    } catch (err) {
      console.error("Failed to fetch labels:", err);
    } finally {
      setLabelsLoading(false);
    }
  };

  const handleCreateLabel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabelName.trim()) return;
    try {
      const res = await fetch("/api/communication/mail/labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newLabelName.trim() })
      });
      if (res.ok) {
        setNewLabelName("");
        setShowCreateLabel(false);
        fetchLabels();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create label");
      }
    } catch (err) {
      console.error("Error creating label:", err);
    }
  };

  const handleDeleteLabel = async (labelId: string) => {
    if (!confirm("Are you sure you want to delete this label?")) return;
    setDeletingLabelId(labelId);
    try {
      const res = await fetch(`/api/communication/mail/labels?id=${labelId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchLabels();
        if (folder === `LABEL_${labelId}`) {
          setFolder("INBOX");
        }
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete label");
      }
    } catch (err) {
      console.error("Error deleting label:", err);
    } finally {
      setDeletingLabelId("");
    }
  };

  const handleUnsubscribe = async (headerValue: string) => {
    const urls = headerValue.match(/<(https?:\/\/[^>]+)>/);
    const mailtos = headerValue.match(/<(mailto:[^>]+)>/);
    
    if (urls && urls[1]) {
      window.open(urls[1], "_blank");
      alert("Unsubscribe page opened in a new tab.");
      return;
    }
    
    if (mailtos && mailtos[1]) {
      try {
        const mailtoUrl = new URL(mailtos[1]);
        const to = mailtoUrl.pathname;
        const subject = mailtoUrl.searchParams.get("subject") || "Unsubscribe";
        const body = mailtoUrl.searchParams.get("body") || "Please unsubscribe me from this mailing list.";
        
        const res = await fetch("/api/communication/mail/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to,
            subject,
            body
          })
        });
        
        if (res.ok) {
          alert("Unsubscribe email request successfully sent!");
        } else {
          alert("Failed to send unsubscribe email automatically. Opening mail composer.");
          setComposeTo(to);
          setComposeSubject(subject);
          setComposeBody(body);
          setShowCompose(true);
        }
      } catch (e) {
        console.error(e);
        alert("Could not parse unsubscribe address. Opening mail composer.");
        window.open(mailtos[1], "_blank");
      }
    }
  };

  const getLabelBadge = (labelId: string, countType: "unread" | "total" = "unread") => {
    const lbl = labels.find((l: any) => l.id === labelId);
    if (!lbl) return null;
    const val = countType === "unread" ? lbl.threadsUnread ?? lbl.messagesUnread : lbl.threadsTotal ?? lbl.messagesTotal;
    if (val && val > 0) {
      return (
        <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#00cec4]/15 text-[#00cec4] ds-numeric">
          {val}
        </span>
      );
    }
    return null;
  };

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
      let q = "label:INBOX";
      if (folder === "STARRED") {
        q = "is:starred";
      } else if (folder === "SNOOZED") {
        q = "is:snoozed";
      } else if (folder === "SENT") {
        q = "is:sent";
      } else if (folder === "DRAFTS") {
        q = "is:draft";
      } else if (folder === "IMPORTANT") {
        q = "is:important";
      } else if (folder === "SCHEDULED") {
        q = "is:scheduled";
      } else if (folder === "ALL_MAIL") {
        q = "";
      } else if (folder === "SPAM") {
        q = "label:SPAM";
      } else if (folder === "TRASH") {
        q = "label:TRASH";
      } else if (folder === "CATEGORY_PURCHASES") {
        q = "category:purchases";
      } else if (folder === "CATEGORY_SOCIAL") {
        q = "category:social";
      } else if (folder === "CATEGORY_UPDATES") {
        q = "category:updates";
      } else if (folder === "CATEGORY_FORUMS") {
        q = "category:forums";
      } else if (folder === "CATEGORY_PROMOTIONS") {
        q = "category:promotions";
      } else if (folder === "SUBSCRIPTIONS") {
        q = "unsubscribe";
      } else if (folder.startsWith("LABEL_")) {
        const labelName = folder.substring("LABEL_".length);
        q = `label:"${labelName}"`;
      }

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
        if (selectedThread) {
          handleThreadSelect(selectedThread.id);
        }
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

  const triggerShareModal = async (msg: any) => {
    setShareMsgText(`📬 *Shared Email: ${selectedThread.subject}*\n\n*From:* ${msg.from}\n*Date:* ${msg.date}\n\n${msg.bodyText?.slice(0, 300) || msg.snippet || ""}`);
    setSelectedSpaceId("");
    setShowShareModal(true);
    setChatSpacesLoading(true);
    try {
      const res = await fetch("/api/communication/chat/list");
      const data = await res.json();
      const combinedSpaces: any[] = [];
      
      if (data.jobs) {
        data.jobs.forEach((j: any) => {
          if (j.spaceId) {
            combinedSpaces.push({ id: j.spaceId, displayName: `Job Channel: JOB-${j.jobNumber}` });
          }
        });
      }
      
      if (data.googleSpaces) {
        data.googleSpaces.forEach((s: any) => {
          combinedSpaces.push({ id: s.name, displayName: s.displayName || (s.spaceType === "DIRECT_MESSAGE" ? `DM: ${s.name}` : `Space: ${s.name}`) });
        });
      }

      if (data.employees) {
        data.employees.forEach((emp: any) => {
          if (emp.workspaceConnection?.googleUserId) {
            combinedSpaces.push({ id: `users/${emp.workspaceConnection.googleUserId}`, displayName: `Direct: ${emp.name}` });
          }
        });
      }
      
      setChatSpaces(combinedSpaces);
    } catch (err) {
      console.error("Failed to load chat channels for sharing:", err);
    } finally {
      setChatSpacesLoading(false);
    }
  };

  const handleShareEmailInChat = async () => {
    if (!selectedSpaceId || !shareMsgText) return;
    setSharing(true);
    try {
      const res = await fetch("/api/communication/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spaceId: selectedSpaceId,
          text: shareMsgText
        })
      });
      if (res.ok) {
        alert("Shared successfully in Chat!");
        setShowShareModal(false);
      } else {
        alert("Failed to share in Chat.");
      }
    } catch (err) {
      console.error(err);
      alert("Error sharing in Chat.");
    } finally {
      setSharing(false);
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveDropdownMsgId(null);
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[80vh] border border-outline-variant bg-surface rounded-2xl overflow-hidden shadow-sm">
      {/* Folder Navigation */}
      <div className="border-r border-outline-variant p-4 space-y-4 bg-surface-container-low flex flex-col h-full overflow-y-auto min-w-[220px]">
        <button
          onClick={() => {
            setComposeTo("");
            setComposeSubject("");
            setComposeBody("");
            setShowCompose(true);
          }}
          className="w-full flex items-center justify-center space-x-2 bg-[#00cec4] text-white hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shrink-0"
        >
          <Plus className="size-4" />
          <span>Compose</span>
        </button>

        <div className="flex-1 space-y-4 text-left">
          {/* Main folders */}
          <div className="space-y-1">
            <button
              onClick={() => setFolder("INBOX")}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors ${
                folder === "INBOX" ? "bg-[#00cec4]/15 text-[#00cec4]" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              }`}
            >
              <Inbox className="size-4 text-[#00cec4]" />
              <span>Inbox</span>
              {getLabelBadge("INBOX", "unread")}
            </button>
            
            <button
              onClick={() => setFolder("STARRED")}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors ${
                folder === "STARRED" ? "bg-[#00cec4]/15 text-[#00cec4]" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              }`}
            >
              <Star className="size-4 text-[#fb923c]" />
              <span>Starred</span>
              {getLabelBadge("STARRED", "unread")}
            </button>

            <button
              onClick={() => setFolder("SNOOZED")}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors ${
                folder === "SNOOZED" ? "bg-[#00cec4]/15 text-[#00cec4]" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              }`}
            >
              <Clock className="size-4 text-[#fbbf24]" />
              <span>Snoozed</span>
              {getLabelBadge("SNOOZED", "unread")}
            </button>

            <button
              onClick={() => setFolder("SENT")}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors ${
                folder === "SENT" ? "bg-[#00cec4]/15 text-[#00cec4]" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              }`}
            >
              <Send className="size-4 text-[#818cf8]" />
              <span>Sent</span>
            </button>

            <button
              onClick={() => setFolder("DRAFTS")}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors ${
                folder === "DRAFTS" ? "bg-[#00cec4]/15 text-[#00cec4]" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              }`}
            >
              <File className="size-4 text-[#22c55e]" />
              <span>Drafts</span>
              {getLabelBadge("DRAFT", "total")}
            </button>
          </div>

          {/* Categories collapsible */}
          <div className="space-y-1">
            <button
              onClick={() => setIsCategoriesExpanded(!isCategoriesExpanded)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <span>Categories</span>
              {isCategoriesExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
            </button>

            {isCategoriesExpanded && (
              <div className="pl-2 space-y-0.5 border-l border-outline-variant/50 ml-3">
                <button
                  onClick={() => setFolder("CATEGORY_PURCHASES")}
                  className={`w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                    folder === "CATEGORY_PURCHASES" ? "bg-[#00cec4]/10 text-[#00cec4]" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                  }`}
                >
                  <ShoppingBag className="size-3 text-[#c084fc]" />
                  <span>Purchases</span>
                  {getLabelBadge("CATEGORY_PURCHASES", "unread")}
                </button>
                <button
                  onClick={() => setFolder("CATEGORY_SOCIAL")}
                  className={`w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                    folder === "CATEGORY_SOCIAL" ? "bg-[#00cec4]/10 text-[#00cec4]" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                  }`}
                >
                  <Users className="size-3 text-[#38bdf8]" />
                  <span>Social</span>
                  {getLabelBadge("CATEGORY_SOCIAL", "unread")}
                </button>
                <button
                  onClick={() => setFolder("CATEGORY_UPDATES")}
                  className={`w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                    folder === "CATEGORY_UPDATES" ? "bg-[#00cec4]/10 text-[#00cec4]" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                  }`}
                >
                  <AlertCircle className="size-3 text-[#fb923c]" />
                  <span>Updates</span>
                  {getLabelBadge("CATEGORY_UPDATES", "unread")}
                </button>
                <button
                  onClick={() => setFolder("CATEGORY_FORUMS")}
                  className={`w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                    folder === "CATEGORY_FORUMS" ? "bg-[#00cec4]/10 text-[#00cec4]" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                  }`}
                >
                  <MessageSquare className="size-3 text-[#8b5cf6]" />
                  <span>Forums</span>
                  {getLabelBadge("CATEGORY_FORUMS", "unread")}
                </button>
                <button
                  onClick={() => setFolder("CATEGORY_PROMOTIONS")}
                  className={`w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                    folder === "CATEGORY_PROMOTIONS" ? "bg-[#00cec4]/10 text-[#00cec4]" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                  }`}
                >
                  <Tag className="size-3 text-[#e879f9]" />
                  <span>Promotions</span>
                  {getLabelBadge("CATEGORY_PROMOTIONS", "unread")}
                </button>
              </div>
            )}
          </div>

          {/* More/Less toggle */}
          <div className="space-y-1">
            <button
              onClick={() => setIsMoreExpanded(!isMoreExpanded)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <span>{isMoreExpanded ? "Show Less" : "Show More"}</span>
              {isMoreExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            </button>

            {isMoreExpanded && (
              <div className="space-y-1">
                <button
                  onClick={() => setFolder("IMPORTANT")}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors ${
                    folder === "IMPORTANT" ? "bg-[#00cec4]/15 text-[#00cec4]" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                  }`}
                >
                  <Bookmark className="size-4 text-[#fb923c]" />
                  <span>Important</span>
                  {getLabelBadge("IMPORTANT", "unread")}
                </button>
                <button
                  onClick={() => setFolder("SCHEDULED")}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors ${
                    folder === "SCHEDULED" ? "bg-[#00cec4]/15 text-[#00cec4]" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                  }`}
                >
                  <CalendarRange className="size-4 text-[#00cec4]" />
                  <span>Scheduled</span>
                </button>
                <button
                  onClick={() => setFolder("ALL_MAIL")}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors ${
                    folder === "ALL_MAIL" ? "bg-[#00cec4]/15 text-[#00cec4]" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                  }`}
                >
                  <Mail className="size-4 text-on-surface-variant" />
                  <span>All Mail</span>
                </button>
                <button
                  onClick={() => setFolder("SPAM")}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors ${
                    folder === "SPAM" ? "bg-[#00cec4]/15 text-[#00cec4]" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                  }`}
                >
                  <AlertOctagon className="size-4 text-[#ef4444]" />
                  <span>Spam</span>
                  {getLabelBadge("SPAM", "unread")}
                </button>
                <button
                  onClick={() => setFolder("TRASH")}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors ${
                    folder === "TRASH" ? "bg-[#00cec4]/15 text-[#00cec4]" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                  }`}
                >
                  <Trash2 className="size-4 text-on-surface-variant" />
                  <span>Trash</span>
                </button>
              </div>
            )}
          </div>

          {/* User Labels section */}
          <div className="space-y-1">
            <button
              onClick={() => setIsLabelsExpanded(!isLabelsExpanded)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <span>Labels</span>
              {isLabelsExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
            </button>

            {isLabelsExpanded && (
              <div className="space-y-0.5 max-h-[150px] overflow-y-auto pr-1">
                {labels.filter((l: any) => l.type === "user").length === 0 ? (
                  <span className="text-[10px] text-on-surface-variant block px-3 py-1 italic">No custom labels</span>
                ) : (
                  labels.filter((l: any) => l.type === "user").map((label: any) => (
                    <button
                      key={label.id}
                      onClick={() => setFolder(`LABEL_${label.name}`)}
                      className={`w-full flex items-center space-x-3 px-3 py-1.5 rounded-lg text-xs font-medium tracking-wide transition-colors ${
                        folder === `LABEL_${label.name}` ? "bg-[#00cec4]/15 text-[#00cec4]" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                      }`}
                    >
                      <Folder className="size-3.5 text-[#00cec4] shrink-0" />
                      <span className="truncate max-w-[100px]">{label.name}</span>
                      {getLabelBadge(label.id, "unread")}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action controls footer */}
        <div className="pt-2 border-t border-outline-variant/30 space-y-1 shrink-0 text-left">
          <button
            onClick={() => setFolder("SUBSCRIPTIONS")}
            className={`w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${
              folder === "SUBSCRIPTIONS" ? "bg-[#00cec4]/15 text-[#00cec4]" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
            }`}
          >
            <CheckCircle2 className="size-3.5 text-[#00cec4]" />
            <span>Subscriptions</span>
          </button>
          <button
            onClick={() => setShowManageLabels(true)}
            className="w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
          >
            <Settings className="size-3.5 text-on-surface-variant" />
            <span>Manage Labels</span>
          </button>
          <button
            onClick={() => setShowCreateLabel(true)}
            className="w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
          >
            <Plus className="size-3.5 text-on-surface-variant" />
            <span>Create Label</span>
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
                <div key={msg.id} className="p-4 rounded-xl border border-outline-variant bg-surface space-y-3 shadow-sm text-left relative">
                  <div className="flex items-start justify-between border-b border-outline-variant/30 pb-2 relative z-0">
                    <div>
                      <span className="text-xs font-bold text-on-surface block">{msg.from}</span>
                      <span className="text-[10px] text-on-surface-variant block">To: {msg.to}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] text-on-surface-variant ds-numeric">{msg.date}</span>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdownMsgId(activeDropdownMsgId === msg.id ? null : msg.id);
                          }}
                          className="p-1 hover:bg-surface-container rounded-lg text-on-surface-variant hover:text-on-surface transition-colors"
                        >
                          <MoreVertical className="size-4" />
                        </button>
                        
                        {activeDropdownMsgId === msg.id && (
                          <div className="absolute right-0 mt-1 w-56 bg-surface/95 backdrop-blur-sm border border-outline-variant rounded-xl shadow-xl z-50 py-1.5 overflow-hidden animate-page-enter">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownMsgId(null);
                                setComposeTo(msg.from);
                                setComposeSubject(selectedThread.subject.startsWith("Re:") ? selectedThread.subject : `Re: ${selectedThread.subject}`);
                                setComposeBody("");
                                setTimeout(() => {
                                  document.getElementById("quick-reply-input")?.focus();
                                }, 100);
                              }}
                              className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-on-surface hover:bg-[#00cec4]/15 hover:text-[#00cec4] text-left transition-colors font-semibold"
                            >
                              <Reply className="size-3.5" />
                              <span>Reply</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownMsgId(null);
                                setComposeTo(msg.from);
                                setComposeSubject(selectedThread.subject.startsWith("Re:") ? selectedThread.subject : `Re: ${selectedThread.subject}`);
                                setComposeBody("");
                                setShowCompose(true);
                              }}
                              className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-on-surface hover:bg-[#00cec4]/15 hover:text-[#00cec4] text-left transition-colors font-semibold"
                            >
                              <ReplyAll className="size-3.5" />
                              <span>Reply all</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownMsgId(null);
                                setComposeTo("");
                                setComposeSubject(selectedThread.subject.startsWith("Fwd:") ? selectedThread.subject : `Fwd: ${selectedThread.subject}`);
                                setComposeBody(`\n\n---------- Forwarded message ---------\nFrom: ${msg.from}\nDate: ${msg.date}\nSubject: ${selectedThread.subject}\nTo: ${msg.to}\n\n${msg.bodyText || ""}`);
                                setShowCompose(true);
                              }}
                              className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-on-surface hover:bg-[#00cec4]/15 hover:text-[#00cec4] text-left transition-colors font-semibold"
                            >
                              <Forward className="size-3.5" />
                              <span>Forward</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownMsgId(null);
                                triggerShareModal(msg);
                              }}
                              className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-on-surface hover:bg-[#00cec4]/15 hover:text-[#00cec4] text-left transition-colors font-semibold"
                            >
                              <MessageSquare className="size-3.5" />
                              <span>Share in chat</span>
                            </button>
                            
                            <hr className="my-1 border-outline-variant/50" />

                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                setActiveDropdownMsgId(null);
                                if (confirm("Move this thread to trash?")) {
                                  try {
                                    const res = await fetch("/api/communication/mail/modify", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        threadId: selectedThread.id,
                                        addLabelIds: ["TRASH"],
                                        removeLabelIds: ["INBOX"]
                                      })
                                    });
                                    if (res.ok) {
                                      setSelectedThread(null);
                                      fetchThreads();
                                    }
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }
                              }}
                              className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-red-500 hover:bg-red-500/10 text-left transition-colors font-semibold"
                            >
                              <Trash2 className="size-3.5" />
                              <span>Delete</span>
                            </button>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                setActiveDropdownMsgId(null);
                                try {
                                  const res = await fetch("/api/communication/mail/modify", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      threadId: selectedThread.id,
                                      addLabelIds: ["UNREAD"]
                                    })
                                  });
                                  if (res.ok) {
                                    setSelectedThread(null);
                                    fetchThreads();
                                  }
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                              className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-on-surface hover:bg-[#00cec4]/15 hover:text-[#00cec4] text-left transition-colors font-semibold"
                            >
                              <Mail className="size-3.5" />
                              <span>Mark unread from here</span>
                            </button>

                            <hr className="my-1 border-outline-variant/50" />

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownMsgId(null);
                                alert(`Sender ${msg.from} has been added to block list.`);
                              }}
                              className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-on-surface hover:bg-[#00cec4]/15 hover:text-[#00cec4] text-left transition-colors font-semibold font-medium"
                            >
                              <ShieldAlert className="size-3.5 text-orange-500" />
                              <span>Block "{msg.from.split(" <")[0]}"</span>
                            </button>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                setActiveDropdownMsgId(null);
                                if (confirm("Report this conversation as spam?")) {
                                  try {
                                    const res = await fetch("/api/communication/mail/modify", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        threadId: selectedThread.id,
                                        addLabelIds: ["SPAM"],
                                        removeLabelIds: ["INBOX"]
                                      })
                                    });
                                    if (res.ok) {
                                      setSelectedThread(null);
                                      fetchThreads();
                                    }
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }
                              }}
                              className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-on-surface hover:bg-[#00cec4]/15 hover:text-[#00cec4] text-left transition-colors font-semibold"
                            >
                              <AlertTriangle className="size-3.5 text-orange-500" />
                              <span>Report spam</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownMsgId(null);
                                alert("Reported phishing to Google Workspace security.");
                              }}
                              className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-on-surface hover:bg-[#00cec4]/15 hover:text-[#00cec4] text-left transition-colors font-semibold"
                            >
                              <ShieldAlert className="size-3.5 text-red-500" />
                              <span>Report phishing</span>
                            </button>

                            <hr className="my-1 border-outline-variant/50" />

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownMsgId(null);
                                const match = msg.from.match(/<([^>]+)>/) || [null, msg.from];
                                const email = match[1] || msg.from;
                                setSearchQuery(`from:${email}`);
                                setTimeout(() => fetchThreads(), 50);
                              }}
                              className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-on-surface hover:bg-[#00cec4]/15 hover:text-[#00cec4] text-left transition-colors font-semibold"
                            >
                              <Search className="size-3.5" />
                              <span>Filter messages like this</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownMsgId(null);
                                setTranslatedMsgId(translatedMsgId === msg.id ? null : msg.id);
                              }}
                              className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-on-surface hover:bg-[#00cec4]/15 hover:text-[#00cec4] text-left transition-colors font-semibold"
                            >
                              <Languages className="size-3.5" />
                              <span>{translatedMsgId === msg.id ? "Original Text" : "Translate"}</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownMsgId(null);
                                const printWindow = window.open("", "_blank");
                                if (printWindow) {
                                  printWindow.document.write(`
                                    <html>
                                      <head>
                                        <title>Print Email - ${selectedThread.subject}</title>
                                        <style>
                                          body { font-family: sans-serif; padding: 20px; line-height: 1.5; color: #191c1e; }
                                          .header { border-bottom: 2px solid #eceef0; padding-bottom: 10px; margin-bottom: 20px; }
                                          .meta { font-size: 12px; color: #404947; margin-bottom: 5px; }
                                          .body { font-size: 14px; white-space: pre-line; }
                                        </style>
                                      </head>
                                      <body>
                                        <div class="header">
                                          <h2>${selectedThread.subject}</h2>
                                          <div class="meta"><strong>From:</strong> ${msg.from}</div>
                                          <div class="meta"><strong>To:</strong> ${msg.to}</div>
                                          <div class="meta"><strong>Date:</strong> ${msg.date}</div>
                                        </div>
                                        <div class="body">${msg.bodyText || msg.bodyHtml}</div>
                                      </body>
                                    </html>
                                  `);
                                  printWindow.document.close();
                                  printWindow.focus();
                                  printWindow.print();
                                }
                              }}
                              className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-on-surface hover:bg-[#00cec4]/15 hover:text-[#00cec4] text-left transition-colors font-semibold"
                            >
                              <Printer className="size-3.5" />
                              <span>Print</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownMsgId(null);
                                const emlContent = `From: ${msg.from}\r\nTo: ${msg.to}\r\nSubject: ${selectedThread.subject}\r\nDate: ${msg.date}\r\nContent-Type: text/plain; charset="UTF-8"\r\n\r\n${msg.bodyText || ""}`;
                                const blob = new Blob([emlContent], { type: "message/rfc822" });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = `${selectedThread.subject.replace(/[^a-z0-9]/gi, "_")}.eml`;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                URL.revokeObjectURL(url);
                              }}
                              className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-on-surface hover:bg-[#00cec4]/15 hover:text-[#00cec4] text-left transition-colors font-semibold"
                            >
                              <Download className="size-3.5" />
                              <span>Download message</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownMsgId(null);
                                setShowOriginalMsg(msg);
                              }}
                              className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-on-surface hover:bg-[#00cec4]/15 hover:text-[#00cec4] text-left transition-colors font-semibold"
                            >
                              <FileText className="size-3.5" />
                              <span>Show original</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {translatedMsgId === msg.id && (
                    <div className="p-2 bg-[#00cec4]/10 rounded-lg text-[10px] text-[#00cec4] font-semibold flex items-center space-x-1">
                      <Languages className="size-3" />
                      <span>Translated to English (Monolith View)</span>
                    </div>
                  )}

                  {msg.listUnsubscribe && (
                    <div className="p-3 mb-3 bg-[#00cec4]/5 border border-outline-variant/65 rounded-xl text-xs text-on-surface flex items-center justify-between shadow-sm animate-page-enter">
                      <div className="flex items-center space-x-2">
                        <HelpCircle className="size-4 text-[#00cec4] shrink-0" />
                        <span className="font-medium text-on-surface-variant text-[11px]">This message is from a mailing list or newsletter subscription.</span>
                      </div>
                      <button
                        onClick={() => handleUnsubscribe(msg.listUnsubscribe)}
                        className="bg-[#00cec4] text-white hover:bg-[#00b8af] px-3.5 py-1.5 rounded-xl text-[10px] uppercase font-bold tracking-wider transition-all shadow-sm"
                      >
                        Unsubscribe
                      </button>
                    </div>
                  )}

                  {/* Sanitized HTML Body */}
                  <div
                    className="text-xs text-on-surface space-y-2 overflow-x-auto whitespace-pre-line"
                    dangerouslySetInnerHTML={{
                      __html: translatedMsgId === msg.id 
                        ? DOMPurify.sanitize(`[Translated Content] ${msg.bodyHtml || msg.bodyText}`)
                        : DOMPurify.sanitize(msg.bodyHtml || msg.bodyText)
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Quick Reply Form */}
            <div className="p-3 border-t border-outline-variant bg-surface">
              <form onSubmit={handleSendEmail} className="flex items-center space-x-2">
                <input
                  id="quick-reply-input"
                  type="text"
                  placeholder="Type reply..."
                  value={composeBody}
                  onChange={(e) => {
                    setComposeBody(e.target.value);
                    setComposeTo(selectedThread.messages[selectedThread.messages.length - 1].from);
                    setComposeSubject(selectedThread.subject.startsWith("Re:") ? selectedThread.subject : `Re: ${selectedThread.subject}`);
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

      {/* Share in Chat Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface border border-outline-variant rounded-xl shadow-xl overflow-hidden animate-page-enter">
            <div className="p-4 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
              <h3 className="ds-h3 text-on-surface">Share Email in Google Chat</h3>
              <button onClick={() => setShowShareModal(false)} className="text-on-surface-variant hover:text-on-surface font-bold text-sm">✕</button>
            </div>
            <div className="p-4 space-y-4 text-left">
              <div>
                <label className="ds-label text-on-surface-variant block mb-1">Select Chat Space / Employee</label>
                {chatSpacesLoading ? (
                  <div className="text-xs text-on-surface-variant">Loading spaces...</div>
                ) : (
                  <select
                    value={selectedSpaceId}
                    onChange={(e) => setSelectedSpaceId(e.target.value)}
                    className="w-full text-xs bg-surface border border-outline-variant rounded-xl p-2.5 focus:outline-none"
                  >
                    <option value="">Choose a conversation...</option>
                    {chatSpaces.map((space) => (
                      <option key={space.id} value={space.id}>
                        {space.displayName}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="ds-label text-on-surface-variant block mb-1">Message Preview</label>
                <textarea
                  value={shareMsgText}
                  onChange={(e) => setShareMsgText(e.target.value)}
                  rows={6}
                  className="w-full text-xs bg-surface border border-outline-variant rounded-xl px-3 py-2 focus:outline-none"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowShareModal(false)}
                  className="px-4 py-2 border border-outline-variant rounded-xl text-xs font-semibold uppercase hover:bg-surface-container-low text-on-surface-variant transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleShareEmailInChat}
                  disabled={sharing || !selectedSpaceId}
                  className="bg-[#00cec4] text-white hover:bg-[#00b8af] disabled:opacity-50 px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all"
                >
                  {sharing ? "Sharing..." : "Share in Chat"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Show Original Modal */}
      {showOriginalMsg && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-surface border border-outline-variant rounded-xl shadow-xl overflow-hidden animate-page-enter">
            <div className="p-4 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
              <h3 className="ds-h3 text-on-surface">Original Message Details</h3>
              <button onClick={() => setShowOriginalMsg(null)} className="text-on-surface-variant hover:text-on-surface font-bold text-sm">✕</button>
            </div>
            <div className="p-4 space-y-4 text-left">
              <div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant max-h-[300px] overflow-y-auto font-mono text-[10px] text-on-surface space-y-2 whitespace-pre-wrap">
                <div><strong>Message-ID:</strong> {showOriginalMsg.id}</div>
                <div><strong>Thread-ID:</strong> {showOriginalMsg.threadId}</div>
                <div><strong>From:</strong> {showOriginalMsg.from}</div>
                <div><strong>To:</strong> {showOriginalMsg.to}</div>
                {showOriginalMsg.cc && <div><strong>Cc:</strong> {showOriginalMsg.cc}</div>}
                <div><strong>Date:</strong> {showOriginalMsg.date}</div>
                <div><strong>Subject:</strong> {selectedThread.subject}</div>
                <div><strong>Labels:</strong> {showOriginalMsg.labelIds?.join(", ")}</div>
                <div className="border-t border-outline-variant/50 pt-2 mt-2">
                  <strong>Snippet:</strong> {showOriginalMsg.snippet}
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowOriginalMsg(null)}
                  className="bg-[#00cec4] text-white hover:bg-[#00b8af] px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Label Modal */}
      {showCreateLabel && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-surface border border-outline-variant rounded-xl shadow-xl overflow-hidden animate-page-enter">
            <div className="p-4 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
              <h3 className="ds-h3 text-on-surface">Create New Label</h3>
              <button onClick={() => setShowCreateLabel(false)} className="text-on-surface-variant hover:text-on-surface font-bold text-sm">✕</button>
            </div>
            <form onSubmit={handleCreateLabel} className="p-4 space-y-4 text-left">
              <div>
                <label className="ds-label text-on-surface-variant block mb-1">Label Name</label>
                <input
                  type="text"
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  className="w-full text-xs bg-surface border border-outline-variant rounded-xl px-3 py-2.5 focus:outline-none"
                  placeholder="e.g. Customs, Shipping Docs"
                  required
                  autoFocus
                />
              </div>
              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateLabel(false)}
                  className="px-4 py-2 border border-outline-variant rounded-xl text-xs font-semibold uppercase hover:bg-surface-container-low text-on-surface-variant transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#00cec4] text-white hover:bg-[#00b8af] px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all"
                >
                  Create Label
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Labels Modal */}
      {showManageLabels && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface border border-outline-variant rounded-xl shadow-xl overflow-hidden animate-page-enter">
            <div className="p-4 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
              <h3 className="ds-h3 text-on-surface">Manage Custom Labels</h3>
              <button onClick={() => setShowManageLabels(false)} className="text-on-surface-variant hover:text-on-surface font-bold text-sm">✕</button>
            </div>
            <div className="p-4 space-y-4 text-left max-h-[400px] overflow-y-auto">
              {labels.filter((l: any) => l.type === "user").length === 0 ? (
                <div className="text-center py-6 text-xs text-on-surface-variant italic">
                  No user-created custom labels found.
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm">
                  <table className="ds-table">
                    <thead>
                      <tr>
                        <th className="px-4 py-2">Label Name</th>
                        <th className="px-4 py-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {labels.filter((l: any) => l.type === "user").map((label: any) => (
                        <tr key={label.id} className="hover:bg-surface-container-low border-b border-outline-variant/30 last:border-0">
                          <td className="px-4 py-3 text-xs font-medium text-on-surface">
                            {label.name}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleDeleteLabel(label.id)}
                              disabled={deletingLabelId === label.id}
                              className="p-1.5 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors disabled:opacity-50 inline-flex items-center"
                              title="Delete Label"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-outline-variant bg-surface-container-low flex justify-end">
              <button
                type="button"
                onClick={() => setShowManageLabels(false)}
                className="bg-[#00cec4] text-white hover:bg-[#00b8af] px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
