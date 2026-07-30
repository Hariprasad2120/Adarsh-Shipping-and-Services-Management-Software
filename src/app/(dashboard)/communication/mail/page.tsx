"use client";

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/immutability, react-hooks/exhaustive-deps, react/no-unescaped-entities */

import { NativeSelect } from "@/components/ui/native-select";
import {
  CommunicationButton,
  CommunicationInput,
  CommunicationTable,
  CommunicationTextarea,
} from "@/modules/communication/components/workspace/communication-workspace";
import { WorkspaceDialogLayer } from "@/components/layout/workspace-dialog";
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
        <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--mnx-accent-text)]/15 text-[var(--mnx-accent-text)] mnx-numeric">
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
    <div data-communication-mail="true" className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[80vh] border border-mono-border bg-mono-card rounded-2xl overflow-hidden shadow-sm">
      {/* Folder Navigation */}
      <div data-communication-mail-folders="true" className="border-r border-mono-border p-4 space-y-4 bg-mono-soft flex flex-col h-full overflow-y-auto min-w-[220px]">
        <CommunicationButton
          onClick={() => {
            setComposeTo("");
            setComposeSubject("");
            setComposeBody("");
            setShowCompose(true);
          }}
          className="w-full flex items-center justify-center space-x-2 bg-[var(--mnx-accent-text)] text-[var(--mnx-accent-contrast)] hover:bg-[var(--mnx-accent)] hover:shadow-ambient-hover py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shrink-0"
        >
          <Plus className="size-4" />
          <span>Compose</span>
        </CommunicationButton>

        <div className="flex-1 space-y-4 text-left">
          {/* Main folders */}
          <div className="space-y-1">
            <CommunicationButton
              onClick={() => setFolder("INBOX")}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors ${
                folder === "INBOX" ? "bg-[var(--mnx-accent-text)]/15 text-[var(--mnx-accent-text)]" : "text-mono-muted hover:bg-mono-soft hover:text-mono-text"
              }`}
            >
              <Inbox className="size-4 text-[var(--mnx-accent-text)]" />
              <span>Inbox</span>
              {getLabelBadge("INBOX", "unread")}
            </CommunicationButton>
            
            <CommunicationButton
              onClick={() => setFolder("STARRED")}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors ${
                folder === "STARRED" ? "bg-[var(--mnx-accent-text)]/15 text-[var(--mnx-accent-text)]" : "text-mono-muted hover:bg-mono-soft hover:text-mono-text"
              }`}
            >
              <Star className="size-4 text-[var(--mnx-warning)]" />
              <span>Starred</span>
              {getLabelBadge("STARRED", "unread")}
            </CommunicationButton>

            <CommunicationButton
              onClick={() => setFolder("SNOOZED")}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors ${
                folder === "SNOOZED" ? "bg-[var(--mnx-accent-text)]/15 text-[var(--mnx-accent-text)]" : "text-mono-muted hover:bg-mono-soft hover:text-mono-text"
              }`}
            >
              <Clock className="size-4 text-[var(--mnx-warning)]" />
              <span>Snoozed</span>
              {getLabelBadge("SNOOZED", "unread")}
            </CommunicationButton>

            <CommunicationButton
              onClick={() => setFolder("SENT")}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors ${
                folder === "SENT" ? "bg-[var(--mnx-accent-text)]/15 text-[var(--mnx-accent-text)]" : "text-mono-muted hover:bg-mono-soft hover:text-mono-text"
              }`}
            >
              <Send className="size-4 text-[var(--mnx-info)]" />
              <span>Sent</span>
            </CommunicationButton>

            <CommunicationButton
              onClick={() => setFolder("DRAFTS")}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors ${
                folder === "DRAFTS" ? "bg-[var(--mnx-accent-text)]/15 text-[var(--mnx-accent-text)]" : "text-mono-muted hover:bg-mono-soft hover:text-mono-text"
              }`}
            >
              <File className="size-4 text-[var(--mnx-success)]" />
              <span>Drafts</span>
              {getLabelBadge("DRAFT", "total")}
            </CommunicationButton>
          </div>

          {/* Categories collapsible */}
          <div className="space-y-1">
            <CommunicationButton
              onClick={() => setIsCategoriesExpanded(!isCategoriesExpanded)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider text-mono-muted hover:text-mono-text transition-colors"
            >
              <span>Categories</span>
              {isCategoriesExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
            </CommunicationButton>

            {isCategoriesExpanded && (
              <div className="pl-2 space-y-0.5 border-l border-mono-border/50 ml-3">
                <CommunicationButton
                  onClick={() => setFolder("CATEGORY_PURCHASES")}
                  className={`w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                    folder === "CATEGORY_PURCHASES" ? "bg-[var(--mnx-accent-text)]/10 text-[var(--mnx-accent-text)]" : "text-mono-muted hover:bg-mono-soft hover:text-mono-text"
                  }`}
                >
                  <ShoppingBag className="size-3 text-[var(--mnx-accent)]" />
                  <span>Purchases</span>
                  {getLabelBadge("CATEGORY_PURCHASES", "unread")}
                </CommunicationButton>
                <CommunicationButton
                  onClick={() => setFolder("CATEGORY_SOCIAL")}
                  className={`w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                    folder === "CATEGORY_SOCIAL" ? "bg-[var(--mnx-accent-text)]/10 text-[var(--mnx-accent-text)]" : "text-mono-muted hover:bg-mono-soft hover:text-mono-text"
                  }`}
                >
                  <Users className="size-3 text-[var(--mnx-info)]" />
                  <span>Social</span>
                  {getLabelBadge("CATEGORY_SOCIAL", "unread")}
                </CommunicationButton>
                <CommunicationButton
                  onClick={() => setFolder("CATEGORY_UPDATES")}
                  className={`w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                    folder === "CATEGORY_UPDATES" ? "bg-[var(--mnx-accent-text)]/10 text-[var(--mnx-accent-text)]" : "text-mono-muted hover:bg-mono-soft hover:text-mono-text"
                  }`}
                >
                  <AlertCircle className="size-3 text-[var(--mnx-warning)]" />
                  <span>Updates</span>
                  {getLabelBadge("CATEGORY_UPDATES", "unread")}
                </CommunicationButton>
                <CommunicationButton
                  onClick={() => setFolder("CATEGORY_FORUMS")}
                  className={`w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                    folder === "CATEGORY_FORUMS" ? "bg-[var(--mnx-accent-text)]/10 text-[var(--mnx-accent-text)]" : "text-mono-muted hover:bg-mono-soft hover:text-mono-text"
                  }`}
                >
                  <MessageSquare className="size-3 text-[var(--mnx-accent)]" />
                  <span>Forums</span>
                  {getLabelBadge("CATEGORY_FORUMS", "unread")}
                </CommunicationButton>
                <CommunicationButton
                  onClick={() => setFolder("CATEGORY_PROMOTIONS")}
                  className={`w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                    folder === "CATEGORY_PROMOTIONS" ? "bg-[var(--mnx-accent-text)]/10 text-[var(--mnx-accent-text)]" : "text-mono-muted hover:bg-mono-soft hover:text-mono-text"
                  }`}
                >
                  <Tag className="size-3 text-[var(--mnx-accent)]" />
                  <span>Promotions</span>
                  {getLabelBadge("CATEGORY_PROMOTIONS", "unread")}
                </CommunicationButton>
              </div>
            )}
          </div>

          {/* More/Less toggle */}
          <div className="space-y-1">
            <CommunicationButton
              onClick={() => setIsMoreExpanded(!isMoreExpanded)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider text-mono-muted hover:text-mono-text transition-colors"
            >
              <span>{isMoreExpanded ? "Show Less" : "Show More"}</span>
              {isMoreExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            </CommunicationButton>

            {isMoreExpanded && (
              <div className="space-y-1">
                <CommunicationButton
                  onClick={() => setFolder("IMPORTANT")}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors ${
                    folder === "IMPORTANT" ? "bg-[var(--mnx-accent-text)]/15 text-[var(--mnx-accent-text)]" : "text-mono-muted hover:bg-mono-soft hover:text-mono-text"
                  }`}
                >
                  <Bookmark className="size-4 text-[var(--mnx-warning)]" />
                  <span>Important</span>
                  {getLabelBadge("IMPORTANT", "unread")}
                </CommunicationButton>
                <CommunicationButton
                  onClick={() => setFolder("SCHEDULED")}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors ${
                    folder === "SCHEDULED" ? "bg-[var(--mnx-accent-text)]/15 text-[var(--mnx-accent-text)]" : "text-mono-muted hover:bg-mono-soft hover:text-mono-text"
                  }`}
                >
                  <CalendarRange className="size-4 text-[var(--mnx-accent-text)]" />
                  <span>Scheduled</span>
                </CommunicationButton>
                <CommunicationButton
                  onClick={() => setFolder("ALL_MAIL")}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors ${
                    folder === "ALL_MAIL" ? "bg-[var(--mnx-accent-text)]/15 text-[var(--mnx-accent-text)]" : "text-mono-muted hover:bg-mono-soft hover:text-mono-text"
                  }`}
                >
                  <Mail className="size-4 text-mono-muted" />
                  <span>All Mail</span>
                </CommunicationButton>
                <CommunicationButton
                  onClick={() => setFolder("SPAM")}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors ${
                    folder === "SPAM" ? "bg-[var(--mnx-accent-text)]/15 text-[var(--mnx-accent-text)]" : "text-mono-muted hover:bg-mono-soft hover:text-mono-text"
                  }`}
                >
                  <AlertOctagon className="size-4 text-[var(--mnx-danger)]" />
                  <span>Spam</span>
                  {getLabelBadge("SPAM", "unread")}
                </CommunicationButton>
                <CommunicationButton
                  onClick={() => setFolder("TRASH")}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors ${
                    folder === "TRASH" ? "bg-[var(--mnx-accent-text)]/15 text-[var(--mnx-accent-text)]" : "text-mono-muted hover:bg-mono-soft hover:text-mono-text"
                  }`}
                >
                  <Trash2 className="size-4 text-mono-muted" />
                  <span>Trash</span>
                </CommunicationButton>
              </div>
            )}
          </div>

          {/* User Labels section */}
          <div className="space-y-1">
            <CommunicationButton
              onClick={() => setIsLabelsExpanded(!isLabelsExpanded)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider text-mono-muted hover:text-mono-text transition-colors"
            >
              <span>Labels</span>
              {isLabelsExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
            </CommunicationButton>

            {isLabelsExpanded && (
              <div className="space-y-0.5 max-h-[150px] overflow-y-auto pr-1">
                {labels.filter((l: any) => l.type === "user").length === 0 ? (
                  <span className="text-[10px] text-mono-muted block px-3 py-1 italic">No custom labels</span>
                ) : (
                  labels.filter((l: any) => l.type === "user").map((label: any) => (
                    <CommunicationButton
                      key={label.id}
                      onClick={() => setFolder(`LABEL_${label.name}`)}
                      className={`w-full flex items-center space-x-3 px-3 py-1.5 rounded-lg text-xs font-medium tracking-wide transition-colors ${
                        folder === `LABEL_${label.name}` ? "bg-[var(--mnx-accent-text)]/15 text-[var(--mnx-accent-text)]" : "text-mono-muted hover:bg-mono-soft hover:text-mono-text"
                      }`}
                    >
                      <Folder className="size-3.5 text-[var(--mnx-accent-text)] shrink-0" />
                      <span className="truncate max-w-[100px]">{label.name}</span>
                      {getLabelBadge(label.id, "unread")}
                    </CommunicationButton>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action controls footer */}
        <div className="pt-2 border-t border-mono-border/30 space-y-1 shrink-0 text-left">
          <CommunicationButton
            onClick={() => setFolder("SUBSCRIPTIONS")}
            className={`w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${
              folder === "SUBSCRIPTIONS" ? "bg-[var(--mnx-accent-text)]/15 text-[var(--mnx-accent-text)]" : "text-mono-muted hover:bg-mono-soft hover:text-mono-text"
            }`}
          >
            <CheckCircle2 className="size-3.5 text-[var(--mnx-accent-text)]" />
            <span>Subscriptions</span>
          </CommunicationButton>
          <CommunicationButton
            onClick={() => setShowManageLabels(true)}
            className="w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-mono-muted hover:bg-mono-soft hover:text-mono-text transition-colors"
          >
            <Settings className="size-3.5 text-mono-muted" />
            <span>Manage Labels</span>
          </CommunicationButton>
          <CommunicationButton
            onClick={() => setShowCreateLabel(true)}
            className="w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-mono-muted hover:bg-mono-soft hover:text-mono-text transition-colors"
          >
            <Plus className="size-3.5 text-mono-muted" />
            <span>Create Label</span>
          </CommunicationButton>
        </div>
      </div>

      {/* Threads List */}
      <div data-communication-mail-list="true" className="md:col-span-1 border-r border-mono-border flex flex-col h-full bg-mono-card">
        <div className="p-3 border-b border-mono-border flex items-center space-x-2">
          <div className="relative flex-1">
            <CommunicationInput
              type="text"
              placeholder="Search mail..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchThreads()}
              className="w-full text-xs bg-mono-card border border-mono-border rounded-xl pl-8 pr-3 py-2 focus:outline-none"
            />
            <Search className="absolute left-2.5 top-2.5 size-4 text-mono-muted" />
          </div>
          <CommunicationButton onClick={fetchThreads} className="p-2 border border-mono-border rounded-xl hover:bg-mono-soft transition-colors">
            <RefreshCw className="size-4 text-mono-muted" />
          </CommunicationButton>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-outline-variant">
          {error ? (
            (() => {
              const url = parseGoogleApiError(error);
              if (url) {
                return (
                  <div className="p-5 text-center space-y-3">
                    <span className="mnx-communication-icon mx-auto" style={{ background: "var(--mnx-warning-bg)", color: "var(--mnx-warning)" }}>
                      <AlertCircle size={20} />
                    </span>
                    <h4 className="text-xs font-bold text-mono-text uppercase tracking-wider">Gmail API Disabled</h4>
                    <p className="text-[10px] text-mono-muted leading-relaxed">
                      The Gmail API is disabled in your Google Cloud Project console. Please enable it to sync your inbox.
                    </p>
                    <div className="pt-1">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex bg-[var(--mnx-accent-text)] text-[var(--mnx-accent-contrast)] hover:bg-[var(--mnx-accent)] px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-wider transition-all"
                      >
                        Enable API
                      </a>
                    </div>
                  </div>
                );
              }
              return (
                <div className="p-4 text-center space-y-2">
                  <span className="text-[var(--mnx-warning)] font-bold text-sm">⚠</span>
                  <p className="text-xs font-semibold text-mono-text">Sync Issue</p>
                  <p className="text-[10px] text-mono-muted leading-relaxed">{error}</p>
                </div>
              );
            })()
          ) : loading && !threads ? (
            <div className="text-center py-8 text-xs text-mono-muted">Loading threads...</div>
          ) : threads?.length === 0 ? (
            <div className="text-center py-8 text-xs text-mono-muted">No threads found.</div>
          ) : (
            threads?.map((t) => (
              <div
                key={t.id}
                onClick={() => handleThreadSelect(t.id)}
                className={`p-3 space-y-1 cursor-pointer transition-colors text-left ${
                  selectedThread?.id === t.id ? "bg-mono-soft" : "hover:bg-mono-soft"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-mono-text truncate max-w-[120px]">{t.from.split(" <")[0]}</span>
                  <span className="text-[10px] text-mono-muted mnx-numeric">{t.date.split(", ")[1]?.slice(0, 11) || t.date}</span>
                </div>
                <h4 className="text-xs font-semibold text-mono-text truncate max-w-[180px]">{t.subject}</h4>
                <p className="text-[10px] text-mono-muted truncate max-w-[200px]">{t.snippet}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Reading & Action Pane */}
      <div data-communication-mail-detail="true" className="md:col-span-2 flex flex-col h-full bg-mono-card">
        {selectedThread ? (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Thread Action Bar */}
            <div className="p-3 border-b border-mono-border bg-mono-soft flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-mono-text uppercase tracking-wide truncate max-w-[250px]">{selectedThread.subject}</h3>
                <a
                  href={`https://mail.google.com/mail/u/0/#inbox/${selectedThread.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--mnx-accent-text)] hover:underline"
                >
                  <span>Open Full Gmail</span>
                  <ExternalLink className="size-3" />
                </a>
              </div>

              {/* Link to Job Option */}
              <div className="flex items-center space-x-2">
                <NativeSelect
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="text-xs bg-mono-card border border-mono-border rounded-xl p-1.5 focus:outline-none"
                >
                  <option value="">Select Job...</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>{job.jobNumber} - {job.title}</option>
                  ))}
                </NativeSelect>

                <NativeSelect
                  value={linkCategory}
                  onChange={(e) => setLinkCategory(e.target.value)}
                  className="text-xs bg-mono-card border border-mono-border rounded-xl p-1.5 focus:outline-none"
                >
                  <option value="01 Customer KYC">KYC</option>
                  <option value="02 Job Documents">Documents</option>
                  <option value="03 User Uploads">Uploads</option>
                  <option value="06 Invoices and Billing">Billing</option>
                </NativeSelect>

                <CommunicationButton
                  onClick={handleLinkJob}
                  disabled={!selectedJobId}
                  className="flex items-center space-x-1 bg-[var(--mnx-accent-text)] text-[var(--mnx-accent-contrast)] hover:bg-[var(--mnx-accent)] disabled:opacity-50 px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all"
                >
                  <Link2 className="size-3.5" />
                  <span>Link</span>
                </CommunicationButton>
              </div>
            </div>

            {/* Conversation Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-mono-soft">
              {selectedThread.messages.map((msg: any) => (
                <div key={msg.id} className="p-4 rounded-xl border border-mono-border bg-mono-card space-y-3 shadow-sm text-left relative">
                  <div className="flex items-start justify-between border-b border-mono-border/30 pb-2 relative z-0">
                    <div>
                      <span className="text-xs font-bold text-mono-text block">{msg.from}</span>
                      <span className="text-[10px] text-mono-muted block">To: {msg.to}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] text-mono-muted mnx-numeric">{msg.date}</span>
                      <div className="relative">
                        <CommunicationButton
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdownMsgId(activeDropdownMsgId === msg.id ? null : msg.id);
                          }}
                          className="p-1 hover:bg-mono-soft rounded-lg text-mono-muted hover:text-mono-text transition-colors"
                        >
                          <MoreVertical className="size-4" />
                        </CommunicationButton>
                        
                        {activeDropdownMsgId === msg.id && (
                          <div className="absolute right-0 mt-1 w-56 bg-mono-card/95 backdrop-blur-sm border border-mono-border rounded-xl shadow-xl z-50 py-1.5 overflow-hidden animate-page-enter">
                            <CommunicationButton
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
                              className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-mono-text hover:bg-[var(--mnx-accent-text)]/15 hover:text-[var(--mnx-accent-text)] text-left transition-colors font-semibold"
                            >
                              <Reply className="size-3.5" />
                              <span>Reply</span>
                            </CommunicationButton>
                            <CommunicationButton
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownMsgId(null);
                                setComposeTo(msg.from);
                                setComposeSubject(selectedThread.subject.startsWith("Re:") ? selectedThread.subject : `Re: ${selectedThread.subject}`);
                                setComposeBody("");
                                setShowCompose(true);
                              }}
                              className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-mono-text hover:bg-[var(--mnx-accent-text)]/15 hover:text-[var(--mnx-accent-text)] text-left transition-colors font-semibold"
                            >
                              <ReplyAll className="size-3.5" />
                              <span>Reply all</span>
                            </CommunicationButton>
                            <CommunicationButton
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownMsgId(null);
                                setComposeTo("");
                                setComposeSubject(selectedThread.subject.startsWith("Fwd:") ? selectedThread.subject : `Fwd: ${selectedThread.subject}`);
                                setComposeBody(`\n\n---------- Forwarded message ---------\nFrom: ${msg.from}\nDate: ${msg.date}\nSubject: ${selectedThread.subject}\nTo: ${msg.to}\n\n${msg.bodyText || ""}`);
                                setShowCompose(true);
                              }}
                              className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-mono-text hover:bg-[var(--mnx-accent-text)]/15 hover:text-[var(--mnx-accent-text)] text-left transition-colors font-semibold"
                            >
                              <Forward className="size-3.5" />
                              <span>Forward</span>
                            </CommunicationButton>
                            <CommunicationButton
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownMsgId(null);
                                triggerShareModal(msg);
                              }}
                              className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-mono-text hover:bg-[var(--mnx-accent-text)]/15 hover:text-[var(--mnx-accent-text)] text-left transition-colors font-semibold"
                            >
                              <MessageSquare className="size-3.5" />
                              <span>Share in chat</span>
                            </CommunicationButton>
                            
                            <hr className="my-1 border-mono-border/50" />

                            <CommunicationButton
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
                              className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-[var(--mnx-danger)] hover:bg-[var(--mnx-danger-bg)] text-left transition-colors font-semibold"
                            >
                              <Trash2 className="size-3.5" />
                              <span>Delete</span>
                            </CommunicationButton>
                            <CommunicationButton
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
                              className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-mono-text hover:bg-[var(--mnx-accent-text)]/15 hover:text-[var(--mnx-accent-text)] text-left transition-colors font-semibold"
                            >
                              <Mail className="size-3.5" />
                              <span>Mark unread from here</span>
                            </CommunicationButton>

                            <hr className="my-1 border-mono-border/50" />

                            <CommunicationButton
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownMsgId(null);
                                alert(`Sender ${msg.from} has been added to block list.`);
                              }}
                              className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-mono-text hover:bg-[var(--mnx-accent-text)]/15 hover:text-[var(--mnx-accent-text)] text-left transition-colors font-semibold font-medium"
                            >
                              <ShieldAlert className="size-3.5 text-[var(--mnx-warning)]" />
                              <span>Block "{msg.from.split(" <")[0]}"</span>
                            </CommunicationButton>
                            <CommunicationButton
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
                              className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-mono-text hover:bg-[var(--mnx-accent-text)]/15 hover:text-[var(--mnx-accent-text)] text-left transition-colors font-semibold"
                            >
                              <AlertTriangle className="size-3.5 text-[var(--mnx-warning)]" />
                              <span>Report spam</span>
                            </CommunicationButton>
                            <CommunicationButton
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownMsgId(null);
                                alert("Reported phishing to Google Workspace security.");
                              }}
                              className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-mono-text hover:bg-[var(--mnx-accent-text)]/15 hover:text-[var(--mnx-accent-text)] text-left transition-colors font-semibold"
                            >
                              <ShieldAlert className="size-3.5 text-[var(--mnx-danger)]" />
                              <span>Report phishing</span>
                            </CommunicationButton>

                            <hr className="my-1 border-mono-border/50" />

                            <CommunicationButton
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownMsgId(null);
                                const match = msg.from.match(/<([^>]+)>/) || [null, msg.from];
                                const email = match[1] || msg.from;
                                setSearchQuery(`from:${email}`);
                                setTimeout(() => fetchThreads(), 50);
                              }}
                              className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-mono-text hover:bg-[var(--mnx-accent-text)]/15 hover:text-[var(--mnx-accent-text)] text-left transition-colors font-semibold"
                            >
                              <Search className="size-3.5" />
                              <span>Filter messages like this</span>
                            </CommunicationButton>
                            <CommunicationButton
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownMsgId(null);
                                setTranslatedMsgId(translatedMsgId === msg.id ? null : msg.id);
                              }}
                              className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-mono-text hover:bg-[var(--mnx-accent-text)]/15 hover:text-[var(--mnx-accent-text)] text-left transition-colors font-semibold"
                            >
                              <Languages className="size-3.5" />
                              <span>{translatedMsgId === msg.id ? "Original Text" : "Translate"}</span>
                            </CommunicationButton>
                            <CommunicationButton
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
                                          body { font-family: sans-serif; padding: 20px; line-height: 1.5; color: CanvasText; }
                                          .header { border-bottom: 2px solid Canvas; padding-bottom: 10px; margin-bottom: 20px; }
                                          .meta { font-size: 12px; color: GrayText; margin-bottom: 5px; }
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
                              className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-mono-text hover:bg-[var(--mnx-accent-text)]/15 hover:text-[var(--mnx-accent-text)] text-left transition-colors font-semibold"
                            >
                              <Printer className="size-3.5" />
                              <span>Print</span>
                            </CommunicationButton>
                            <CommunicationButton
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
                              className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-mono-text hover:bg-[var(--mnx-accent-text)]/15 hover:text-[var(--mnx-accent-text)] text-left transition-colors font-semibold"
                            >
                              <Download className="size-3.5" />
                              <span>Download message</span>
                            </CommunicationButton>
                            <CommunicationButton
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownMsgId(null);
                                setShowOriginalMsg(msg);
                              }}
                              className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-mono-text hover:bg-[var(--mnx-accent-text)]/15 hover:text-[var(--mnx-accent-text)] text-left transition-colors font-semibold"
                            >
                              <FileText className="size-3.5" />
                              <span>Show original</span>
                            </CommunicationButton>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {translatedMsgId === msg.id && (
                    <div className="p-2 bg-[var(--mnx-accent-text)]/10 rounded-lg text-[10px] text-[var(--mnx-accent-text)] font-semibold flex items-center space-x-1">
                      <Languages className="size-3" />
                      <span>Translated to English (Monolith View)</span>
                    </div>
                  )}

                  {msg.listUnsubscribe && (
                    <div className="p-3 mb-3 bg-[var(--mnx-accent-text)]/5 border border-mono-border/65 rounded-xl text-xs text-mono-text flex items-center justify-between shadow-sm animate-page-enter">
                      <div className="flex items-center space-x-2">
                        <HelpCircle className="size-4 text-[var(--mnx-accent-text)] shrink-0" />
                        <span className="font-medium text-mono-muted text-[11px]">This message is from a mailing list or newsletter subscription.</span>
                      </div>
                      <CommunicationButton
                        onClick={() => handleUnsubscribe(msg.listUnsubscribe)}
                        className="bg-[var(--mnx-accent-text)] text-[var(--mnx-accent-contrast)] hover:bg-[var(--mnx-accent)] px-3.5 py-1.5 rounded-xl text-[10px] uppercase font-bold tracking-wider transition-all shadow-sm"
                      >
                        Unsubscribe
                      </CommunicationButton>
                    </div>
                  )}

                  {/* Sanitized HTML Body */}
                  <div
                    className="text-xs text-mono-text space-y-2 overflow-x-auto whitespace-pre-line"
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
            <div className="p-3 border-t border-mono-border bg-mono-card">
              <form onSubmit={handleSendEmail} className="flex items-center space-x-2">
                <CommunicationInput
                  id="quick-reply-input"
                  type="text"
                  placeholder="Type reply..."
                  value={composeBody}
                  onChange={(e) => {
                    setComposeBody(e.target.value);
                    setComposeTo(selectedThread.messages[selectedThread.messages.length - 1].from);
                    setComposeSubject(selectedThread.subject.startsWith("Re:") ? selectedThread.subject : `Re: ${selectedThread.subject}`);
                  }}
                  className="flex-1 text-xs bg-mono-card border border-mono-border rounded-xl px-3 py-2 focus:outline-none"
                  required
                />
                <CommunicationButton
                  type="submit"
                  className="bg-[var(--mnx-accent-text)] text-[var(--mnx-accent-contrast)] hover:bg-[var(--mnx-accent)] px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all"
                >
                  Reply
                </CommunicationButton>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-mono-muted text-xs">
            <Mail className="size-12 text-[var(--mnx-accent-text)]/40 mb-2 animate-pulse" />
            <span>Select an email thread to read conversation.</span>
          </div>
        )}
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <WorkspaceDialogLayer
          open
          onClose={() => setShowCompose(false)}
          labelledBy="communication-compose-title"
          className="mnx-communication-legacy-dialog"
        >
          <div className="w-full max-w-lg bg-mono-card border border-mono-border rounded-xl shadow-xl overflow-hidden animate-page-enter">
            <div className="p-4 border-b border-mono-border bg-mono-soft flex justify-between items-center">
              <h3 id="communication-compose-title" className="mnx-communication-heading text-mono-text">Compose New Email</h3>
              <CommunicationButton onClick={() => setShowCompose(false)} className="text-mono-muted hover:text-mono-text font-bold text-sm">✕</CommunicationButton>
            </div>
            <form onSubmit={handleSendEmail} className="p-4 space-y-3 text-left">
              <div>
                <label className="mnx-communication-label text-mono-muted block mb-1">To</label>
                <CommunicationInput
                  type="email"
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  className="w-full text-xs bg-mono-card border border-mono-border rounded-xl px-3 py-2 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="mnx-communication-label text-mono-muted block mb-1">Subject</label>
                <CommunicationInput
                  type="text"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  className="w-full text-xs bg-mono-card border border-mono-border rounded-xl px-3 py-2 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="mnx-communication-label text-mono-muted block mb-1">Message</label>
                <CommunicationTextarea
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  rows={6}
                  className="w-full text-xs bg-mono-card border border-mono-border rounded-xl px-3 py-2 focus:outline-none"
                  required
                />
              </div>
              <div className="pt-2 flex justify-end space-x-2">
                <CommunicationButton
                  type="button"
                  onClick={() => setShowCompose(false)}
                  className="px-4 py-2 border border-mono-border rounded-xl text-xs font-semibold uppercase hover:bg-mono-soft text-mono-muted transition-colors"
                >
                  Cancel
                </CommunicationButton>
                <CommunicationButton
                  type="submit"
                  className="bg-[var(--mnx-accent-text)] text-[var(--mnx-accent-contrast)] hover:bg-[var(--mnx-accent)] px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all"
                >
                  Send Email
                </CommunicationButton>
              </div>
            </form>
          </div>
        </WorkspaceDialogLayer>
      )}

      {/* Share in Chat Modal */}
      {showShareModal && (
        <WorkspaceDialogLayer
          open
          onClose={() => setShowShareModal(false)}
          labelledBy="communication-share-title"
          className="mnx-communication-legacy-dialog"
        >
          <div className="w-full max-w-md bg-mono-card border border-mono-border rounded-xl shadow-xl overflow-hidden animate-page-enter">
            <div className="p-4 border-b border-mono-border bg-mono-soft flex justify-between items-center">
              <h3 id="communication-share-title" className="mnx-communication-heading text-mono-text">Share Email in Google Chat</h3>
              <CommunicationButton onClick={() => setShowShareModal(false)} className="text-mono-muted hover:text-mono-text font-bold text-sm">✕</CommunicationButton>
            </div>
            <div className="p-4 space-y-4 text-left">
              <div>
                <label className="mnx-communication-label text-mono-muted block mb-1">Select Chat Space / Employee</label>
                {chatSpacesLoading ? (
                  <div className="text-xs text-mono-muted">Loading spaces...</div>
                ) : (
                  <NativeSelect
                    value={selectedSpaceId}
                    onChange={(e) => setSelectedSpaceId(e.target.value)}
                    className="w-full text-xs bg-mono-card border border-mono-border rounded-xl p-2.5 focus:outline-none"
                  >
                    <option value="">Choose a conversation...</option>
                    {chatSpaces.map((space) => (
                      <option key={space.id} value={space.id}>
                        {space.displayName}
                      </option>
                    ))}
                  </NativeSelect>
                )}
              </div>

              <div>
                <label className="mnx-communication-label text-mono-muted block mb-1">Message Preview</label>
                <CommunicationTextarea
                  value={shareMsgText}
                  onChange={(e) => setShareMsgText(e.target.value)}
                  rows={6}
                  className="w-full text-xs bg-mono-card border border-mono-border rounded-xl px-3 py-2 focus:outline-none"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <CommunicationButton
                  type="button"
                  onClick={() => setShowShareModal(false)}
                  className="px-4 py-2 border border-mono-border rounded-xl text-xs font-semibold uppercase hover:bg-mono-soft text-mono-muted transition-colors"
                >
                  Cancel
                </CommunicationButton>
                <CommunicationButton
                  onClick={handleShareEmailInChat}
                  disabled={sharing || !selectedSpaceId}
                  className="bg-[var(--mnx-accent-text)] text-[var(--mnx-accent-contrast)] hover:bg-[var(--mnx-accent)] disabled:opacity-50 px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all"
                >
                  {sharing ? "Sharing..." : "Share in Chat"}
                </CommunicationButton>
              </div>
            </div>
          </div>
        </WorkspaceDialogLayer>
      )}

      {/* Show Original Modal */}
      {showOriginalMsg && (
        <WorkspaceDialogLayer
          open
          onClose={() => setShowOriginalMsg(null)}
          labelledBy="communication-original-title"
          size="wide"
          className="mnx-communication-legacy-dialog"
        >
          <div className="w-full max-w-2xl bg-mono-card border border-mono-border rounded-xl shadow-xl overflow-hidden animate-page-enter">
            <div className="p-4 border-b border-mono-border bg-mono-soft flex justify-between items-center">
              <h3 id="communication-original-title" className="mnx-communication-heading text-mono-text">Original Message Details</h3>
              <CommunicationButton onClick={() => setShowOriginalMsg(null)} className="text-mono-muted hover:text-mono-text font-bold text-sm">✕</CommunicationButton>
            </div>
            <div className="p-4 space-y-4 text-left">
              <div className="bg-mono-soft p-3 rounded-xl border border-mono-border max-h-[300px] overflow-y-auto font-mono text-[10px] text-mono-text space-y-2 whitespace-pre-wrap">
                <div><strong>Message-ID:</strong> {showOriginalMsg.id}</div>
                <div><strong>Thread-ID:</strong> {showOriginalMsg.threadId}</div>
                <div><strong>From:</strong> {showOriginalMsg.from}</div>
                <div><strong>To:</strong> {showOriginalMsg.to}</div>
                {showOriginalMsg.cc && <div><strong>Cc:</strong> {showOriginalMsg.cc}</div>}
                <div><strong>Date:</strong> {showOriginalMsg.date}</div>
                <div><strong>Subject:</strong> {selectedThread.subject}</div>
                <div><strong>Labels:</strong> {showOriginalMsg.labelIds?.join(", ")}</div>
                <div className="border-t border-mono-border/50 pt-2 mt-2">
                  <strong>Snippet:</strong> {showOriginalMsg.snippet}
                </div>
              </div>
              <div className="flex justify-end">
                <CommunicationButton
                  type="button"
                  onClick={() => setShowOriginalMsg(null)}
                  className="bg-[var(--mnx-accent-text)] text-[var(--mnx-accent-contrast)] hover:bg-[var(--mnx-accent)] px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all"
                >
                  Close
                </CommunicationButton>
              </div>
            </div>
          </div>
        </WorkspaceDialogLayer>
      )}

      {/* Create Label Modal */}
      {showCreateLabel && (
        <WorkspaceDialogLayer
          open
          onClose={() => setShowCreateLabel(false)}
          labelledBy="communication-create-label-title"
          size="compact"
          className="mnx-communication-legacy-dialog"
        >
          <div className="w-full max-w-sm bg-mono-card border border-mono-border rounded-xl shadow-xl overflow-hidden animate-page-enter">
            <div className="p-4 border-b border-mono-border bg-mono-soft flex justify-between items-center">
              <h3 id="communication-create-label-title" className="mnx-communication-heading text-mono-text">Create New Label</h3>
              <CommunicationButton onClick={() => setShowCreateLabel(false)} className="text-mono-muted hover:text-mono-text font-bold text-sm">✕</CommunicationButton>
            </div>
            <form onSubmit={handleCreateLabel} className="p-4 space-y-4 text-left">
              <div>
                <label className="mnx-communication-label text-mono-muted block mb-1">Label Name</label>
                <CommunicationInput
                  type="text"
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  className="w-full text-xs bg-mono-card border border-mono-border rounded-xl px-3 py-2.5 focus:outline-none"
                  placeholder="e.g. Customs, Shipping Docs"
                  required
                  autoFocus
                />
              </div>
              <div className="pt-2 flex justify-end space-x-2">
                <CommunicationButton
                  type="button"
                  onClick={() => setShowCreateLabel(false)}
                  className="px-4 py-2 border border-mono-border rounded-xl text-xs font-semibold uppercase hover:bg-mono-soft text-mono-muted transition-colors"
                >
                  Cancel
                </CommunicationButton>
                <CommunicationButton
                  type="submit"
                  className="bg-[var(--mnx-accent-text)] text-[var(--mnx-accent-contrast)] hover:bg-[var(--mnx-accent)] px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all"
                >
                  Create Label
                </CommunicationButton>
              </div>
            </form>
          </div>
        </WorkspaceDialogLayer>
      )}

      {/* Manage Labels Modal */}
      {showManageLabels && (
        <WorkspaceDialogLayer
          open
          onClose={() => setShowManageLabels(false)}
          labelledBy="communication-manage-labels-title"
          className="mnx-communication-legacy-dialog"
        >
          <div className="w-full max-w-md bg-mono-card border border-mono-border rounded-xl shadow-xl overflow-hidden animate-page-enter">
            <div className="p-4 border-b border-mono-border bg-mono-soft flex justify-between items-center">
              <h3 id="communication-manage-labels-title" className="mnx-communication-heading text-mono-text">Manage Custom Labels</h3>
              <CommunicationButton onClick={() => setShowManageLabels(false)} className="text-mono-muted hover:text-mono-text font-bold text-sm">✕</CommunicationButton>
            </div>
            <div className="p-4 space-y-4 text-left max-h-[400px] overflow-y-auto">
              {labels.filter((l: any) => l.type === "user").length === 0 ? (
                <div className="text-center py-6 text-xs text-mono-muted italic">
                  No user-created custom labels found.
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-mono-border bg-mono-card shadow-sm">
                  <CommunicationTable className="mnx-communication-table">
                    <thead>
                      <tr>
                        <th className="px-4 py-2">Label Name</th>
                        <th className="px-4 py-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {labels.filter((l: any) => l.type === "user").map((label: any) => (
                        <tr key={label.id} className="hover:bg-mono-soft border-b border-mono-border/30 last:border-0">
                          <td className="px-4 py-3 text-xs font-medium text-mono-text">
                            {label.name}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <CommunicationButton
                              onClick={() => handleDeleteLabel(label.id)}
                              disabled={deletingLabelId === label.id}
                              className="p-1.5 hover:bg-[var(--mnx-danger-bg)] text-[var(--mnx-danger)] rounded-lg transition-colors disabled:opacity-50 inline-flex items-center"
                              title="Delete Label"
                            >
                              <Trash2 className="size-3.5" />
                            </CommunicationButton>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </CommunicationTable>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-mono-border bg-mono-soft flex justify-end">
              <CommunicationButton
                type="button"
                onClick={() => setShowManageLabels(false)}
                className="bg-[var(--mnx-accent-text)] text-[var(--mnx-accent-contrast)] hover:bg-[var(--mnx-accent)] px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all"
              >
                Close
              </CommunicationButton>
            </div>
          </div>
        </WorkspaceDialogLayer>
      )}
    </div>
  );
}
