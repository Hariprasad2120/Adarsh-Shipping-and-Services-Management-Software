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
  Settings2,
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
import type {
  MonaPetBehaviorIntensity,
  MonaContextSnapshot,
  MonaPetDockPosition,
  MonaPetPersonality,
} from "@/modules/mona/components/mona-provider";

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

function buildContextPrompt(snapshot: MonaContextSnapshot | null, fallbackPrompt: string) {
  if (!snapshot) return fallbackPrompt;
  if (snapshot.entity) {
    return `I am on ${snapshot.route.pageLabel}. Use this page context and focused record ${snapshot.entity.label} to summarize what matters, any risk, and the next best step.`;
  }
  return `I am on ${snapshot.route.pageLabel} in ${snapshot.route.moduleLabel}. Use this page context to explain what matters here and what I should do next.`;
}

function buildContextBubble(snapshot: MonaContextSnapshot | null, fallbackText: string) {
  if (!snapshot) return fallbackText;
  if (snapshot.entity) {
    return `${snapshot.route.pageLabel} is focused on ${snapshot.entity.label}. I can brief you on the record, current context, and next move.`;
  }
  return `${snapshot.route.pageLabel} is ready. ${snapshot.route.pageSummary}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getDockOffset(position: MonaPetDockPosition, viewportWidth: number) {
  if (position === "auto") {
    return { x: 0, y: 0 };
  }

  const compact = viewportWidth < 640;
  if (position === "bottom-left") {
    return { x: compact ? -152 : -284, y: 0 };
  }
  if (position === "bottom-center") {
    return { x: compact ? -76 : -142, y: 0 };
  }
  return { x: 0, y: 0 };
}

function describeCompanionLine(
  personality: MonaPetPersonality,
  petName: string,
) {
  switch (personality) {
    case "professional":
      return `${petName} stays concise, calm, and focused on the page in front of you.`;
    case "playful":
      return `${petName} keeps the workspace lively while staying grounded in real Monolith context.`;
    case "silent":
      return `${petName} stays out of the way until you open the panel or ask for help.`;
    default:
      return `${petName} stays low, follows your workspace, and opens the right Monolith help when you need it.`;
  }
}

function getBehaviorAmplitude(intensity: MonaPetBehaviorIntensity) {
  if (intensity === "quiet") {
    return { lift: 2, sway: 6 };
  }
  if (intensity === "expressive") {
    return { lift: 10, sway: 20 };
  }
  return { lift: 7, sway: 14 };
}

function ChoiceButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    // eslint-disable-next-line no-restricted-syntax -- pet setting chips are compact custom choice controls
    <button
      type="button"
      className={cn("mnx-mona-pet-choice", active ? "is-active" : "")}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function SettingsSection({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div className="mnx-mona-pet-setting-group">
      <strong>{label}</strong>
      <div className="mnx-mona-pet-choice-row">{children}</div>
    </div>
  );
}

export function MonaDesktopPet() {
  const pathname = usePathname();
  const routeProfile = useMemo(() => getRouteProfile(pathname), [pathname]);
  const label = getPathLabel(pathname) ?? routeProfile.headline;
  const reduceMotion = useReducedMotion();
  const {
    contextSnapshot,
    isLoading,
    isContextLoading,
    isOpen,
    openChat,
    preferences,
    sendMessage,
    suggestedPrompts,
    guidanceTargets,
    startGuidance,
    toggleChat,
    updatePreferences,
  } = useMonaChat();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const dismissTimerRef = useRef<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mood, setMood] = useState<PetMood>("idle");
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1280 : window.innerWidth,
  );
  const [message, setMessage] = useState<PetMessage>({
    actionLabel: "Assist here",
    prompt: routeProfile.prompt,
    text: routeProfile.text,
  });
  const primaryPrompt = suggestedPrompts[0]?.prompt ?? buildContextPrompt(contextSnapshot, routeProfile.prompt);
  const primaryLabel = suggestedPrompts[0]?.label ?? "Assist here";
  const effectiveAnimationMode =
    reduceMotion && preferences.animationMode === "full"
      ? "reduced"
      : preferences.animationMode;
  const motionDisabled = effectiveAnimationMode === "disabled";
  const motionReduced = effectiveAnimationMode === "reduced";
  const proactiveAssistVisible =
    preferences.personality !== "silent" &&
    preferences.proactiveLevel === "proactive" &&
    mood === "assist";
  const showBubble =
    isExpanded ||
    isOpen ||
    mood === "alert" ||
    mood === "celebrate" ||
    proactiveAssistVisible;
  const shouldWander =
    !isExpanded &&
    !isOpen &&
    !motionDisabled &&
    preferences.behaviorIntensity !== "quiet";
  const dragEnabled = preferences.dockPosition === "auto" && viewportWidth >= 768;
  const dragBounds = useMemo(() => {
    if (viewportWidth < 640) {
      return { left: -156, right: 24, top: -240, bottom: 18 };
    }
    if (viewportWidth < 1024) {
      return { left: -260, right: 52, top: -360, bottom: 56 };
    }
    return { left: -380, right: 120, top: -480, bottom: 100 };
  }, [viewportWidth]);
  const behaviorAmplitude = useMemo(
    () => getBehaviorAmplitude(preferences.behaviorIntensity),
    [preferences.behaviorIntensity],
  );
  const personalityLine = useMemo(
    () => describeCompanionLine(preferences.personality, preferences.petName),
    [preferences.personality, preferences.petName],
  );

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
    if (typeof window === "undefined") return;

    function handleResize() {
      setViewportWidth(window.innerWidth);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (preferences.dockPosition !== "auto") {
      const offset = getDockOffset(preferences.dockPosition, viewportWidth);
      x.set(offset.x);
      y.set(offset.y);
      return;
    }

    x.set(clamp(x.get(), dragBounds.left, dragBounds.right));
    y.set(clamp(y.get(), dragBounds.top, dragBounds.bottom));
  }, [dragBounds, preferences.dockPosition, viewportWidth, x, y]);

  useEffect(() => {
    if (preferences.personality === "silent" || preferences.proactiveLevel === "silent") {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      setMood("assist");
      setMessage({
        actionLabel: primaryLabel,
        prompt: primaryPrompt,
        text: buildContextBubble(contextSnapshot, routeProfile.text),
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
  }, [
    contextSnapshot,
    preferences.personality,
    preferences.proactiveLevel,
    primaryLabel,
    primaryPrompt,
    routeProfile.text,
  ]);

  useEffect(() => {
    function handleRouteEvent(event: Event) {
      if (preferences.personality === "silent") return;
      if (preferences.proactiveLevel === "silent") return;

      const detail = (event as CustomEvent<MonaPetRouteDetail>).detail;
      const profile = getRouteProfile(detail.pathname);
      setMood("assist");
      setMessage({
        actionLabel: primaryLabel,
        prompt: primaryPrompt || profile.prompt,
        text: contextSnapshot
          ? buildContextBubble(contextSnapshot, `${detail.contextLabel} is ready. ${profile.text}`)
          : `${detail.contextLabel} is ready. ${profile.text}`,
      });
    }

    function handleNotificationEvent(event: Event) {
      if (preferences.proactiveLevel === "silent") return;

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
  }, [contextSnapshot, preferences.personality, preferences.proactiveLevel, primaryLabel, primaryPrompt]);

  useEffect(() => {
    if (!isOpen || preferences.personality === "silent") return;

    const frameId = window.requestAnimationFrame(() => {
      setMood("assist");
      setMessage({
        text: isLoading
          ? `${preferences.petName} is thinking through your workspace context now.`
          : isContextLoading
            ? `${preferences.petName} is reading the current workspace so the next answer lands in the right context.`
            : "Chat is open. Ask for a summary, navigation help, or action plan.",
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [isContextLoading, isLoading, isOpen, preferences.personality, preferences.petName]);

  async function handleAssistHere() {
    openChat();
    await sendMessage(primaryPrompt);
  }

  function persistCurrentPosition() {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      "mona-pet-position",
      JSON.stringify({
        x: clamp(x.get(), dragBounds.left, dragBounds.right),
        y: clamp(y.get(), dragBounds.top, dragBounds.bottom),
      }),
    );
  }

  return (
    <motion.aside
      className={cn("mnx-mona-pet", isExpanded ? "is-expanded" : "", isOpen ? "is-chat-open" : "")}
      data-mona-appearance={preferences.appearance}
      data-mona-type={preferences.petType}
      style={{ x, y }}
      drag={dragEnabled}
      dragMomentum={false}
      dragElastic={0.08}
      dragConstraints={dragBounds}
      onDragStart={() => {
        dragStartRef.current = { x: x.get(), y: y.get() };
      }}
      onDragEnd={() => {
        if (!dragEnabled) return;
        const moved =
          Math.abs(dragStartRef.current.x - x.get()) > 6 ||
          Math.abs(dragStartRef.current.y - y.get()) > 6;
        persistCurrentPosition();
        if (!moved) {
          setIsExpanded((current) => !current);
        }
      }}
      initial={motionDisabled ? false : { opacity: 0, y: 18, scale: 0.96 }}
      animate={motionDisabled ? undefined : { opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
    >
      <AnimatePresence initial={false}>
        {showBubble ? (
          <motion.div
            key={message.text}
            className="mnx-mona-pet-bubble"
            initial={motionDisabled ? false : { opacity: 0, y: 6, scale: 0.96 }}
            animate={motionDisabled ? undefined : { opacity: 1, y: 0, scale: 1 }}
            exit={motionDisabled ? undefined : { opacity: 0, y: 6, scale: 0.96 }}
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
            motionDisabled || motionReduced
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
            motionDisabled
              ? undefined
              : {
                  x: shouldWander
                    ? [-behaviorAmplitude.sway, behaviorAmplitude.sway, -behaviorAmplitude.sway]
                    : 0,
                  y: [0, -behaviorAmplitude.lift, 0],
                  rotateZ: motionReduced ? [0, -0.6, 0.6, 0] : [0, -1.4, 1.4, 0],
                }
          }
          transition={{
            x: {
              duration: mood === "alert" ? 1.8 : motionReduced ? 7.5 : 6,
              repeat: Infinity,
              ease: "easeInOut",
            },
            duration: mood === "alert" ? 1.6 : motionReduced ? 4.8 : 3.2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          whileHover={motionDisabled ? undefined : { scale: 1.04 }}
          whileTap={motionDisabled ? undefined : { scale: 0.98 }}
          aria-expanded={isExpanded}
          aria-label={`Open ${preferences.petName} desktop pet controls`}
        >
          <span className="mnx-mona-pet-halo" aria-hidden="true" />
          <span className="mnx-mona-pet-shell" aria-hidden="true">
            <span className="mnx-mona-pet-glass" />
            <span className="mnx-mona-pet-chat mnx-mona-pet-chat-back" />
            <span className="mnx-mona-pet-orbit-ring">
              <span className="mnx-mona-pet-orbit-node" />
            </span>
            <span className="mnx-mona-pet-chat mnx-mona-pet-chat-front">
              <span className="mnx-mona-pet-chat-gloss" />
              <span className="mnx-mona-pet-chat-dots">
                <span />
                <span />
                <span />
              </span>
            </span>
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
            initial={motionDisabled ? false : { opacity: 0, y: 8, scale: 0.96 }}
            animate={motionDisabled ? undefined : { opacity: 1, y: 0, scale: 1 }}
            exit={motionDisabled ? undefined : { opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.2 }}
          >
            <div className="mnx-mona-pet-controls-copy">
              <strong>
                {preferences.petName} · {contextSnapshot?.route.pageLabel ?? routeProfile.headline}
              </strong>
              <span>
                {contextSnapshot?.entity?.summary ?? personalityLine}
              </span>
            </div>

            <div className="mnx-mona-pet-actions">
              <Button size="sm" variant="accent" onClick={() => void handleAssistHere()}>
                <MessageSquareText size={14} />
                <span>{message.actionLabel ?? primaryLabel}</span>
              </Button>
              <Button size="sm" variant="outline" onClick={dispatchMonaPetOpenSearch}>
                <Search size={14} />
                <span>Search</span>
              </Button>
              <Button size="sm" variant="outline" onClick={toggleChat}>
                <Sparkles size={14} />
                <span>{isOpen ? "Hide chat" : "Open chat"}</span>
              </Button>
              {guidanceTargets.length > 0 ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => startGuidance()}
                >
                  <Sparkles size={14} />
                  <span>Guide page</span>
                </Button>
              ) : null}
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
                onClick={() =>
                  updatePreferences({ voiceEnabled: !preferences.voiceEnabled })
                }
              >
                {preferences.voiceEnabled ? <Volume2 size={13} /> : <VolumeOff size={13} />}
                <span>{preferences.voiceEnabled ? "Voice on" : "Voice off"}</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="mnx-mona-pet-utility"
                onClick={() => setSettingsOpen((current) => !current)}
              >
                <Settings2 size={13} />
                <span>{settingsOpen ? "Hide settings" : "Settings"}</span>
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

            <AnimatePresence initial={false}>
              {settingsOpen ? (
                <motion.div
                  className="mnx-mona-pet-settings"
                  initial={motionDisabled ? false : { opacity: 0, y: 6 }}
                  animate={motionDisabled ? undefined : { opacity: 1, y: 0 }}
                  exit={motionDisabled ? undefined : { opacity: 0, y: 6 }}
                  transition={{ duration: 0.18 }}
                >
                  <SettingsSection label="Name">
                    {(["Mona", "Moni", "Orbit", "Pixel"] as const).map((name) => (
                      <ChoiceButton
                        key={name}
                        active={preferences.petName === name}
                        onClick={() => updatePreferences({ petName: name })}
                      >
                        {name}
                      </ChoiceButton>
                    ))}
                  </SettingsSection>

                  <SettingsSection label="Type">
                    {(["orb", "scout"] as const).map((petType) => (
                      <ChoiceButton
                        key={petType}
                        active={preferences.petType === petType}
                        onClick={() => updatePreferences({ petType })}
                      >
                        {petType === "orb" ? "Orb" : "Scout"}
                      </ChoiceButton>
                    ))}
                  </SettingsSection>

                  <SettingsSection label="Appearance">
                    {(["classic", "aurora"] as const).map((appearance) => (
                      <ChoiceButton
                        key={appearance}
                        active={preferences.appearance === appearance}
                        onClick={() => updatePreferences({ appearance })}
                      >
                        {appearance === "classic" ? "Classic" : "Aurora"}
                      </ChoiceButton>
                    ))}
                  </SettingsSection>

                  <SettingsSection label="Personality">
                    {(
                      ["professional", "friendly", "playful", "silent"] as const
                    ).map((personality) => (
                      <ChoiceButton
                        key={personality}
                        active={preferences.personality === personality}
                        onClick={() => updatePreferences({ personality })}
                      >
                        {personality[0].toUpperCase() + personality.slice(1)}
                      </ChoiceButton>
                    ))}
                  </SettingsSection>

                  <SettingsSection label="Animation">
                    {(["full", "reduced", "disabled"] as const).map((animationMode) => (
                      <ChoiceButton
                        key={animationMode}
                        active={preferences.animationMode === animationMode}
                        onClick={() => updatePreferences({ animationMode })}
                      >
                        {animationMode[0].toUpperCase() + animationMode.slice(1)}
                      </ChoiceButton>
                    ))}
                  </SettingsSection>

                  <SettingsSection label="Behavior">
                    {(
                      ["quiet", "balanced", "expressive"] as const
                    ).map((behaviorIntensity) => (
                      <ChoiceButton
                        key={behaviorIntensity}
                        active={preferences.behaviorIntensity === behaviorIntensity}
                        onClick={() => updatePreferences({ behaviorIntensity })}
                      >
                        {behaviorIntensity[0].toUpperCase() + behaviorIntensity.slice(1)}
                      </ChoiceButton>
                    ))}
                  </SettingsSection>

                  <SettingsSection label="Proactive">
                    {(
                      [
                        "silent",
                        "important-only",
                        "balanced",
                        "proactive",
                      ] as const
                    ).map((proactiveLevel) => (
                      <ChoiceButton
                        key={proactiveLevel}
                        active={preferences.proactiveLevel === proactiveLevel}
                        onClick={() => updatePreferences({ proactiveLevel })}
                      >
                        {proactiveLevel === "important-only"
                          ? "Important"
                          : proactiveLevel[0].toUpperCase() + proactiveLevel.slice(1)}
                      </ChoiceButton>
                    ))}
                  </SettingsSection>

                  <SettingsSection label="Dock">
                    {(
                      [
                        "auto",
                        "bottom-left",
                        "bottom-center",
                        "bottom-right",
                      ] as const
                    ).map((dockPosition) => (
                      <ChoiceButton
                        key={dockPosition}
                        active={preferences.dockPosition === dockPosition}
                        onClick={() => updatePreferences({ dockPosition })}
                      >
                        {dockPosition === "auto"
                          ? "Auto"
                          : dockPosition === "bottom-left"
                            ? "Left"
                            : dockPosition === "bottom-center"
                              ? "Center"
                              : "Right"}
                      </ChoiceButton>
                    ))}
                  </SettingsSection>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.aside>
  );
}
