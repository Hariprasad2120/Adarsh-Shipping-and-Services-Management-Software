"use client";

import { NativeSelect } from "@/components/monolith/native-select";
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps, prefer-const, @typescript-eslint/no-require-imports, react-hooks/immutability, react-hooks/set-state-in-effect */

import { useState, useEffect, useRef, useCallback } from "react";
import {Search, Send, Video, ExternalLink, Hash, User, Briefcase, Folder, Users,AlertCircle, RefreshCw, Mail, Phone, Clock, ArrowRight, Shield, Plus,ChevronDown, Check, X, Star, Info, MessageSquare, Paperclip, Bell,Smile, Bold, Italic, Code, Trash2, Edit2, Pin, ChevronRight, Sparkles, AtSign} from "lucide-react";
import Link from "next/link";
import { useChatContext } from "../_components/chat-provider";

export default function MonolithMessenger() {
  const ctx = useChatContext();
  const {
    jobs, employees, googleSpaces, chatLoading: loading,
    selectedSpaceId, selectedSpaceTitle, selectedSpaceType,
    selectedJob, selectedEmployee,
    messagesBySpace,
    selectSpace, clearSelection,
  } = ctx;

  // Messages timeline state
  const [messages, setMessages] = useState<any[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessageText, setNewMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeShortcut, setActiveShortcut] = useState<string>("home"); // home, starred
  const [starredSpaces, setStarredSpaces] = useState<Set<string>>(new Set());
  const [showCaretDropdown, setShowCaretDropdown] = useState(false);
  const [showDetailsPanel, setShowDetailsPanel] = useState(true);

  // Drafts dictionary: preserves input content per space
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  // Collapsible sidebar sections
  const [collapsedSections, setCollapsedSections] = useState({
    shortcuts: false,
    dms: false,
    jobSpaces: false,
    spaces: false,
    apps: false,
  });

  // Message edits
  const [editingMessageName, setEditingMessageName] = useState<string | null>(null);
  const [editingMessageText, setEditingMessageText] = useState<string>("");

  // Extra menus
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [messageReactions, setMessageReactions] = useState<Record<string, string[]>>({});

  // SSE + polling state (per active space only — cross-space tracking is in ChatProvider)
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "reconnecting" | "disconnected" | "auth_error">("connecting");
  const sseRef = useRef<EventSource | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevMessageCountRef = useRef<number>(0);

  // In-app toast notifications
  const [chatToasts, setChatToasts] = useState<{ id: string; sender: string; snippet: string; spaceId: string; spaceName: string; time: number }[]>([]);

  // Desktop notification preference lives in ChatProvider context
  const desktopNotificationsEnabled = ctx.desktopNotifEnabled;

  // Modals state
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showCreateSpaceModal, setShowCreateSpaceModal] = useState(false);
  const [showManageMembersModal, setShowManageMembersModal] = useState(false);
  const [showSpaceSettingsModal, setShowSpaceSettingsModal] = useState(false);
  const [showSpaceDetailsModal, setShowSpaceDetailsModal] = useState(false);

  // Space creation state
  const [newSpaceName, setNewSpaceName] = useState("");
  const [newSpaceAccess, setNewSpaceAccess] = useState<string>("Private");
  const [newSpaceRequestToJoin, setNewSpaceRequestToJoin] = useState(true);
  const [newSpaceInvitees, setNewSpaceInvitees] = useState<string[]>([]);
  const [spaceCreating, setSpaceCreating] = useState(false);

  // Space settings state
  const [spaceSettingsAccess, setSpaceSettingsAccess] = useState<string>("Private");
  const [spaceSettingsRequestToJoin, setSpaceSettingsRequestToJoin] = useState(true);
  const [spaceSettingsPermissions, setSpaceSettingsPermissions] = useState<string>("all");
  const [spaceSettingsSaving, setSpaceSettingsSaving] = useState(false);

  // Space members state
  const [members, setMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [showAddMemberPopover, setShowAddMemberPopover] = useState(false);
  const [memberActionLoading, setMemberActionLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  // Mirrors messages state so side-effects can compare outside a state updater
  const messagesRef = useRef<any[]>([]);


  // Thin wrapper kept for compatibility with handleLeaveSpace / handleCreateSpace
  const fetchChannelsAndDMs = useCallback(async () => {
    await ctx.refreshSpaces();
  }, [ctx]);

  const handleSyncGoogleAccount = async () => {
    setSyncing(true);
    setSyncToast(null);
    try {
      const res = await fetch("/api/communication/chat/sync", {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        await ctx.refreshSpaces();
        setSyncToast({ message: `Synced ${data.count} spaces from Google Workspace`, type: "success" });
        setTimeout(() => setSyncToast(null), 4000);
      } else {
        setSyncToast({ message: data.error || "Sync failed", type: "error" });
        setTimeout(() => setSyncToast(null), 5000);
      }
    } catch (err: any) {
      console.error("Error syncing Google Chat spaces:", err);
      setSyncToast({ message: err.message || "Network error during sync", type: "error" });
      setTimeout(() => setSyncToast(null), 5000);
    } finally {
      setSyncing(false);
    }
  };

  const fetchMessages = async (spaceId: string, spaceType?: string, spaceTitle?: string) => {
    setMessagesLoading(true);
    try {
      let fetchUrl = `/api/communication/chat/messages?spaceId=${encodeURIComponent(spaceId)}`;
      // Pass DM partner name hint so the backend can resolve sender names
      const type = spaceType || selectedSpaceType;
      const title = spaceTitle || selectedSpaceTitle;
      if (type === "DM" && title) {
        fetchUrl += `&dmPartnerName=${encodeURIComponent(title)}`;
      }
      const res = await fetch(fetchUrl);
      const data = await res.json();
      const msgs = data.messages || [];
      messagesRef.current = msgs;
      setMessages(msgs);
      // Set the baseline count so the FIRST new message is properly detected
      prevMessageCountRef.current = msgs.length;
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    } finally {
      setMessagesLoading(false);
    }
  };

  const fetchSpaceDetails = async (spaceId: string) => {
    try {
      const res = await fetch(`/api/communication/chat/space?spaceId=${encodeURIComponent(spaceId)}`);
      const data = await res.json();
      setSpaceSettingsAccess(data.access || "Private");
      setSpaceSettingsRequestToJoin(data.requestToJoin);
      setSpaceSettingsPermissions(data.membershipPermissions || "all");
    } catch (err) {
      console.error("Failed to fetch space settings:", err);
    }
  };

  const fetchSpaceMembers = async (spaceId: string) => {
    setMembersLoading(true);
    try {
      const res = await fetch(`/api/communication/chat/space/members?spaceId=${encodeURIComponent(spaceId)}`);
      const data = await res.json();
      setMembers(data.memberships || []);
    } catch (err) {
      console.error("Failed to fetch space members:", err);
    } finally {
      setMembersLoading(false);
    }
  };

  // Request notification permission on mount (gated — only if not yet asked)
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Add in-app toast notification helper
  const showChatToast = useCallback((sender: string, snippet: string, spaceId: string, spaceName: string) => {
    const id = `${spaceId}-${Date.now()}`;
    setChatToasts(prev => [...prev.slice(-4), { id, sender, snippet, spaceId, spaceName, time: Date.now() }]);
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setChatToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  // Helper to resolve space name — uses context data, kept for in-page toast naming
  const resolveSpaceName = useCallback((spaceId: string) => {
    const space = googleSpaces.find((s: any) => s.name === spaceId);
    if (space?.displayName && !["Adarsh Operations", "Google Chat DM", "Google User"].includes(space.displayName)) {
      return space.displayName;
    }
    const job = jobs.find((j: any) => j.spaceId === spaceId);
    if (job) return `JOB-${job.jobNumber}`;
    return "Chat";
  }, [googleSpaces, jobs]);

  // ── Auto-select first space once ChatProvider data is ready ──
  const hasAutoSelectedRef = useRef(false);
  useEffect(() => {
    if (loading || hasAutoSelectedRef.current) return;
    if (jobs.length === 0 && googleSpaces.length === 0) return;
    // Provider restored a selection from sessionStorage — don't override
    if (selectedSpaceId) { hasAutoSelectedRef.current = true; return; }
    hasAutoSelectedRef.current = true;

    const urlParams = new URLSearchParams(window.location.search);
    const querySpaceId = urlParams.get("spaceId");

    if (querySpaceId) {
      const match = jobs.find((j: any) => j.spaceId === querySpaceId);
      if (match) {
        handleSelectSpace(match.spaceId, `job-${match.jobNumber}`, "JOB", match, null);
        return;
      }
    }
    if (jobs.length > 0) {
      handleSelectSpace(jobs[0].spaceId, `job-${jobs[0].jobNumber}`, "JOB", jobs[0], null);
      return;
    }
    if (googleSpaces.length > 0) {
      const s = googleSpaces[0];
      const isDM = s.spaceType === "DIRECT_MESSAGE";
      handleSelectSpace(s.name, s.displayName || (isDM ? "Google DM" : "Group Space"), isDM ? "DM" : "SPACE", null, null);
    }
  }, [loading, jobs.length, googleSpaces.length]);

  // On mount with a provider-restored selection, seed messages from cache immediately
  const didSeedOnMountRef = useRef(false);
  useEffect(() => {
    if (didSeedOnMountRef.current) return;
    if (!selectedSpaceId) return;
    didSeedOnMountRef.current = true;
    const cached = messagesBySpace[selectedSpaceId] ?? [];
    if (cached.length > 0) {
      setMessages(cached);
      prevMessageCountRef.current = cached.length;
    } else {
      setMessagesLoading(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSpaceId]);

  // Keep messagesRef in sync so side-effects can compare without being inside a state updater
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Write-through: keep provider message cache current so warm navigation restores instantly
  useEffect(() => {
    if (selectedSpaceId && messages.length > 0) ctx.cacheMessages(selectedSpaceId, messages);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, selectedSpaceId]);

  // Cross-space polling + seeding now live in ChatProvider (persistent across navigation).
  // Drain any toasts queued by the provider and display them in-page.
  useEffect(() => {
    if (ctx.pendingToasts.length === 0) return;
    const toastsToAdd = ctx.pendingToasts;
    ctx.drainToasts();
    setChatToasts(prev => {
      const combined = [...prev, ...toastsToAdd];
      return combined.slice(-5);
    });
    toastsToAdd.forEach(t => {
      setTimeout(() => {
        setChatToasts(prev => prev.filter(x => x.id !== t.id));
      }, 5000);
    });
  }, [ctx.pendingToasts]);

  // Silent message poll — doesn't show loading spinner, used for live updates
  const silentPollMessages = async (spaceId: string, spaceType?: string, spaceTitle?: string) => {
    try {
      let fetchUrl = `/api/communication/chat/messages?spaceId=${encodeURIComponent(spaceId)}`;
      const type = spaceType || selectedSpaceType;
      const title = spaceTitle || selectedSpaceTitle;
      if (type === "DM" && title) {
        fetchUrl += `&dmPartnerName=${encodeURIComponent(title)}`;
      }
      const res = await fetch(fetchUrl);
      const data = await res.json();
      const newMsgs = data.messages || [];

      // Compare against ref — avoids calling setState-from-provider inside a state updater
      const prev = messagesRef.current;
      const prevNames = prev.map((m: any) => m.name).join(",");
      const newNames = newMsgs.map((m: any) => m.name).join(",");
      const changed = prevNames !== newNames || newMsgs.length !== prev.length;

      if (changed) {
        // Activity bump — outside state updater so it doesn't trigger setState-in-render
        if (newMsgs.length > 0) {
          const latestMsg = newMsgs[newMsgs.length - 1];
          ctx.bumpActivity(spaceId, new Date(latestMsg.createTime || Date.now()).getTime());
        }

        // New messages arrived — notify for incoming from others
        if (newMsgs.length > prevMessageCountRef.current && prevMessageCountRef.current > 0) {
          const latestMsg = newMsgs[newMsgs.length - 1];
          if (latestMsg && !latestMsg.isMe) {
            const senderName = latestMsg.sender?.displayName || latestMsg.senderName || "New message";
            showChatToast(senderName, latestMsg.text?.slice(0, 100) || "New message", spaceId, selectedSpaceTitle || "Chat");

            if (desktopNotificationsEnabled && typeof Notification !== "undefined" && Notification.permission === "granted") {
              const notif = new Notification(senderName, {
                body: latestMsg.text?.slice(0, 120) || "New message",
                icon: "/favicon.ico",
                tag: `chat-${latestMsg.name || spaceId}`,
              });
              notif.onclick = () => { window.focus(); notif.close(); };
            }
            if (document.hidden) {
              document.title = `💬 New message — Monolith`;
            }
          }
        }

        prevMessageCountRef.current = newMsgs.length;
        messagesRef.current = newMsgs;
        setMessages(newMsgs);
      }

      setConnectionStatus("connected");
    } catch {
      // Silent fail — don't disturb the user
    }
  };

  // Primary: Reliable polling + SSE enhancement for live updates
  useEffect(() => {
    if (!selectedSpaceId) return;

    // Pass type and title explicitly to avoid stale-state issues
    const currentType = selectedSpaceType;
    const currentTitle = selectedSpaceTitle;

    // Use cached messages immediately (no spinner) — silent refresh if cache exists
    const cached = messagesBySpace[selectedSpaceId] ?? [];
    if (cached.length > 0) {
      messagesRef.current = cached;
      setMessages(cached);
      prevMessageCountRef.current = cached.length;
      silentPollMessages(selectedSpaceId, currentType, currentTitle);
    } else {
      fetchMessages(selectedSpaceId, currentType, currentTitle);
    }
    fetchSpaceDetails(selectedSpaceId);

    // ── 1. Reliable polling (guaranteed to work) ──
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    pollTimerRef.current = setInterval(() => {
      silentPollMessages(selectedSpaceId, currentType, currentTitle);
    }, 5000);

    // ── 2. SSE enhancement (faster when it works) ──
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }

    setConnectionStatus("connecting");

    try {
      let sseUrl = `/api/communication/chat/sse?spaceId=${encodeURIComponent(selectedSpaceId)}`;
      if (currentType === "DM" && currentTitle) {
        sseUrl += `&dmPartnerName=${encodeURIComponent(currentTitle)}`;
      }
      const sse = new EventSource(sseUrl);
      sseRef.current = sse;

      sse.addEventListener("message:new", (event) => {
        try {
          const data = JSON.parse(event.data);
          const newMsgs = data.messages || [];

          // Compare outside state updater to avoid setState-in-render across providers
          const prev = messagesRef.current;
          const prevNames = prev.map((m: any) => m.name).join(",");
          const newNames = newMsgs.map((m: any) => m.name).join(",");
          if (prevNames !== newNames || newMsgs.length !== prev.length) {
            if (newMsgs.length > prevMessageCountRef.current && prevMessageCountRef.current > 0) {
              const latestMsg = newMsgs[newMsgs.length - 1];
              if (latestMsg && !latestMsg.isMe) {
                const senderName = latestMsg.sender?.displayName || latestMsg.senderName || "New message";
                showChatToast(senderName, latestMsg.text?.slice(0, 100) || "New message", selectedSpaceId, currentTitle || "Chat");
                if (desktopNotificationsEnabled && typeof Notification !== "undefined" && Notification.permission === "granted") {
                  new Notification(senderName, {
                    body: latestMsg.text?.slice(0, 120) || "New message",
                    icon: "/favicon.ico",
                    tag: `chat-${latestMsg.name || selectedSpaceId}`,
                  });
                }
                ctx.bumpActivity(selectedSpaceId, new Date(latestMsg.createTime || Date.now()).getTime());
              }
            }
            prevMessageCountRef.current = newMsgs.length;
            messagesRef.current = newMsgs;
            setMessages(newMsgs);
          }
        } catch { /* ignore parse errors */ }
      });

      sse.addEventListener("spaces:updated", () => {
        ctx.refreshSpaces();
      });

      sse.addEventListener("sync:status", (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.status === "connected") setConnectionStatus("connected");
          else if (data.status === "auth_error") setConnectionStatus("auth_error");
          else if (data.status === "error") setConnectionStatus("reconnecting");
        } catch { /* ignore */ }
      });

      sse.addEventListener("ping", () => {
        setConnectionStatus("connected");
      });

      sse.onerror = () => {
        // SSE failed but polling still works — don't show error
        setConnectionStatus("connected");
      };

      sse.onopen = () => {
        setConnectionStatus("connected");
      };
    } catch {
      // SSE not available — polling handles everything
      setConnectionStatus("connected");
    }

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
    };
  }, [selectedSpaceId, selectedSpaceType, selectedSpaceTitle]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSelectSpace = (spaceId: string, title: string, type: string, jobData?: any, empData?: any) => {
    // Preserve current draft
    if (selectedSpaceId) {
      setDrafts((prev) => ({ ...prev, [selectedSpaceId]: newMessageText }));
    }
    // Seed from cache for instant warm-nav; triggers fetch+poll via selectedSpaceId effect
    const cached = messagesBySpace[spaceId] ?? [];
    setMessages(cached);
    setMessagesLoading(cached.length === 0);
    setShowCaretDropdown(false);
    setNewMessageText(drafts[spaceId] || "");

    // Lift selection into provider (persists across navigation + sessionStorage)
    selectSpace(spaceId, title, type, jobData, empData);
  };

  const handleSelectEmployeeDM = async (emp: any) => {
    setMessagesLoading(true);
    setShowNewChatModal(false);
    try {
      const res = await fetch("/api/communication/chat/dm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetGoogleUserId: emp.workspaceConnection?.googleUserId,
          targetEmployeeId: emp.id
        })
      });
      const data = await res.json();
      if (data.success && data.spaceId) {
        handleSelectSpace(data.spaceId, emp.name, "DM", null, emp);
      } else {
        setSyncToast({ message: data.error || "Failed to start DM conversation.", type: "error" });
        setTimeout(() => setSyncToast(null), 6000);
      }
    } catch (err) {
      console.error("Error creating DM space:", err);
      setSyncToast({ message: "Network error creating DM. Please try again.", type: "error" });
      setTimeout(() => setSyncToast(null), 5000);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessageText.trim() || !selectedSpaceId) return;

    const msgText = newMessageText.trim();

    // Optimistic UI: show message immediately
    const optimisticMsg = {
      name: `optimistic-${Date.now()}`,
      text: msgText,
      isMe: true,
      _sending: true,
      sender: { name: "users/me", displayName: "You", type: "HUMAN" },
      createTime: new Date().toISOString()
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setNewMessageText("");
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[selectedSpaceId];
      return next;
    });

    setSending(true);
    try {
      const res = await fetch("/api/communication/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spaceId: selectedSpaceId,
          text: msgText
        })
      });
      const data = await res.json();
      if (data.success && data.message) {
        // Replace optimistic message with real Google message
        setMessages((prev) =>
          prev.map((m) =>
            m.name === optimisticMsg.name
              ? { ...data.message, isMe: true, _sending: false }
              : m
          )
        );
        // Move this space to top of recent list
        ctx.bumpActivity(selectedSpaceId);
      } else {
        // Send failed — mark optimistic message as failed
        setMessages((prev) =>
          prev.map((m) =>
            m.name === optimisticMsg.name
              ? { ...m, _sending: false, _failed: true, _error: data.error || "Send failed" }
              : m
          )
        );
        setSyncToast({ message: data.error || "Failed to send message", type: "error" });
        setTimeout(() => setSyncToast(null), 5000);
      }
    } catch (err: any) {
      // Send failed — mark optimistic message as failed with retry
      setMessages((prev) =>
        prev.map((m) =>
          m.name === optimisticMsg.name
            ? { ...m, _sending: false, _failed: true, _error: "Network error" }
            : m
        )
      );
      setSyncToast({ message: "Failed to send message. Check your connection.", type: "error" });
      setTimeout(() => setSyncToast(null), 5000);
    } finally {
      setSending(false);
      setTimeout(() => composerRef.current?.focus(), 50);
    }
  };

  const toggleStarSpace = (spaceId: string) => {
    const updated = new Set(starredSpaces);
    if (updated.has(spaceId)) {
      updated.delete(spaceId);
    } else {
      updated.add(spaceId);
    }
    setStarredSpaces(updated);
  };

  const handleCopyLink = () => {
    const spaceUrl = `${window.location.origin}/communication/chat?spaceId=${encodeURIComponent(selectedSpaceId)}`;
    navigator.clipboard.writeText(spaceUrl);
    alert("Space link copied to clipboard!");
  };

  const handleLeaveSpace = async () => {
    if (!confirm("Are you sure you want to leave this space?")) return;
    try {
      const resMembers = await fetch(`/api/communication/chat/space/members?spaceId=${encodeURIComponent(selectedSpaceId)}`);
      const membersData = await resMembers.json();
      const myMembership = membersData.memberships?.find(
        (m: any) => m.member?.employeeId === "current-user" || m.member?.displayName?.includes("You")
      );

      const membershipName = myMembership?.name || `${selectedSpaceId}/members/current-user`;
      
      const res = await fetch(`/api/communication/chat/space/members?spaceId=${encodeURIComponent(selectedSpaceId)}&memberResourceName=${encodeURIComponent(membershipName)}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        alert("You have left the space.");
        fetchChannelsAndDMs();
        clearSelection();
      } else {
        alert("Failed to leave space.");
      }
    } catch (err) {
      console.error("Error leaving space:", err);
    }
  };

  const handleCreateSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpaceName.trim()) return;

    setSpaceCreating(true);
    try {
      const res = await fetch("/api/communication/chat/space", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: newSpaceName,
          spaceType: "SPACE",
          access: newSpaceAccess,
          requestToJoin: newSpaceRequestToJoin,
          invitees: newSpaceInvitees
        })
      });
      const data = await res.json();
      if (data.success) {
        setNewSpaceName("");
        setNewSpaceInvitees([]);
        setShowCreateSpaceModal(false);
        fetchChannelsAndDMs();
        handleSelectSpace(data.space.name, data.space.displayName, "SPACE", null, null);
      } else {
        alert("Failed to create space.");
      }
    } catch (err) {
      console.error("Error creating space:", err);
    } finally {
      setSpaceCreating(false);
    }
  };

  const handleSaveSpaceSettings = async () => {
    setSpaceSettingsSaving(true);
    try {
      const res = await fetch("/api/communication/chat/space", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spaceId: selectedSpaceId,
          displayName: selectedSpaceTitle,
          access: spaceSettingsAccess,
          requestToJoin: spaceSettingsRequestToJoin,
          membershipPermissions: spaceSettingsPermissions
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowSpaceSettingsModal(false);
        alert("Settings saved successfully!");
      } else {
        alert("Failed to update settings.");
      }
    } catch (err) {
      console.error("Error saving settings:", err);
    } finally {
      setSpaceSettingsSaving(false);
    }
  };

  const handleAddMember = async (empId: string) => {
    setMemberActionLoading(true);
    try {
      const res = await fetch("/api/communication/chat/space/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spaceId: selectedSpaceId,
          employeeId: empId
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchSpaceMembers(selectedSpaceId);
        setShowAddMemberPopover(false);
      } else {
        alert("Failed to add member to space.");
      }
    } catch (err) {
      console.error("Error adding member:", err);
    } finally {
      setMemberActionLoading(false);
    }
  };

  const handleRemoveMember = async (memberResourceName: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;
    setMemberActionLoading(true);
    try {
      const res = await fetch(`/api/communication/chat/space/members?spaceId=${encodeURIComponent(selectedSpaceId)}&memberResourceName=${encodeURIComponent(memberResourceName)}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        fetchSpaceMembers(selectedSpaceId);
      } else {
        alert("Failed to remove member.");
      }
    } catch (err) {
      console.error("Error removing member:", err);
    } finally {
      setMemberActionLoading(false);
    }
  };

  const handleOpenMembersModal = () => {
    fetchSpaceMembers(selectedSpaceId);
    setShowManageMembersModal(true);
  };

  const handleOpenSettingsModal = () => {
    setShowSpaceSettingsModal(true);
  };

  const handleOpenDetailsModal = () => {
    setShowSpaceDetailsModal(true);
  };

  // Reactions: Google Chat API v1 does not support reactions via user OAuth
  // This is intentionally a no-op — reactions are not available

  // Dynamic composer draft/keypress handlers
  const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const insertEmoji = (emoji: string) => {
    setNewMessageText(prev => prev + emoji);
    composerRef.current?.focus();
  };

  const applyTextFormat = (tag: string) => {
    const start = composerRef.current?.selectionStart || 0;
    const end = composerRef.current?.selectionEnd || 0;
    const text = newMessageText;
    const selected = text.slice(start, end);
    const formatted = `${tag}${selected}${tag}`;
    setNewMessageText(text.slice(0, start) + formatted + text.slice(end));
    setTimeout(() => {
      composerRef.current?.focus();
      composerRef.current?.setSelectionRange(start + tag.length, start + tag.length + selected.length);
    }, 50);
  };

  const cleanJobChannelName = (jobNumber: string, customerName?: string) => {
    const cleanCust = customerName
      ? customerName.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 15).replace(/-+/g, "-").replace(/^-|-$/g, "")
      : "";
    return `job-${jobNumber.toLowerCase()}${cleanCust ? "-" + cleanCust : ""}`;
  };

  // Avatar helper
  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getAvatarBg = (name: string) => {
    const tones = [
      "bg-teal-500/10 text-teal-500",
      "bg-[#818cf8]/15 text-[#818cf8]",
      "bg-[#fbbf24]/15 text-[#fbbf24]",
      "bg-emerald-500/10 text-emerald-500",
      "bg-[#c084fc]/15 text-[#c084fc]",
      "bg-[#38bdf8]/15 text-[#38bdf8]",
    ];
    let sum = 0;
    for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
    return tones[sum % tones.length];
  };

  const toggleSection = (section: keyof typeof collapsedSections) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Group consecutive messages by sender if sent within 3 minutes
  const groupMessages = (msgs: any[]) => {
    const groups: any[] = [];
    let currentGroup: any = null;

    msgs.forEach((msg) => {
      const msgTime = new Date(msg.createTime || Date.now());
      const groupTime = currentGroup ? new Date(currentGroup.createTime) : null;
      
      const isConsecutive = currentGroup && 
        currentGroup.sender?.name === msg.sender?.name && 
        groupTime && 
        (msgTime.getTime() - groupTime.getTime() < 180000); 

      if (isConsecutive) {
        currentGroup.messages.push(msg);
      } else {
        currentGroup = {
          sender: msg.sender,
          isMe: msg.isMe,
          createTime: msg.createTime,
          messages: [msg]
        };
        groups.push(currentGroup);
      }
    });

    return groups;
  };

  const renderMessageText = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\*[^*]+\*|_[^_]+_|`[^`]+`)/);
    return parts.map((part, index) => {
      if (part.startsWith("*") && part.endsWith("*")) {
        return <strong key={index} className="font-bold">{part.slice(1, -1)}</strong>;
      }
      if (part.startsWith("_") && part.endsWith("_")) {
        return <em key={index} className="italic">{part.slice(1, -1)}</em>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return <code key={index} className="font-mono bg-mono-soft text-xs px-1 py-0.5 rounded border border-mono-border">{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  const isNewDay = (prevMsg: any, currMsg: any) => {
    if (!prevMsg) return true;
    const prevDate = new Date(prevMsg.createTime);
    const currDate = new Date(currMsg.createTime);
    return prevDate.toDateString() !== currDate.toDateString();
  };

  const formatDateSeparator = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return "Today";
    } else if (d.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
    }
  };

  // Sort helper: spaces with recent activity first, then unread first
  const activitySort = (a: string, b: string) => {
    const aUnread = ctx.unreadCounts[a] || 0;
    const bUnread = ctx.unreadCounts[b] || 0;
    if (aUnread > 0 && bUnread === 0) return -1;
    if (bUnread > 0 && aUnread === 0) return 1;
    const aTime = ctx.spaceLastActivity[a] || 0;
    const bTime = ctx.spaceLastActivity[b] || 0;
    return bTime - aTime;
  };

  // Filter listings — sorted by recent activity
  const filteredJobs = jobs
    .filter((job) => {
      const matchesSearch = `JOB-${job.jobNumber}`.toLowerCase().includes(searchQuery.toLowerCase()) || job.title?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesShortcut = activeShortcut !== "starred" || starredSpaces.has(job.spaceId);
      return matchesSearch && matchesShortcut;
    })
    .sort((a, b) => activitySort(a.spaceId, b.spaceId));

  // Build unified DM contact list — like WhatsApp:
  // 1. Active DMs (have messages) sorted by most recent activity
  // 2. All other employees accessible via "New DM" button
  const badNames = ["Adarsh Operations", "adarsh operations", "Google Chat DM", "Google User", "ADARSH OPERATIONS"];

  // Map: spaceResourceName → employee for DMs that have been linked
  const dmSpaceToEmployee = new Map<string, any>();
  const employeeToSpace = new Map<string, any>();

  // Link DM spaces to employees
  for (const space of googleSpaces) {
    if (space.spaceType !== "DIRECT_MESSAGE") continue;
    
    // If the list API returned an employeeId
    if (space.employeeId) {
      const emp = employees.find((e: any) => e.id === space.employeeId);
      if (emp) {
        dmSpaceToEmployee.set(space.name, emp);
        employeeToSpace.set(emp.id, space);
        continue;
      }
    }
    
    // If the displayName matches an employee name
    if (space.displayName && !badNames.includes(space.displayName)) {
      const emp = employees.find((e: any) => 
        e.name.toLowerCase() === space.displayName?.toLowerCase()
      );
      if (emp) {
        dmSpaceToEmployee.set(space.name, emp);
        employeeToSpace.set(emp.id, space);
      }
    }
  }

  // Build the unified DM list
  const dmEntries: { type: "dm"; spaceId: string; name: string; employeeId?: string; hasActivity: boolean }[] = [];
  const addedSpaces = new Set<string>();

  // First: All DM spaces — linked to employee names where possible, fallback to displayName
  for (const space of googleSpaces) {
    if (space.spaceType !== "DIRECT_MESSAGE") continue;
    const emp = dmSpaceToEmployee.get(space.name);
    
    // Use employee name if linked, otherwise use the space displayName (even if it's generic)
    let displayName = emp?.name;
    if (!displayName && space.displayName && !badNames.includes(space.displayName)) {
      displayName = space.displayName;
    }
    
    // If we have unread counts for this space, show it regardless of name resolution
    const hasUnread = (ctx.unreadCounts[space.name] || 0) > 0;
    const hasKnownActivity = (ctx.spaceLastActivity[space.name] || 0) > 0;
    
    if (displayName) {
      dmEntries.push({
        type: "dm",
        spaceId: space.name,
        name: displayName,
        employeeId: emp?.id,
        hasActivity: true
      });
      addedSpaces.add(space.name);
    } else if (hasUnread || hasKnownActivity) {
      // Unresolved name BUT has activity — show with generic name rather than hiding
      dmEntries.push({
        type: "dm",
        spaceId: space.name,
        name: space.displayName || "Google DM",
        employeeId: undefined,
        hasActivity: true
      });
      addedSpaces.add(space.name);
    }
  }

  const filteredDMs = dmEntries
    .filter(entry => {
      const matchesSearch = entry.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesShortcut = activeShortcut !== "starred" || starredSpaces.has(entry.spaceId);
      return matchesSearch && matchesShortcut;
    })
    .sort((a, b) => activitySort(a.spaceId, b.spaceId));

  const filteredSpaces = googleSpaces
    .filter((space) => {
      const isRoom = space.spaceType === "SPACE";
      if (!isRoom) return false;
      if (jobs.some((j) => j.spaceId === space.name)) return false;
      const matchesSearch = space.displayName?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesShortcut = activeShortcut !== "starred" || starredSpaces.has(space.name);
      return matchesSearch && matchesShortcut;
    })
    .sort((a, b) => activitySort(a.name, b.name));

  return (
    <div className="relative">
      {/* ── In-app toast notifications ── */}
      {chatToasts.length > 0 && (
        <div className="absolute top-2 right-4 z-[100] flex flex-col gap-2 pointer-events-none" style={{ maxWidth: "340px" }}>
          {chatToasts.map((toast) => (
            <div
              key={toast.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                const space = googleSpaces.find((s: any) => s.name === toast.spaceId);
                const job = jobs.find((j: any) => j.spaceId === toast.spaceId);
                const spaceType = job ? "JOB" : space?.spaceType === "DIRECT_MESSAGE" ? "DM" : "SPACE";
                handleSelectSpace(toast.spaceId, toast.spaceName, spaceType, job || null, null);
                setChatToasts(prev => prev.filter(t => t.id !== toast.id));
              }}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") e.currentTarget.click(); }}
              className="pointer-events-auto flex items-start gap-3 bg-mono-card border border-[#F9D972]/30 rounded-xl px-4 py-3 shadow-lg backdrop-blur-sm animate-in slide-in-from-right duration-300 hover:border-[#F9D972]/60 hover:shadow-xl transition-all cursor-pointer text-left w-full"
            >
              <div className="shrink-0 mt-0.5">
                <Bell className="size-4 text-[#F9D972]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-mono-text truncate">{toast.sender}</span>
                  <span className="text-[9px] text-mono-muted shrink-0">now</span>
                </div>
                <p className="text-[11px] text-mono-muted mt-0.5 line-clamp-2 leading-snug">{toast.snippet}</p>
                {toast.spaceName !== toast.sender && (
                  <span className="text-[9px] text-[#F9D972] font-medium mt-1 block">in {toast.spaceName}</span>
                )}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setChatToasts(prev => prev.filter(t => t.id !== toast.id)); }}
                className="shrink-0 p-0.5 hover:bg-mono-soft rounded text-mono-muted"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex border border-mono-border bg-mono-card rounded-2xl overflow-hidden shadow-sm text-left font-sans" style={{ height: "calc(100vh - 9rem)" }}>
      
      {/* 1. Left Sidebar: Slack layout */}
      <div className="w-[240px] border-r border-mono-border flex flex-col bg-mono-soft shrink-0 h-full">
        
        {/* Workspace selector */}
        <div className="p-3 border-b border-mono-border bg-mono-card flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2 truncate">
            <div className="size-6 bg-[#F9D972] rounded-lg text-white font-bold flex items-center justify-center text-xs shrink-0 font-display">
              A
            </div>
            <div className="truncate">
              <h2 className="text-xs font-bold text-mono-text uppercase tracking-wide font-display">Adarsh Shipping</h2>
              <div className="flex items-center space-x-1 mt-0.5">
                <span className={`size-1.5 rounded-full ${
                  connectionStatus === "connected" ? "bg-emerald-500 animate-pulse" :
                  connectionStatus === "connecting" ? "bg-yellow-500 animate-pulse" :
                  connectionStatus === "reconnecting" ? "bg-yellow-500 animate-pulse" :
                  connectionStatus === "auth_error" ? "bg-red-500" :
                  "bg-red-500"
                }`} />
                <span className="text-[9px] text-mono-muted font-medium block uppercase tracking-wider">
                  {connectionStatus === "connected" ? "Connected" :
                   connectionStatus === "connecting" ? "Connecting..." :
                   connectionStatus === "reconnecting" ? "Reconnecting..." :
                   connectionStatus === "auth_error" ? "Auth Error" :
                   "Disconnected"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-1 shrink-0">
            <button
              type="button"
              onClick={handleSyncGoogleAccount}
              disabled={syncing}
              className={`p-1.5 hover:bg-mono-soft rounded-lg text-mono-muted transition-all hover:scale-105 ${
                syncing ? "animate-spin text-[#F9D972]" : ""
              }`}
              title="Sync spaces with Google account"
            >
              <RefreshCw className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowNewChatModal(true)}
              className="p-1.5 hover:bg-mono-soft rounded-lg text-[#F9D972] transition-all hover:scale-105"
              title="Compose direct message or space"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>

        {/* Toast notification banner */}
        {syncToast && (
          <div className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider flex items-center justify-between shrink-0 animate-in slide-in-from-top duration-200 ${
            syncToast.type === "success" 
              ? "bg-[#F9D972]/10 text-[#F9D972] border-b border-[#F9D972]/20" 
              : "bg-red-500/10 text-red-500 border-b border-red-500/20"
          }`}>
            <span>{syncToast.message}</span>
            <button onClick={() => setSyncToast(null)} className="p-0.5 hover:bg-mono-soft rounded">
              <X className="size-3" />
            </button>
          </div>
        )}

        {/* Filter Quick Switcher */}
        <div className="p-2 bg-mono-soft border-b border-mono-border shrink-0">
          <div className="relative">
            <input
              type="text"
              placeholder="Jump to channel or DM..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-[11px] bg-mono-card border border-mono-border rounded-lg pl-7 pr-3 py-1.5 focus:outline-none focus:border-[#F9D972]/70 placeholder:text-mono-muted/40 text-mono-text"
            />
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-mono-muted/50" />
          </div>
        </div>

        {/* Shortcuts rail */}
        <div className="px-2 pt-2 border-b border-mono-border bg-mono-soft flex justify-around items-center gap-1 shrink-0 pb-2">
          <button
            onClick={() => setActiveShortcut("home")}
            className={`flex-1 py-1 px-1.5 rounded-md text-[9px] font-bold uppercase tracking-wider text-center transition-all ${
              activeShortcut === "home" ? "bg-[#F9D972]/15 text-[#F9D972]" : "text-mono-muted hover:bg-mono-soft"
            }`}
          >
            Home
          </button>
          <button
            onClick={() => setActiveShortcut("starred")}
            className={`flex-1 py-1 px-1.5 rounded-md text-[9px] font-bold uppercase tracking-wider text-center transition-all ${
              activeShortcut === "starred" ? "bg-[#F9D972]/15 text-[#F9D972]" : "text-mono-muted hover:bg-mono-soft"
            }`}
          >
            Starred
          </button>
        </div>

        {/* Collapsible channels / lists */}
        <div className="flex-1 overflow-y-auto p-2 space-y-4 scrollbar-thin select-none">
          
          {/* Direct Messages */}
          <div className="space-y-0.5">
            <div className="flex items-center justify-between px-2 py-1 text-mono-muted hover:text-mono-text cursor-pointer group">
              <button 
                onClick={() => toggleSection("dms")} 
                className="flex items-center space-x-1 flex-1 text-left"
              >
                {collapsedSections.dms ? <ChevronRight className="size-3 shrink-0" /> : <ChevronDown className="size-3 shrink-0" />}
                <span className="monolith-label text-[9px] font-bold tracking-wider">Direct Messages</span>
              </button>
              <button 
                onClick={() => setShowNewChatModal(true)} 
                className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-mono-soft rounded text-mono-muted transition-all"
                title="New Direct Message"
              >
                <Plus className="size-3" />
              </button>
            </div>

            {!collapsedSections.dms && (
              <div className="space-y-0.5 pl-1.5">
                {loading ? (
                  <div className="text-[10px] text-mono-muted px-2 animate-pulse">Loading DMs...</div>
                ) : filteredDMs.length === 0 ? (
                  <div className="text-[10px] text-mono-muted px-2 italic">
                    {searchQuery ? "No matching conversations." : "No conversations yet. Click + to start a new DM."}
                  </div>
                ) : (
                  <>
                    {filteredDMs.map((entry) => {
                      const isSelected = selectedSpaceId === entry.spaceId;
                      const unreadCount = ctx.unreadCounts[entry.spaceId] || 0;
                      return (
                        <button
                          key={entry.spaceId}
                          onClick={() => handleSelectSpace(entry.spaceId, entry.name, "DM")}
                          className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs text-left transition-all ${
                            isSelected
                              ? "bg-[#F9D972] text-white shadow-sm font-semibold"
                              : unreadCount > 0
                                ? "text-mono-text font-bold hover:bg-mono-soft"
                                : "text-mono-muted font-medium hover:bg-mono-soft hover:text-mono-text"
                          }`}
                        >
                          <div className="relative shrink-0">
                            <span className={`flex items-center justify-center size-5 rounded-full font-bold text-[8px] ${isSelected ? "bg-white/20 text-white" : getAvatarBg(entry.name)}`}>
                              {getInitials(entry.name)}
                            </span>
                            <span className="absolute -bottom-0.5 -right-0.5 size-1.5 bg-emerald-500 rounded-full border border-surface" />
                          </div>
                          <span className="truncate flex-1">{entry.name}</span>
                          {unreadCount > 0 && !isSelected && (
                            <span className="flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-[#F9D972] text-white text-[9px] font-bold px-1">
                              {unreadCount > 99 ? "99+" : unreadCount}
                            </span>
                          )}
                          {ctx.mentionSpaces.has(entry.spaceId) && !isSelected && (
                            <span className="flex items-center justify-center size-[18px] rounded-full bg-[#D88700] text-white text-[9px] font-bold shrink-0" title="You were mentioned">
                              <AtSign className="size-2.5" />
                            </span>
                          )}
                          {starredSpaces.has(entry.spaceId) && <Star className={`size-3 ${isSelected ? "text-white" : "text-[#D88700]"} fill-current`} />}
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Job Spaces */}
          <div className="space-y-0.5">
            <div className="flex items-center justify-between px-2 py-1 text-mono-muted hover:text-mono-text cursor-pointer group">
              <button 
                onClick={() => toggleSection("jobSpaces")} 
                className="flex items-center space-x-1 flex-1 text-left"
              >
                {collapsedSections.jobSpaces ? <ChevronRight className="size-3 shrink-0" /> : <ChevronDown className="size-3 shrink-0" />}
                <span className="monolith-label text-[9px] font-bold tracking-wider">Job Spaces</span>
              </button>
            </div>

            {!collapsedSections.jobSpaces && (
              <div className="space-y-0.5 pl-1.5">
                {loading ? (
                  <div className="text-[10px] text-mono-muted px-2 animate-pulse">Loading spaces...</div>
                ) : filteredJobs.length === 0 ? (
                  <div className="text-[10px] text-mono-muted px-2 italic">No active jobs.</div>
                ) : (
                  filteredJobs.map((job) => {
                    const isSelected = selectedSpaceId === job.spaceId;
                    const channelName = cleanJobChannelName(job.jobNumber, job.title);
                    const unreadCount = ctx.unreadCounts[job.spaceId] || 0;
                    return (
                      <button
                        key={job.id}
                        onClick={() => handleSelectSpace(job.spaceId, `job-${job.jobNumber}`, "JOB", job, null)}
                        className={`w-full flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs text-left transition-all ${
                          isSelected
                            ? "bg-[#F9D972] text-white font-semibold"
                            : unreadCount > 0
                              ? "text-mono-text font-bold hover:bg-mono-soft"
                              : "text-mono-muted font-medium hover:bg-mono-soft hover:text-mono-text"
                        }`}
                      >
                        <Hash className={`size-3.5 shrink-0 ${isSelected ? "text-white" : "text-[#F9D972]"}`} />
                        <span className="truncate flex-1">{channelName}</span>
                        {unreadCount > 0 && !isSelected && (
                          <span className="flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-[#F9D972] text-white text-[9px] font-bold px-1">
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        )}
                        {ctx.mentionSpaces.has(job.spaceId) && !isSelected && (
                          <span className="flex items-center justify-center size-[18px] rounded-full bg-[#D88700] text-white text-[9px] font-bold shrink-0" title="You were mentioned">
                            <AtSign className="size-2.5" />
                          </span>
                        )}
                        {starredSpaces.has(job.spaceId) && <Star className={`size-3 ${isSelected ? "text-white" : "text-[#D88700]"} fill-current`} />}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Normal Spaces / Rooms */}
          <div className="space-y-0.5">
            <div className="flex items-center justify-between px-2 py-1 text-mono-muted hover:text-mono-text cursor-pointer group">
              <button 
                onClick={() => toggleSection("spaces")} 
                className="flex items-center space-x-1 flex-1 text-left"
              >
                {collapsedSections.spaces ? <ChevronRight className="size-3 shrink-0" /> : <ChevronDown className="size-3 shrink-0" />}
                <span className="monolith-label text-[9px] font-bold tracking-wider">Group Channels</span>
              </button>
              <button 
                onClick={() => setShowCreateSpaceModal(true)} 
                className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-mono-soft rounded text-mono-muted transition-all"
                title="Create Space"
              >
                <Plus className="size-3" />
              </button>
            </div>

            {!collapsedSections.spaces && (
              <div className="space-y-0.5 pl-1.5">
                {loading ? (
                  <div className="text-[10px] text-mono-muted px-2 animate-pulse">Loading spaces...</div>
                ) : filteredSpaces.length === 0 ? (
                  <div className="text-[10px] text-mono-muted px-2 italic">No spaces.</div>
                ) : (
                  filteredSpaces.map((space) => {
                    const isSelected = selectedSpaceId === space.name;
                    const unreadCount = ctx.unreadCounts[space.name] || 0;
                    return (
                      <button
                        key={space.name}
                        onClick={() => handleSelectSpace(space.name, space.displayName || "Google Space", "SPACE")}
                        className={`w-full flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs text-left transition-all ${
                          isSelected
                            ? "bg-[#F9D972] text-white font-semibold"
                            : unreadCount > 0
                              ? "text-mono-text font-bold hover:bg-mono-soft"
                              : "text-mono-muted font-medium hover:bg-mono-soft hover:text-mono-text"
                        }`}
                      >
                        <Users className={`size-3.5 shrink-0 ${isSelected ? "text-white" : "text-[#818cf8]"}`} />
                        <span className="truncate flex-1">{space.displayName || "Google Space"}</span>
                        {unreadCount > 0 && !isSelected && (
                          <span className="flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-[#F9D972] text-white text-[9px] font-bold px-1">
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        )}
                        {ctx.mentionSpaces.has(space.name) && !isSelected && (
                          <span className="flex items-center justify-center size-[18px] rounded-full bg-[#D88700] text-white text-[9px] font-bold shrink-0" title="You were mentioned">
                            <AtSign className="size-2.5" />
                          </span>
                        )}
                        {starredSpaces.has(space.name) && <Star className={`size-3 ${isSelected ? "text-white" : "text-[#D88700]"} fill-current`} />}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Integrations & Apps */}
          <div className="space-y-0.5">
            <div className="flex items-center justify-between px-2 py-1 text-mono-muted hover:text-mono-text cursor-pointer">
              <button 
                onClick={() => toggleSection("apps")} 
                className="flex items-center space-x-1 flex-1 text-left"
              >
                {collapsedSections.apps ? <ChevronRight className="size-3 shrink-0" /> : <ChevronDown className="size-3 shrink-0" />}
                <span className="monolith-label text-[9px] font-bold tracking-wider">Workspace Apps</span>
              </button>
            </div>

            {!collapsedSections.apps && (
              <div className="space-y-0.5 pl-1.5 text-xs text-mono-muted font-medium">
                <div className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg hover:bg-mono-soft cursor-pointer transition-all">
                  <span className="size-2 rounded-full bg-[#F9D972] shrink-0" />
                  <span>Mono AI Bot</span>
                </div>
                <div className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg hover:bg-mono-soft cursor-pointer transition-all">
                  <span className="size-2 rounded-full bg-[#D88700] shrink-0" />
                  <span>Google Drive App</span>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* 2. Main Conversation Area */}
      <div className="flex-1 flex flex-col bg-mono-card h-full min-w-0">
        {selectedSpaceId ? (
          <div className="flex flex-col h-full min-w-0 overflow-hidden relative">
            
            {/* Conversation Header */}
            <div className="h-[48px] px-4 border-b border-mono-border bg-mono-card flex justify-between items-center z-10 shrink-0 select-none">
              <div className="flex items-center space-x-2 min-w-0 relative">
                
                {/* Space Dropdown */}
                <button
                  onClick={() => setShowCaretDropdown(!showCaretDropdown)}
                  className="flex items-center gap-1 hover:bg-mono-soft px-2 py-1 rounded-lg text-xs font-bold text-mono-text uppercase tracking-wide transition-all truncate"
                >
                  {selectedSpaceType === "JOB" ? (
                    <Hash className="size-3.5 text-[#F9D972] shrink-0" />
                  ) : selectedSpaceType === "DM" ? (
                    <span className="size-2 bg-emerald-500 rounded-full shrink-0" />
                  ) : (
                    <Users className="size-3.5 text-[#818cf8] shrink-0" />
                  )}
                  <span className="truncate">{selectedSpaceTitle}</span>
                  <ChevronDown className="size-3 text-mono-muted shrink-0" />
                </button>

                {showCaretDropdown && (
                  <div className="absolute left-0 top-full mt-1 w-52 rounded-xl bg-mono-card border border-mono-border shadow-lg z-50 py-1 text-xs text-mono-text">
                    <button
                      onClick={() => { setShowCaretDropdown(false); handleOpenDetailsModal(); }}
                      className="w-full text-left px-3 py-1.5 hover:bg-mono-soft flex items-center gap-2"
                    >
                      <Info className="size-3.5 text-[#F9D972]" />
                      <span>Details</span>
                    </button>
                    {selectedSpaceType !== "DM" && (
                      <>
                        <button
                          onClick={() => { setShowCaretDropdown(false); handleOpenMembersModal(); }}
                          className="w-full text-left px-3 py-1.5 hover:bg-mono-soft flex items-center gap-2"
                        >
                          <Users className="size-3.5 text-[#818cf8]" />
                          <span>Manage Members</span>
                        </button>
                        <button
                          onClick={() => { setShowCaretDropdown(false); handleOpenSettingsModal(); }}
                          className="w-full text-left px-3 py-1.5 hover:bg-mono-soft flex items-center gap-2"
                        >
                          <Clock className="size-3.5 text-[#D88700]" />
                          <span>Settings</span>
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => { setShowCaretDropdown(false); handleCopyLink(); }}
                      className="w-full text-left px-3 py-1.5 hover:bg-mono-soft flex items-center gap-2"
                    >
                      <ExternalLink className="size-3.5 text-[#22c55e]" />
                      <span>Copy Space Link</span>
                    </button>
                    <div className="border-t border-mono-border my-1"></div>
                    <button
                      onClick={() => { setShowCaretDropdown(false); toggleStarSpace(selectedSpaceId); }}
                      className="w-full text-left px-3 py-1.5 hover:bg-mono-soft flex items-center gap-2"
                    >
                      <Star className={`size-3.5 ${starredSpaces.has(selectedSpaceId) ? "text-[#D88700] fill-current" : "text-mono-muted"}`} />
                      <span>{starredSpaces.has(selectedSpaceId) ? "Unstar" : "Star"}</span>
                    </button>
                    {selectedSpaceType !== "DM" && (
                      <button
                        onClick={() => { setShowCaretDropdown(false); handleLeaveSpace(); }}
                        className="w-full text-left px-3 py-1.5 hover:bg-mono-soft text-red-500 flex items-center gap-2"
                      >
                        <AlertCircle className="size-3.5 text-red-500" />
                        <span>Leave Space</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Star toggle */}
                <button
                  onClick={() => toggleStarSpace(selectedSpaceId)}
                  className="p-1 text-mono-muted hover:text-[#D88700] rounded-md transition-colors"
                >
                  <Star className={`size-3.5 ${starredSpaces.has(selectedSpaceId) ? "text-[#D88700] fill-current" : ""}`} />
                </button>

                {/* Job stage badge */}
                {selectedSpaceType === "JOB" && selectedJob && (
                  <span className="hidden sm:inline-block bg-[#F9D972]/10 text-[#F9D972] border border-[#F9D972]/20 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
                    {selectedJob.stage?.replace(/_/g, " ")}
                  </span>
                )}
              </div>

              {/* Action shortcuts */}
              <div className="flex items-center space-x-1">
                {selectedSpaceType === "JOB" && selectedJob?.workspaceProfile?.rootFolderId && (
                  selectedJob.workspaceProfile.rootFolderId.startsWith("mock-") ? (
                    <Link
                      href={`/communication/drive?jobId=${selectedJob.id}`}
                      className="p-1.5 hover:bg-mono-soft text-[#D88700] rounded-lg transition-colors"
                      title="Google Drive Storage (Sim)"
                    >
                      <Folder className="size-4" />
                    </Link>
                  ) : (
                    <a
                      href={`https://drive.google.com/drive/folders/${selectedJob.workspaceProfile.rootFolderId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 hover:bg-mono-soft text-[#D88700] rounded-lg transition-colors"
                      title="Open Google Drive Folder"
                    >
                      <Folder className="size-4" />
                    </a>
                  )
                )}
                
                <Link
                  href="/communication/meetings"
                  className="p-1.5 hover:bg-mono-soft text-[#F9D972] rounded-lg transition-colors"
                  title="Schedule Google Meet"
                >
                  <Video className="size-4" />
                </Link>

                {/* Open in Google Chat deep link */}
                {!selectedSpaceId.includes("mock") && (
                  <a
                    href={`https://chat.google.com/room/${selectedSpaceId.replace("spaces/", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 hover:bg-mono-soft text-mono-muted hover:text-mono-text rounded-lg transition-colors"
                    title="Open in native Google Chat app"
                  >
                    <ExternalLink className="size-4" />
                  </a>
                )}

                <div className="h-4 w-px bg-outline-variant mx-1" />

                {/* Details toggle */}
                <button
                  onClick={() => setShowDetailsPanel(!showDetailsPanel)}
                  className={`p-1.5 rounded-lg transition-colors ${showDetailsPanel ? "bg-mono-soft text-[#F9D972]" : "hover:bg-mono-soft text-mono-muted"}`}
                  title="Toggle details panel"
                >
                  <Info className="size-4" />
                </button>
              </div>
            </div>

            {/* Message Feed timeline */}
            <div className="flex-1 overflow-y-auto bg-mono-soft min-h-0 divide-y-0 relative">
              {messagesLoading && messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-xs text-mono-muted space-y-2 h-full">
                  <RefreshCw className="size-5 animate-spin text-[#F9D972]" />
                  <span>Syncing conversation history...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-20 text-xs text-mono-muted flex flex-col items-center justify-center space-y-2 h-full select-none">
                  <span className="text-3xl">💬</span>
                  <span className="font-semibold text-mono-text uppercase tracking-wider">Beginning of conversation</span>
                  <span className="max-w-[200px]">Send a message to sync with this Google Workspace Chat space.</span>
                </div>
              ) : (
                <div className="py-4">
                  {groupMessages(messages).map((group, groupIdx) => {
                    const isSystem = group.sender?.type === "BOT";
                    const isMe = group.isMe;
                    const initials = getInitials(group.sender?.displayName || "G");
                    const avatarColor = getAvatarBg(group.sender?.displayName || "G");
                    const dateSep = groupIdx === 0 || isNewDay(groupMessages(messages)[groupIdx - 1], group);

                    return (
                      <div key={groupIdx} className="flex flex-col">
                        {dateSep && (
                          <div className="flex items-center my-4 px-6 select-none">
                            <div className="flex-1 h-px bg-outline-variant/60" />
                            <span className="mx-4 text-[10px] font-bold text-mono-muted uppercase tracking-widest bg-mono-card px-3 py-1 rounded-full border border-mono-border/40 shadow-sm">
                              {formatDateSeparator(group.createTime)}
                            </span>
                            <div className="flex-1 h-px bg-outline-variant/60" />
                          </div>
                        )}

                        {/* Slack message row format */}
                        <div 
                          className={`px-6 py-2 transition-colors duration-150 flex items-start space-x-3 relative group ${
                            isSystem ? "bg-mono-soft/30" : "hover:bg-mono-soft"
                          }`}
                          onMouseEnter={() => setHoveredMessageId(group.messages[0].name)}
                          onMouseLeave={() => setHoveredMessageId(null)}
                        >
                          {/* Avatar */}
                          <div className="shrink-0 pt-0.5 select-none">
                            {isSystem ? (
                              <span className="flex items-center justify-center size-8 rounded-lg bg-[#F9D972]/15 border border-[#F9D972]/20 text-[#F9D972] font-bold text-xs">
                                AI
                              </span>
                            ) : (
                              <span className={`flex items-center justify-center size-8 rounded-lg font-bold text-xs select-none ${avatarColor}`}>
                                {initials}
                              </span>
                            )}
                          </div>

                          {/* Message content block */}
                          <div className="flex-1 min-w-0 text-xs">
                            <div className="flex items-baseline space-x-2 select-none mb-1">
                              <span className="font-bold text-mono-text tracking-wide">
                                {group.sender?.displayName || "Google User"}
                              </span>
                              {isSystem && (
                                <span className="bg-[#F9D972]/15 text-[#F9D972] px-1 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide border border-[#F9D972]/20">
                                  Bot
                                </span>
                              )}
                              <span className="text-[10px] text-mono-muted/60 font-medium monolith-numeric">
                                {new Date(group.createTime).toLocaleTimeString("en-IN", {
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </span>
                            </div>

                            {/* Consecutive messages text list */}
                            <div className="space-y-1 text-mono-text font-normal leading-relaxed break-words pr-4">
                              {group.messages.map((msg: any, msgIdx: number) => {
                                const isMsgHovered = hoveredMessageId === msg.name;
                                const reactions = messageReactions[msg.name] || [];

                                return (
                                  <div key={msgIdx} className="relative py-0.5">
                                    <div className="text-mono-text text-[12px] font-normal leading-relaxed">
                                      {renderMessageText(msg.text)}
                                      {msg.edited && (
                                        <span className="text-[9px] text-mono-muted/50 ml-1 select-none font-medium">(edited)</span>
                                      )}
                                    </div>

                                    {/* Google card formatting if present */}
                                    {msg.cardsV2 && msg.cardsV2.length > 0 && (
                                      <div className="mt-2 border border-mono-border bg-mono-card rounded-xl p-3 max-w-sm shadow-sm">
                                        <h5 className="font-bold text-xs text-mono-text uppercase tracking-wide">Workspace Card Notification</h5>
                                        <p className="text-xs text-mono-muted mt-1">Details resolved from synced Workspace events.</p>
                                      </div>
                                    )}

                                    {/* Message Quick-Actions floating toolbar (Slack style) */}
                                    {isMsgHovered && (
                                      <div className="absolute right-0 top-0 -translate-y-4 bg-mono-card border border-mono-border rounded-lg shadow-md flex items-center p-1 space-x-0.5 z-10 select-none animate-in fade-in duration-75">
                                        <button
                                          onClick={() => {
                                            setEditingMessageName(msg.name);
                                            setEditingMessageText(msg.text);
                                          }}
                                          className="p-1 hover:bg-mono-soft rounded text-mono-muted hover:text-mono-text transition-colors"
                                          title="Edit message"
                                        >
                                          <Edit2 className="size-3" />
                                        </button>
                                        <button
                                          onClick={() => {
                                            if (confirm("Delete this message?")) {
                                              setMessages(prev => prev.filter(m => m.name !== msg.name));
                                            }
                                          }}
                                          className="p-1 hover:bg-mono-soft text-red-500 rounded transition-colors"
                                          title="Delete message"
                                        >
                                          <Trash2 className="size-3" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Slack StyleComposer */}
            <div className="p-4 border-t border-mono-border bg-mono-card shrink-0">
              
              {/* Draft edit pane */}
              {editingMessageName ? (
                <div className="mb-2 p-2 bg-mono-soft border border-mono-border rounded-xl flex items-center justify-between text-xs animate-in slide-in-from-bottom duration-100">
                  <div className="flex-1 mr-4">
                    <span className="text-[10px] uppercase font-bold text-[#F9D972] block">Editing Message</span>
                    <input
                      type="text"
                      value={editingMessageText}
                      onChange={(e) => setEditingMessageText(e.target.value)}
                      className="w-full bg-transparent border-none text-xs text-mono-text focus:outline-none focus:ring-0 py-1"
                    />
                  </div>
                  <div className="flex items-center space-x-1.5 shrink-0">
                    <button
                      onClick={() => setEditingMessageName(null)}
                      className="px-2.5 py-1 border border-mono-border hover:bg-mono-soft text-mono-text rounded-lg font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        // Call backend edit in production or mock in dev
                        setMessages(prev => prev.map(m => m.name === editingMessageName ? { ...m, text: editingMessageText, edited: true } : m));
                        setEditingMessageName(null);
                      }}
                      className="bg-[#F9D972] text-white hover:bg-[#E8C85D] px-3 py-1 rounded-lg font-bold"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="border border-mono-border rounded-xl overflow-hidden focus-within:border-[#F9D972] focus-within:shadow-[0_0_0_3px_rgba(0,206,196,0.1)] transition-all">
                <textarea
                  ref={composerRef}
                  rows={2}
                  placeholder={selectedSpaceType === "DM" ? `Message ${selectedSpaceTitle}` : `Message #${cleanJobChannelName(selectedJob?.jobNumber || "space", selectedSpaceTitle)}`}
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  className="w-full p-3 bg-mono-card border-none text-xs text-mono-text focus:ring-0 focus:outline-none resize-none"
                />

                {/* Format Toolbar & actions */}
                <div className="px-3 py-2 bg-mono-soft border-t border-mono-border flex justify-between items-center select-none text-mono-muted">
                  <div className="flex items-center space-x-1">
                    
                    {/* Plus Actions button */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowPlusMenu(!showPlusMenu)}
                        className={`p-1.5 rounded hover:bg-mono-soft transition-colors ${showPlusMenu ? "text-[#F9D972] bg-mono-soft" : ""}`}
                        title="Add attachment or meeting room"
                      >
                        <Plus className="size-3.5" />
                      </button>

                      {showPlusMenu && (
                        <div className="absolute left-0 bottom-full mb-2 w-48 rounded-xl bg-mono-card border border-mono-border shadow-lg z-50 py-1 text-xs text-mono-text animate-page-enter">
                          <button
                            onClick={() => { setShowPlusMenu(false); alert("To attach Drive file, search files in Job Context panel."); }}
                            className="w-full text-left px-3 py-2 hover:bg-mono-soft flex items-center gap-2"
                          >
                            <Folder className="size-3.5 text-[#D88700]" />
                            <span>Share from Drive</span>
                          </button>
                          <Link
                            href="/communication/meetings"
                            className="w-full text-left px-3 py-2 hover:bg-mono-soft flex items-center gap-2"
                          >
                            <Video className="size-3.5 text-[#F9D972]" />
                            <span>Create Google Meet</span>
                          </Link>
                          <Link
                            href="/communication/calendar"
                            className="w-full text-left px-3 py-2 hover:bg-mono-soft flex items-center gap-2"
                          >
                            <Clock className="size-3.5 text-[#818cf8]" />
                            <span>Schedule Calendar Event</span>
                          </Link>
                        </div>
                      )}
                    </div>

                    <div className="h-4 w-px bg-outline-variant mx-1" />

                    <button
                      type="button"
                      onClick={() => applyTextFormat("*")}
                      className="p-1.5 rounded hover:bg-mono-soft transition-colors"
                      title="Bold"
                    >
                      <Bold className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTextFormat("_")}
                      className="p-1.5 rounded hover:bg-mono-soft transition-colors"
                      title="Italic"
                    >
                      <Italic className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTextFormat("`")}
                      className="p-1.5 rounded hover:bg-mono-soft transition-colors"
                      title="Code Block"
                    >
                      <Code className="size-3.5" />
                    </button>

                    <div className="h-4 w-px bg-outline-variant mx-1" />

                    {/* Emoji list trigger */}
                    <button
                      type="button"
                      onClick={() => insertEmoji("😊")}
                      className="p-1.5 rounded hover:bg-mono-soft transition-colors text-xs"
                      title="Insert emoji 😊"
                    >
                      😊
                    </button>
                    <button
                      type="button"
                      onClick={() => insertEmoji("👍")}
                      className="p-1.5 rounded hover:bg-mono-soft transition-colors text-xs"
                      title="Insert emoji 👍"
                    >
                      👍
                    </button>
                    <button
                      type="button"
                      onClick={() => insertEmoji("🚀")}
                      className="p-1.5 rounded hover:bg-mono-soft transition-colors text-xs"
                      title="Insert emoji 🚀"
                    >
                      🚀
                    </button>
                  </div>

                  {/* Send Button */}
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={sending || !newMessageText.trim()}
                    className="bg-[#F9D972] text-white hover:bg-[#E8C85D] disabled:opacity-40 px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all flex items-center space-x-1 shadow-sm"
                  >
                    <span>Send</span>
                    <Send className="size-3" />
                  </button>
                </div>
              </div>
              <div className="text-[10px] text-mono-muted/50 text-right mt-1 font-medium select-none">
                <strong>Enter</strong> to send • <strong>Shift+Enter</strong> for new line
              </div>
            </div>

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center h-full text-mono-muted text-xs space-y-2 bg-mono-soft select-none">
            <span className="text-4xl animate-bounce">💬</span>
            <span className="font-semibold text-mono-text uppercase tracking-wider font-display">No Conversation Open</span>
            <span>Select a channel or DM chat thread to sync.</span>
          </div>
        )}
      </div>

      {/* 3. Collapsible Right Context Panel */}
      {selectedSpaceId && showDetailsPanel && (
        <div className="w-[300px] border-l border-mono-border flex flex-col bg-mono-card h-full overflow-y-auto shrink-0 select-none animate-in slide-in-from-right duration-200">
          
          <div className="p-4 border-b border-mono-border flex items-center justify-between shrink-0">
            <h4 className="monolith-h3 text-mono-text font-bold font-display">Workspace Info</h4>
            <button
              onClick={() => setShowDetailsPanel(false)}
              className="p-1 hover:bg-mono-soft rounded-lg text-mono-muted hover:text-mono-text"
              title="Close panel"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="p-4 space-y-6">
            {selectedSpaceType === "JOB" && selectedJob ? (
              <div className="space-y-6">
                
                {/* Job identity */}
                <div className="monolith-card monolith-accent p-3.5 rounded-xl border border-mono-border bg-mono-soft space-y-1">
                  <span className="text-[9px] uppercase font-bold text-[#F9D972] tracking-widest block">Linked Job File</span>
                  <h5 className="text-xs font-bold text-mono-text font-mono monolith-numeric">JOB-{selectedJob.jobNumber}</h5>
                  <p className="text-[10px] text-mono-muted leading-relaxed font-semibold">{selectedJob.title}</p>
                </div>

                {/* Drive Provision slots */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="monolith-label text-mono-muted font-bold">Drive Folder Files</span>
                    {selectedJob.workspaceProfile?.rootFolderId && (
                      <a
                        href={selectedJob.workspaceProfile.rootFolderId.startsWith("mock") 
                          ? `/communication/drive?jobId=${selectedJob.id}` 
                          : `https://drive.google.com/drive/folders/${selectedJob.workspaceProfile.rootFolderId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[9px] font-bold text-[#F9D972] uppercase hover:underline flex items-center gap-0.5"
                      >
                        <span>Open Drive</span>
                        <ExternalLink className="size-2.5" />
                      </a>
                    )}
                  </div>

                  <div className="bg-mono-soft border border-mono-border/60 rounded-xl p-2.5 space-y-1.5 text-[11px] font-medium text-mono-text">
                    <div className="flex items-center justify-between p-1 hover:bg-mono-soft rounded transition-colors">
                      <span className="truncate">01 Customer KYC</span>
                      <Check className="size-3 text-[#F9D972]" />
                    </div>
                    <div className="flex items-center justify-between p-1 hover:bg-mono-soft rounded transition-colors">
                      <span className="truncate">02 Job Documents</span>
                      <Check className="size-3 text-[#F9D972]" />
                    </div>
                    <div className="flex items-center justify-between p-1 hover:bg-mono-soft rounded transition-colors">
                      <span className="truncate">06 Invoices & Billing</span>
                      <Clock className="size-3 text-[#D88700]" />
                    </div>
                  </div>
                </div>

                {/* Job team members */}
                <div className="space-y-2">
                  <span className="monolith-label text-mono-muted font-bold block">Assigned Officers</span>
                  <div className="max-h-32 overflow-y-auto space-y-2 pr-1">
                    <div className="flex items-center space-x-2 bg-mono-soft p-2 rounded-lg border border-mono-border/30">
                      <span className="size-5 rounded-full bg-[#F9D972]/15 text-[#F9D972] font-bold text-[9px] flex items-center justify-center">OP</span>
                      <div className="text-[10px] font-semibold text-mono-text">Primary Owner</div>
                    </div>
                  </div>
                </div>

                {/* Action links */}
                <div className="pt-2 border-t border-mono-border/60 space-y-2.5">
                  <Link
                    href={`/cha/jobs/${selectedJob.id}`}
                    className="flex items-center space-x-2 text-xs font-bold text-mono-text hover:text-[#F9D972] transition-all p-2 rounded-lg hover:bg-mono-soft"
                  >
                    <Briefcase className="size-4 text-[#F9D972]" />
                    <span>Open CHA Job Profile</span>
                  </Link>
                  <Link
                    href={`/communication/drive?jobId=${selectedJob.id}`}
                    className="flex items-center space-x-2 text-xs font-bold text-mono-text hover:text-[#F9D972] transition-all p-2 rounded-lg hover:bg-mono-soft"
                  >
                    <Folder className="size-4 text-[#D88700]" />
                    <span>View Sync Manager</span>
                  </Link>
                </div>
              </div>
            ) : selectedSpaceType === "DM" && selectedEmployee ? (
              <div className="space-y-5 text-center flex flex-col items-center">
                
                {/* Employee Info Card */}
                <div className="monolith-card monolith-accent w-full p-4 rounded-xl border border-mono-border bg-mono-soft flex flex-col items-center space-y-3">
                  <div className="relative">
                    <span className={`flex items-center justify-center size-14 rounded-full font-bold text-sm select-none ${getAvatarBg(selectedEmployee.name)}`}>
                      {getInitials(selectedEmployee.name)}
                    </span>
                    <span className="absolute bottom-0 right-0 size-3.5 bg-emerald-500 rounded-full border-2 border-surface" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-mono-text uppercase tracking-wide">{selectedEmployee.name}</h5>
                    <span className="text-[9px] text-[#F9D972] uppercase font-bold tracking-wider mt-0.5 block">
                      {selectedEmployee.designation || "Staff"}
                    </span>
                  </div>
                </div>

                {/* Employee quick metadata details */}
                <div className="w-full text-left space-y-3">
                  <span className="monolith-label text-mono-muted font-bold block mb-1">Contact Information</span>
                  <div className="space-y-2 text-xs text-mono-text">
                    <a
                      href={`mailto:${selectedEmployee.email}`}
                      className="flex items-center space-x-2.5 p-2 rounded-lg border border-mono-border/30 hover:bg-mono-soft"
                    >
                      <Mail className="size-3.5 text-[#818cf8]" />
                      <span className="truncate">{selectedEmployee.email}</span>
                    </a>
                    {selectedEmployee.phone && (
                      <a
                        href={`tel:${selectedEmployee.phone}`}
                        className="flex items-center space-x-2.5 p-2 rounded-lg border border-mono-border/30 hover:bg-mono-soft"
                      >
                        <Phone className="size-3.5 text-emerald-500" />
                        <span>{selectedEmployee.phone}</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Sync context */}
                <div className="w-full pt-3 border-t border-mono-border/60 text-left space-y-2 text-xs">
                  <span className="monolith-label text-mono-muted font-bold block">Integrations</span>
                  <div className="flex items-center justify-between p-2 rounded-lg border border-mono-border/30 bg-mono-soft font-bold">
                    <span className="text-mono-muted text-[10px]">Google Connection</span>
                    <span className="text-[#F9D972] text-[10px]">ACTIVE</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center text-mono-muted text-xs space-y-2 select-none h-full h-[50vh]">
                <span className="text-2xl">🗂</span>
                <span className="font-semibold text-mono-text">No Context Profile</span>
                <span className="max-w-[160px] leading-relaxed">Choose a job or contact DM to load Google metadata.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODALS */}
      {/* 1. New Chat Popover */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-mono-card border border-mono-border rounded-2xl w-full max-w-md p-5 relative shadow-xl text-left animate-page-enter">
            <button
              onClick={() => setShowNewChatModal(false)}
              className="absolute top-4 right-4 text-mono-muted hover:text-mono-text p-1 hover:bg-mono-soft rounded-lg"
            >
              <X className="size-4" />
            </button>

            <h4 className="monolith-h3 text-mono-text font-bold mb-4 font-display">New chat</h4>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="monolith-label block font-semibold text-mono-muted">Add people</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Enter email or select from below..."
                    className="w-full text-xs bg-mono-card border border-[#F9D972]/55 rounded-xl px-3 py-2.5 focus:outline-none"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 pt-1">
                <button
                  onClick={() => { setShowNewChatModal(false); setShowCreateSpaceModal(true); }}
                  className="w-full text-left px-3 py-2.5 hover:bg-mono-soft rounded-xl text-xs font-semibold flex items-center gap-2 text-[#F9D972] transition-all"
                >
                  <Users className="size-4" />
                  <span>Create a space</span>
                </button>
              </div>

              <div className="border-t border-mono-border/60 my-2"></div>

              <div className="space-y-1.5">
                <span className="monolith-label text-mono-muted font-bold block mb-1">Frequent Users</span>
                <div className="max-h-[220px] overflow-y-auto space-y-1 pr-1">
                  {employees
                    .filter(emp => emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || emp.email.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((emp) => (
                      <button
                        key={emp.id}
                        onClick={() => handleSelectEmployeeDM(emp)}
                        className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all hover:bg-mono-soft"
                      >
                        <span className={`flex items-center justify-center size-6 rounded-full font-bold text-[9px] ${getAvatarBg(emp.name)} shrink-0`}>
                          {getInitials(emp.name)}
                        </span>
                        <div className="truncate flex-1">
                          <div className="text-mono-text font-bold">{emp.name}</div>
                          <div className="text-[9px] text-mono-muted font-normal">{emp.email}</div>
                        </div>
                      </button>
                    ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 2. Create Space Modal */}
      {showCreateSpaceModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateSpace} className="bg-mono-card border border-mono-border rounded-2xl w-full max-w-md p-6 relative shadow-xl text-left animate-page-enter">
            <button
              type="button"
              onClick={() => setShowCreateSpaceModal(false)}
              className="absolute top-4 right-4 text-mono-muted hover:text-mono-text p-1 hover:bg-mono-soft rounded-lg"
            >
              <X className="size-4" />
            </button>

            <h4 className="monolith-h3 text-mono-text font-bold mb-4 font-display">Create space</h4>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="monolith-label block font-semibold text-mono-muted">Space name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Freight Forwarding Project"
                  value={newSpaceName}
                  onChange={(e) => setNewSpaceName(e.target.value)}
                  className="w-full text-xs bg-mono-card border border-[#F9D972]/55 rounded-xl px-3 py-2.5 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="monolith-label block font-semibold text-mono-muted">Access Control</label>
                <div className="space-y-2">
                  <label className="flex items-start space-x-2.5 text-xs text-mono-text font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="access"
                      value="Private"
                      checked={newSpaceAccess === "Private"}
                      onChange={() => setNewSpaceAccess("Private")}
                      className="mt-0.5 accent-[#F9D972]"
                    />
                    <div>
                      <div className="font-bold">Private</div>
                      <span className="text-[10px] text-mono-muted font-normal">Only invited employees can access this space.</span>
                    </div>
                  </label>
                  <label className="flex items-start space-x-2.5 text-xs text-mono-text cursor-pointer">
                    <input
                      type="radio"
                      name="access"
                      value="Open"
                      checked={newSpaceAccess === "Open"}
                      onChange={() => setNewSpaceAccess("Open")}
                      className="mt-0.5 accent-[#F9D972]"
                    />
                    <div>
                      <div className="font-bold">Open</div>
                      <span className="text-[10px] text-mono-muted font-normal">Anyone in organization can search and join this space.</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <div>
                  <span className="font-bold text-mono-text block">Request to Join</span>
                  <span className="text-[10px] text-mono-muted leading-relaxed">Require manager approval to join this space.</span>
                </div>
                <input
                  type="checkbox"
                  checked={newSpaceRequestToJoin}
                  onChange={(e) => setNewSpaceRequestToJoin(e.target.checked)}
                  className="accent-[#F9D972] size-4 rounded cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <label className="monolith-label block font-semibold text-mono-muted">Invite initial members</label>
                <div className="max-h-[120px] overflow-y-auto border border-mono-border rounded-xl p-2 space-y-1.5">
                  {employees.map((emp) => (
                    <label key={emp.id} className="flex items-center justify-between text-xs text-mono-text cursor-pointer px-1 py-0.5 hover:bg-mono-soft rounded-md">
                      <span className="truncate pr-2 font-medium">{emp.name} ({emp.designation || "Staff"})</span>
                      <input
                        type="checkbox"
                        checked={newSpaceInvitees.includes(emp.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewSpaceInvitees([...newSpaceInvitees, emp.id]);
                          } else {
                            setNewSpaceInvitees(newSpaceInvitees.filter(id => id !== emp.id));
                          }
                        }}
                        className="accent-[#F9D972]"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateSpaceModal(false)}
                  className="px-4 py-2 text-xs border border-mono-border hover:bg-mono-soft rounded-xl text-mono-text font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={spaceCreating}
                  className="bg-[#F9D972] text-white hover:bg-[#E8C85D] disabled:opacity-50 px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all"
                >
                  {spaceCreating ? "Creating..." : "Create"}
                </button>
              </div>

            </div>
          </form>
        </div>
      )}

      {/* 3. Manage Members Modal */}
      {showManageMembersModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-mono-card border border-mono-border rounded-2xl w-full max-w-lg p-5 relative shadow-xl text-left animate-page-enter">
            <button
              onClick={() => setShowManageMembersModal(false)}
              className="absolute top-4 right-4 text-mono-muted hover:text-mono-text p-1 hover:bg-mono-soft rounded-lg"
            >
              <X className="size-4" />
            </button>

            <h4 className="monolith-h3 text-mono-text font-bold mb-4 font-display">Members - {selectedSpaceTitle}</h4>

            <div className="flex justify-between items-center gap-4 mb-4 relative">
              <span className="monolith-label text-mono-muted font-bold">Space Members ({members.length})</span>
              <div className="relative">
                <button
                  disabled={memberActionLoading}
                  onClick={() => setShowAddMemberPopover(!showAddMemberPopover)}
                  className="bg-[#F9D972] text-white hover:bg-[#E8C85D] px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Plus className="size-3.5" /> Add member
                </button>

                {showAddMemberPopover && (
                  <div className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-mono-card border border-mono-border shadow-lg z-50 py-1.5 text-xs text-mono-text max-h-52 overflow-y-auto animate-page-enter">
                    <span className="monolith-label px-3 py-1 text-[8px] font-bold text-mono-muted block mb-1">Add Employee</span>
                    {employees
                      .filter(emp => !members.some(m => m.member?.displayName === emp.name))
                      .map((emp) => (
                        <button
                          key={emp.id}
                          onClick={() => handleAddMember(emp.id)}
                          className="w-full text-left px-3 py-1.5 hover:bg-mono-soft truncate font-medium block"
                        >
                          {emp.name}
                        </button>
                      ))}
                    {employees.filter(emp => !members.some(m => m.member?.displayName === emp.name)).length === 0 && (
                      <span className="px-3 py-2 text-mono-muted italic block text-[10px]">All users added.</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2.5 border border-mono-border/60 rounded-xl p-3 bg-mono-soft">
              {membersLoading ? (
                <div className="text-center py-10 text-xs text-mono-muted animate-pulse">Loading memberships...</div>
              ) : members.length === 0 ? (
                <div className="text-center py-10 text-xs text-mono-muted italic">No members found.</div>
              ) : (
                members.map((m, idx) => {
                  const mName = m.member?.displayName || "Google User";
                  const isCurrent = m.member?.employeeId === "current-user" || m.member?.displayName?.includes("You");
                  return (
                    <div key={idx} className="flex justify-between items-center bg-mono-card border border-mono-border/40 rounded-xl p-2.5">
                      <div className="flex items-center space-x-2.5 truncate">
                        <span className={`flex items-center justify-center size-7 rounded-full font-bold text-[9px] ${getAvatarBg(mName)} shrink-0`}>
                          {getInitials(mName)}
                        </span>
                        <div className="truncate text-xs">
                          <span className="font-bold text-mono-text block truncate">{mName}</span>
                          <span className="text-[9px] text-mono-muted block uppercase tracking-wide">
                            {m.member?.designation || "Member"} • {m.role === "ROLE_OWNER" ? "Owner" : "Member"}
                          </span>
                        </div>
                      </div>

                      {!isCurrent && (
                        <button
                          disabled={memberActionLoading}
                          onClick={() => handleRemoveMember(m.name)}
                          className="text-[10px] text-red-500 hover:bg-red-500/10 px-2.5 py-1 rounded-lg font-bold uppercase transition-all"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

          </div>
        </div>
      )}

      {/* 4. Space Settings Modal */}
      {showSpaceSettingsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-mono-card border border-mono-border rounded-2xl w-full max-w-md p-6 relative shadow-xl text-left animate-page-enter">
            <button
              onClick={() => setShowSpaceSettingsModal(false)}
              className="absolute top-4 right-4 text-mono-muted hover:text-mono-text p-1 hover:bg-mono-soft rounded-lg"
            >
              <X className="size-4" />
            </button>

            <h4 className="monolith-h3 text-mono-text font-bold mb-4 font-display">Space Settings - {selectedSpaceTitle}</h4>

            <div className="space-y-4 text-xs">
              
              <div className="space-y-2">
                <label className="monolith-label block font-semibold text-mono-muted">Access Control</label>
                <div className="space-y-2">
                  <label className="flex items-start space-x-2.5 text-xs text-mono-text font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="settings-access"
                      value="Private"
                      checked={spaceSettingsAccess === "Private"}
                      onChange={() => setSpaceSettingsAccess("Private")}
                      className="mt-0.5 accent-[#F9D972]"
                    />
                    <div>
                      <div className="font-bold">Private</div>
                      <span className="text-[10px] text-mono-muted font-normal">Only invited employees can access this space.</span>
                    </div>
                  </label>
                  <label className="flex items-start space-x-2.5 text-xs text-mono-text cursor-pointer">
                    <input
                      type="radio"
                      name="settings-access"
                      value="Discoverable"
                      checked={spaceSettingsAccess === "Discoverable"}
                      onChange={() => setSpaceSettingsAccess("Discoverable")}
                      className="mt-0.5 accent-[#F9D972]"
                    />
                    <div>
                      <div className="font-bold">Discoverable</div>
                      <span className="text-[10px] text-mono-muted font-normal">Anyone in adarshshipping can search and join this space.</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-mono-border/60">
                <div>
                  <span className="font-bold text-mono-text block">Request to Join</span>
                  <span className="text-[10px] text-mono-muted leading-relaxed">Require manager approval to join this space.</span>
                </div>
                <input
                  type="checkbox"
                  checked={spaceSettingsRequestToJoin}
                  onChange={(e) => setSpaceSettingsRequestToJoin(e.target.checked)}
                  className="accent-[#F9D972] size-4 rounded cursor-pointer"
                />
              </div>

              <div className="space-y-1.5 border-t border-mono-border/60 pt-3">
                <label className="monolith-label block font-semibold text-mono-muted">Who can manage memberships</label>
                <NativeSelect
                  value={spaceSettingsPermissions}
                  onChange={(e) => setSpaceSettingsPermissions(e.target.value)}
                  className="w-full bg-mono-card text-xs focus:ring-0 focus:outline-none"
                >
                  <option value="all">Owners, managers, and members</option>
                  <option value="managers">Owners and managers only</option>
                </NativeSelect>
              </div>

              <div className="flex justify-end space-x-2 pt-2.5 border-t border-mono-border/60">
                <button
                  onClick={() => setShowSpaceSettingsModal(false)}
                  className="px-4 py-2 border border-mono-border hover:bg-mono-soft rounded-xl text-mono-text font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSpaceSettings}
                  disabled={spaceSettingsSaving}
                  className="bg-[#F9D972] text-white hover:bg-[#E8C85D] disabled:opacity-50 px-4 py-2 rounded-xl font-bold uppercase transition-all"
                >
                  {spaceSettingsSaving ? "Saving..." : "Save"}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 5. Space Details Modal */}
      {showSpaceDetailsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-mono-card border border-mono-border rounded-2xl w-full max-w-md p-6 relative shadow-xl text-left animate-page-enter">
            <button
              onClick={() => setShowSpaceDetailsModal(false)}
              className="absolute top-4 right-4 text-mono-muted hover:text-mono-text p-1 hover:bg-mono-soft rounded-lg"
            >
              <X className="size-4" />
            </button>

            <h4 className="monolith-h3 text-mono-text font-bold mb-4 font-display">Space Details</h4>

            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <span className="monolith-label text-mono-muted">Name</span>
                <div className="text-mono-text font-bold">{selectedSpaceTitle}</div>
              </div>

              <div className="space-y-1 border-t border-mono-border/60 pt-2.5">
                <span className="monolith-label text-mono-muted">Type</span>
                <div className="text-mono-text font-bold uppercase tracking-wider">{selectedSpaceType}</div>
              </div>

              <div className="space-y-1 border-t border-mono-border/60 pt-2.5">
                <span className="monolith-label text-mono-muted">Access level</span>
                <div className="text-mono-text font-bold">{spaceSettingsAccess}</div>
              </div>

              <div className="space-y-1 border-t border-mono-border/60 pt-2.5">
                <span className="monolith-label text-mono-muted">Join approval</span>
                <div className="text-mono-text font-bold">{spaceSettingsRequestToJoin ? "Requires manager approval" : "No approval required"}</div>
              </div>

              <div className="space-y-1 border-t border-mono-border/60 pt-2.5">
                <span className="monolith-label text-mono-muted">Space ID</span>
                <div className="text-mono-muted font-mono text-[9px] select-all break-all">{selectedSpaceId}</div>
              </div>

              <div className="flex justify-end pt-2 border-t border-mono-border/60">
                <button
                  onClick={() => setShowSpaceDetailsModal(false)}
                  className="bg-[#F9D972] text-white hover:bg-[#E8C85D] px-4 py-2 rounded-xl font-bold uppercase transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
    </div>
  );
}
