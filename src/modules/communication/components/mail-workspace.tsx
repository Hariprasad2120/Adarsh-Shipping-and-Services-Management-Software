"use client";

import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import DOMPurify from "isomorphic-dompurify";
import {
  Archive,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Clock3,
  Download,
  EllipsisVertical,
  FileText,
  Forward,
  Image as ImageIcon,
  Inbox,
  Link2,
  Mail,
  Minimize2,
  Palette,
  Paperclip,
  PenLine,
  Plus,
  Printer,
  RefreshCw,
  Reply,
  ReplyAll,
  Search,
  Send,
  ShieldAlert,
  ShoppingBag,
  Square,
  Star,
  Tag,
  Trash2,
  TriangleAlert,
  Users,
  X,
} from "lucide-react";
import { NativeSelect } from "@/components/ui/native-select";
import { WorkspaceDialogLayer } from "@/components/layout/workspace-dialog";
import { WorkspaceState } from "@/components/layout/workspace";
import { ButtonLink } from "@/components/ui/button";
import {
  CommunicationButton,
  CommunicationInput,
  CommunicationTextarea,
} from "@/modules/communication/components/workspace/communication-workspace";

type MailLabel = {
  id: string;
  name: string;
  type: "system" | "user";
  messagesTotal?: number;
  messagesUnread?: number;
  threadsTotal?: number;
  threadsUnread?: number;
};

type MailThread = {
  id: string;
  snippet: string;
  historyId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  isUnread: boolean;
  isStarred: boolean;
};

type MailAttachment = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  contentId?: string;
  disposition?: string;
  isInline?: boolean;
};

type MailMessage = {
  id: string;
  threadId: string;
  draftId?: string;
  from: string;
  to: string;
  cc?: string;
  subject: string;
  date: string;
  snippet: string;
  bodyHtml: string;
  bodyText: string;
  labelIds: string[];
  attachments?: MailAttachment[];
  listUnsubscribe?: string;
};

type MailThreadDetails = {
  id: string;
  subject: string;
  messages: MailMessage[];
};

type JobOption = {
  id: string;
  jobNumber: string;
  title: string;
};

type ChatDestination = {
  id: string;
  displayName: string;
};

type ComposeState = {
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
  attachments: File[];
};

type ReplyMode = "reply" | "replyAll";
type MailFolder =
  | "INBOX"
  | "STARRED"
  | "SNOOZED"
  | "SENT"
  | "DRAFTS"
  | "IMPORTANT"
  | "ALL_MAIL"
  | "SPAM"
  | "TRASH"
  | "CATEGORY_PURCHASES"
  | "CATEGORY_FORUMS"
  | "CUSTOM";
type InboxTab = "PRIMARY" | "PROMOTIONS" | "SOCIAL" | "UPDATES";

const PAGE_SIZE = 40;
const JOB_LINK_CATEGORIES = [
  "01 Customer KYC",
  "02 Job Documents",
  "03 User Uploads",
  "04 Checklists",
  "05 Customs and CHA",
  "06 Invoices and Billing",
  "07 Correspondence",
  "08 Other Documents",
] as const;

const INITIAL_COMPOSE: ComposeState = {
  to: "",
  cc: "",
  bcc: "",
  subject: "",
  body: "",
  attachments: [],
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function formatDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const now = new Date();
  const sameYear = date.getFullYear() === now.getFullYear();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return new Intl.DateTimeFormat("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(date);
}

function formatDateTimeLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatBytes(size: number) {
  if (!size) return "0 KB";
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function buildAttachmentUrl(
  messageId: string,
  attachment: MailAttachment,
  options?: { disposition?: "attachment" | "inline" },
) {
  const params = new URLSearchParams({
    messageId,
    attachmentId: attachment.id,
    filename: attachment.name,
    mimeType: attachment.mimeType,
  });
  if (options?.disposition) {
    params.set("disposition", options.disposition);
  }
  return `/api/communication/mail/attachment?${params.toString()}`;
}

function resolveMessageHtml(message: MailMessage) {
  if (!message.bodyHtml) return `<pre>${message.bodyText}</pre>`;

  let html = message.bodyHtml;
  for (const attachment of message.attachments ?? []) {
    if (!attachment.contentId) continue;
    const safeContentId = attachment.contentId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const inlineUrl = buildAttachmentUrl(message.id, attachment, { disposition: "inline" });
    html = html.replace(new RegExp(`cid:${safeContentId}`, "gi"), inlineUrl);
  }

  return html;
}

function isPreviewableAttachment(attachment: MailAttachment) {
  return attachment.mimeType.startsWith("image/");
}

function parseMailboxError(message: string | null) {
  if (!message) return null;
  if (
    !(
      message.includes("API has not been used") ||
      message.includes("SERVICE_DISABLED") ||
      message.includes("accessNotConfigured")
    )
  ) {
    return null;
  }
  return (
    message.match(/https:\/\/console\.[^\s"'}]+/)?.[0] ??
    "https://console.cloud.google.com/apis/dashboard"
  );
}

function getAddressEmail(value: string) {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] ?? value).trim();
}

function getAddressName(value: string) {
  return value.split(" <")[0]?.trim() || value.trim();
}

function buildComposeTextBody(body: string) {
  return body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function messageHasLabel(message: MailMessage, labelId: string) {
  return message.labelIds.includes(labelId);
}

function threadIsUnread(thread: MailThreadDetails | null) {
  return Boolean(thread?.messages.some((message) => message.labelIds.includes("UNREAD")));
}

function threadIsStarred(thread: MailThreadDetails | null) {
  return Boolean(thread?.messages.some((message) => message.labelIds.includes("STARRED")));
}

function systemLabelCount(
  labels: MailLabel[],
  labelName: string,
  countType: "unread" | "total" = "unread",
) {
  const label = labels.find((entry) => entry.id === labelName || entry.name === labelName);
  if (!label) return 0;
  return countType === "unread"
    ? label.threadsUnread ?? label.messagesUnread ?? 0
    : label.threadsTotal ?? label.messagesTotal ?? 0;
}

function buildFolderQuery(
  folder: MailFolder,
  inboxTab: InboxTab,
  customLabelId: string | null,
  labels: MailLabel[],
  searchQuery: string,
) {
  if (searchQuery.trim()) return searchQuery.trim();
  if (folder === "CUSTOM") {
    const label = labels.find((entry) => entry.id === customLabelId);
    return label ? `label:"${label.name}"` : "in:inbox";
  }
  if (folder === "INBOX") {
    if (inboxTab === "PRIMARY") {
      return "in:inbox -category:promotions -category:social -category:updates -category:forums";
    }
    if (inboxTab === "PROMOTIONS") return "in:inbox category:promotions";
    if (inboxTab === "SOCIAL") return "in:inbox category:social";
    return "in:inbox category:updates";
  }
  if (folder === "STARRED") return "is:starred";
  if (folder === "SNOOZED") return "is:snoozed";
  if (folder === "SENT") return "in:sent";
  if (folder === "DRAFTS") return "in:drafts";
  if (folder === "IMPORTANT") return "is:important";
  if (folder === "SPAM") return "in:spam";
  if (folder === "TRASH") return "in:trash";
  if (folder === "ALL_MAIL") return "in:anywhere";
  if (folder === "CATEGORY_PURCHASES") return "category:purchases";
  if (folder === "CATEGORY_FORUMS") return "category:forums";
  return "in:inbox";
}

function createFormDataPayload(
  compose: ComposeState,
  options?: { threadId?: string },
) {
  const formData = new FormData();
  formData.set("to", compose.to);
  formData.set("cc", compose.cc);
  formData.set("bcc", compose.bcc);
  formData.set("subject", compose.subject);
  formData.set("body", compose.body);
  formData.set("textBody", buildComposeTextBody(compose.body));
  if (options?.threadId) {
    formData.set("threadId", options.threadId);
  }
  for (const attachment of compose.attachments) {
    formData.append("attachments", attachment);
  }
  return formData;
}

export function CommunicationMailWorkspace({
  initialThreadId,
}: {
  initialThreadId?: string;
}) {
  const searchInputId = useId();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const composeFileInputRef = useRef<HTMLInputElement | null>(null);
  const replyTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const messagePopoverRef = useRef<HTMLDivElement | null>(null);
  const messagePopoverFrameRef = useRef<number | null>(null);
  const initialThreadIdRef = useRef(initialThreadId ?? null);

  const [threads, setThreads] = useState<MailThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<MailThreadDetails | null>(null);
  const [selectedThreadIds, setSelectedThreadIds] = useState<string[]>([]);
  const [labels, setLabels] = useState<MailLabel[]>([]);
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [chatDestinations, setChatDestinations] = useState<ChatDestination[]>([]);

  const [folder, setFolder] = useState<MailFolder>("INBOX");
  const [inboxTab, setInboxTab] = useState<InboxTab>("PRIMARY");
  const [customLabelId, setCustomLabelId] = useState<string | null>(null);
  const [labelToApply, setLabelToApply] = useState("");
  const [jobToLink, setJobToLink] = useState("");
  const [linkCategory, setLinkCategory] =
    useState<(typeof JOB_LINK_CATEGORIES)[number]>("02 Job Documents");
  const [replyMode, setReplyMode] = useState<ReplyMode>("reply");

  const [searchDraft, setSearchDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [composeState, setComposeState] = useState<ComposeState>(INITIAL_COMPOSE);
  const [shareState, setShareState] = useState({
    open: false,
    destinationId: "",
    message: "",
  });
  const [openMessageMenuId, setOpenMessageMenuId] = useState<string | null>(null);
  const [openReactionPickerId, setOpenReactionPickerId] = useState<string | null>(null);
  const [messagePopoverPosition, setMessagePopoverPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [loadingLabels, setLoadingLabels] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [sendingReply, setSendingReply] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [sendingCompose, setSendingCompose] = useState(false);
  const [sendingHiddenDraftId, setSendingHiddenDraftId] = useState<string | null>(null);
  const [sharingToChat, setSharingToChat] = useState(false);
  const [linkingJob, setLinkingJob] = useState(false);
  const [bulkWorking, setBulkWorking] = useState(false);
  const [managingLabels, setManagingLabels] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [showComposeCc, setShowComposeCc] = useState(false);
  const [showComposeBcc, setShowComposeBcc] = useState(false);
  const [composeMinimized, setComposeMinimized] = useState(false);
  const [showComposeMoreMenu, setShowComposeMoreMenu] = useState(false);
  const [showCreateLabel, setShowCreateLabel] = useState(false);
  const [showManageLabels, setShowManageLabels] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [showAllSidebarLabels, setShowAllSidebarLabels] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [pageHistory, setPageHistory] = useState<(string | undefined)[]>([undefined]);
  const [pageIndex, setPageIndex] = useState(0);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();

  const currentPageToken = pageHistory[pageIndex];
  const visibleUserLabels = labels.filter((label) => label.type === "user");
  const SIDEBAR_LABEL_PREVIEW = 6;
  const sidebarLabels = showAllSidebarLabels
    ? visibleUserLabels
    : visibleUserLabels.slice(0, SIDEBAR_LABEL_PREVIEW);
  const selectedCount = selectedThreadIds.length;
  const showConversationView = Boolean(selectedThread) || loadingThread;
  const apiEnableUrl = parseMailboxError(error);
  const pagerStart = pageIndex * PAGE_SIZE + (threads.length === 0 ? 0 : 1);
  const pagerEnd = pageIndex * PAGE_SIZE + threads.length;
  const totalInboxThreads = systemLabelCount(labels, "INBOX", "total");
  const unreadInboxThreads = systemLabelCount(labels, "INBOX");
  const draftThreads = systemLabelCount(labels, "DRAFT", "total");
  const activeSearchFilters = [
    searchQuery.trim() ? "Search active" : null,
    folder === "INBOX" ? "Unread" : null,
    folder === "INBOX" ? "Has attachment" : null,
    customLabelId ? "Label" : null,
    "Date",
    "More filters",
  ].filter(Boolean) as string[];
  const selectedThreadMessages = selectedThread?.messages ?? [];
  const selectedThreadDraftMessages = selectedThreadMessages.filter((message) =>
    messageHasLabel(message, "DRAFT"),
  );
  const selectedThreadVisibleMessages = selectedThreadMessages.filter(
    (message) => !messageHasLabel(message, "DRAFT"),
  );
  const selectedThreadAttachments = selectedThreadVisibleMessages.flatMap(
    (message) => message.attachments ?? [],
  );
  const selectedThreadPeople = Array.from(
    new Map(
      selectedThreadVisibleMessages.flatMap((message) =>
        [message.from, message.to]
          .filter(Boolean)
          .map((value) => [getAddressEmail(value), value] as const),
      ),
    ).values(),
  );
  const selectedThreadFirstMessage = selectedThreadVisibleMessages[0] ?? null;
  const selectedThreadLastMessage =
    selectedThreadVisibleMessages[selectedThreadVisibleMessages.length - 1] ?? null;
  const latestHiddenDraft =
    selectedThreadDraftMessages[selectedThreadDraftMessages.length - 1] ?? null;
  const activeMessagePopover =
    selectedThreadVisibleMessages.find(
      (message) => message.id === openMessageMenuId || message.id === openReactionPickerId,
    ) ?? null;
  const activeMessagePopoverType = openMessageMenuId
    ? "menu"
    : openReactionPickerId
      ? "reaction"
      : null;

  const getMessagePopoverPlacement = (trigger: DOMRect, type: "menu" | "reaction") => {
    const width = type === "menu" ? 232 : 248;
    const height = type === "menu" ? 380 : 64;
    const left = Math.max(16, Math.min(window.innerWidth - width - 16, trigger.right - width));
    const preferredTop = trigger.bottom + 8;
    const top =
      preferredTop + height > window.innerHeight - 16
        ? Math.max(16, trigger.top - height - 8)
        : preferredTop;

    return { top, left };
  };

  const applyMessagePopoverPosition = (top: number, left: number) => {
    const popover = messagePopoverRef.current;
    if (!popover) return;
    popover.style.top = `${top}px`;
    popover.style.left = `${left}px`;
  };

  const resetPager = () => {
    setPageHistory([undefined]);
    setPageIndex(0);
    setSelectedThreadIds([]);
    setSelectedThread(null);
  };

  const loadLabels = async () => {
    setLoadingLabels(true);
    try {
      const response = await fetch("/api/communication/mail/labels");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to load labels");
      }
      setLabels(data.labels ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLabels(false);
    }
  };

  const loadJobs = async () => {
    try {
      const response = await fetch("/api/communication/mail/link");
      const data = await response.json();
      if (response.ok) {
        setJobs(data.jobs ?? []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadThreads = async (pageToken?: string) => {
    setLoadingThreads(true);
    setError(null);
    setActionError(null);
    try {
      const query = buildFolderQuery(
        folder,
        inboxTab,
        customLabelId,
        labels,
        searchQuery,
      );
      const params = new URLSearchParams();
      params.set("maxResults", String(PAGE_SIZE));
      if (query) params.set("q", query);
      if (pageToken) params.set("pageToken", pageToken);

      const response = await fetch(`/api/communication/mail/list?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to load threads");
      }
      setThreads(data.threads ?? []);
      setNextPageToken(data.nextPageToken);
      setSelectedThreadIds([]);
    } catch (err: unknown) {
      console.error(err);
      setThreads([]);
      setNextPageToken(undefined);
      setError(getErrorMessage(err, "Failed to load threads."));
    } finally {
      setLoadingThreads(false);
    }
  };

  const openThread = async (thread: MailThread) => {
    setLoadingThread(true);
    setActionError(null);
    try {
      const response = await fetch(`/api/communication/mail/thread?id=${thread.id}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to load conversation");
      }
      setSelectedThread(data.thread as MailThreadDetails);
      setReplyBody("");

      if (thread.isUnread) {
        await fetch("/api/communication/mail/modify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            threadId: thread.id,
            addLabelIds: [],
            removeLabelIds: ["UNREAD"],
          }),
        });
        setThreads((current) =>
          current.map((entry) =>
            entry.id === thread.id ? { ...entry, isUnread: false } : entry,
          ),
        );
      }
    } catch (err: unknown) {
      console.error(err);
      setActionError(getErrorMessage(err, "Failed to open the thread."));
    } finally {
      setLoadingThread(false);
    }
  };

  const refreshCurrentView = async () => {
    await Promise.all([loadLabels(), loadThreads(currentPageToken)]);
  };

  const applyThreadModification = async (
    threadIds: string[],
    addLabelIds: string[],
    removeLabelIds: string[],
    successMessage: string,
  ) => {
    if (threadIds.length === 0) return;
    setBulkWorking(true);
    setActionError(null);
    try {
      const responses = await Promise.all(
        threadIds.map((threadId) =>
          fetch("/api/communication/mail/modify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ threadId, addLabelIds, removeLabelIds }),
          }),
        ),
      );
      const failed = responses.find((response) => !response.ok);
      if (failed) {
        const data = await failed.json();
        throw new Error(data.error || "Mailbox action failed");
      }
      setToast(successMessage);
      if (selectedThread && threadIds.includes(selectedThread.id)) {
        if (addLabelIds.includes("TRASH") || addLabelIds.includes("SPAM")) {
          setSelectedThread(null);
        } else {
          const detailResponse = await fetch(
            `/api/communication/mail/thread?id=${selectedThread.id}`,
          );
          if (detailResponse.ok) {
            const data = await detailResponse.json();
            setSelectedThread(data.thread as MailThreadDetails);
          }
        }
      }
      await refreshCurrentView();
    } catch (err: unknown) {
      console.error(err);
      setActionError(getErrorMessage(err, "Mailbox action failed."));
    } finally {
      setBulkWorking(false);
    }
  };

  const handleReplySend = async () => {
    if (!selectedThread || !replyBody.trim()) return;
    const latestMessage =
      selectedThreadVisibleMessages[selectedThreadVisibleMessages.length - 1] ?? null;
    if (!latestMessage) {
      setActionError("This thread only contains drafts. Send or open it from Drafts before replying.");
      return;
    }
    setSendingReply(true);
    setActionError(null);
    try {
      const response = await fetch("/api/communication/mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: getAddressEmail(latestMessage.from),
          cc: replyMode === "replyAll" ? latestMessage.cc : undefined,
          subject: selectedThread.subject.startsWith("Re:")
            ? selectedThread.subject
            : `Re: ${selectedThread.subject}`,
          body: replyBody,
          textBody: buildComposeTextBody(replyBody),
          threadId: selectedThread.id,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to send reply");
      }
      setReplyBody("");
      setToast("Reply sent.");
      await refreshCurrentView();
      const senderMessage = latestMessage;
      await openThread({
        id: selectedThread.id,
        snippet: senderMessage.snippet,
        historyId: "",
        subject: selectedThread.subject,
        from: senderMessage.from,
        to: senderMessage.to,
        date: senderMessage.date,
        isUnread: false,
        isStarred: threadIsStarred(selectedThread),
      });
    } catch (err: unknown) {
      console.error(err);
      setActionError(getErrorMessage(err, "Failed to send reply."));
    } finally {
      setSendingReply(false);
    }
  };

  const handleSendHiddenDraft = async (message: MailMessage) => {
    if (!selectedThread || !message.draftId) {
      setActionError("This draft can no longer be sent from the conversation view.");
      return;
    }

    setSendingHiddenDraftId(message.id);
    setActionError(null);
    try {
      const response = await fetch("/api/communication/mail/draft/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId: message.draftId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to send draft");
      }

      const detailResponse = await fetch(`/api/communication/mail/thread?id=${selectedThread.id}`);
      if (detailResponse.ok) {
        const detailData = await detailResponse.json();
        setSelectedThread(detailData.thread as MailThreadDetails);
      }
      await refreshCurrentView();
      setToast("Draft sent.");
    } catch (err: unknown) {
      console.error(err);
      setActionError(getErrorMessage(err, "Failed to send draft."));
    } finally {
      setSendingHiddenDraftId(null);
    }
  };

  const focusReplyComposer = () => {
    window.setTimeout(() => {
      replyTextareaRef.current?.focus();
      replyTextareaRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, 0);
  };

  const handleMessageReply = (message: MailMessage, mode: ReplyMode = "reply") => {
    setReplyMode(mode);
    setReplyBody((current) => {
      if (current.trim()) return current;
      const intro = mode === "replyAll" ? "Reply all" : "Reply";
      return `\n\n${intro} to ${getAddressName(message.from)}:\n`;
    });
    setOpenMessageMenuId(null);
    setOpenReactionPickerId(null);
    setMessagePopoverPosition(null);
    focusReplyComposer();
  };

  const handleMessageForward = (message: MailMessage) => {
    setComposeState({
      to: "",
      cc: "",
      bcc: "",
      subject: message.subject.startsWith("Fwd:") ? message.subject : `Fwd: ${message.subject}`,
      body: `\n\n---------- Forwarded message ---------\nFrom: ${message.from}\nDate: ${message.date}\nSubject: ${message.subject}\nTo: ${message.to}\n\n${message.bodyText || message.snippet}`,
      attachments: [],
    });
    setShowComposeCc(false);
    setShowComposeBcc(false);
    setShowCompose(true);
    setOpenMessageMenuId(null);
    setMessagePopoverPosition(null);
  };

  const handleMessageReaction = (message: MailMessage, emoji: string) => {
    setReplyMode("reply");
    setReplyBody(`${emoji}`);
    setToast(`Reaction added for ${getAddressName(message.from)}. Send to confirm.`);
    setOpenReactionPickerId(null);
    setOpenMessageMenuId(null);
    setMessagePopoverPosition(null);
    focusReplyComposer();
  };

  const handleDownloadMessage = (message: MailMessage) => {
    const content = [
      `From: ${message.from}`,
      `To: ${message.to}`,
      message.cc ? `Cc: ${message.cc}` : null,
      `Date: ${message.date}`,
      `Subject: ${message.subject}`,
      "",
      message.bodyText || message.snippet,
    ]
      .filter(Boolean)
      .join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${(message.subject || "message").replace(/[^\w.-]+/g, "_")}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
    setOpenMessageMenuId(null);
    setMessagePopoverPosition(null);
  };

  const handleShowOriginal = (message: MailMessage) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Original message</title>
        </head>
        <body style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; padding: 24px; line-height: 1.6; white-space: pre-wrap;">
From: ${message.from}
To: ${message.to}
${message.cc ? `Cc: ${message.cc}\n` : ""}Date: ${message.date}
Subject: ${message.subject}

${message.bodyText || message.snippet}
        </body>
      </html>
    `);
    printWindow.document.close();
    setOpenMessageMenuId(null);
    setMessagePopoverPosition(null);
  };

  const openMessagePopover = (
    event: React.MouseEvent<HTMLButtonElement>,
    messageId: string,
    type: "menu" | "reaction",
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const { top, left } = getMessagePopoverPlacement(rect, type);

    setMessagePopoverPosition({ top, left });
    setOpenMessageMenuId(type === "menu" ? messageId : null);
    setOpenReactionPickerId(type === "reaction" ? messageId : null);
  };

  const syncMessagePopoverPosition = () => {
    const messageId = openMessageMenuId || openReactionPickerId;
    const type = openMessageMenuId ? "menu" : openReactionPickerId ? "reaction" : null;
    if (!messageId || !type) return;

    const trigger = document.querySelector<HTMLElement>(
      `[data-message-popover-trigger="${type}"][data-message-id="${messageId}"]`,
    );
    if (!trigger) {
      setOpenMessageMenuId(null);
      setOpenReactionPickerId(null);
      setMessagePopoverPosition(null);
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const { top, left } = getMessagePopoverPlacement(rect, type);
    applyMessagePopoverPosition(top, left);
  };

  const handleComposeSend = async () => {
    if (!composeState.to.trim() || !composeState.subject.trim() || !composeState.body.trim()) {
      setActionError("To, subject, and message are required to send mail.");
      return;
    }
    setSendingCompose(true);
    setActionError(null);
    try {
      const response = await fetch("/api/communication/mail/send", {
        method: "POST",
        body: createFormDataPayload(composeState),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to send email");
      }
      setComposeState(INITIAL_COMPOSE);
      setShowComposeCc(false);
      setShowComposeBcc(false);
      setShowCompose(false);
      setToast("Email sent.");
      await refreshCurrentView();
    } catch (err: unknown) {
      console.error(err);
      setActionError(getErrorMessage(err, "Failed to send email."));
    } finally {
      setSendingCompose(false);
    }
  };

  const closeCompose = () => {
    setShowCompose(false);
    setComposeMinimized(false);
    setShowComposeMoreMenu(false);
  };

  const resetCompose = () => {
    setComposeState(INITIAL_COMPOSE);
    setShowComposeCc(false);
    setShowComposeBcc(false);
    setComposeMinimized(false);
    setShowComposeMoreMenu(false);
  };

  const discardCompose = () => {
    resetCompose();
    setShowCompose(false);
  };

  const insertIntoComposeBody = (value: string) => {
    setComposeState((current) => ({
      ...current,
      body: current.body ? `${current.body}\n${value}` : value,
    }));
  };

  const handleComposeInsertLink = () => {
    const url = window.prompt("Enter the link URL");
    if (!url?.trim()) return;
    const label = window.prompt("Enter link text", url.trim())?.trim() || url.trim();
    insertIntoComposeBody(`<a href="${url.trim()}">${label}</a>`);
  };

  const handleComposeInsertSignature = () => {
    insertIntoComposeBody("Thanks & Regards\nHR");
    setShowComposeMoreMenu(false);
  };

  const handleComposeInsertImage = () => {
    const imageUrl = window.prompt("Enter the image URL");
    if (!imageUrl?.trim()) return;
    insertIntoComposeBody(`<img src="${imageUrl.trim()}" alt="Inline image" />`);
  };

  const handleComposeFormatting = () => {
    insertIntoComposeBody("<p><strong>Heading</strong></p><p>Write your message here.</p>");
  };

  const handleSaveDraft = async () => {
    if (
      !composeState.to.trim() &&
      !composeState.cc.trim() &&
      !composeState.bcc.trim() &&
      !composeState.subject.trim() &&
      !composeState.body.trim() &&
      composeState.attachments.length === 0
    ) {
      setActionError("Add some mail content before saving a draft.");
      return;
    }
    setSavingDraft(true);
    setActionError(null);
    try {
      const response = await fetch("/api/communication/mail/draft", {
        method: "POST",
        body: createFormDataPayload(composeState),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to save draft");
      }
      setToast("Draft saved to Gmail.");
      setComposeState(INITIAL_COMPOSE);
      setShowComposeCc(false);
      setShowComposeBcc(false);
      setShowCompose(false);
      await refreshCurrentView();
    } catch (err: unknown) {
      console.error(err);
      setActionError(getErrorMessage(err, "Failed to save draft."));
    } finally {
      setSavingDraft(false);
    }
  };

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) return;
    setManagingLabels(true);
    setActionError(null);
    try {
      const response = await fetch("/api/communication/mail/labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newLabelName.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create label");
      }
      setNewLabelName("");
      setShowCreateLabel(false);
      setToast("Label created.");
      await loadLabels();
    } catch (err: unknown) {
      console.error(err);
      setActionError(getErrorMessage(err, "Failed to create label."));
    } finally {
      setManagingLabels(false);
    }
  };

  const handleDeleteLabel = async (labelId: string) => {
    setManagingLabels(true);
    setActionError(null);
    try {
      const response = await fetch(`/api/communication/mail/labels?id=${labelId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete label");
      }
      if (folder === "CUSTOM" && customLabelId === labelId) {
        setFolder("INBOX");
        setCustomLabelId(null);
      }
      setToast("Label removed.");
      await loadLabels();
      await loadThreads(currentPageToken);
    } catch (err: unknown) {
      console.error(err);
      setActionError(getErrorMessage(err, "Failed to delete label."));
    } finally {
      setManagingLabels(false);
    }
  };

  const handleLinkJob = async () => {
    if (!selectedThread || !jobToLink) return;
    setLinkingJob(true);
    setActionError(null);
    try {
      const response = await fetch("/api/communication/mail/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId: selectedThread.id,
          jobId: jobToLink,
          category: linkCategory,
          subject: selectedThread.subject,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to link thread");
      }
      setJobToLink("");
      setToast("Thread linked to the selected job workspace.");
    } catch (err: unknown) {
      console.error(err);
      setActionError(getErrorMessage(err, "Failed to link thread."));
    } finally {
      setLinkingJob(false);
    }
  };

  const loadChatDestinations = async () => {
    if (chatDestinations.length > 0) return;
    try {
      const response = await fetch("/api/communication/chat/list");
      const data = await response.json();
      if (!response.ok) return;
      const destinations: ChatDestination[] = [];
      (data.jobs as Array<{ jobNumber: string; spaceId?: string }> | undefined)?.forEach((job) => {
        if (job.spaceId) {
          destinations.push({ id: job.spaceId, displayName: `JOB-${job.jobNumber}` });
        }
      });
      (
        data.googleSpaces as Array<{ name: string; displayName?: string }> | undefined
      )?.forEach((space) => {
        destinations.push({
          id: space.name,
          displayName: space.displayName || space.name,
        });
      });
      (
        data.employees as Array<
          { name: string; workspaceConnection?: { googleUserId?: string | null } }
        > | undefined
      )?.forEach((employee) => {
        const userId = employee.workspaceConnection?.googleUserId;
        if (userId) {
          destinations.push({ id: `users/${userId}`, displayName: employee.name });
        }
      });
      setChatDestinations(destinations);
    } catch (err) {
      console.error(err);
    }
  };

  const openShareModal = async (message: MailMessage) => {
    await loadChatDestinations();
    setShareState({
      open: true,
      destinationId: "",
      message: `Shared from Monolith Mail\n\nSubject: ${selectedThread?.subject ?? message.subject}\nFrom: ${message.from}\nDate: ${message.date}\n\n${message.bodyText?.slice(0, 500) || message.snippet}`,
    });
  };

  const handleShareToChat = async () => {
    if (!shareState.destinationId || !shareState.message.trim()) return;
    setSharingToChat(true);
    setActionError(null);
    try {
      const response = await fetch("/api/communication/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spaceId: shareState.destinationId,
          text: shareState.message,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to share message");
      }
      setShareState({ open: false, destinationId: "", message: "" });
      setToast("Shared to Google Chat.");
    } catch (err: unknown) {
      console.error(err);
      setActionError(getErrorMessage(err, "Failed to share to chat."));
    } finally {
      setSharingToChat(false);
    }
  };

  const handleUnsubscribe = async (headerValue: string) => {
    const urls = headerValue.match(/<(https?:\/\/[^>]+)>/);
    const mailtos = headerValue.match(/<(mailto:[^>]+)>/);
    if (urls?.[1]) {
      window.open(urls[1], "_blank", "noopener,noreferrer");
      setToast("Opened the unsubscribe destination.");
      return;
    }
    if (mailtos?.[1]) {
      const mailtoUrl = new URL(mailtos[1]);
      setComposeState({
        to: mailtoUrl.pathname,
        cc: "",
        bcc: "",
        subject: mailtoUrl.searchParams.get("subject") || "Unsubscribe",
        body:
          mailtoUrl.searchParams.get("body") ||
          "Please unsubscribe me from this mailing list.",
        attachments: [],
      });
      setShowComposeCc(false);
      setShowComposeBcc(false);
      setShowCompose(true);
      setToast("Prepared an unsubscribe draft.");
    }
  };

  useEffect(() => {
    const bootstrapTimer = window.setTimeout(() => {
      void loadLabels();
      void loadJobs();
    }, 0);

    return () => window.clearTimeout(bootstrapTimer);
  }, []);

  useEffect(() => {
    if (loadingLabels) return;

    const refreshTimer = window.setTimeout(() => {
      void loadThreads(currentPageToken);
    }, 0);

    return () => window.clearTimeout(refreshTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingLabels, labels, currentPageToken, folder, inboxTab, customLabelId, searchQuery]);

  useEffect(() => {
    const targetThreadId = initialThreadIdRef.current;
    if (!targetThreadId || loadingThreads || selectedThread?.id === targetThreadId) {
      return;
    }

    const targetThread = threads.find((thread) => thread.id === targetThreadId);
    if (!targetThread) {
      return;
    }

    initialThreadIdRef.current = null;
    void openThread(targetThread);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- this one-time deep link should react to the loaded thread list only
  }, [loadingThreads, selectedThread?.id, threads]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!openMessageMenuId && !openReactionPickerId) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-message-action-root='true']")) return;
      if (target.closest("[data-message-popover-layer='true']")) return;
      setOpenMessageMenuId(null);
      setOpenReactionPickerId(null);
      setMessagePopoverPosition(null);
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [openMessageMenuId, openReactionPickerId]);

  useEffect(() => {
    if (!activeMessagePopoverType) return;

    const scheduleSync = () => {
      if (messagePopoverFrameRef.current !== null) return;
      messagePopoverFrameRef.current = window.requestAnimationFrame(() => {
        messagePopoverFrameRef.current = null;
        syncMessagePopoverPosition();
      });
    };

    window.addEventListener("scroll", scheduleSync, true);
    window.addEventListener("resize", scheduleSync);
    scheduleSync();

    return () => {
      if (messagePopoverFrameRef.current !== null) {
        window.cancelAnimationFrame(messagePopoverFrameRef.current);
        messagePopoverFrameRef.current = null;
      }
      window.removeEventListener("scroll", scheduleSync, true);
      window.removeEventListener("resize", scheduleSync);
    };
  }, [activeMessagePopoverType, openMessageMenuId, openReactionPickerId]);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      const isEditable =
        target?.isContentEditable ||
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select";
      if (isEditable) return;

      if (event.key === "/") {
        event.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if (event.key.toLowerCase() === "c") {
        event.preventDefault();
        setShowCompose(true);
        return;
      }
      if (event.key.toLowerCase() === "j") {
        event.preventDefault();
        if (threads.length === 0) return;
        const currentIndex = threads.findIndex((thread) => thread.id === selectedThread?.id);
        const nextIndex = currentIndex < 0 ? 0 : Math.min(threads.length - 1, currentIndex + 1);
        void openThread(threads[nextIndex]);
        return;
      }
      if (event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (threads.length === 0) return;
        const currentIndex = threads.findIndex((thread) => thread.id === selectedThread?.id);
        const nextIndex = currentIndex <= 0 ? 0 : currentIndex - 1;
        void openThread(threads[nextIndex]);
        return;
      }
      if (event.key.toLowerCase() === "e" && selectedThreadIds.length > 0) {
        event.preventDefault();
        void applyThreadModification(
          selectedThreadIds,
          [],
          ["INBOX"],
          "Archived selected threads.",
        );
        return;
      }
      if (event.key === "#" && selectedThreadIds.length > 0) {
        event.preventDefault();
        void applyThreadModification(
          selectedThreadIds,
          ["TRASH"],
          ["INBOX"],
          "Moved selected threads to trash.",
        );
        return;
      }
      if (event.key.toLowerCase() === "u" && selectedThread) {
        event.preventDefault();
        setSelectedThread(null);
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mailbox keyboard shortcuts intentionally bind the current filtered list and selection state
  }, [selectedThread, selectedThreadIds, threads]);

  const toggleThreadSelection = (threadId: string) => {
    setSelectedThreadIds((current) =>
      current.includes(threadId)
        ? current.filter((id) => id !== threadId)
        : [...current, threadId],
    );
  };

  const toggleSelectAll = () => {
    if (selectedThreadIds.length === threads.length) {
      setSelectedThreadIds([]);
      return;
    }
    setSelectedThreadIds(threads.map((thread) => thread.id));
  };

  const handleStarToggle = async (thread: MailThread) => {
    await applyThreadModification(
      [thread.id],
      thread.isStarred ? [] : ["STARRED"],
      thread.isStarred ? ["STARRED"] : [],
      thread.isStarred ? "Removed star." : "Starred thread.",
    );
  };

  return (
    <>
      <section className="mnx-gmail-workspace" data-communication-mail="true">
        <div className="mnx-gmail-topbar">
          <div className="mnx-gmail-topbar-primary">
            <div className="mnx-gmail-topbar-search">
              <label htmlFor={searchInputId} className="mnx-gmail-sr-only">
                Search mail
              </label>
              <Search aria-hidden="true" />
              <CommunicationInput
                id={searchInputId}
                ref={searchInputRef}
                type="search"
                placeholder="Search mail, senders, labels, or subjects"
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    resetPager();
                    setSearchQuery(searchDraft);
                  }
                }}
              />
              <span className="mnx-gmail-topbar-shortcut">/</span>
              {searchDraft ? (
                <CommunicationButton
                  type="button"
                  variant="secondary"
                  size="compact"
                  className="mnx-gmail-topbar-clear"
                  onClick={() => {
                    resetPager();
                    setSearchDraft("");
                    setSearchQuery("");
                  }}
                >
                  <X aria-hidden="true" />
                </CommunicationButton>
              ) : null}
            </div>
          </div>
          <div className="mnx-gmail-topbar-actions">
            <div className="mnx-gmail-topbar-action-group">
              <CommunicationButton
                type="button"
                variant="secondary"
                size="compact"
                className="mnx-gmail-topbar-action"
                onClick={() => {
                  resetPager();
                  setSearchQuery(searchDraft);
                }}
              >
                <Search aria-hidden="true" />
                Search
              </CommunicationButton>
            <CommunicationButton
              type="button"
              variant="secondary"
              size="compact"
              className="mnx-gmail-topbar-action"
              onClick={() => void refreshCurrentView()}
            >
              <RefreshCw aria-hidden="true" />
              Refresh
            </CommunicationButton>
            </div>
          </div>
        </div>

        {toast ? <div className="mnx-gmail-toast">{toast}</div> : null}
        {actionError ? (
          <div className="mnx-gmail-banner mnx-gmail-banner-danger">{actionError}</div>
        ) : null}
        {apiEnableUrl ? (
          <div className="mnx-gmail-banner mnx-gmail-banner-warning">
            <span>Gmail API access needs to be enabled for this workspace connection.</span>
            <a href={apiEnableUrl} target="_blank" rel="noopener noreferrer">
              Open Google Cloud
            </a>
          </div>
        ) : null}

        <div
          className={[
            "mnx-gmail-shell",
            showConversationView ? "is-conversation-view" : "is-list-view",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <aside className="mnx-gmail-sidebar">
            <CommunicationButton
              type="button"
              className="mnx-gmail-compose-button"
              onClick={() => {
                setComposeState(INITIAL_COMPOSE);
                setShowComposeCc(false);
                setShowComposeBcc(false);
                setComposeMinimized(false);
                setShowComposeMoreMenu(false);
                setShowCompose(true);
              }}
            >
              <PenLine aria-hidden="true" />
              Compose
            </CommunicationButton>

            <nav className="mnx-gmail-folder-list" aria-label="Mail folders">
              <FolderButton
                active={folder === "INBOX"}
                count={systemLabelCount(labels, "INBOX")}
                icon={<Inbox aria-hidden="true" />}
                label="Inbox"
                onClick={() => {
                  resetPager();
                  setFolder("INBOX");
                  setCustomLabelId(null);
                }}
              />
              <FolderButton
                active={folder === "STARRED"}
                count={systemLabelCount(labels, "STARRED")}
                icon={<Star aria-hidden="true" />}
                label="Starred"
                onClick={() => {
                  resetPager();
                  setFolder("STARRED");
                  setCustomLabelId(null);
                }}
              />
              <FolderButton
                active={folder === "SNOOZED"}
                count={systemLabelCount(labels, "SNOOZED")}
                icon={<Clock3 aria-hidden="true" />}
                label="Snoozed"
                onClick={() => {
                  resetPager();
                  setFolder("SNOOZED");
                  setCustomLabelId(null);
                }}
              />
              <FolderButton
                active={folder === "SENT"}
                count={systemLabelCount(labels, "SENT", "total")}
                icon={<Send aria-hidden="true" />}
                label="Sent"
                onClick={() => {
                  resetPager();
                  setFolder("SENT");
                  setCustomLabelId(null);
                }}
              />
              <FolderButton
                active={folder === "DRAFTS"}
                count={systemLabelCount(labels, "DRAFT", "total")}
                icon={<FileText aria-hidden="true" />}
                label="Drafts"
                onClick={() => {
                  resetPager();
                  setFolder("DRAFTS");
                  setCustomLabelId(null);
                }}
              />
              <FolderButton
                active={folder === "IMPORTANT"}
                count={systemLabelCount(labels, "IMPORTANT")}
                icon={<TriangleAlert aria-hidden="true" />}
                label="Important"
                onClick={() => {
                  resetPager();
                  setFolder("IMPORTANT");
                  setCustomLabelId(null);
                }}
              />
              <FolderButton
                active={folder === "CATEGORY_PURCHASES"}
                count={systemLabelCount(labels, "CATEGORY_PURCHASES")}
                icon={<ShoppingBag aria-hidden="true" />}
                label="Purchases"
                onClick={() => {
                  resetPager();
                  setFolder("CATEGORY_PURCHASES");
                  setCustomLabelId(null);
                }}
              />
              <FolderButton
                active={folder === "CATEGORY_FORUMS"}
                count={systemLabelCount(labels, "CATEGORY_FORUMS")}
                icon={<Users aria-hidden="true" />}
                label="Forums"
                onClick={() => {
                  resetPager();
                  setFolder("CATEGORY_FORUMS");
                  setCustomLabelId(null);
                }}
              />
              <FolderButton
                active={folder === "SPAM"}
                count={systemLabelCount(labels, "SPAM")}
                icon={<ShieldAlert aria-hidden="true" />}
                label="Spam"
                onClick={() => {
                  resetPager();
                  setFolder("SPAM");
                  setCustomLabelId(null);
                }}
              />
              <FolderButton
                active={folder === "TRASH"}
                count={systemLabelCount(labels, "TRASH", "total")}
                icon={<Trash2 aria-hidden="true" />}
                label="Trash"
                onClick={() => {
                  resetPager();
                  setFolder("TRASH");
                  setCustomLabelId(null);
                }}
              />
              <FolderButton
                active={folder === "ALL_MAIL"}
                count={systemLabelCount(labels, "INBOX", "total")}
                icon={<Mail aria-hidden="true" />}
                label="All mail"
                onClick={() => {
                  resetPager();
                  setFolder("ALL_MAIL");
                  setCustomLabelId(null);
                }}
              />
            </nav>

            <div className="mnx-gmail-labels">
              <div className="mnx-gmail-sidebar-heading">
                <span>Labels</span>
                <div>
                  <CommunicationButton
                    type="button"
                    variant="secondary"
                    size="compact"
                    onClick={() => setShowCreateLabel(true)}
                  >
                    <Plus aria-hidden="true" />
                    New
                  </CommunicationButton>
                  <CommunicationButton
                    type="button"
                    variant="secondary"
                    size="compact"
                    onClick={() => setShowManageLabels(true)}
                  >
                    <Tag aria-hidden="true" />
                    Manage
                  </CommunicationButton>
                </div>
              </div>
              {loadingLabels ? (
                <p className="mnx-gmail-sidebar-muted">Loading labels…</p>
              ) : visibleUserLabels.length === 0 ? (
                <p className="mnx-gmail-sidebar-muted">No custom labels yet.</p>
              ) : (
                <div className="mnx-gmail-custom-labels">
                  {sidebarLabels.map((label) => (
                    <FolderButton
                      key={label.id}
                      active={folder === "CUSTOM" && customLabelId === label.id}
                      count={label.threadsUnread ?? 0}
                      icon={<Tag aria-hidden="true" />}
                      label={label.name}
                      onClick={() => {
                        resetPager();
                        setFolder("CUSTOM");
                        setCustomLabelId(label.id);
                      }}
                    />
                  ))}
                  {visibleUserLabels.length > SIDEBAR_LABEL_PREVIEW ? (
                    <CommunicationButton
                      type="button"
                      variant="secondary"
                      size="compact"
                      className="mnx-gmail-sidebar-more"
                      onClick={() => setShowAllSidebarLabels((current) => !current)}
                    >
                      {showAllSidebarLabels
                        ? "Show fewer labels"
                        : `Show all ${visibleUserLabels.length} labels`}
                    </CommunicationButton>
                  ) : null}
                </div>
              )}
            </div>
          </aside>

          <main
            className={[
              "mnx-gmail-main",
              showConversationView ? "is-conversation-view" : "is-list-view",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <div className="mnx-gmail-list-shell">
            <div className="mnx-gmail-list">
              <div className="mnx-gmail-list-header">
                <div className="mnx-gmail-list-title">
                  <div>
                    <strong>Workspace inbox</strong>
                    <p>Read, organize, and act on connected conversations.</p>
                  </div>
                </div>
                <CommunicationButton
                  type="button"
                  variant="secondary"
                  size="compact"
                  onClick={() => {
                    resetPager();
                    setSearchQuery(searchDraft);
                  }}
                >
                  <Star aria-hidden="true" />
                  Customize view
                </CommunicationButton>
              </div>

              {folder === "INBOX" && !searchQuery ? (
                <div className="mnx-gmail-tabs" role="tablist" aria-label="Inbox categories">
                  <InboxTabButton
                    active={inboxTab === "PRIMARY"}
                    badge={systemLabelCount(labels, "CATEGORY_PERSONAL")}
                    description="Priority conversations"
                    icon={<Inbox aria-hidden="true" />}
                    label="Primary"
                    onClick={() => {
                      resetPager();
                      setInboxTab("PRIMARY");
                    }}
                  />
                  <InboxTabButton
                    active={inboxTab === "PROMOTIONS"}
                    badge={systemLabelCount(labels, "CATEGORY_PROMOTIONS")}
                    description="Offers and campaigns"
                    icon={<Tag aria-hidden="true" />}
                    label="Promotions"
                    onClick={() => {
                      resetPager();
                      setInboxTab("PROMOTIONS");
                    }}
                  />
                  <InboxTabButton
                    active={inboxTab === "SOCIAL"}
                    badge={systemLabelCount(labels, "CATEGORY_SOCIAL")}
                    description="Community and social mail"
                    icon={<Users aria-hidden="true" />}
                    label="Social"
                    onClick={() => {
                      resetPager();
                      setInboxTab("SOCIAL");
                    }}
                  />
                  <InboxTabButton
                    active={inboxTab === "UPDATES"}
                    badge={systemLabelCount(labels, "CATEGORY_UPDATES")}
                    description="Receipts, alerts, and reports"
                    icon={<TriangleAlert aria-hidden="true" />}
                    label="Updates"
                    onClick={() => {
                      resetPager();
                      setInboxTab("UPDATES");
                    }}
                  />
                </div>
              ) : null}

              <div className="mnx-gmail-filter-row">
                <div className="mnx-gmail-filter-search">
                  <Search aria-hidden="true" />
                  <span>{searchQuery.trim() || "Search conversations"}</span>
                </div>
                <div className="mnx-gmail-filter-chips">
                  {activeSearchFilters.map((filter) => (
                    <CommunicationButton
                      key={filter}
                      type="button"
                      variant="secondary"
                      size="compact"
                      className="mnx-gmail-filter-chip"
                    >
                      {filter}
                    </CommunicationButton>
                  ))}
                </div>
              </div>

              <header className="mnx-gmail-toolbar">
                <div className="mnx-gmail-toolbar-left">
                  <label className="mnx-gmail-checkbox">
                    <CommunicationInput
                      type="checkbox"
                      checked={threads.length > 0 && selectedThreadIds.length === threads.length}
                      onChange={toggleSelectAll}
                    />
                    <span aria-hidden="true">
                      <Square aria-hidden="true" />
                    </span>
                  </label>
                  <CommunicationButton
                    type="button"
                    variant="secondary"
                    size="compact"
                    onClick={() => void refreshCurrentView()}
                  >
                    <RefreshCw aria-hidden="true" />
                  </CommunicationButton>
                  <CommunicationButton
                    type="button"
                    variant="secondary"
                    size="compact"
                    disabled={selectedCount === 0 || bulkWorking}
                    onClick={() =>
                      void applyThreadModification(
                        selectedThreadIds,
                        [],
                        ["INBOX"],
                        "Archived selected threads.",
                      )
                    }
                  >
                    <Archive aria-hidden="true" />
                    Archive
                  </CommunicationButton>
                  <CommunicationButton
                    type="button"
                    variant="secondary"
                    size="compact"
                    disabled={selectedCount === 0 || bulkWorking}
                    onClick={() =>
                      void applyThreadModification(
                        selectedThreadIds,
                        ["UNREAD"],
                        [],
                        "Marked selected threads unread.",
                      )
                    }
                  >
                    <Mail aria-hidden="true" />
                    Unread
                  </CommunicationButton>
                  <CommunicationButton
                    type="button"
                    variant="secondary"
                    size="compact"
                    disabled={selectedCount === 0 || bulkWorking}
                    onClick={() =>
                      void applyThreadModification(
                        selectedThreadIds,
                        ["SPAM"],
                        ["INBOX"],
                        "Reported selected threads as spam.",
                      )
                    }
                  >
                    <ShieldAlert aria-hidden="true" />
                    Spam
                  </CommunicationButton>
                  <CommunicationButton
                    type="button"
                    variant="secondary"
                    size="compact"
                    disabled={selectedCount === 0 || bulkWorking}
                    onClick={() =>
                      void applyThreadModification(
                        selectedThreadIds,
                        ["TRASH"],
                        ["INBOX"],
                        "Moved selected threads to trash.",
                      )
                    }
                  >
                    <Trash2 aria-hidden="true" />
                    Delete
                  </CommunicationButton>
                </div>
                <div className="mnx-gmail-toolbar-right">
                  <div className="mnx-gmail-label-apply">
                    <NativeSelect
                      value={labelToApply}
                      onChange={(event) => setLabelToApply(event.target.value)}
                      className="mnx-gmail-select"
                    >
                      <option value="">Apply label…</option>
                      {visibleUserLabels.map((label) => (
                        <option key={label.id} value={label.id}>
                          {label.name}
                        </option>
                      ))}
                    </NativeSelect>
                    <CommunicationButton
                      type="button"
                      variant="secondary"
                      size="compact"
                      disabled={!labelToApply || selectedCount === 0 || bulkWorking}
                      onClick={() =>
                        void applyThreadModification(
                          selectedThreadIds,
                          [labelToApply],
                          [],
                          "Applied label to selected threads.",
                        )
                      }
                    >
                      <Tag aria-hidden="true" />
                      Label
                    </CommunicationButton>
                  </div>
                  <span className="mnx-gmail-toolbar-count">
                    {threads.length === 0 ? "0" : `${pagerStart}-${pagerEnd}`}
                  </span>
                  <CommunicationButton
                    type="button"
                    variant="secondary"
                    size="compact"
                    disabled={pageIndex === 0}
                    onClick={() => setPageIndex((current) => Math.max(0, current - 1))}
                  >
                    <ChevronLeft aria-hidden="true" />
                  </CommunicationButton>
                  <CommunicationButton
                    type="button"
                    variant="secondary"
                    size="compact"
                    disabled={!nextPageToken}
                    onClick={() => {
                      if (!nextPageToken) return;
                      if (pageIndex === pageHistory.length - 1) {
                        setPageHistory((current) => [...current, nextPageToken]);
                      }
                      setPageIndex((current) => current + 1);
                    }}
                  >
                    <ChevronRight aria-hidden="true" />
                  </CommunicationButton>
                </div>
              </header>

              <div className="mnx-gmail-thread-list" role="list">
                {loadingThreads ? (
                  <div className="mnx-gmail-list-state">Loading mailbox…</div>
                ) : error && !threads.length ? (
                  <div className="mnx-gmail-list-state">{error}</div>
                ) : threads.length === 0 ? (
                  <div className="mnx-gmail-list-state">No threads matched this mailbox view.</div>
                ) : (
                  threads.map((thread) => {
                    const selected = selectedThread?.id === thread.id;
                    const checked = selectedThreadIds.includes(thread.id);
                    return (
                      <div
                        key={thread.id}
                        className={[
                          "mnx-gmail-thread-row",
                          thread.isUnread ? "is-unread" : "",
                          selected ? "is-selected" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        role="listitem"
                        onClick={() => void openThread(thread)}
                      >
                        <div className="mnx-gmail-thread-row-leading">
                          <label
                            className="mnx-gmail-checkbox"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <CommunicationInput
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleThreadSelection(thread.id)}
                            />
                            <span aria-hidden="true">
                              <Square aria-hidden="true" />
                            </span>
                          </label>
                          <CommunicationButton
                            type="button"
                            variant="secondary"
                            size="compact"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleStarToggle(thread);
                            }}
                          >
                            <Star
                              aria-hidden="true"
                              className={thread.isStarred ? "is-starred" : undefined}
                            />
                          </CommunicationButton>
                        </div>
                        <div className="mnx-gmail-thread-row-sender">
                          {getAddressName(thread.from)}
                        </div>
                        <div className="mnx-gmail-thread-row-content">
                          <strong>{thread.subject || "(no subject)"}</strong>
                          <span>{thread.snippet}</span>
                        </div>
                        <time className="mnx-gmail-thread-row-date">
                          {formatDateLabel(thread.date)}
                        </time>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <aside className="mnx-gmail-insights">
              <section className="mnx-gmail-insight-card">
                <div className="mnx-gmail-insight-card-header">
                  <strong>Inbox overview</strong>
                </div>
                <div className="mnx-gmail-insight-grid">
                  <div className="mnx-gmail-insight-stat">
                    <strong>{unreadInboxThreads}</strong>
                    <span>Unread</span>
                  </div>
                  <div className="mnx-gmail-insight-stat">
                    <strong>{totalInboxThreads}</strong>
                    <span>Total conversations</span>
                  </div>
                </div>
                <div className="mnx-gmail-action-list">
                  <CommunicationButton
                    type="button"
                    variant="secondary"
                    className="mnx-gmail-action-item"
                    onClick={() => setShowCompose(true)}
                  >
                    <PenLine aria-hidden="true" />
                    <span>
                      <strong>Compose mail</strong>
                      <small>Start a new message</small>
                    </span>
                  </CommunicationButton>
                  <CommunicationButton
                    type="button"
                    variant="secondary"
                    className="mnx-gmail-action-item"
                    onClick={() => {
                      resetPager();
                      setFolder("DRAFTS");
                      setCustomLabelId(null);
                    }}
                  >
                    <FileText aria-hidden="true" />
                    <span>
                      <strong>Open drafts</strong>
                      <small>{draftThreads} drafts available</small>
                    </span>
                  </CommunicationButton>
                  <CommunicationButton
                    type="button"
                    variant="secondary"
                    className="mnx-gmail-action-item"
                    onClick={() => void refreshCurrentView()}
                  >
                    <RefreshCw aria-hidden="true" />
                    <span>
                      <strong>Refresh mailbox</strong>
                      <small>Pull the latest Gmail changes</small>
                    </span>
                  </CommunicationButton>
                </div>
              </section>
            </aside>
            </div>

            <section className="mnx-gmail-detail">
              {selectedThread ? (
                <>
                  <header className="mnx-gmail-detail-header mnx-gmail-conversation-toolbar">
                    <div className="mnx-gmail-inline-actions">
                      <CommunicationButton
                        type="button"
                        variant="secondary"
                        size="compact"
                        onClick={() => setSelectedThread(null)}
                      >
                        <ArrowLeft aria-hidden="true" />
                        Back
                      </CommunicationButton>
                      <CommunicationButton
                        type="button"
                        variant="secondary"
                        size="compact"
                        onClick={() =>
                          void applyThreadModification(
                            [selectedThread.id],
                            [],
                            ["INBOX"],
                            "Thread archived.",
                          )
                        }
                      >
                        <Archive aria-hidden="true" />
                        Archive
                      </CommunicationButton>
                      <CommunicationButton
                        type="button"
                        variant="secondary"
                        size="compact"
                        onClick={() =>
                          void applyThreadModification(
                            [selectedThread.id],
                            threadIsUnread(selectedThread) ? [] : ["UNREAD"],
                            threadIsUnread(selectedThread) ? ["UNREAD"] : [],
                            threadIsUnread(selectedThread)
                              ? "Marked thread read."
                              : "Marked thread unread.",
                          )
                        }
                      >
                        <Mail aria-hidden="true" />
                        {threadIsUnread(selectedThread) ? "Read" : "Unread"}
                      </CommunicationButton>
                      <CommunicationButton
                        type="button"
                        variant="secondary"
                        size="compact"
                        onClick={() =>
                          void applyThreadModification(
                            [selectedThread.id],
                            ["SPAM"],
                            ["INBOX"],
                            "Reported thread as spam.",
                          )
                        }
                      >
                        <ShieldAlert aria-hidden="true" />
                        Spam
                      </CommunicationButton>
                      <CommunicationButton
                        type="button"
                        variant="secondary"
                        size="compact"
                        onClick={() =>
                          void applyThreadModification(
                            [selectedThread.id],
                            threadIsStarred(selectedThread) ? [] : ["STARRED"],
                            threadIsStarred(selectedThread) ? ["STARRED"] : [],
                            threadIsStarred(selectedThread)
                              ? "Removed star."
                              : "Starred thread.",
                          )
                        }
                      >
                        <Star aria-hidden="true" />
                        {threadIsStarred(selectedThread) ? "Unstar" : "Star"}
                      </CommunicationButton>
                      <CommunicationButton
                        type="button"
                        variant="secondary"
                        size="compact"
                        onClick={() =>
                          void applyThreadModification(
                            [selectedThread.id],
                            ["TRASH"],
                            ["INBOX"],
                            "Moved thread to trash.",
                          )
                        }
                      >
                        <Trash2 aria-hidden="true" />
                        Delete
                      </CommunicationButton>
                    </div>
                    <div className="mnx-gmail-inline-actions">
                      <span className="mnx-gmail-toolbar-count">
                        {threads.findIndex((thread) => thread.id === selectedThread.id) + 1} of{" "}
                        {Math.max(threads.length, totalInboxThreads)}
                      </span>
                      <CommunicationButton
                        type="button"
                        variant="secondary"
                        size="compact"
                        disabled={pageIndex === 0 && threads.findIndex((thread) => thread.id === selectedThread.id) <= 0}
                        onClick={() => {
                          const currentIndex = threads.findIndex(
                            (thread) => thread.id === selectedThread.id,
                          );
                          if (currentIndex <= 0) return;
                          void openThread(threads[currentIndex - 1]);
                        }}
                      >
                        <ChevronLeft aria-hidden="true" />
                      </CommunicationButton>
                      <CommunicationButton
                        type="button"
                        variant="secondary"
                        size="compact"
                        disabled={
                          threads.findIndex((thread) => thread.id === selectedThread.id) >=
                          threads.length - 1
                        }
                        onClick={() => {
                          const currentIndex = threads.findIndex(
                            (thread) => thread.id === selectedThread.id,
                          );
                          if (currentIndex < 0 || currentIndex >= threads.length - 1) return;
                          void openThread(threads[currentIndex + 1]);
                        }}
                      >
                        <ChevronRight aria-hidden="true" />
                      </CommunicationButton>
                      <ButtonLink
                        href={`https://mail.google.com/mail/u/0/#inbox/${selectedThread.id}`}
                        variant="inverse"
                        size="sm"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open Gmail
                      </ButtonLink>
                    </div>
                  </header>

                  <div className="mnx-gmail-conversation-shell">
                    <div className="mnx-gmail-conversation-main">
                      <section className="mnx-gmail-conversation-hero">
                        <div className="mnx-gmail-conversation-hero-copy">
                          <div className="mnx-gmail-conversation-subject-row">
                            <h2>{selectedThread.subject || "(no subject)"}</h2>
                            <span className="mnx-gmail-list-badge">Workspace mail</span>
                            {folder === "INBOX" ? (
                              <span className="mnx-gmail-conversation-label">Inbox</span>
                            ) : null}
                            {selectedThreadDraftMessages.length ? (
                              <span className="mnx-gmail-conversation-label">
                                {selectedThreadDraftMessages.length} draft
                                {selectedThreadDraftMessages.length === 1 ? "" : "s"}
                              </span>
                            ) : null}
                          </div>
                          <p>
                            {selectedThreadVisibleMessages.length} message
                            {selectedThreadVisibleMessages.length === 1 ? "" : "s"} in this
                            conversation
                          </p>
                        </div>
                        <div className="mnx-gmail-inline-actions">
                          <CommunicationButton
                            type="button"
                            variant="secondary"
                            size="compact"
                            onClick={() => setReplyMode("reply")}
                          >
                            <Reply aria-hidden="true" />
                            Reply
                          </CommunicationButton>
                          <CommunicationButton
                            type="button"
                            variant="secondary"
                            size="compact"
                            onClick={() => setReplyMode("replyAll")}
                          >
                            <ReplyAll aria-hidden="true" />
                            Reply all
                          </CommunicationButton>
                          <CommunicationButton
                            type="button"
                            variant="secondary"
                            size="compact"
                            onClick={() => {
                              const latestMessage =
                                selectedThreadLastMessage ??
                                selectedThread.messages[selectedThread.messages.length - 1];
                              setComposeState({
                                to: "",
                                cc: "",
                                bcc: "",
                                subject: selectedThread.subject.startsWith("Fwd:")
                                  ? selectedThread.subject
                                  : `Fwd: ${selectedThread.subject}`,
                                body: `\n\n---------- Forwarded message ---------\nFrom: ${latestMessage.from}\nDate: ${latestMessage.date}\nSubject: ${selectedThread.subject}\nTo: ${latestMessage.to}\n\n${latestMessage.bodyText || latestMessage.snippet}`,
                                attachments: [],
                              });
                              setShowComposeCc(false);
                              setShowComposeBcc(false);
                              setShowCompose(true);
                            }}
                          >
                            <Forward aria-hidden="true" />
                            Forward
                          </CommunicationButton>
                        </div>
                      </section>

                      <div className="mnx-gmail-message-stack">
                        {selectedThreadDraftMessages.length ? (
                          <div className="mnx-gmail-message-banner">
                            <span>
                              {selectedThreadDraftMessages.length} unsent draft
                              {selectedThreadDraftMessages.length === 1 ? " is" : "s are"} hidden
                              from this conversation timeline.
                            </span>
                            {latestHiddenDraft?.draftId ? (
                              <CommunicationButton
                                type="button"
                                variant="secondary"
                                size="compact"
                                disabled={sendingHiddenDraftId === latestHiddenDraft.id}
                                onClick={() => void handleSendHiddenDraft(latestHiddenDraft)}
                              >
                                <Send aria-hidden="true" />
                                {sendingHiddenDraftId === latestHiddenDraft.id
                                  ? "Sending draft..."
                                  : "Send draft"}
                              </CommunicationButton>
                            ) : null}
                          </div>
                        ) : null}
                        {selectedThreadVisibleMessages.length === 0 ? (
                          <div className="mnx-gmail-detail-empty">
                            <p>
                              This thread only contains draft messages. Send the hidden draft
                              below or open the Drafts mailbox if you want to keep editing.
                            </p>
                            {latestHiddenDraft?.draftId ? (
                              <CommunicationButton
                                type="button"
                                variant="secondary"
                                size="compact"
                                disabled={sendingHiddenDraftId === latestHiddenDraft.id}
                                onClick={() => void handleSendHiddenDraft(latestHiddenDraft)}
                              >
                                <Send aria-hidden="true" />
                                {sendingHiddenDraftId === latestHiddenDraft.id
                                  ? "Sending draft..."
                                  : "Send draft"}
                              </CommunicationButton>
                            ) : null}
                          </div>
                        ) : null}
                        {selectedThreadVisibleMessages.map((message) => (
                      <div key={message.id} className="mnx-gmail-message-card">
                        <header className="mnx-gmail-message-header">
                          <div>
                            <strong>{getAddressName(message.from)}</strong>
                            <p>
                              From {message.from}
                              {message.cc ? ` • Cc ${message.cc}` : ""}
                            </p>
                          </div>
                          <div
                            className="mnx-gmail-inline-actions mnx-gmail-message-actions"
                            data-message-action-root="true"
                          >
                            <time>{formatDateTimeLabel(message.date)}</time>
                            <CommunicationButton
                              type="button"
                              variant="secondary"
                              size="compact"
                              className="mnx-gmail-message-action-button"
                              data-message-popover-trigger="reaction"
                              data-message-id={message.id}
                              onClick={(event) => {
                                if (openReactionPickerId === message.id) {
                                  setOpenReactionPickerId(null);
                                  setMessagePopoverPosition(null);
                                  return;
                                }
                                openMessagePopover(event, message.id, "reaction");
                              }}
                            >
                              React
                            </CommunicationButton>
                            <CommunicationButton
                              type="button"
                              variant="secondary"
                              size="compact"
                              className="mnx-gmail-message-action-button"
                              onClick={() => handleMessageReply(message)}
                            >
                              <Reply aria-hidden="true" />
                              Reply
                            </CommunicationButton>
                            <CommunicationButton
                              type="button"
                              variant="secondary"
                              size="compact"
                              className="mnx-gmail-message-action-button"
                              data-message-popover-trigger="menu"
                              data-message-id={message.id}
                              onClick={(event) => {
                                if (openMessageMenuId === message.id) {
                                  setOpenMessageMenuId(null);
                                  setMessagePopoverPosition(null);
                                  return;
                                }
                                openMessagePopover(event, message.id, "menu");
                              }}
                            >
                              <EllipsisVertical aria-hidden="true" />
                            </CommunicationButton>
                          </div>
                        </header>

                        {message.listUnsubscribe ? (
                          <div className="mnx-gmail-message-banner">
                            <span>This message includes an unsubscribe action.</span>
                            <CommunicationButton
                              type="button"
                              variant="secondary"
                              size="compact"
                              onClick={() => void handleUnsubscribe(message.listUnsubscribe!)}
                            >
                              Unsubscribe
                            </CommunicationButton>
                          </div>
                        ) : null}

                        <div
                          className="mnx-gmail-message-body"
                          dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(resolveMessageHtml(message)),
                          }}
                        />

                        {message.attachments?.filter((attachment) => !attachment.isInline).length ? (
                          <div className="mnx-gmail-attachment-grid">
                            {message.attachments
                              .filter((attachment) => !attachment.isInline)
                              .map((attachment) => (
                                <a
                                  key={attachment.id}
                                  href={buildAttachmentUrl(message.id, attachment)}
                                  className={[
                                    "mnx-gmail-attachment-card",
                                    isPreviewableAttachment(attachment)
                                      ? "is-previewable"
                                      : "",
                                  ]
                                    .filter(Boolean)
                                    .join(" ")}
                                >
                                  {isPreviewableAttachment(attachment) ? (
                                    <img
                                      src={buildAttachmentUrl(message.id, attachment, {
                                        disposition: "inline",
                                      })}
                                      alt={attachment.name}
                                      className="mnx-gmail-attachment-preview"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <Paperclip aria-hidden="true" />
                                  )}
                                  <span>
                                    <strong>{attachment.name}</strong>
                                    <small>{formatBytes(attachment.size)}</small>
                                  </span>
                                  <Download aria-hidden="true" />
                                </a>
                              ))}
                          </div>
                        ) : null}
                      </div>
                        ))}
                      </div>

                      <footer className="mnx-gmail-reply-box">
                        <div className="mnx-gmail-reply-heading">
                          <strong>{replyMode === "reply" ? "Reply" : "Reply all"}</strong>
                          <span>
                            Keyboard shortcuts: <kbd>c</kbd> compose, <kbd>/</kbd> search,
                            <kbd>j</kbd>/<kbd>k</kbd> move
                          </span>
                        </div>
                        <CommunicationTextarea
                          ref={replyTextareaRef}
                          rows={7}
                          value={replyBody}
                          onChange={(event) => setReplyBody(event.target.value)}
                          placeholder="Reply to this conversation"
                        />
                        <div className="mnx-gmail-inline-actions">
                          <CommunicationButton
                            type="button"
                            variant="primary"
                            disabled={!replyBody.trim() || sendingReply}
                            onClick={() => void handleReplySend()}
                          >
                            <Send aria-hidden="true" />
                            {sendingReply ? "Sending…" : "Send"}
                          </CommunicationButton>
                          <CommunicationButton
                            type="button"
                            variant="secondary"
                            onClick={() => setReplyBody("")}
                          >
                            <X aria-hidden="true" />
                            Clear
                          </CommunicationButton>
                        </div>
                      </footer>
                    </div>

                    <aside className="mnx-gmail-conversation-rail">
                      <section className="mnx-gmail-insight-card">
                        <div className="mnx-gmail-insight-card-header">
                          <strong>About this conversation</strong>
                        </div>
                        <div className="mnx-gmail-shortcut-list">
                          <div>
                            <span>First message</span>
                            <small>{selectedThreadFirstMessage ? formatDateTimeLabel(selectedThreadFirstMessage.date) : "—"}</small>
                          </div>
                          <div>
                            <span>Last message</span>
                            <small>{selectedThreadLastMessage ? formatDateTimeLabel(selectedThreadLastMessage.date) : "—"}</small>
                          </div>
                          <div>
                            <span>Messages</span>
                            <small>{selectedThreadVisibleMessages.length}</small>
                          </div>
                          <div>
                            <span>Status</span>
                            <small>{threadIsUnread(selectedThread) ? "Needs review" : "Open"}</small>
                          </div>
                        </div>
                      </section>

                      <section className="mnx-gmail-insight-card">
                        <div className="mnx-gmail-insight-card-header">
                          <strong>People</strong>
                        </div>
                        <div className="mnx-gmail-action-list">
                          {selectedThreadPeople.slice(0, 4).map((person) => (
                            <div key={person} className="mnx-gmail-conversation-person">
                              <span className="mnx-gmail-conversation-avatar">
                                {getAddressName(person).slice(0, 1).toUpperCase()}
                              </span>
                              <span>
                                <strong>{getAddressName(person)}</strong>
                                <small>{getAddressEmail(person)}</small>
                              </span>
                            </div>
                          ))}
                        </div>
                      </section>

                      <section className="mnx-gmail-insight-card">
                        <div className="mnx-gmail-insight-card-header">
                          <strong>Labels & attachments</strong>
                        </div>
                        <div className="mnx-gmail-action-list">
                          <div className="mnx-gmail-conversation-meta-row">
                            <Tag aria-hidden="true" />
                            <span>
                              <strong>Job link</strong>
                              <small>Connect this thread to an operational workspace</small>
                            </span>
                          </div>
                          <NativeSelect
                            value={jobToLink}
                            onChange={(event) => setJobToLink(event.target.value)}
                            className="mnx-gmail-select"
                          >
                            <option value="">Link this thread to a job…</option>
                            {jobs.map((job) => (
                              <option key={job.id} value={job.id}>
                                {job.jobNumber} - {job.title}
                              </option>
                            ))}
                          </NativeSelect>
                          <NativeSelect
                            value={linkCategory}
                            onChange={(event) =>
                              setLinkCategory(
                                event.target.value as (typeof JOB_LINK_CATEGORIES)[number],
                              )
                            }
                            className="mnx-gmail-select"
                          >
                            {JOB_LINK_CATEGORIES.map((category) => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                          </NativeSelect>
                          <CommunicationButton
                            type="button"
                            variant="secondary"
                            disabled={!jobToLink || linkingJob}
                            onClick={() => void handleLinkJob()}
                          >
                            <Tag aria-hidden="true" />
                            Link job
                          </CommunicationButton>
                          <div className="mnx-gmail-conversation-meta-row">
                            <Paperclip aria-hidden="true" />
                            <span>
                              <strong>Attachments</strong>
                              <small>{selectedThreadAttachments.length} files in this thread</small>
                            </span>
                          </div>
                        </div>
                      </section>
                    </aside>
                  </div>
                </>
              ) : loadingThread ? (
                <div className="mnx-gmail-detail-empty">Loading conversation…</div>
              ) : (
                <WorkspaceState
                  variant="empty"
                  eyebrow="Mail"
                  title="Open a conversation"
                  description="Select a thread from the list to read, reply, label, or link it into operational job workspaces."
                  icon={<Mail aria-hidden="true" />}
                />
              )}
            </section>
          </main>
        </div>
      </section>

      {showCompose ? (
        <WorkspaceDialogLayer
          open
          onClose={closeCompose}
          labelledBy="communication-compose-title"
          className="mnx-gmail-compose-dialog"
        >
          <section
            className={[
              "mnx-gmail-compose-sheet",
              composeMinimized ? "is-minimized" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <header className="mnx-gmail-compose-sheet-header">
              <div className="mnx-gmail-compose-sheet-title">
                <CommunicationButton
                  type="button"
                  variant="secondary"
                  size="compact"
                  onClick={closeCompose}
                >
                  <ArrowLeft aria-hidden="true" />
                </CommunicationButton>
                <CommunicationButton
                  type="button"
                  variant="secondary"
                  size="compact"
                  onClick={() => setComposeMinimized((current) => !current)}
                >
                  <ChevronDown aria-hidden="true" />
                </CommunicationButton>
                <h2 id="communication-compose-title">To</h2>
              </div>
              <div className="mnx-gmail-compose-sheet-window-actions">
                <CommunicationButton
                  type="button"
                  variant="secondary"
                  size="compact"
                  className="mnx-gmail-compose-inline-toggle"
                  onClick={() => setShowComposeCc((current) => !current)}
                >
                  Cc
                </CommunicationButton>
                <CommunicationButton
                  type="button"
                  variant="secondary"
                  size="compact"
                  className="mnx-gmail-compose-inline-toggle"
                  onClick={() => setShowComposeBcc((current) => !current)}
                >
                  Bcc
                </CommunicationButton>
                <CommunicationButton
                  type="button"
                  variant="secondary"
                  size="compact"
                  onClick={() => setComposeMinimized((current) => !current)}
                >
                  <Minimize2 aria-hidden="true" />
                </CommunicationButton>
                <CommunicationButton
                  type="button"
                  variant="secondary"
                  size="compact"
                  onClick={discardCompose}
                >
                  <Trash2 aria-hidden="true" />
                </CommunicationButton>
                <CommunicationButton
                  type="button"
                  variant="secondary"
                  size="compact"
                  onClick={closeCompose}
                >
                  <X aria-hidden="true" />
                </CommunicationButton>
              </div>
            </header>
            {composeMinimized ? (
              <div className="mnx-gmail-compose-minimized">
                <span>
                  {composeState.subject.trim() || composeState.to.trim() || "Draft message"}
                </span>
                <CommunicationButton
                  type="button"
                  variant="secondary"
                  size="compact"
                  onClick={() => setComposeMinimized(false)}
                >
                  Open
                </CommunicationButton>
              </div>
            ) : null}
            {composeMinimized ? null : (
            <div className="mnx-gmail-compose-fields">
              <div className="mnx-gmail-compose-address-row">
                <span className="mnx-gmail-compose-address-label">To</span>
                <CommunicationInput
                  type="email"
                  placeholder="Recipients"
                  value={composeState.to}
                  onChange={(event) =>
                    setComposeState((current) => ({ ...current, to: event.target.value }))
                  }
                />
              </div>
              {showComposeCc || composeState.cc ? (
                <div className="mnx-gmail-compose-address-row">
                  <span className="mnx-gmail-compose-address-label">Cc</span>
                  <CommunicationInput
                    type="text"
                    placeholder="Carbon copy recipients"
                    value={composeState.cc}
                    onChange={(event) =>
                      setComposeState((current) => ({ ...current, cc: event.target.value }))
                    }
                  />
                </div>
              ) : null}
              {showComposeBcc || composeState.bcc ? (
                <div className="mnx-gmail-compose-address-row">
                  <span className="mnx-gmail-compose-address-label">Bcc</span>
                  <CommunicationInput
                    type="text"
                    placeholder="Blind carbon copy recipients"
                    value={composeState.bcc}
                    onChange={(event) =>
                      setComposeState((current) => ({ ...current, bcc: event.target.value }))
                    }
                  />
                </div>
              ) : null}
              <CommunicationInput
                type="text"
                className="mnx-gmail-compose-subject"
                placeholder="Subject"
                value={composeState.subject}
                onChange={(event) =>
                  setComposeState((current) => ({
                    ...current,
                    subject: event.target.value,
                  }))
                }
              />
              <CommunicationTextarea
                rows={14}
                className="mnx-gmail-compose-editor"
                placeholder="Describe your message"
                value={composeState.body}
                onChange={(event) =>
                  setComposeState((current) => ({ ...current, body: event.target.value }))
                }
              />
              <div className="mnx-gmail-compose-attachments">
                {/* eslint-disable-next-line no-restricted-syntax -- native file picker is required for Gmail-style attachment uploads */}
                <input
                  ref={composeFileInputRef}
                  type="file"
                  hidden
                  multiple
                  onChange={(event) => {
                    const files = Array.from(event.target.files ?? []);
                    setComposeState((current) => ({
                      ...current,
                      attachments: [...current.attachments, ...files],
                    }));
                    event.currentTarget.value = "";
                  }}
                />
                <CommunicationButton
                  type="button"
                  variant="secondary"
                  size="compact"
                  onClick={() => composeFileInputRef.current?.click()}
                >
                  <Paperclip aria-hidden="true" />
                  Attach files
                </CommunicationButton>
                {composeState.attachments.length ? (
                  <div className="mnx-gmail-compose-file-list">
                    {composeState.attachments.map((attachment, index) => (
                      <span key={`${attachment.name}-${index}`} className="mnx-gmail-file-chip">
                        {attachment.name}
                        {/* eslint-disable-next-line no-restricted-syntax -- chip close control is a custom inline mailbox widget */}
                        <button
                          type="button"
                          onClick={() =>
                            setComposeState((current) => ({
                              ...current,
                              attachments: current.attachments.filter(
                                (_, attachmentIndex) => attachmentIndex !== index,
                              ),
                            }))
                          }
                        >
                          <X aria-hidden="true" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            )}
            {composeMinimized ? null : (
            <footer className="mnx-gmail-compose-sheet-footer">
              <div className="mnx-gmail-compose-footer-primary">
                <CommunicationButton
                  type="button"
                  variant="primary"
                  className="mnx-gmail-compose-send"
                  disabled={sendingCompose}
                  onClick={() => void handleComposeSend()}
                >
                  <Send aria-hidden="true" />
                  {sendingCompose ? "Sending…" : "Send"}
                </CommunicationButton>
              </div>
              <div className="mnx-gmail-compose-footer-tools">
                <CommunicationButton
                  type="button"
                  variant="secondary"
                  className="mnx-gmail-compose-tool"
                  disabled={savingDraft}
                  onClick={() => void handleSaveDraft()}
                >
                  <FileText aria-hidden="true" />
                </CommunicationButton>
                <CommunicationButton
                  type="button"
                  variant="secondary"
                  className="mnx-gmail-compose-tool"
                  onClick={() => composeFileInputRef.current?.click()}
                >
                  <Paperclip aria-hidden="true" />
                </CommunicationButton>
                <CommunicationButton
                  type="button"
                  variant="secondary"
                  className="mnx-gmail-compose-tool"
                  onClick={handleComposeInsertLink}
                >
                  <Link2 aria-hidden="true" />
                </CommunicationButton>
                <CommunicationButton
                  type="button"
                  variant="secondary"
                  className="mnx-gmail-compose-tool"
                  onClick={handleComposeFormatting}
                >
                  <Palette aria-hidden="true" />
                </CommunicationButton>
                <CommunicationButton
                  type="button"
                  variant="secondary"
                  className="mnx-gmail-compose-tool"
                  onClick={handleComposeInsertImage}
                >
                  <ImageIcon aria-hidden="true" />
                </CommunicationButton>
                <div className="mnx-gmail-compose-more">
                <CommunicationButton
                  type="button"
                  variant="secondary"
                  className="mnx-gmail-compose-tool"
                  onClick={() => setShowComposeMoreMenu((current) => !current)}
                >
                  <EllipsisVertical aria-hidden="true" />
                </CommunicationButton>
                {showComposeMoreMenu ? (
                  <div className="mnx-gmail-message-popover mnx-gmail-message-menu">
                    <button type="button" onClick={handleComposeInsertSignature}>
                      <FileText aria-hidden="true" />
                      Insert signature
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowComposeCc((current) => !current);
                        setShowComposeBcc((current) => !current);
                        setShowComposeMoreMenu(false);
                      }}
                    >
                      <Users aria-hidden="true" />
                      Toggle Cc and Bcc
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        resetCompose();
                        setShowComposeMoreMenu(false);
                      }}
                    >
                      <Trash2 aria-hidden="true" />
                      Clear draft
                    </button>
                  </div>
                ) : null}
                </div>
                <CommunicationButton
                  type="button"
                  variant="secondary"
                  className="mnx-gmail-compose-tool mnx-gmail-compose-discard"
                  onClick={discardCompose}
                >
                  <Trash2 aria-hidden="true" />
                </CommunicationButton>
              </div>
            </footer>
            )}
          </section>
        </WorkspaceDialogLayer>
      ) : null}

      {activeMessagePopover && messagePopoverPosition ? (
        <div
          ref={messagePopoverRef}
          className={[
            "mnx-gmail-message-popover",
            openReactionPickerId === activeMessagePopover.id
              ? "mnx-gmail-reaction-picker"
              : "mnx-gmail-message-menu",
          ]
            .filter(Boolean)
            .join(" ")}
          data-message-popover-layer="true"
          style={{
            position: "fixed",
            top: `${messagePopoverPosition.top}px`,
            left: `${messagePopoverPosition.left}px`,
            zIndex: 40,
          }}
        >
          {openReactionPickerId === activeMessagePopover.id
            ? ["👍", "❤️", "🎉", "🙏", "👀", "✅"].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="mnx-gmail-reaction-option"
                  onClick={() => handleMessageReaction(activeMessagePopover, emoji)}
                >
                  {emoji}
                </button>
              ))
            : null}
          {openMessageMenuId === activeMessagePopover.id ? (
            <>
              <button type="button" onClick={() => handleMessageReply(activeMessagePopover)}>
                <Reply aria-hidden="true" />
                Reply
              </button>
              <button type="button" onClick={() => handleMessageForward(activeMessagePopover)}>
                <Forward aria-hidden="true" />
                Forward
              </button>
              <button type="button" onClick={() => void openShareModal(activeMessagePopover)}>
                <Users aria-hidden="true" />
                Share in chat
              </button>
              <button
                type="button"
                onClick={() =>
                  void applyThreadModification(
                    [selectedThread!.id],
                    ["UNREAD"],
                    [],
                    "Marked thread unread.",
                  )
                }
              >
                <Mail aria-hidden="true" />
                Mark unread from here
              </button>
              <button
                type="button"
                onClick={() =>
                  void applyThreadModification(
                    [selectedThread!.id],
                    ["SPAM"],
                    ["INBOX"],
                    "Reported thread as spam.",
                  )
                }
              >
                <ShieldAlert aria-hidden="true" />
                Report spam
              </button>
              <button
                type="button"
                onClick={() =>
                  void applyThreadModification(
                    [selectedThread!.id],
                    ["TRASH"],
                    ["INBOX"],
                    "Moved thread to trash.",
                  )
                }
              >
                <Trash2 aria-hidden="true" />
                Delete
              </button>
              <button
                type="button"
                onClick={() => {
                  const printWindow = window.open("", "_blank");
                  if (!printWindow || !selectedThread) return;
                  printWindow.document.write(`
                    <html>
                      <head>
                        <title>${selectedThread.subject}</title>
                      </head>
                      <body style="font-family: sans-serif; padding: 24px; line-height: 1.6;">
                        <h1>${selectedThread.subject}</h1>
                        <p><strong>From:</strong> ${activeMessagePopover.from}</p>
                        <p><strong>To:</strong> ${activeMessagePopover.to}</p>
                        <p><strong>Date:</strong> ${activeMessagePopover.date}</p>
                        <hr />
                        ${DOMPurify.sanitize(activeMessagePopover.bodyHtml || `<pre>${activeMessagePopover.bodyText}</pre>`)}
                      </body>
                    </html>
                  `);
                  printWindow.document.close();
                  printWindow.print();
                  setOpenMessageMenuId(null);
                  setMessagePopoverPosition(null);
                }}
              >
                <Printer aria-hidden="true" />
                Print
              </button>
              <button type="button" onClick={() => handleDownloadMessage(activeMessagePopover)}>
                <Download aria-hidden="true" />
                Download message
              </button>
              <button type="button" onClick={() => handleShowOriginal(activeMessagePopover)}>
                <FileText aria-hidden="true" />
                Show original
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      {showCreateLabel ? (
        <WorkspaceDialogLayer
          open
          onClose={() => setShowCreateLabel(false)}
          labelledBy="communication-create-label-title"
          size="compact"
        >
          <section className="mnx-gmail-modal-card">
            <header className="mnx-gmail-modal-card-header">
              <h2 id="communication-create-label-title">Create label</h2>
              <CommunicationButton
                type="button"
                variant="secondary"
                size="compact"
                onClick={() => setShowCreateLabel(false)}
              >
                <X aria-hidden="true" />
              </CommunicationButton>
            </header>
            <div className="mnx-gmail-modal-card-body">
              <CommunicationInput
                type="text"
                placeholder="Label name"
                value={newLabelName}
                onChange={(event) => setNewLabelName(event.target.value)}
              />
            </div>
            <footer className="mnx-gmail-modal-card-footer">
              <CommunicationButton
                type="button"
                variant="secondary"
                onClick={() => setShowCreateLabel(false)}
              >
                Cancel
              </CommunicationButton>
              <CommunicationButton
                type="button"
                variant="primary"
                disabled={!newLabelName.trim() || managingLabels}
                onClick={() => void handleCreateLabel()}
              >
                Create
              </CommunicationButton>
            </footer>
          </section>
        </WorkspaceDialogLayer>
      ) : null}

      {showManageLabels ? (
        <WorkspaceDialogLayer
          open
          onClose={() => setShowManageLabels(false)}
          labelledBy="communication-manage-labels-title"
          size="compact"
        >
          <section className="mnx-gmail-modal-card">
            <header className="mnx-gmail-modal-card-header">
              <h2 id="communication-manage-labels-title">Manage labels</h2>
              <CommunicationButton
                type="button"
                variant="secondary"
                size="compact"
                onClick={() => setShowManageLabels(false)}
              >
                <X aria-hidden="true" />
              </CommunicationButton>
            </header>
            <div className="mnx-gmail-modal-card-body">
              {visibleUserLabels.length === 0 ? (
                <p className="mnx-gmail-sidebar-muted">No custom labels available.</p>
              ) : (
                <div className="mnx-gmail-manage-labels">
                  {visibleUserLabels.map((label) => (
                    <div key={label.id} className="mnx-gmail-manage-label-row">
                      <span>{label.name}</span>
                      <CommunicationButton
                        type="button"
                        variant="secondary"
                        size="compact"
                        disabled={managingLabels}
                        onClick={() => void handleDeleteLabel(label.id)}
                      >
                        <Trash2 aria-hidden="true" />
                        Delete
                      </CommunicationButton>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </WorkspaceDialogLayer>
      ) : null}

      {shareState.open ? (
        <WorkspaceDialogLayer
          open
          onClose={() => setShareState({ open: false, destinationId: "", message: "" })}
          labelledBy="communication-share-chat-title"
          size="compact"
        >
          <section className="mnx-gmail-modal-card">
            <header className="mnx-gmail-modal-card-header">
              <h2 id="communication-share-chat-title">Share to Google Chat</h2>
              <CommunicationButton
                type="button"
                variant="secondary"
                size="compact"
                onClick={() => setShareState({ open: false, destinationId: "", message: "" })}
              >
                <X aria-hidden="true" />
              </CommunicationButton>
            </header>
            <div className="mnx-gmail-modal-card-body">
              <NativeSelect
                value={shareState.destinationId}
                onChange={(event) =>
                  setShareState((current) => ({
                    ...current,
                    destinationId: event.target.value,
                  }))
                }
                className="mnx-gmail-select"
              >
                <option value="">Select destination…</option>
                {chatDestinations.map((destination) => (
                  <option key={destination.id} value={destination.id}>
                    {destination.displayName}
                  </option>
                ))}
              </NativeSelect>
              <CommunicationTextarea
                rows={8}
                value={shareState.message}
                onChange={(event) =>
                  setShareState((current) => ({
                    ...current,
                    message: event.target.value,
                  }))
                }
              />
            </div>
            <footer className="mnx-gmail-modal-card-footer">
              <CommunicationButton
                type="button"
                variant="secondary"
                onClick={() => setShareState({ open: false, destinationId: "", message: "" })}
              >
                Cancel
              </CommunicationButton>
              <CommunicationButton
                type="button"
                variant="primary"
                disabled={!shareState.destinationId || !shareState.message.trim() || sharingToChat}
                onClick={() => void handleShareToChat()}
              >
                Share
              </CommunicationButton>
            </footer>
          </section>
        </WorkspaceDialogLayer>
      ) : null}
    </>
  );
}

function FolderButton({
  active,
  count,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  count: number;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    // eslint-disable-next-line no-restricted-syntax -- mailbox folder rows are custom navigation widgets, not generic design-system buttons
    <button
      type="button"
      className={["mnx-gmail-folder-button", active ? "is-active" : ""]
        .filter(Boolean)
        .join(" ")}
      onClick={onClick}
    >
      <span className="mnx-gmail-folder-button-copy">
        {icon}
        <span>{label}</span>
      </span>
      {count > 0 ? <strong>{count}</strong> : null}
    </button>
  );
}

function InboxTabButton({
  active,
  badge,
  description,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  badge: number;
  description: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    // eslint-disable-next-line no-restricted-syntax -- inbox category tabs are custom mailbox controls with tab semantics
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={["mnx-gmail-tab", active ? "is-active" : ""].filter(Boolean).join(" ")}
      onClick={onClick}
    >
      <span className="mnx-gmail-tab-header">
        {icon}
        <strong>{label}</strong>
        {badge > 0 ? <em>{badge}</em> : null}
      </span>
      <small>{description}</small>
    </button>
  );
}
