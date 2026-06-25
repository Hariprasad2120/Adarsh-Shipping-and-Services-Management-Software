"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";

interface ToastData {
  id: string;
  sender: string;
  snippet: string;
  spaceId: string;
  spaceName: string;
  time: number;
}

interface ChatContextValue {
  jobs: any[];
  employees: any[];
  googleSpaces: any[];
  chatLoading: boolean;
  unreadCounts: Record<string, number>;
  mentionSpaces: Set<string>;
  spaceLastActivity: Record<string, number>;
  desktopNotifEnabled: boolean;
  pendingToasts: ToastData[];
  // Active selection — lifted from chat page so it survives navigation
  selectedSpaceId: string;
  selectedSpaceTitle: string;
  selectedSpaceType: string;
  selectedJob: any;
  selectedEmployee: any;
  // Per-space message cache — warm nav restores history instantly
  messagesBySpace: Record<string, any[]>;
  refreshSpaces: () => Promise<void>;
  setActiveSpaceId: (id: string) => void;
  selectSpace: (spaceId: string, title: string, type: string, job?: any, employee?: any) => void;
  clearSelection: () => void;
  cacheMessages: (spaceId: string, msgs: any[]) => void;
  clearUnread: (spaceId: string) => void;
  clearMention: (spaceId: string) => void;
  bumpActivity: (spaceId: string, timestamp?: number) => void;
  drainToasts: () => void;
  setDesktopNotifEnabled: (enabled: boolean) => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function useChatContext(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChatContext must be used within ChatProvider");
  return ctx;
}

const BAD_NAMES = new Set([
  "Adarsh Operations", "adarsh operations", "ADARSH OPERATIONS",
  "Google Chat DM", "Google User",
]);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [googleSpaces, setGoogleSpaces] = useState<any[]>([]);
  const [chatLoading, setChatLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [mentionSpaces, setMentionSpaces] = useState<Set<string>>(new Set());
  const [spaceLastActivity, setSpaceLastActivity] = useState<Record<string, number>>({});
  const [desktopNotifEnabled, setDesktopNotifEnabledState] = useState(false);
  const [pendingToasts, setPendingToasts] = useState<ToastData[]>([]);

  // Active selection — persisted across module navigation + full reload via sessionStorage
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>("");
  const [selectedSpaceTitle, setSelectedSpaceTitle] = useState<string>("");
  const [selectedSpaceType, setSelectedSpaceType] = useState<string>("");
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [messagesBySpace, setMessagesBySpace] = useState<Record<string, any[]>>({});

  const jobsRef = useRef<any[]>([]);
  const googleSpacesRef = useRef<any[]>([]);
  const activeSpaceIdRef = useRef<string>("");
  const lastKnownMsgRef = useRef<Record<string, string>>({});
  const notifiedMsgsRef = useRef<Set<string>>(new Set());
  const batchRef = useRef(0);
  const desktopNotifRef = useRef(false);

  useEffect(() => { jobsRef.current = jobs; }, [jobs]);
  useEffect(() => { googleSpacesRef.current = googleSpaces; }, [googleSpaces]);
  useEffect(() => { desktopNotifRef.current = desktopNotifEnabled; }, [desktopNotifEnabled]);

  // Load desktop notif pref + listen for changes from the settings page
  useEffect(() => {
    try {
      const stored = localStorage.getItem("monolith_chat_desktop_notif");
      if (stored === "true") {
        setDesktopNotifEnabledState(true);
        desktopNotifRef.current = true;
      }
    } catch {}

    const handler = (e: StorageEvent) => {
      if (e.key === "monolith_chat_desktop_notif") {
        const enabled = e.newValue === "true";
        setDesktopNotifEnabledState(enabled);
        desktopNotifRef.current = enabled;
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const setDesktopNotifEnabled = useCallback((enabled: boolean) => {
    setDesktopNotifEnabledState(enabled);
    desktopNotifRef.current = enabled;
    try { localStorage.setItem("monolith_chat_desktop_notif", String(enabled)); } catch {}
  }, []);

  const setActiveSpaceId = useCallback((id: string) => {
    activeSpaceIdRef.current = id;
  }, []);

  const selectSpace = useCallback((spaceId: string, title: string, type: string, job?: any, employee?: any) => {
    activeSpaceIdRef.current = spaceId;
    setSelectedSpaceId(spaceId);
    setSelectedSpaceTitle(title);
    setSelectedSpaceType(type);
    setSelectedJob(job ?? null);
    setSelectedEmployee(employee ?? null);
    setUnreadCounts(prev => { const n = { ...prev }; delete n[spaceId]; return n; });
    setMentionSpaces(prev => { const n = new Set(prev); n.delete(spaceId); return n; });
    try {
      sessionStorage.setItem("monolith_chat_selected", JSON.stringify({ spaceId, title, type }));
    } catch {}
  }, []);

  const clearSelection = useCallback(() => {
    activeSpaceIdRef.current = "";
    setSelectedSpaceId("");
    setSelectedSpaceTitle("");
    setSelectedSpaceType("");
    setSelectedJob(null);
    setSelectedEmployee(null);
    try { sessionStorage.removeItem("monolith_chat_selected"); } catch {}
  }, []);

  const cacheMessages = useCallback((spaceId: string, msgs: any[]) => {
    setMessagesBySpace(prev => ({ ...prev, [spaceId]: msgs }));
  }, []);

  // Rehydrate selection from sessionStorage once data has loaded
  useEffect(() => {
    if (chatLoading) return;
    // If a selection is already set (e.g. user clicked a space before load finished), don't clobber
    if (selectedSpaceId) return;
    try {
      const stored = sessionStorage.getItem("monolith_chat_selected");
      if (!stored) return;
      const { spaceId, title, type } = JSON.parse(stored) as { spaceId: string; title: string; type: string };
      if (!spaceId) return;

      // Restore basic fields immediately — page can start fetching messages
      activeSpaceIdRef.current = spaceId;
      setSelectedSpaceId(spaceId);
      setSelectedSpaceType(type);

      // Resolve richer objects from loaded data
      const matchJob = jobs.find((j: any) => j.spaceId === spaceId);
      if (matchJob) {
        setSelectedJob(matchJob);
        setSelectedSpaceTitle(`job-${matchJob.jobNumber}`);
        return;
      }

      const matchSpace = googleSpaces.find((s: any) => s.name === spaceId);
      if (matchSpace) {
        // For DMs, resolve employee name if possible
        if (type === "DM") {
          const emp = employees.find((e: any) =>
            e.name.toLowerCase() === matchSpace.displayName?.toLowerCase()
          );
          if (emp) {
            setSelectedEmployee(emp);
            setSelectedSpaceTitle(emp.name);
            return;
          }
        }
        setSelectedSpaceTitle(matchSpace.displayName || title);
        return;
      }

      // Space not found in loaded data — still restore with stored title as fallback
      setSelectedSpaceTitle(title);
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatLoading]);

  const resolveSpaceName = useCallback((spaceId: string): string => {
    const space = googleSpacesRef.current.find((s: any) => s.name === spaceId);
    if (space?.displayName && !BAD_NAMES.has(space.displayName)) return space.displayName;
    const job = jobsRef.current.find((j: any) => j.spaceId === spaceId);
    if (job) return `JOB-${job.jobNumber}`;
    return "Chat";
  }, []);

  const refreshSpaces = useCallback(async () => {
    try {
      const res = await fetch("/api/communication/chat/list");
      if (!res.ok) return;
      const data = await res.json();

      // Detect brand-new DM spaces (someone messaged us from a new conversation)
      const prevNames = new Set(googleSpacesRef.current.map((s: any) => s.name));

      setJobs(data.jobs || []);
      setEmployees(data.employees || []);
      setGoogleSpaces(data.googleSpaces || []);

      for (const space of (data.googleSpaces || [])) {
        if (space.spaceType === "DIRECT_MESSAGE" && !prevNames.has(space.name)) {
          setUnreadCounts(prev => ({ ...prev, [space.name]: (prev[space.name] || 0) + 1 }));
          setSpaceLastActivity(prev => ({ ...prev, [space.name]: Date.now() }));
        }
      }
    } catch {}
  }, []);

  // Initial load
  useEffect(() => {
    (async () => {
      setChatLoading(true);
      try {
        const res = await fetch("/api/communication/chat/list");
        if (res.ok) {
          const data = await res.json();
          setJobs(data.jobs || []);
          setEmployees(data.employees || []);
          setGoogleSpaces(data.googleSpaces || []);
        }
      } catch {}
      setChatLoading(false);
    })();
  }, []);

  // 30s spaces refresh — keeps DM list current even when on other pages
  useEffect(() => {
    const t = setInterval(refreshSpaces, 30000);
    return () => clearInterval(t);
  }, [refreshSpaces]);

  // Seed baseline message IDs + initial activity sort values after load
  useEffect(() => {
    const t = setTimeout(async () => {
      const allIds = [
        ...googleSpacesRef.current.map((s: any) => s.name),
        ...jobsRef.current.map((j: any) => j.spaceId),
      ].filter(Boolean);
      const unique = [...new Set(allIds)];

      for (let i = 0; i < unique.length; i += 10) {
        const batch = unique.slice(i, i + 10);
        try {
          const res = await fetch(`/api/communication/chat/check-new?spaces=${batch.join(",")}`);
          if (!res.ok) continue;
          const data = await res.json();
          for (const item of (data.results || [])) {
            if (item?.latestMessageName) {
              lastKnownMsgRef.current[item.spaceId] = item.latestMessageName;
              // Seed activity time for initial sort
              if (item.latestTime) {
                setSpaceLastActivity(prev => ({
                  ...prev,
                  [item.spaceId]: new Date(item.latestTime).getTime(),
                }));
              }
            }
          }
        } catch {}
      }
    }, 6000); // Wait 6s for initial list load

    return () => clearTimeout(t);
  }, []); // runs once on mount

  // Cross-space poll — 8s batch, DMs prioritised
  // This persists even when the user navigates to mail/calendar/drive
  useEffect(() => {
    const t = setInterval(async () => {
      const spaces = googleSpacesRef.current;
      const jobs = jobsRef.current;
      const active = activeSpaceIdRef.current;

      const dmIds = spaces
        .filter((s: any) => s.name && s.name !== active && s.spaceType === "DIRECT_MESSAGE")
        .map((s: any) => s.name);
      const otherIds = spaces
        .filter((s: any) => s.name && s.name !== active && s.spaceType !== "DIRECT_MESSAGE")
        .map((s: any) => s.name);
      const jobIds = jobs
        .filter((j: any) => j.spaceId && j.spaceId !== active)
        .map((j: any) => j.spaceId);

      const allIds = [...new Set([...dmIds, ...jobIds, ...otherIds])];
      if (!allIds.length) return;

      const start = (batchRef.current * 10) % allIds.length;
      batchRef.current++;
      const batch = allIds.slice(start, start + 10);

      try {
        const res = await fetch(`/api/communication/chat/check-new?spaces=${batch.join(",")}`);
        if (!res.ok) return;
        const data = await res.json();

        let needSpaceRefresh = false;

        for (const item of (data.results || [])) {
          if (!item || item.isMe) continue;

          const prev = lastKnownMsgRef.current[item.spaceId];

          // First time seeing this space — just record baseline, no notification
          if (!prev) {
            lastKnownMsgRef.current[item.spaceId] = item.latestMessageName;
            continue;
          }

          // No change
          if (prev === item.latestMessageName) continue;

          // Already notified for this exact message (duplicate-safe)
          if (notifiedMsgsRef.current.has(item.latestMessageName)) {
            lastKnownMsgRef.current[item.spaceId] = item.latestMessageName;
            continue;
          }

          lastKnownMsgRef.current[item.spaceId] = item.latestMessageName;
          notifiedMsgsRef.current.add(item.latestMessageName);

          const spaceName = resolveSpaceName(item.spaceId);

          setUnreadCounts(prev2 => ({ ...prev2, [item.spaceId]: (prev2[item.spaceId] || 0) + 1 }));
          setSpaceLastActivity(prev2 => ({
            ...prev2,
            [item.spaceId]: new Date(item.latestTime || Date.now()).getTime(),
          }));

          if (item.hasMention) {
            setMentionSpaces(prev2 => new Set([...prev2, item.spaceId]));
          }

          // Queue in-app toast for the chat page to display
          setPendingToasts(prev2 => [
            ...prev2.slice(-4),
            {
              id: item.latestMessageName,
              sender: item.senderDisplayName || spaceName,
              snippet: item.snippet || "New message",
              spaceId: item.spaceId,
              spaceName,
              time: Date.now(),
            },
          ]);

          // Desktop notification — stable tag prevents duplicates on reconnect
          if (
            desktopNotifRef.current &&
            typeof Notification !== "undefined" &&
            Notification.permission === "granted"
          ) {
            const notif = new Notification(item.senderDisplayName || spaceName, {
              body: item.snippet?.slice(0, 120) || "New message",
              icon: "/favicon.ico",
              tag: `chat-${item.latestMessageName}`,
            });
            notif.onclick = () => { window.focus(); notif.close(); };
          }

          if (document.hidden) {
            document.title = `💬 ${spaceName} — New message`;
          }

          // Refresh spaces list so new DM appears in sidebar immediately
          if (!spaces.some((s: any) => s.name === item.spaceId)) {
            needSpaceRefresh = true;
          }
        }

        if (needSpaceRefresh) {
          await refreshSpaces();
        }
      } catch {}
    }, 8000);

    return () => clearInterval(t);
  }, [resolveSpaceName, refreshSpaces]);

  // Restore document title when tab regains focus
  useEffect(() => {
    const handler = () => {
      if (!document.hidden) document.title = "Communication — Monolith";
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  const clearUnread = useCallback((spaceId: string) => {
    setUnreadCounts(prev => { const n = { ...prev }; delete n[spaceId]; return n; });
  }, []);

  const clearMention = useCallback((spaceId: string) => {
    setMentionSpaces(prev => { const n = new Set(prev); n.delete(spaceId); return n; });
  }, []);

  const bumpActivity = useCallback((spaceId: string, timestamp?: number) => {
    setSpaceLastActivity(prev => ({ ...prev, [spaceId]: timestamp ?? Date.now() }));
  }, []);

  const drainToasts = useCallback(() => {
    setPendingToasts([]);
  }, []);

  return (
    <ChatContext.Provider value={{
      jobs,
      employees,
      googleSpaces,
      chatLoading,
      unreadCounts,
      mentionSpaces,
      spaceLastActivity,
      desktopNotifEnabled,
      pendingToasts,
      selectedSpaceId,
      selectedSpaceTitle,
      selectedSpaceType,
      selectedJob,
      selectedEmployee,
      messagesBySpace,
      refreshSpaces,
      setActiveSpaceId,
      selectSpace,
      clearSelection,
      cacheMessages,
      clearUnread,
      clearMention,
      bumpActivity,
      drainToasts,
      setDesktopNotifEnabled,
    }}>
      {children}
    </ChatContext.Provider>
  );
}
