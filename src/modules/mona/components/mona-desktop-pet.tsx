"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
} from "framer-motion";
import {
  Bell,
  MessageSquareText,
  Minus,
  Search,
  Sparkles,
  Volume2,
  VolumeOff,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getPathLabel } from "@/lib/route-labels";
import {
  MONA_PET_NOTIFICATION_EVENT,
  MONA_PET_ROUTE_EVENT,
  dispatchMonaPetOpenSearch,
  type MonaPetNotificationDetail,
  type MonaPetRouteDetail,
} from "@/modules/mona/pet-events";
import { useMonaChat } from "@/modules/mona/components/mona-provider";

type PetMood = "idle" | "assist" | "alert" | "celebrate";

type PetMessage = {
  actionLabel?: string;
  prompt?: string;
  text: string;
};

type RouteProfile = {
  headline: string;
  prompt: string;
  text: string;
};

const ROUTE_PROFILES: Array<{ match: RegExp; profile: RouteProfile }> = [
  {
    match: /^\/dashboard/,
    profile: {
      headline: "Command center",
      prompt:
        "Summarize the most important Monolith dashboard signals and tell me what needs attention first.",
      text: "Your command center is live. I can point out the most important follow-ups first.",
    },
  },
  {
    match: /^\/crm/,
    profile: {
      headline: "CRM watch",
      prompt:
        "Help me on this CRM page. Summarize the current pipeline risks, pending actions, and next best step.",
      text: "CRM is active. I can summarize leads, enquiries, quotes, and customer follow-ups from here.",
    },
  },
  {
    match: /^\/cha/,
    profile: {
      headline: "CHA lane",
      prompt:
        "Help me on this CHA workspace. Summarize urgent jobs, filing risk, and operational blockers.",
      text: "CHA operations are live. I can help surface risky filings, due dates, and workflow blockers.",
    },
  },
  {
    match: /^\/communication/,
    profile: {
      headline: "Communication desk",
      prompt:
        "Help me on this Communication workspace. Summarize urgent threads, mail, meetings, and response tasks.",
      text: "Communication tools are open. I can help triage mail, chat, meetings, and linked workspaces.",
    },
  },
  {
    match: /^\/hrms/,
    profile: {
      headline: "People operations",
      prompt:
        "Help me on this HRMS page. Summarize the most important employee, approval, or compliance work here.",
      text: "HRMS is active. I can help with employees, approvals, files, payroll handoffs, and people ops.",
    },
  },
  {
    match: /^\/attendance/,
    profile: {
      headline: "Attendance control",
      prompt:
        "Help me on this Attendance workspace. Summarize attendance exceptions, approvals, and operational risks.",
      text: "Attendance control is active. I can help with exceptions, leaves, OT, and month-end readiness.",
    },
  },
  {
    match: /^\/payroll/,
    profile: {
      headline: "Payroll cockpit",
      prompt:
        "Help me on this Payroll page. Summarize the pending payroll work, approvals, and compliance actions.",
      text: "Payroll is loaded. I can help with pay runs, employee inputs, statutory work, and approvals.",
    },
  },
  {
    match: /^\/accounting/,
    profile: {
      headline: "Accounting desk",
      prompt:
        "Help me on this Accounting page. Summarize open finance tasks, approvals, and operational risks.",
      text: "Accounting is in focus. I can help navigate records, reports, banking, and approvals from here.",
    },
  },
  {
    match: /^\/notifications/,
    profile: {
      headline: "Notification watch",
      prompt:
        "Summarize my unread Monolith notifications and tell me which ones need action first.",
      text: "Your notifications are open. I can help sort what is urgent, blocked, or safe to defer.",
    },
  },
];

const DEFAULT_PROFILE: RouteProfile = {
  headline: "Workspace companion",
  prompt:
    "Help me on this Monolith page. Summarize what this workspace is for and what I should do next.",
  text: "I’m following this workspace with you. Ask me for a walkthrough, summary, or next-step plan.",
};

function getRouteProfile(pathname: string) {
  return ROUTE_PROFILES.find((entry) => entry.match.test(pathname))?.profile ?? DEFAULT_PROFILE;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function MonaDesktopPet() {
  const pathname = usePathname();
  const routeProfile = useMemo(() => getRouteProfile(pathname), [pathname]);
  const label = getPathLabel(pathname) ?? routeProfile.headline;
  const reduceMotion = useReducedMotion();
  const { isLoading, isOpen, openChat, sendMessage, toggleChat } = useMonaChat();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const dismissTimerRef = useRef<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [mood, setMood] = useState<PetMood>("idle");
  const [message, setMessage] = useState<PetMessage>({
    actionLabel: "Assist here",
    prompt: routeProfile.prompt,
    text: routeProfile.text,
  });
  const showBubble = isExpanded || isOpen || mood === "alert" || mood === "celebrate";
  const shouldWander = !isExpanded && !isOpen;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const saved = window.localStorage.getItem("mona-pet-position");
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as { x?: number; y?: number };
      x.set(clamp(parsed.x ?? 0, -320, 120));
      y.set(clamp(parsed.y ?? 0, -420, 80));
    } catch {
      // ignore malformed position cache
    }
  }, [x, y]);

  useEffect(() => {
    if (isMuted) return;

    const frameId = window.requestAnimationFrame(() => {
      setMood("assist");
      setMessage({
        actionLabel: "Assist here",
        prompt: routeProfile.prompt,
        text: routeProfile.text,
      });
    });

    if (dismissTimerRef.current) {
      window.clearTimeout(dismissTimerRef.current);
    }

    dismissTimerRef.current = window.setTimeout(() => {
      setMood("idle");
    }, 5000);

    return () => {
      window.cancelAnimationFrame(frameId);
      if (dismissTimerRef.current) {
        window.clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
    };
  }, [isMuted, routeProfile]);

  useEffect(() => {
    function handleRouteEvent(event: Event) {
      if (isMuted) return;

      const detail = (event as CustomEvent<MonaPetRouteDetail>).detail;
      const profile = getRouteProfile(detail.pathname);
      setMood("assist");
      setMessage({
        actionLabel: "Assist here",
        prompt: profile.prompt,
        text: `${detail.contextLabel} is ready. ${profile.text}`,
      });
    }

    function handleNotificationEvent(event: Event) {
      if (isMuted) return;

      const detail = (event as CustomEvent<MonaPetNotificationDetail>).detail;
      setMood(detail.count > 1 ? "alert" : "celebrate");
      setMessage({
        actionLabel: "Review alerts",
        text:
          detail.count > 1
            ? `${detail.count} fresh workspace alerts just landed. I can help you triage them.`
            : `${detail.title} just came in. I can help you respond from the right workspace.`,
      });
    }

    window.addEventListener(MONA_PET_ROUTE_EVENT, handleRouteEvent as EventListener);
    window.addEventListener(
      MONA_PET_NOTIFICATION_EVENT,
      handleNotificationEvent as EventListener,
    );
    return () => {
      window.removeEventListener(MONA_PET_ROUTE_EVENT, handleRouteEvent as EventListener);
      window.removeEventListener(
        MONA_PET_NOTIFICATION_EVENT,
        handleNotificationEvent as EventListener,
      );
    };
  }, [isMuted]);

  useEffect(() => {
    if (!isOpen || isMuted) return;

    const frameId = window.requestAnimationFrame(() => {
      setMood("assist");
      setMessage({
        text: isLoading
          ? "I’m thinking through your workspace context now."
          : "Chat is open. Ask for a summary, navigation help, or action plan.",
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [isLoading, isMuted, isOpen]);

  async function handleAssistHere() {
    openChat();
    await sendMessage(routeProfile.prompt);
  }

  function persistCurrentPosition() {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      "mona-pet-position",
      JSON.stringify({
        x: clamp(x.get(), -320, 120),
        y: clamp(y.get(), -420, 80),
      }),
    );
  }

  return (
    <motion.aside
      className={cn("mnx-mona-pet", isExpanded ? "is-expanded" : "", isOpen ? "is-chat-open" : "")}
      style={{ x, y }}
      drag
      dragMomentum={false}
      dragElastic={0.08}
      dragConstraints={{ top: -480, left: -380, right: 120, bottom: 100 }}
      onDragStart={() => {
        dragStartRef.current = { x: x.get(), y: y.get() };
      }}
      onDragEnd={() => {
        const moved =
          Math.abs(dragStartRef.current.x - x.get()) > 6 ||
          Math.abs(dragStartRef.current.y - y.get()) > 6;
        persistCurrentPosition();
        if (!moved) {
          setIsExpanded((current) => !current);
        }
      }}
      initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.96 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
    >
      <AnimatePresence initial={false}>
        {!isMuted && showBubble ? (
          <motion.div
            key={message.text}
            className="mnx-mona-pet-bubble"
            initial={reduceMotion ? false : { opacity: 0, y: 6, scale: 0.96 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.2 }}
          >
            <small>{label}</small>
            <p>{message.text}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="mnx-mona-pet-stage">
        <div className="mnx-mona-pet-runway" aria-hidden="true" />
        <motion.div
          className={cn("mnx-mona-pet-shadow", `is-${mood}`)}
          animate={
            reduceMotion
              ? undefined
              : {
                  scaleX: [1, 1.12, 1],
                  opacity: [0.34, 0.5, 0.34],
                }
          }
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.button
          type="button"
          className={cn("mnx-mona-pet-core", `is-${mood}`)}
          onClick={() => setIsExpanded((current) => !current)}
          animate={
            reduceMotion
              ? undefined
              : {
                  x: shouldWander ? [-14, 16, -14] : 0,
                  y: [0, -7, 0],
                  rotateZ: [0, -1.4, 1.4, 0],
                }
          }
          transition={{
            x: {
              duration: mood === "alert" ? 1.8 : 6,
              repeat: Infinity,
              ease: "easeInOut",
            },
            duration: mood === "alert" ? 1.6 : 3.2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          whileHover={reduceMotion ? undefined : { scale: 1.04 }}
          whileTap={reduceMotion ? undefined : { scale: 0.98 }}
          aria-expanded={isExpanded}
          aria-label="Open Mona desktop pet controls"
        >
          <span className="mnx-mona-pet-halo" aria-hidden="true" />
          <span className="mnx-mona-pet-shell" aria-hidden="true">
            <span className="mnx-mona-pet-face">
              <span className="mnx-mona-pet-eye" />
              <span className="mnx-mona-pet-eye" />
              <span className="mnx-mona-pet-smile" />
            </span>
            <span className="mnx-mona-pet-paw mnx-mona-pet-paw-a" />
            <span className="mnx-mona-pet-paw mnx-mona-pet-paw-b" />
            <span className="mnx-mona-pet-orbit mnx-mona-pet-orbit-a" />
            <span className="mnx-mona-pet-orbit mnx-mona-pet-orbit-b" />
            <span className="mnx-mona-pet-orbit mnx-mona-pet-orbit-c" />
          </span>
          <span className="mnx-mona-pet-badge">
            <Sparkles size={14} />
          </span>
        </motion.button>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded ? (
          <motion.div
            className="mnx-mona-pet-controls"
            initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.96 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.2 }}
          >
            <div className="mnx-mona-pet-controls-copy">
              <strong>{routeProfile.headline}</strong>
              <span>I stay low, follow your workspace, and open the right Monolith help when you need me.</span>
            </div>

            <div className="mnx-mona-pet-actions">
              <Button size="sm" variant="accent" onClick={() => void handleAssistHere()}>
                <MessageSquareText size={14} />
                <span>{message.actionLabel ?? "Assist here"}</span>
              </Button>
              <Button size="sm" variant="outline" onClick={dispatchMonaPetOpenSearch}>
                <Search size={14} />
                <span>Search</span>
              </Button>
              <Button size="sm" variant="outline" onClick={toggleChat}>
                <Sparkles size={14} />
                <span>{isOpen ? "Hide chat" : "Open chat"}</span>
              </Button>
              <Link className="mnx-mona-pet-link" href="/notifications">
                <Bell size={14} />
                <span>Notifications</span>
              </Link>
            </div>

            <div className="mnx-mona-pet-utility-row">
              <Button
                size="sm"
                variant="outline"
                className="mnx-mona-pet-utility"
                onClick={() => setIsMuted((current) => !current)}
              >
                {isMuted ? <VolumeOff size={13} /> : <Volume2 size={13} />}
                <span>{isMuted ? "Muted" : "Voice on"}</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="mnx-mona-pet-utility"
                onClick={() => setIsExpanded(false)}
              >
                <Minus size={13} />
                <span>Minimize</span>
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.aside>
  );
}
