"use client";

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps, prefer-const, @typescript-eslint/no-require-imports, react-hooks/immutability, react-hooks/set-state-in-effect */

import { useState, useEffect, useRef, useCallback } from "react";
import { 
  Search, Send, Video, ExternalLink, Hash, User, Briefcase, Folder, Users, 
  AlertCircle, RefreshCw, Mail, Phone, Clock, ArrowRight, Shield, Plus, 
  ChevronDown, Check, X, Star, Info, MessageSquare, Paperclip, Bell,
  Smile, Bold, Italic, Code, Trash2, Edit2, Pin, ChevronRight, Sparkles
} from "lucide-react";
import Link from "next/link";

export default function MonolithMessenger() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [googleSpaces, setGoogleSpaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active space state
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>("");
  const [selectedSpaceTitle, setSelectedSpaceTitle] = useState<string>("");
  const [selectedSpaceType, setSelectedSpaceType] = useState<string>(""); // JOB, DM, SPACE
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

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

  // Unread tracking & SSE state
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "reconnecting" | "disconnected" | "auth_error">("connecting");
  const sseRef = useRef<EventSource | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spacePollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const crossSpacePollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevMessageCountRef = useRef<number>(0);

  // Track last activity time per space for sorting (most recent first)
  const [spaceLastActivity, setSpaceLastActivity] = useState<Record<string, number>>({});

  // In-app toast notifications
  const [chatToasts, setChatToasts] = useState<{ id: string; sender: string; snippet: string; spaceId: string; spaceName: string; time: number }[]>([]);

  // Cross-space polling state: track last known message per space
  const lastKnownMessageRef = useRef<Record<string, string>>({});
  const crossSpaceBatchRef = useRef<number>(0);

  // Notification preferences (persisted in localStorage)
  const [desktopNotificationsEnabled, setDesktopNotificationsEnabled] = useState(false);

  // Load notification preferences from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("monolith_chat_desktop_notif");
      if (stored === "true") setDesktopNotificationsEnabled(true);
    } catch {}
  }, []);

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


  const fetchChannelsAndDMs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/communication/chat/list");
      const data = await res.json();
      setJobs(data.jobs || []);
      setEmployees(data.employees || []);
      setGoogleSpaces(data.googleSpaces || []);

      // Default select space from url query or first available
      const urlParams = new URLSearchParams(window.location.search);
      const querySpaceId = urlParams.get("spaceId");
      let selected = false;

      if (querySpaceId && data.jobs) {
        const match = data.jobs.find((j: any) => j.spaceId === querySpaceId);
        if (match) {
          handleSelectSpace(match.spaceId, `job-${match.jobNumber}`, "JOB", match, null);
          selected = true;
        }
      }

      if (!selected && data.jobs && data.jobs.length > 0) {
        handleSelectSpace(data.jobs[0].spaceId, `job-${data.jobs[0].jobNumber}`, "JOB", data.jobs[0], null);
        selected = true;
      }

      if (!selected && data.googleSpaces && data.googleSpaces.length > 0) {
        const firstSpace = data.googleSpaces[0];
        const isDM = firstSpace.spaceType === "DIRECT_MESSAGE";
        handleSelectSpace(
          firstSpace.name,
          firstSpace.displayName || (isDM ? "Google DM" : "Group Space"),
          isDM ? "DM" : "SPACE",
          null,
          null
        );
        selected = true;
      }
    } catch (err) {
      console.error("Failed to load spaces list:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncGoogleAccount = async () => {
    setSyncing(true);
    setSyncToast(null);
    try {
      const res = await fetch("/api/communication/chat/sync", {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        await fetchChannelsAndDMs();
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

  // Request notification permission on mount
  useEffect(() => {
    // Request notification permission proactively
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
    // Restore document title when tab regains focus
    const handleVisibility = () => {
      if (!document.hidden) {
        document.title = "Communication — Monolith";
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
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

  // Helper to resolve space name from DM entries or spaces
  const resolveSpaceName = useCallback((spaceId: string) => {
    // Check googleSpaces for a good display name
    const space = googleSpaces.find((s: any) => s.name === spaceId);
    if (space?.displayName && !["Adarsh Operations", "Google Chat DM", "Google User"].includes(space.displayName)) {
      return space.displayName;
    }
    // Check if it's a job space
    const job = jobs.find((j: any) => j.spaceId === spaceId);
    if (job) return `JOB-${job.jobNumber}`;
    return "Chat";
  }, [googleSpaces, jobs]);

  // ── Refs to hold latest data for cross-space polling (avoids stale closures & infinite loops) ──
  const googleSpacesRef = useRef(googleSpaces);
  const jobsRef = useRef(jobs);
  const selectedSpaceIdRef = useRef(selectedSpaceId);
  const desktopNotifRef = useRef(desktopNotificationsEnabled);
  useEffect(() => { googleSpacesRef.current = googleSpaces; }, [googleSpaces]);
  useEffect(() => { jobsRef.current = jobs; }, [jobs]);
  useEffect(() => { selectedSpaceIdRef.current = selectedSpaceId; }, [selectedSpaceId]);
  useEffect(() => { desktopNotifRef.current = desktopNotificationsEnabled; }, [desktopNotificationsEnabled]);

  // ── 1. Initial load + 30s spaces poll (runs ONCE) ──
  useEffect(() => {
    fetchChannelsAndDMs();

    // Poll spaces list every 30 seconds for new conversations/DMs
    spacePollTimerRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/communication/chat/list");
        const data = await res.json();
        setJobs(data.jobs || []);
        setEmployees(data.employees || []);
        setGoogleSpaces(data.googleSpaces || []);
      } catch {}
    }, 30000);

    return () => {
      if (spacePollTimerRef.current) clearInterval(spacePollTimerRef.current);
    };
  }, []);

  // ── 2. Cross-space polling for new messages (runs ONCE, reads refs for latest data) ──
  // Seed baseline message IDs on initial load (after a delay to let list API finish)
  useEffect(() => {
    const seedTimer = setTimeout(async () => {
      try {
        const currentSpaces = googleSpacesRef.current;
        const currentJobs = jobsRef.current;
        const allSpaceIds = currentSpaces.map((s: any) => s.name).filter(Boolean);
        const jobSpaceIds = currentJobs.map((j: any) => j.spaceId).filter(Boolean);
        const allIds = [...new Set([...allSpaceIds, ...jobSpaceIds])];
        // Seed in batches of 10
        for (let i = 0; i < allIds.length; i += 10) {
          const batch = allIds.slice(i, i + 10);
          try {
            const res = await fetch(`/api/communication/chat/check-new?spaces=${batch.join(",")}`);
            if (res.ok) {
              const data = await res.json();
              for (const item of (data.results || [])) {
                if (item?.latestMessageName) {
                  lastKnownMessageRef.current[item.spaceId] = item.latestMessageName;
                }
              }
            }
          } catch {}
        }
        console.log(`[CrossPoll] Seeded baseline for ${Object.keys(lastKnownMessageRef.current).length} spaces`);
      } catch {}
    }, 8000); // Wait 8s for list API to finish

    crossSpacePollRef.current = setInterval(async () => {
      try {
        const currentSpaces = googleSpacesRef.current;
        const currentJobs = jobsRef.current;
        const activeSpaceId = selectedSpaceIdRef.current;

        // Get all DM + Space resource names (excluding the currently active one)
        // Prioritize DM spaces first for faster notification
        const dmSpaceIds = currentSpaces
          .filter((s: any) => s.name && s.name !== activeSpaceId && s.spaceType === "DIRECT_MESSAGE")
          .map((s: any) => s.name);
        const otherSpaceIds = currentSpaces
          .filter((s: any) => s.name && s.name !== activeSpaceId && s.spaceType !== "DIRECT_MESSAGE")
          .map((s: any) => s.name);
        const jobSpaceIds = currentJobs
          .filter((j: any) => j.spaceId && j.spaceId !== activeSpaceId)
          .map((j: any) => j.spaceId);
        
        // DMs first, then other spaces — ensures DMs are checked every cycle
        const allIds = [...new Set([...dmSpaceIds, ...jobSpaceIds, ...otherSpaceIds])];
        if (allIds.length === 0) return;

        // Batch size 10, faster rotation
        const batchSize = 10;
        const startIdx = (crossSpaceBatchRef.current * batchSize) % allIds.length;
        const batch = allIds.slice(startIdx, startIdx + batchSize);
        crossSpaceBatchRef.current++;

        const res = await fetch(`/api/communication/chat/check-new?spaces=${batch.join(",")}`);
        if (!res.ok) return;
        const data = await res.json();

        for (const item of (data.results || [])) {
          if (!item || item.isMe) continue;

          const prevMsg = lastKnownMessageRef.current[item.spaceId];
          if (prevMsg && prevMsg === item.latestMessageName) continue;

          // First time seeing this space — just record the message ID, don't notify
          if (!prevMsg) {
            lastKnownMessageRef.current[item.spaceId] = item.latestMessageName;
            continue;
          }

          // NEW MESSAGE detected in a non-active space!
          lastKnownMessageRef.current[item.spaceId] = item.latestMessageName;

          const spaceName = resolveSpaceName(item.spaceId);

          // Update unread count
          setUnreadCounts(prev => ({
            ...prev,
            [item.spaceId]: (prev[item.spaceId] || 0) + 1
          }));

          // Update activity time for sidebar reordering
          setSpaceLastActivity(prev => ({
            ...prev,
            [item.spaceId]: new Date(item.latestTime || Date.now()).getTime()
          }));

          // Show in-app toast
          showChatToast(
            item.senderDisplayName || spaceName,
            item.snippet || "New message",
            item.spaceId,
            spaceName
          );

          // Desktop notification only if enabled
          if (desktopNotifRef.current && typeof Notification !== "undefined" && Notification.permission === "granted") {
            const notif = new Notification(`${item.senderDisplayName || spaceName}`, {
              body: item.snippet?.slice(0, 120) || "New message",
              icon: "/favicon.ico",
              tag: `chat-${item.spaceId}-${Date.now()}`,
            });
            notif.onclick = () => { window.focus(); notif.close(); };
          }

          // Flash document title
          if (document.hidden) {
            document.title = `💬 ${spaceName} — New message`;
          }

          // Refresh spaces list so sidebar updates immediately
          try {
            const listRes = await fetch("/api/communication/chat/list");
            if (listRes.ok) {
              const listData = await listRes.json();
              setJobs(listData.jobs || []);
              setEmployees(listData.employees || []);
              setGoogleSpaces(listData.googleSpaces || []);
            }
          } catch {}
        }
      } catch {
        // Silent fail
      }
    }, 8000);

    return () => {
      clearTimeout(seedTimer);
      if (crossSpacePollRef.current) clearInterval(crossSpacePollRef.current);
    };
  }, []);

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
      setMessages((prev) => {
        const prevNames = prev.map((m: any) => m.name).join(",");
        const newNames = newMsgs.map((m: any) => m.name).join(",");
        if (prevNames !== newNames || newMsgs.length !== prev.length) {
          // Track activity time
          if (newMsgs.length > 0) {
            const latestMsg = newMsgs[newMsgs.length - 1];
            setSpaceLastActivity((prev) => ({
              ...prev,
              [spaceId]: new Date(latestMsg.createTime || Date.now()).getTime()
            }));
          }

          // New messages arrived — notify for incoming from others
          if (newMsgs.length > prevMessageCountRef.current && prevMessageCountRef.current > 0) {
            const latestMsg = newMsgs[newMsgs.length - 1];
            if (latestMsg && !latestMsg.isMe) {
              const senderName = latestMsg.sender?.displayName || latestMsg.senderName || "New message";
              // In-app toast notification (always)
              showChatToast(senderName, latestMsg.text?.slice(0, 100) || "New message", spaceId, selectedSpaceTitle || "Chat");

              // Desktop notification only if enabled in settings
              if (desktopNotificationsEnabled && typeof Notification !== "undefined" && Notification.permission === "granted") {
                const notif = new Notification(senderName, {
                  body: latestMsg.text?.slice(0, 120) || "New message",
                  icon: "/favicon.ico",
                  tag: `chat-${spaceId}-${Date.now()}`,
                });
                notif.onclick = () => { window.focus(); notif.close(); };
              }
              // Update document title when tab is hidden
              if (document.hidden) {
                document.title = `💬 New message — Monolith`;
              }
            }
          }
          prevMessageCountRef.current = newMsgs.length;
          return newMsgs;
        }
        return prev;
      });
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

    fetchMessages(selectedSpaceId, currentType, currentTitle);
    fetchSpaceDetails(selectedSpaceId);

    // Clear unread for active space
    setUnreadCounts((prev) => {
      const next = { ...prev };
      delete next[selectedSpaceId];
      return next;
    });

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
          setMessages((prev) => {
            const prevNames = prev.map((m: any) => m.name).join(",");
            const newNames = newMsgs.map((m: any) => m.name).join(",");
            if (prevNames !== newNames || newMsgs.length !== prev.length) {
              if (newMsgs.length > prevMessageCountRef.current && prevMessageCountRef.current > 0) {
                const latestMsg = newMsgs[newMsgs.length - 1];
                if (latestMsg && !latestMsg.isMe) {
                  const senderName = latestMsg.sender?.displayName || latestMsg.senderName || "New message";
                  // In-app toast
                  showChatToast(senderName, latestMsg.text?.slice(0, 100) || "New message", selectedSpaceId, currentTitle || "Chat");
                  // Desktop notification only if enabled
                  if (desktopNotificationsEnabled && typeof Notification !== "undefined" && Notification.permission === "granted") {
                    new Notification(senderName, {
                      body: latestMsg.text?.slice(0, 120) || "New message",
                      icon: "/favicon.ico",
                      tag: `chat-${selectedSpaceId}-${Date.now()}`,
                    });
                  }
                }
              }
              prevMessageCountRef.current = newMsgs.length;
              return newMsgs;
            }
            return prev;
          });
        } catch { /* ignore parse errors */ }
      });

      sse.addEventListener("spaces:updated", () => {
        fetch("/api/communication/chat/list")
          .then((res) => res.json())
          .then((data) => {
            setJobs(data.jobs || []);
            setEmployees(data.employees || []);
            setGoogleSpaces(data.googleSpaces || []);
          })
          .catch(() => {});
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
    setSelectedSpaceId(spaceId);
    setSelectedSpaceTitle(title);
    setSelectedSpaceType(type);
    setSelectedJob(jobData || null);
    setSelectedEmployee(empData || null);
    setMessages([]);
    setShowCaretDropdown(false);

    // Restore draft for the new channel
    setNewMessageText(drafts[spaceId] || "");
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
        setSelectedSpaceId("");
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
        return <code key={index} className="font-mono bg-surface-container-high text-xs px-1 py-0.5 rounded border border-outline-variant">{part.slice(1, -1)}</code>;
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
    const aUnread = unreadCounts[a] || 0;
    const bUnread = unreadCounts[b] || 0;
    // Unread first
    if (aUnread > 0 && bUnread === 0) return -1;
    if (bUnread > 0 && aUnread === 0) return 1;
    // Then by last activity time
    const aTime = spaceLastActivity[a] || 0;
    const bTime = spaceLastActivity[b] || 0;
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
    const hasUnread = (unreadCounts[space.name] || 0) > 0;
    const hasKnownActivity = (spaceLastActivity[space.name] || 0) > 0;
    
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
            <button
              key={toast.id}
              onClick={() => {
                // Determine space type from the spaces data
                const space = googleSpaces.find((s: any) => s.name === toast.spaceId);
                const job = jobs.find((j: any) => j.spaceId === toast.spaceId);
                const spaceType = job ? "JOB" : space?.spaceType === "DIRECT_MESSAGE" ? "DM" : "SPACE";
                handleSelectSpace(toast.spaceId, toast.spaceName, spaceType, job || null, null);
                setChatToasts(prev => prev.filter(t => t.id !== toast.id));
              }}
              className="pointer-events-auto flex items-start gap-3 bg-surface border border-[#00cec4]/30 rounded-xl px-4 py-3 shadow-lg backdrop-blur-sm animate-in slide-in-from-right duration-300 hover:border-[#00cec4]/60 hover:shadow-xl transition-all cursor-pointer text-left w-full"
            >
              <div className="shrink-0 mt-0.5">
                <Bell className="size-4 text-[#00cec4]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-on-surface truncate">{toast.sender}</span>
                  <span className="text-[9px] text-on-surface-variant shrink-0">now</span>
                </div>
                <p className="text-[11px] text-on-surface-variant mt-0.5 line-clamp-2 leading-snug">{toast.snippet}</p>
                {toast.spaceName !== toast.sender && (
                  <span className="text-[9px] text-[#00cec4] font-medium mt-1 block">in {toast.spaceName}</span>
                )}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setChatToasts(prev => prev.filter(t => t.id !== toast.id)); }}
                className="shrink-0 p-0.5 hover:bg-surface-container rounded text-on-surface-variant"
              >
                <X className="size-3" />
              </button>
            </button>
          ))}
        </div>
      )}

      <div className="flex border border-outline-variant bg-surface rounded-2xl overflow-hidden shadow-sm text-left font-sans" style={{ height: "calc(100vh - 9rem)" }}>
      
      {/* 1. Left Sidebar: Slack layout */}
      <div className="w-[240px] border-r border-outline-variant flex flex-col bg-surface-container-low shrink-0 h-full">
        
        {/* Workspace selector */}
        <div className="p-3 border-b border-outline-variant bg-surface flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2 truncate">
            <div className="size-6 bg-[#00cec4] rounded-lg text-white font-bold flex items-center justify-center text-xs shrink-0 font-display">
              A
            </div>
            <div className="truncate">
              <h2 className="text-xs font-bold text-on-surface uppercase tracking-wide font-display">Adarsh Shipping</h2>
              <div className="flex items-center space-x-1 mt-0.5">
                <span className={`size-1.5 rounded-full ${
                  connectionStatus === "connected" ? "bg-emerald-500 animate-pulse" :
                  connectionStatus === "connecting" ? "bg-yellow-500 animate-pulse" :
                  connectionStatus === "reconnecting" ? "bg-yellow-500 animate-pulse" :
                  connectionStatus === "auth_error" ? "bg-red-500" :
                  "bg-red-500"
                }`} />
                <span className="text-[9px] text-on-surface-variant font-medium block uppercase tracking-wider">
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
              className={`p-1.5 hover:bg-surface-container rounded-lg text-on-surface-variant transition-all hover:scale-105 ${
                syncing ? "animate-spin text-[#00cec4]" : ""
              }`}
              title="Sync spaces with Google account"
            >
              <RefreshCw className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowNewChatModal(true)}
              className="p-1.5 hover:bg-surface-container rounded-lg text-[#00cec4] transition-all hover:scale-105"
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
              ? "bg-[#00cec4]/10 text-[#00cec4] border-b border-[#00cec4]/20" 
              : "bg-red-500/10 text-red-500 border-b border-red-500/20"
          }`}>
            <span>{syncToast.message}</span>
            <button onClick={() => setSyncToast(null)} className="p-0.5 hover:bg-surface-container rounded">
              <X className="size-3" />
            </button>
          </div>
        )}

        {/* Filter Quick Switcher */}
        <div className="p-2 bg-surface-container-low border-b border-outline-variant shrink-0">
          <div className="relative">
            <input
              type="text"
              placeholder="Jump to channel or DM..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-[11px] bg-surface border border-outline-variant rounded-lg pl-7 pr-3 py-1.5 focus:outline-none focus:border-[#00cec4]/70 placeholder:text-on-surface-variant/40 text-on-surface"
            />
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-on-surface-variant/50" />
          </div>
        </div>

        {/* Shortcuts rail */}
        <div className="px-2 pt-2 border-b border-outline-variant bg-surface-container-low flex justify-around items-center gap-1 shrink-0 pb-2">
          <button
            onClick={() => setActiveShortcut("home")}
            className={`flex-1 py-1 px-1.5 rounded-md text-[9px] font-bold uppercase tracking-wider text-center transition-all ${
              activeShortcut === "home" ? "bg-[#00cec4]/15 text-[#00cec4]" : "text-on-surface-variant hover:bg-surface-container"
            }`}
          >
            Home
          </button>
          <button
            onClick={() => setActiveShortcut("starred")}
            className={`flex-1 py-1 px-1.5 rounded-md text-[9px] font-bold uppercase tracking-wider text-center transition-all ${
              activeShortcut === "starred" ? "bg-[#00cec4]/15 text-[#00cec4]" : "text-on-surface-variant hover:bg-surface-container"
            }`}
          >
            Starred
          </button>
        </div>

        {/* Collapsible channels / lists */}
        <div className="flex-1 overflow-y-auto p-2 space-y-4 scrollbar-thin select-none">
          
          {/* Direct Messages */}
          <div className="space-y-0.5">
            <div className="flex items-center justify-between px-2 py-1 text-on-surface-variant hover:text-on-surface cursor-pointer group">
              <button 
                onClick={() => toggleSection("dms")} 
                className="flex items-center space-x-1 flex-1 text-left"
              >
                {collapsedSections.dms ? <ChevronRight className="size-3 shrink-0" /> : <ChevronDown className="size-3 shrink-0" />}
                <span className="ds-label text-[9px] font-bold tracking-wider">Direct Messages</span>
              </button>
              <button 
                onClick={() => setShowNewChatModal(true)} 
                className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-surface-container rounded text-on-surface-variant transition-all"
                title="New Direct Message"
              >
                <Plus className="size-3" />
              </button>
            </div>

            {!collapsedSections.dms && (
              <div className="space-y-0.5 pl-1.5">
                {loading ? (
                  <div className="text-[10px] text-on-surface-variant px-2 animate-pulse">Loading DMs...</div>
                ) : filteredDMs.length === 0 ? (
                  <div className="text-[10px] text-on-surface-variant px-2 italic">
                    {searchQuery ? "No matching conversations." : "No conversations yet. Click + to start a new DM."}
                  </div>
                ) : (
                  <>
                    {filteredDMs.map((entry) => {
                      const isSelected = selectedSpaceId === entry.spaceId;
                      const unreadCount = unreadCounts[entry.spaceId] || 0;
                      return (
                        <button
                          key={entry.spaceId}
                          onClick={() => handleSelectSpace(entry.spaceId, entry.name, "DM")}
                          className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs text-left transition-all ${
                            isSelected
                              ? "bg-[#00cec4] text-white shadow-sm font-semibold"
                              : unreadCount > 0
                                ? "text-on-surface font-bold hover:bg-surface-container"
                                : "text-on-surface-variant font-medium hover:bg-surface-container hover:text-on-surface"
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
                            <span className="flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-[#00cec4] text-white text-[9px] font-bold px-1">
                              {unreadCount > 99 ? "99+" : unreadCount}
                            </span>
                          )}
                          {starredSpaces.has(entry.spaceId) && <Star className={`size-3 ${isSelected ? "text-white" : "text-[#fb923c]"} fill-current`} />}
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
            <div className="flex items-center justify-between px-2 py-1 text-on-surface-variant hover:text-on-surface cursor-pointer group">
              <button 
                onClick={() => toggleSection("jobSpaces")} 
                className="flex items-center space-x-1 flex-1 text-left"
              >
                {collapsedSections.jobSpaces ? <ChevronRight className="size-3 shrink-0" /> : <ChevronDown className="size-3 shrink-0" />}
                <span className="ds-label text-[9px] font-bold tracking-wider">Job Spaces</span>
              </button>
            </div>

            {!collapsedSections.jobSpaces && (
              <div className="space-y-0.5 pl-1.5">
                {loading ? (
                  <div className="text-[10px] text-on-surface-variant px-2 animate-pulse">Loading spaces...</div>
                ) : filteredJobs.length === 0 ? (
                  <div className="text-[10px] text-on-surface-variant px-2 italic">No active jobs.</div>
                ) : (
                  filteredJobs.map((job) => {
                    const isSelected = selectedSpaceId === job.spaceId;
                    const channelName = cleanJobChannelName(job.jobNumber, job.title);
                    const unreadCount = unreadCounts[job.spaceId] || 0;
                    return (
                      <button
                        key={job.id}
                        onClick={() => handleSelectSpace(job.spaceId, `job-${job.jobNumber}`, "JOB", job, null)}
                        className={`w-full flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs text-left transition-all ${
                          isSelected
                            ? "bg-[#00cec4] text-white font-semibold"
                            : unreadCount > 0
                              ? "text-on-surface font-bold hover:bg-surface-container"
                              : "text-on-surface-variant font-medium hover:bg-surface-container hover:text-on-surface"
                        }`}
                      >
                        <Hash className={`size-3.5 shrink-0 ${isSelected ? "text-white" : "text-[#00cec4]"}`} />
                        <span className="truncate flex-1">{channelName}</span>
                        {unreadCount > 0 && !isSelected && (
                          <span className="flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-[#00cec4] text-white text-[9px] font-bold px-1">
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        )}
                        {starredSpaces.has(job.spaceId) && <Star className={`size-3 ${isSelected ? "text-white" : "text-[#fb923c]"} fill-current`} />}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Normal Spaces / Rooms */}
          <div className="space-y-0.5">
            <div className="flex items-center justify-between px-2 py-1 text-on-surface-variant hover:text-on-surface cursor-pointer group">
              <button 
                onClick={() => toggleSection("spaces")} 
                className="flex items-center space-x-1 flex-1 text-left"
              >
                {collapsedSections.spaces ? <ChevronRight className="size-3 shrink-0" /> : <ChevronDown className="size-3 shrink-0" />}
                <span className="ds-label text-[9px] font-bold tracking-wider">Group Channels</span>
              </button>
              <button 
                onClick={() => setShowCreateSpaceModal(true)} 
                className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-surface-container rounded text-on-surface-variant transition-all"
                title="Create Space"
              >
                <Plus className="size-3" />
              </button>
            </div>

            {!collapsedSections.spaces && (
              <div className="space-y-0.5 pl-1.5">
                {loading ? (
                  <div className="text-[10px] text-on-surface-variant px-2 animate-pulse">Loading spaces...</div>
                ) : filteredSpaces.length === 0 ? (
                  <div className="text-[10px] text-on-surface-variant px-2 italic">No spaces.</div>
                ) : (
                  filteredSpaces.map((space) => {
                    const isSelected = selectedSpaceId === space.name;
                    const unreadCount = unreadCounts[space.name] || 0;
                    return (
                      <button
                        key={space.name}
                        onClick={() => handleSelectSpace(space.name, space.displayName || "Google Space", "SPACE")}
                        className={`w-full flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs text-left transition-all ${
                          isSelected
                            ? "bg-[#00cec4] text-white font-semibold"
                            : unreadCount > 0
                              ? "text-on-surface font-bold hover:bg-surface-container"
                              : "text-on-surface-variant font-medium hover:bg-surface-container hover:text-on-surface"
                        }`}
                      >
                        <Users className={`size-3.5 shrink-0 ${isSelected ? "text-white" : "text-[#818cf8]"}`} />
                        <span className="truncate flex-1">{space.displayName || "Google Space"}</span>
                        {unreadCount > 0 && !isSelected && (
                          <span className="flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-[#00cec4] text-white text-[9px] font-bold px-1">
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        )}
                        {starredSpaces.has(space.name) && <Star className={`size-3 ${isSelected ? "text-white" : "text-[#fb923c]"} fill-current`} />}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Integrations & Apps */}
          <div className="space-y-0.5">
            <div className="flex items-center justify-between px-2 py-1 text-on-surface-variant hover:text-on-surface cursor-pointer">
              <button 
                onClick={() => toggleSection("apps")} 
                className="flex items-center space-x-1 flex-1 text-left"
              >
                {collapsedSections.apps ? <ChevronRight className="size-3 shrink-0" /> : <ChevronDown className="size-3 shrink-0" />}
                <span className="ds-label text-[9px] font-bold tracking-wider">Workspace Apps</span>
              </button>
            </div>

            {!collapsedSections.apps && (
              <div className="space-y-0.5 pl-1.5 text-xs text-on-surface-variant font-medium">
                <div className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg hover:bg-surface-container cursor-pointer transition-all">
                  <span className="size-2 rounded-full bg-[#00cec4] shrink-0" />
                  <span>Mono AI Bot</span>
                </div>
                <div className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg hover:bg-surface-container cursor-pointer transition-all">
                  <span className="size-2 rounded-full bg-[#fb923c] shrink-0" />
                  <span>Google Drive App</span>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* 2. Main Conversation Area */}
      <div className="flex-1 flex flex-col bg-surface h-full min-w-0">
        {selectedSpaceId ? (
          <div className="flex flex-col h-full min-w-0 overflow-hidden relative">
            
            {/* Conversation Header */}
            <div className="h-[48px] px-4 border-b border-outline-variant bg-surface flex justify-between items-center z-10 shrink-0 select-none">
              <div className="flex items-center space-x-2 min-w-0 relative">
                
                {/* Space Dropdown */}
                <button
                  onClick={() => setShowCaretDropdown(!showCaretDropdown)}
                  className="flex items-center gap-1 hover:bg-surface-container px-2 py-1 rounded-lg text-xs font-bold text-on-surface uppercase tracking-wide transition-all truncate"
                >
                  {selectedSpaceType === "JOB" ? (
                    <Hash className="size-3.5 text-[#00cec4] shrink-0" />
                  ) : selectedSpaceType === "DM" ? (
                    <span className="size-2 bg-emerald-500 rounded-full shrink-0" />
                  ) : (
                    <Users className="size-3.5 text-[#818cf8] shrink-0" />
                  )}
                  <span className="truncate">{selectedSpaceTitle}</span>
                  <ChevronDown className="size-3 text-on-surface-variant shrink-0" />
                </button>

                {showCaretDropdown && (
                  <div className="absolute left-0 top-full mt-1 w-52 rounded-xl bg-surface border border-outline-variant shadow-lg z-50 py-1 text-xs text-on-surface">
                    <button
                      onClick={() => { setShowCaretDropdown(false); handleOpenDetailsModal(); }}
                      className="w-full text-left px-3 py-1.5 hover:bg-surface-container-low flex items-center gap-2"
                    >
                      <Info className="size-3.5 text-[#00cec4]" />
                      <span>Details</span>
                    </button>
                    {selectedSpaceType !== "DM" && (
                      <>
                        <button
                          onClick={() => { setShowCaretDropdown(false); handleOpenMembersModal(); }}
                          className="w-full text-left px-3 py-1.5 hover:bg-surface-container-low flex items-center gap-2"
                        >
                          <Users className="size-3.5 text-[#818cf8]" />
                          <span>Manage Members</span>
                        </button>
                        <button
                          onClick={() => { setShowCaretDropdown(false); handleOpenSettingsModal(); }}
                          className="w-full text-left px-3 py-1.5 hover:bg-surface-container-low flex items-center gap-2"
                        >
                          <Clock className="size-3.5 text-[#fb923c]" />
                          <span>Settings</span>
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => { setShowCaretDropdown(false); handleCopyLink(); }}
                      className="w-full text-left px-3 py-1.5 hover:bg-surface-container-low flex items-center gap-2"
                    >
                      <ExternalLink className="size-3.5 text-[#22c55e]" />
                      <span>Copy Space Link</span>
                    </button>
                    <div className="border-t border-outline-variant my-1"></div>
                    <button
                      onClick={() => { setShowCaretDropdown(false); toggleStarSpace(selectedSpaceId); }}
                      className="w-full text-left px-3 py-1.5 hover:bg-surface-container-low flex items-center gap-2"
                    >
                      <Star className={`size-3.5 ${starredSpaces.has(selectedSpaceId) ? "text-[#fb923c] fill-current" : "text-on-surface-variant"}`} />
                      <span>{starredSpaces.has(selectedSpaceId) ? "Unstar" : "Star"}</span>
                    </button>
                    {selectedSpaceType !== "DM" && (
                      <button
                        onClick={() => { setShowCaretDropdown(false); handleLeaveSpace(); }}
                        className="w-full text-left px-3 py-1.5 hover:bg-surface-container-low text-red-500 flex items-center gap-2"
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
                  className="p-1 text-on-surface-variant hover:text-[#fb923c] rounded-md transition-colors"
                >
                  <Star className={`size-3.5 ${starredSpaces.has(selectedSpaceId) ? "text-[#fb923c] fill-current" : ""}`} />
                </button>

                {/* Job stage badge */}
                {selectedSpaceType === "JOB" && selectedJob && (
                  <span className="hidden sm:inline-block bg-[#00cec4]/10 text-[#00cec4] border border-[#00cec4]/20 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
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
                      className="p-1.5 hover:bg-surface-container text-[#fb923c] rounded-lg transition-colors"
                      title="Google Drive Storage (Sim)"
                    >
                      <Folder className="size-4" />
                    </Link>
                  ) : (
                    <a
                      href={`https://drive.google.com/drive/folders/${selectedJob.workspaceProfile.rootFolderId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 hover:bg-surface-container text-[#fb923c] rounded-lg transition-colors"
                      title="Open Google Drive Folder"
                    >
                      <Folder className="size-4" />
                    </a>
                  )
                )}
                
                <Link
                  href="/communication/meetings"
                  className="p-1.5 hover:bg-surface-container text-[#00cec4] rounded-lg transition-colors"
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
                    className="p-1.5 hover:bg-surface-container text-on-surface-variant hover:text-on-surface rounded-lg transition-colors"
                    title="Open in native Google Chat app"
                  >
                    <ExternalLink className="size-4" />
                  </a>
                )}

                <div className="h-4 w-px bg-outline-variant mx-1" />

                {/* Details toggle */}
                <button
                  onClick={() => setShowDetailsPanel(!showDetailsPanel)}
                  className={`p-1.5 rounded-lg transition-colors ${showDetailsPanel ? "bg-surface-container text-[#00cec4]" : "hover:bg-surface-container text-on-surface-variant"}`}
                  title="Toggle details panel"
                >
                  <Info className="size-4" />
                </button>
              </div>
            </div>

            {/* Message Feed timeline */}
            <div className="flex-1 overflow-y-auto bg-surface-container-low min-h-0 divide-y-0 relative">
              {messagesLoading && messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-xs text-on-surface-variant space-y-2 h-full">
                  <RefreshCw className="size-5 animate-spin text-[#00cec4]" />
                  <span>Syncing conversation history...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-20 text-xs text-on-surface-variant flex flex-col items-center justify-center space-y-2 h-full select-none">
                  <span className="text-3xl">💬</span>
                  <span className="font-semibold text-on-surface uppercase tracking-wider">Beginning of conversation</span>
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
                            <span className="mx-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest bg-surface px-3 py-1 rounded-full border border-outline-variant/40 shadow-sm">
                              {formatDateSeparator(group.createTime)}
                            </span>
                            <div className="flex-1 h-px bg-outline-variant/60" />
                          </div>
                        )}

                        {/* Slack message row format */}
                        <div 
                          className={`px-6 py-2 transition-colors duration-150 flex items-start space-x-3 relative group ${
                            isSystem ? "bg-surface-container-low/30" : "hover:bg-surface-container-low"
                          }`}
                          onMouseEnter={() => setHoveredMessageId(group.messages[0].name)}
                          onMouseLeave={() => setHoveredMessageId(null)}
                        >
                          {/* Avatar */}
                          <div className="shrink-0 pt-0.5 select-none">
                            {isSystem ? (
                              <span className="flex items-center justify-center size-8 rounded-lg bg-[#00cec4]/15 border border-[#00cec4]/20 text-[#00cec4] font-bold text-xs">
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
                              <span className="font-bold text-on-surface tracking-wide">
                                {group.sender?.displayName || "Google User"}
                              </span>
                              {isSystem && (
                                <span className="bg-[#00cec4]/15 text-[#00cec4] px-1 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide border border-[#00cec4]/20">
                                  Bot
                                </span>
                              )}
                              <span className="text-[10px] text-on-surface-variant/60 font-medium ds-numeric">
                                {new Date(group.createTime).toLocaleTimeString("en-IN", {
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </span>
                            </div>

                            {/* Consecutive messages text list */}
                            <div className="space-y-1 text-on-surface font-normal leading-relaxed break-words pr-4">
                              {group.messages.map((msg: any, msgIdx: number) => {
                                const isMsgHovered = hoveredMessageId === msg.name;
                                const reactions = messageReactions[msg.name] || [];

                                return (
                                  <div key={msgIdx} className="relative py-0.5">
                                    <div className="text-on-surface text-[12px] font-normal leading-relaxed">
                                      {renderMessageText(msg.text)}
                                      {msg.edited && (
                                        <span className="text-[9px] text-on-surface-variant/50 ml-1 select-none font-medium">(edited)</span>
                                      )}
                                    </div>

                                    {/* Google card formatting if present */}
                                    {msg.cardsV2 && msg.cardsV2.length > 0 && (
                                      <div className="mt-2 border border-outline-variant bg-surface rounded-xl p-3 max-w-sm shadow-sm">
                                        <h5 className="font-bold text-xs text-on-surface uppercase tracking-wide">Workspace Card Notification</h5>
                                        <p className="text-xs text-on-surface-variant mt-1">Details resolved from synced Workspace events.</p>
                                      </div>
                                    )}

                                    {/* Message Quick-Actions floating toolbar (Slack style) */}
                                    {isMsgHovered && (
                                      <div className="absolute right-0 top-0 -translate-y-4 bg-surface border border-outline-variant rounded-lg shadow-md flex items-center p-1 space-x-0.5 z-10 select-none animate-in fade-in duration-75">
                                        <button
                                          onClick={() => {
                                            setEditingMessageName(msg.name);
                                            setEditingMessageText(msg.text);
                                          }}
                                          className="p-1 hover:bg-surface-container-low rounded text-on-surface-variant hover:text-on-surface transition-colors"
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
                                          className="p-1 hover:bg-surface-container-low text-red-500 rounded transition-colors"
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
            <div className="p-4 border-t border-outline-variant bg-surface shrink-0">
              
              {/* Draft edit pane */}
              {editingMessageName ? (
                <div className="mb-2 p-2 bg-surface-container-low border border-outline-variant rounded-xl flex items-center justify-between text-xs animate-in slide-in-from-bottom duration-100">
                  <div className="flex-1 mr-4">
                    <span className="text-[10px] uppercase font-bold text-[#00cec4] block">Editing Message</span>
                    <input
                      type="text"
                      value={editingMessageText}
                      onChange={(e) => setEditingMessageText(e.target.value)}
                      className="w-full bg-transparent border-none text-xs text-on-surface focus:outline-none focus:ring-0 py-1"
                    />
                  </div>
                  <div className="flex items-center space-x-1.5 shrink-0">
                    <button
                      onClick={() => setEditingMessageName(null)}
                      className="px-2.5 py-1 border border-outline-variant hover:bg-surface-container-high text-on-surface rounded-lg font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        // Call backend edit in production or mock in dev
                        setMessages(prev => prev.map(m => m.name === editingMessageName ? { ...m, text: editingMessageText, edited: true } : m));
                        setEditingMessageName(null);
                      }}
                      className="bg-[#00cec4] text-white hover:bg-[#00b8af] px-3 py-1 rounded-lg font-bold"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="border border-outline-variant rounded-xl overflow-hidden focus-within:border-[#00cec4] focus-within:shadow-[0_0_0_3px_rgba(0,206,196,0.1)] transition-all">
                <textarea
                  ref={composerRef}
                  rows={2}
                  placeholder={selectedSpaceType === "DM" ? `Message ${selectedSpaceTitle}` : `Message #${cleanJobChannelName(selectedJob?.jobNumber || "space", selectedSpaceTitle)}`}
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  className="w-full p-3 bg-surface border-none text-xs text-on-surface focus:ring-0 focus:outline-none resize-none"
                />

                {/* Format Toolbar & actions */}
                <div className="px-3 py-2 bg-surface-container-low border-t border-outline-variant flex justify-between items-center select-none text-on-surface-variant">
                  <div className="flex items-center space-x-1">
                    
                    {/* Plus Actions button */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowPlusMenu(!showPlusMenu)}
                        className={`p-1.5 rounded hover:bg-surface-container-high transition-colors ${showPlusMenu ? "text-[#00cec4] bg-surface-container" : ""}`}
                        title="Add attachment or meeting room"
                      >
                        <Plus className="size-3.5" />
                      </button>

                      {showPlusMenu && (
                        <div className="absolute left-0 bottom-full mb-2 w-48 rounded-xl bg-surface border border-outline-variant shadow-lg z-50 py-1 text-xs text-on-surface animate-page-enter">
                          <button
                            onClick={() => { setShowPlusMenu(false); alert("To attach Drive file, search files in Job Context panel."); }}
                            className="w-full text-left px-3 py-2 hover:bg-surface-container-low flex items-center gap-2"
                          >
                            <Folder className="size-3.5 text-[#fb923c]" />
                            <span>Share from Drive</span>
                          </button>
                          <Link
                            href="/communication/meetings"
                            className="w-full text-left px-3 py-2 hover:bg-surface-container-low flex items-center gap-2"
                          >
                            <Video className="size-3.5 text-[#00cec4]" />
                            <span>Create Google Meet</span>
                          </Link>
                          <Link
                            href="/communication/calendar"
                            className="w-full text-left px-3 py-2 hover:bg-surface-container-low flex items-center gap-2"
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
                      className="p-1.5 rounded hover:bg-surface-container-high transition-colors"
                      title="Bold"
                    >
                      <Bold className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTextFormat("_")}
                      className="p-1.5 rounded hover:bg-surface-container-high transition-colors"
                      title="Italic"
                    >
                      <Italic className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTextFormat("`")}
                      className="p-1.5 rounded hover:bg-surface-container-high transition-colors"
                      title="Code Block"
                    >
                      <Code className="size-3.5" />
                    </button>

                    <div className="h-4 w-px bg-outline-variant mx-1" />

                    {/* Emoji list trigger */}
                    <button
                      type="button"
                      onClick={() => insertEmoji("😊")}
                      className="p-1.5 rounded hover:bg-surface-container-high transition-colors text-xs"
                      title="Insert emoji 😊"
                    >
                      😊
                    </button>
                    <button
                      type="button"
                      onClick={() => insertEmoji("👍")}
                      className="p-1.5 rounded hover:bg-surface-container-high transition-colors text-xs"
                      title="Insert emoji 👍"
                    >
                      👍
                    </button>
                    <button
                      type="button"
                      onClick={() => insertEmoji("🚀")}
                      className="p-1.5 rounded hover:bg-surface-container-high transition-colors text-xs"
                      title="Insert emoji 🚀"
                    >
                      🚀
                    </button>
                  </div>

                  {/* Send Button */}
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={sending || !newMessageText.trim()}
                    className="bg-[#00cec4] text-white hover:bg-[#00b8af] disabled:opacity-40 px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all flex items-center space-x-1 shadow-sm"
                  >
                    <span>Send</span>
                    <Send className="size-3" />
                  </button>
                </div>
              </div>
              <div className="text-[10px] text-on-surface-variant/50 text-right mt-1 font-medium select-none">
                <strong>Enter</strong> to send • <strong>Shift+Enter</strong> for new line
              </div>
            </div>

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center h-full text-on-surface-variant text-xs space-y-2 bg-surface-container-low select-none">
            <span className="text-4xl animate-bounce">💬</span>
            <span className="font-semibold text-on-surface uppercase tracking-wider font-display">No Conversation Open</span>
            <span>Select a channel or DM chat thread to sync.</span>
          </div>
        )}
      </div>

      {/* 3. Collapsible Right Context Panel */}
      {selectedSpaceId && showDetailsPanel && (
        <div className="w-[300px] border-l border-outline-variant flex flex-col bg-surface h-full overflow-y-auto shrink-0 select-none animate-in slide-in-from-right duration-200">
          
          <div className="p-4 border-b border-outline-variant flex items-center justify-between shrink-0">
            <h4 className="ds-h3 text-on-surface font-bold font-display">Workspace Info</h4>
            <button
              onClick={() => setShowDetailsPanel(false)}
              className="p-1 hover:bg-surface-container rounded-lg text-on-surface-variant hover:text-on-surface"
              title="Close panel"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="p-4 space-y-6">
            {selectedSpaceType === "JOB" && selectedJob ? (
              <div className="space-y-6">
                
                {/* Job identity */}
                <div className="card-left-accent p-3.5 rounded-xl border border-outline-variant bg-surface-container-low space-y-1">
                  <span className="text-[9px] uppercase font-bold text-[#00cec4] tracking-widest block">Linked Job File</span>
                  <h5 className="text-xs font-bold text-on-surface font-mono ds-numeric">JOB-{selectedJob.jobNumber}</h5>
                  <p className="text-[10px] text-on-surface-variant leading-relaxed font-semibold">{selectedJob.title}</p>
                </div>

                {/* Drive Provision slots */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="ds-label text-on-surface-variant font-bold">Drive Folder Files</span>
                    {selectedJob.workspaceProfile?.rootFolderId && (
                      <a
                        href={selectedJob.workspaceProfile.rootFolderId.startsWith("mock") 
                          ? `/communication/drive?jobId=${selectedJob.id}` 
                          : `https://drive.google.com/drive/folders/${selectedJob.workspaceProfile.rootFolderId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[9px] font-bold text-[#00cec4] uppercase hover:underline flex items-center gap-0.5"
                      >
                        <span>Open Drive</span>
                        <ExternalLink className="size-2.5" />
                      </a>
                    )}
                  </div>

                  <div className="bg-surface-container-low border border-outline-variant/60 rounded-xl p-2.5 space-y-1.5 text-[11px] font-medium text-on-surface">
                    <div className="flex items-center justify-between p-1 hover:bg-surface-container rounded transition-colors">
                      <span className="truncate">01 Customer KYC</span>
                      <Check className="size-3 text-[#00cec4]" />
                    </div>
                    <div className="flex items-center justify-between p-1 hover:bg-surface-container rounded transition-colors">
                      <span className="truncate">02 Job Documents</span>
                      <Check className="size-3 text-[#00cec4]" />
                    </div>
                    <div className="flex items-center justify-between p-1 hover:bg-surface-container rounded transition-colors">
                      <span className="truncate">06 Invoices & Billing</span>
                      <Clock className="size-3 text-[#fb923c]" />
                    </div>
                  </div>
                </div>

                {/* Job team members */}
                <div className="space-y-2">
                  <span className="ds-label text-on-surface-variant font-bold block">Assigned Officers</span>
                  <div className="max-h-32 overflow-y-auto space-y-2 pr-1">
                    <div className="flex items-center space-x-2 bg-surface-container-low p-2 rounded-lg border border-outline-variant/30">
                      <span className="size-5 rounded-full bg-[#00cec4]/15 text-[#00cec4] font-bold text-[9px] flex items-center justify-center">OP</span>
                      <div className="text-[10px] font-semibold text-on-surface">Primary Owner</div>
                    </div>
                  </div>
                </div>

                {/* Action links */}
                <div className="pt-2 border-t border-outline-variant/60 space-y-2.5">
                  <Link
                    href={`/cha/jobs/${selectedJob.id}`}
                    className="flex items-center space-x-2 text-xs font-bold text-on-surface hover:text-[#00cec4] transition-all p-2 rounded-lg hover:bg-surface-container-low"
                  >
                    <Briefcase className="size-4 text-[#00cec4]" />
                    <span>Open CHA Job Profile</span>
                  </Link>
                  <Link
                    href={`/communication/drive?jobId=${selectedJob.id}`}
                    className="flex items-center space-x-2 text-xs font-bold text-on-surface hover:text-[#00cec4] transition-all p-2 rounded-lg hover:bg-surface-container-low"
                  >
                    <Folder className="size-4 text-[#fb923c]" />
                    <span>View Sync Manager</span>
                  </Link>
                </div>
              </div>
            ) : selectedSpaceType === "DM" && selectedEmployee ? (
              <div className="space-y-5 text-center flex flex-col items-center">
                
                {/* Employee Info Card */}
                <div className="card-left-accent w-full p-4 rounded-xl border border-outline-variant bg-surface-container-low flex flex-col items-center space-y-3">
                  <div className="relative">
                    <span className={`flex items-center justify-center size-14 rounded-full font-bold text-sm select-none ${getAvatarBg(selectedEmployee.name)}`}>
                      {getInitials(selectedEmployee.name)}
                    </span>
                    <span className="absolute bottom-0 right-0 size-3.5 bg-emerald-500 rounded-full border-2 border-surface" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-on-surface uppercase tracking-wide">{selectedEmployee.name}</h5>
                    <span className="text-[9px] text-[#00cec4] uppercase font-bold tracking-wider mt-0.5 block">
                      {selectedEmployee.designation || "Staff"}
                    </span>
                  </div>
                </div>

                {/* Employee quick metadata details */}
                <div className="w-full text-left space-y-3">
                  <span className="ds-label text-on-surface-variant font-bold block mb-1">Contact Information</span>
                  <div className="space-y-2 text-xs text-on-surface">
                    <a
                      href={`mailto:${selectedEmployee.email}`}
                      className="flex items-center space-x-2.5 p-2 rounded-lg border border-outline-variant/30 hover:bg-surface-container-low"
                    >
                      <Mail className="size-3.5 text-[#818cf8]" />
                      <span className="truncate">{selectedEmployee.email}</span>
                    </a>
                    {selectedEmployee.phone && (
                      <a
                        href={`tel:${selectedEmployee.phone}`}
                        className="flex items-center space-x-2.5 p-2 rounded-lg border border-outline-variant/30 hover:bg-surface-container-low"
                      >
                        <Phone className="size-3.5 text-emerald-500" />
                        <span>{selectedEmployee.phone}</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Sync context */}
                <div className="w-full pt-3 border-t border-outline-variant/60 text-left space-y-2 text-xs">
                  <span className="ds-label text-on-surface-variant font-bold block">Integrations</span>
                  <div className="flex items-center justify-between p-2 rounded-lg border border-outline-variant/30 bg-surface-container-low font-bold">
                    <span className="text-on-surface-variant text-[10px]">Google Connection</span>
                    <span className="text-[#00cec4] text-[10px]">ACTIVE</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center text-on-surface-variant text-xs space-y-2 select-none h-full h-[50vh]">
                <span className="text-2xl">🗂</span>
                <span className="font-semibold text-on-surface">No Context Profile</span>
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
          <div className="bg-surface border border-outline-variant rounded-2xl w-full max-w-md p-5 relative shadow-xl text-left animate-page-enter">
            <button
              onClick={() => setShowNewChatModal(false)}
              className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface p-1 hover:bg-surface-container rounded-lg"
            >
              <X className="size-4" />
            </button>

            <h4 className="ds-h3 text-on-surface font-bold mb-4 font-display">New chat</h4>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="ds-label block font-semibold text-on-surface-variant">Add people</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Enter email or select from below..."
                    className="w-full text-xs bg-surface border border-[#00cec4]/55 rounded-xl px-3 py-2.5 focus:outline-none"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 pt-1">
                <button
                  onClick={() => { setShowNewChatModal(false); setShowCreateSpaceModal(true); }}
                  className="w-full text-left px-3 py-2.5 hover:bg-surface-container rounded-xl text-xs font-semibold flex items-center gap-2 text-[#00cec4] transition-all"
                >
                  <Users className="size-4" />
                  <span>Create a space</span>
                </button>
              </div>

              <div className="border-t border-outline-variant/60 my-2"></div>

              <div className="space-y-1.5">
                <span className="ds-label text-on-surface-variant font-bold block mb-1">Frequent Users</span>
                <div className="max-h-[220px] overflow-y-auto space-y-1 pr-1">
                  {employees
                    .filter(emp => emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || emp.email.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((emp) => (
                      <button
                        key={emp.id}
                        onClick={() => handleSelectEmployeeDM(emp)}
                        className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all hover:bg-surface-container"
                      >
                        <span className={`flex items-center justify-center size-6 rounded-full font-bold text-[9px] ${getAvatarBg(emp.name)} shrink-0`}>
                          {getInitials(emp.name)}
                        </span>
                        <div className="truncate flex-1">
                          <div className="text-on-surface font-bold">{emp.name}</div>
                          <div className="text-[9px] text-on-surface-variant font-normal">{emp.email}</div>
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
          <form onSubmit={handleCreateSpace} className="bg-surface border border-outline-variant rounded-2xl w-full max-w-md p-6 relative shadow-xl text-left animate-page-enter">
            <button
              type="button"
              onClick={() => setShowCreateSpaceModal(false)}
              className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface p-1 hover:bg-surface-container rounded-lg"
            >
              <X className="size-4" />
            </button>

            <h4 className="ds-h3 text-on-surface font-bold mb-4 font-display">Create space</h4>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="ds-label block font-semibold text-on-surface-variant">Space name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Freight Forwarding Project"
                  value={newSpaceName}
                  onChange={(e) => setNewSpaceName(e.target.value)}
                  className="w-full text-xs bg-surface border border-[#00cec4]/55 rounded-xl px-3 py-2.5 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="ds-label block font-semibold text-on-surface-variant">Access Control</label>
                <div className="space-y-2">
                  <label className="flex items-start space-x-2.5 text-xs text-on-surface font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="access"
                      value="Private"
                      checked={newSpaceAccess === "Private"}
                      onChange={() => setNewSpaceAccess("Private")}
                      className="mt-0.5 accent-[#00cec4]"
                    />
                    <div>
                      <div className="font-bold">Private</div>
                      <span className="text-[10px] text-on-surface-variant font-normal">Only invited employees can access this space.</span>
                    </div>
                  </label>
                  <label className="flex items-start space-x-2.5 text-xs text-on-surface cursor-pointer">
                    <input
                      type="radio"
                      name="access"
                      value="Open"
                      checked={newSpaceAccess === "Open"}
                      onChange={() => setNewSpaceAccess("Open")}
                      className="mt-0.5 accent-[#00cec4]"
                    />
                    <div>
                      <div className="font-bold">Open</div>
                      <span className="text-[10px] text-on-surface-variant font-normal">Anyone in organization can search and join this space.</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <div>
                  <span className="font-bold text-on-surface block">Request to Join</span>
                  <span className="text-[10px] text-on-surface-variant leading-relaxed">Require manager approval to join this space.</span>
                </div>
                <input
                  type="checkbox"
                  checked={newSpaceRequestToJoin}
                  onChange={(e) => setNewSpaceRequestToJoin(e.target.checked)}
                  className="accent-[#00cec4] size-4 rounded cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <label className="ds-label block font-semibold text-on-surface-variant">Invite initial members</label>
                <div className="max-h-[120px] overflow-y-auto border border-outline-variant rounded-xl p-2 space-y-1.5">
                  {employees.map((emp) => (
                    <label key={emp.id} className="flex items-center justify-between text-xs text-on-surface cursor-pointer px-1 py-0.5 hover:bg-surface-container-low rounded-md">
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
                        className="accent-[#00cec4]"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateSpaceModal(false)}
                  className="px-4 py-2 text-xs border border-outline-variant hover:bg-surface-container-low rounded-xl text-on-surface font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={spaceCreating}
                  className="bg-[#00cec4] text-white hover:bg-[#00b8af] disabled:opacity-50 px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all"
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
          <div className="bg-surface border border-outline-variant rounded-2xl w-full max-w-lg p-5 relative shadow-xl text-left animate-page-enter">
            <button
              onClick={() => setShowManageMembersModal(false)}
              className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface p-1 hover:bg-surface-container rounded-lg"
            >
              <X className="size-4" />
            </button>

            <h4 className="ds-h3 text-on-surface font-bold mb-4 font-display">Members - {selectedSpaceTitle}</h4>

            <div className="flex justify-between items-center gap-4 mb-4 relative">
              <span className="ds-label text-on-surface-variant font-bold">Space Members ({members.length})</span>
              <div className="relative">
                <button
                  disabled={memberActionLoading}
                  onClick={() => setShowAddMemberPopover(!showAddMemberPopover)}
                  className="bg-[#00cec4] text-white hover:bg-[#00b8af] px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Plus className="size-3.5" /> Add member
                </button>

                {showAddMemberPopover && (
                  <div className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-surface border border-outline-variant shadow-lg z-50 py-1.5 text-xs text-on-surface max-h-52 overflow-y-auto animate-page-enter">
                    <span className="ds-label px-3 py-1 text-[8px] font-bold text-on-surface-variant block mb-1">Add Employee</span>
                    {employees
                      .filter(emp => !members.some(m => m.member?.displayName === emp.name))
                      .map((emp) => (
                        <button
                          key={emp.id}
                          onClick={() => handleAddMember(emp.id)}
                          className="w-full text-left px-3 py-1.5 hover:bg-surface-container-low truncate font-medium block"
                        >
                          {emp.name}
                        </button>
                      ))}
                    {employees.filter(emp => !members.some(m => m.member?.displayName === emp.name)).length === 0 && (
                      <span className="px-3 py-2 text-on-surface-variant italic block text-[10px]">All users added.</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2.5 border border-outline-variant/60 rounded-xl p-3 bg-surface-container-low">
              {membersLoading ? (
                <div className="text-center py-10 text-xs text-on-surface-variant animate-pulse">Loading memberships...</div>
              ) : members.length === 0 ? (
                <div className="text-center py-10 text-xs text-on-surface-variant italic">No members found.</div>
              ) : (
                members.map((m, idx) => {
                  const mName = m.member?.displayName || "Google User";
                  const isCurrent = m.member?.employeeId === "current-user" || m.member?.displayName?.includes("You");
                  return (
                    <div key={idx} className="flex justify-between items-center bg-surface border border-outline-variant/40 rounded-xl p-2.5">
                      <div className="flex items-center space-x-2.5 truncate">
                        <span className={`flex items-center justify-center size-7 rounded-full font-bold text-[9px] ${getAvatarBg(mName)} shrink-0`}>
                          {getInitials(mName)}
                        </span>
                        <div className="truncate text-xs">
                          <span className="font-bold text-on-surface block truncate">{mName}</span>
                          <span className="text-[9px] text-on-surface-variant block uppercase tracking-wide">
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
          <div className="bg-surface border border-outline-variant rounded-2xl w-full max-w-md p-6 relative shadow-xl text-left animate-page-enter">
            <button
              onClick={() => setShowSpaceSettingsModal(false)}
              className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface p-1 hover:bg-surface-container rounded-lg"
            >
              <X className="size-4" />
            </button>

            <h4 className="ds-h3 text-on-surface font-bold mb-4 font-display">Space Settings - {selectedSpaceTitle}</h4>

            <div className="space-y-4 text-xs">
              
              <div className="space-y-2">
                <label className="ds-label block font-semibold text-on-surface-variant">Access Control</label>
                <div className="space-y-2">
                  <label className="flex items-start space-x-2.5 text-xs text-on-surface font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="settings-access"
                      value="Private"
                      checked={spaceSettingsAccess === "Private"}
                      onChange={() => setSpaceSettingsAccess("Private")}
                      className="mt-0.5 accent-[#00cec4]"
                    />
                    <div>
                      <div className="font-bold">Private</div>
                      <span className="text-[10px] text-on-surface-variant font-normal">Only invited employees can access this space.</span>
                    </div>
                  </label>
                  <label className="flex items-start space-x-2.5 text-xs text-on-surface cursor-pointer">
                    <input
                      type="radio"
                      name="settings-access"
                      value="Discoverable"
                      checked={spaceSettingsAccess === "Discoverable"}
                      onChange={() => setSpaceSettingsAccess("Discoverable")}
                      className="mt-0.5 accent-[#00cec4]"
                    />
                    <div>
                      <div className="font-bold">Discoverable</div>
                      <span className="text-[10px] text-on-surface-variant font-normal">Anyone in adarshshipping can search and join this space.</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-outline-variant/60">
                <div>
                  <span className="font-bold text-on-surface block">Request to Join</span>
                  <span className="text-[10px] text-on-surface-variant leading-relaxed">Require manager approval to join this space.</span>
                </div>
                <input
                  type="checkbox"
                  checked={spaceSettingsRequestToJoin}
                  onChange={(e) => setSpaceSettingsRequestToJoin(e.target.checked)}
                  className="accent-[#00cec4] size-4 rounded cursor-pointer"
                />
              </div>

              <div className="space-y-1.5 border-t border-outline-variant/60 pt-3">
                <label className="ds-label block font-semibold text-on-surface-variant">Who can manage memberships</label>
                <select
                  value={spaceSettingsPermissions}
                  onChange={(e) => setSpaceSettingsPermissions(e.target.value)}
                  className="w-full bg-surface text-xs focus:ring-0 focus:outline-none"
                >
                  <option value="all">Owners, managers, and members</option>
                  <option value="managers">Owners and managers only</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2.5 border-t border-outline-variant/60">
                <button
                  onClick={() => setShowSpaceSettingsModal(false)}
                  className="px-4 py-2 border border-outline-variant hover:bg-surface-container-low rounded-xl text-on-surface font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSpaceSettings}
                  disabled={spaceSettingsSaving}
                  className="bg-[#00cec4] text-white hover:bg-[#00b8af] disabled:opacity-50 px-4 py-2 rounded-xl font-bold uppercase transition-all"
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
          <div className="bg-surface border border-outline-variant rounded-2xl w-full max-w-md p-6 relative shadow-xl text-left animate-page-enter">
            <button
              onClick={() => setShowSpaceDetailsModal(false)}
              className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface p-1 hover:bg-surface-container rounded-lg"
            >
              <X className="size-4" />
            </button>

            <h4 className="ds-h3 text-on-surface font-bold mb-4 font-display">Space Details</h4>

            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <span className="ds-label text-on-surface-variant">Name</span>
                <div className="text-on-surface font-bold">{selectedSpaceTitle}</div>
              </div>

              <div className="space-y-1 border-t border-outline-variant/60 pt-2.5">
                <span className="ds-label text-on-surface-variant">Type</span>
                <div className="text-on-surface font-bold uppercase tracking-wider">{selectedSpaceType}</div>
              </div>

              <div className="space-y-1 border-t border-outline-variant/60 pt-2.5">
                <span className="ds-label text-on-surface-variant">Access level</span>
                <div className="text-on-surface font-bold">{spaceSettingsAccess}</div>
              </div>

              <div className="space-y-1 border-t border-outline-variant/60 pt-2.5">
                <span className="ds-label text-on-surface-variant">Join approval</span>
                <div className="text-on-surface font-bold">{spaceSettingsRequestToJoin ? "Requires manager approval" : "No approval required"}</div>
              </div>

              <div className="space-y-1 border-t border-outline-variant/60 pt-2.5">
                <span className="ds-label text-on-surface-variant">Space ID</span>
                <div className="text-on-surface-variant font-mono text-[9px] select-all break-all">{selectedSpaceId}</div>
              </div>

              <div className="flex justify-end pt-2 border-t border-outline-variant/60">
                <button
                  onClick={() => setShowSpaceDetailsModal(false)}
                  className="bg-[#00cec4] text-white hover:bg-[#00b8af] px-4 py-2 rounded-xl font-bold uppercase transition-all"
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
