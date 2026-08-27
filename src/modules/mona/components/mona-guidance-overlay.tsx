"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMonaChat } from "@/modules/mona/components/mona-provider";

type OverlayRect = {
  height: number;
  left: number;
  top: number;
  width: number;
};

function readTargetRect(targetId: string): OverlayRect | null {
  const element = document.querySelector<HTMLElement>(
    `[data-workpet-target="${targetId}"]`,
  );
  if (!element) {
    return null;
  }

  const rect = element.getBoundingClientRect();
  return {
    left: rect.left + window.scrollX,
    top: rect.top + window.scrollY,
    width: rect.width,
    height: rect.height,
  };
}

export function MonaGuidanceOverlay() {
  const {
    activeGuidanceTarget,
    guidanceTargets,
    clearGuidance,
    openChat,
    sendMessage,
    startGuidance,
  } = useMonaChat();
  const [layoutVersion, setLayoutVersion] = useState(0);

  const activeIndex = useMemo(
    () =>
      activeGuidanceTarget
        ? guidanceTargets.findIndex((target) => target.id === activeGuidanceTarget.id)
        : -1,
    [activeGuidanceTarget, guidanceTargets],
  );

  useEffect(() => {
    if (!activeGuidanceTarget) {
      return;
    }

    const update = () => {
      setLayoutVersion((current) => current + 1);
    };

    const frameId = window.requestAnimationFrame(update);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [activeGuidanceTarget]);

  const targetRect = useMemo(
    () =>
      activeGuidanceTarget
        ? readTargetRect(activeGuidanceTarget.id)
        : null,
    [activeGuidanceTarget, layoutVersion],
  );

  if (!activeGuidanceTarget || !targetRect) {
    return null;
  }

  const currentTarget = activeGuidanceTarget;
  const nextTarget = guidanceTargets[activeIndex + 1] ?? null;
  const tooltipTop = Math.max(window.scrollY + 12, targetRect.top - 144);
  const tooltipLeft = Math.min(
    Math.max(window.scrollX + 12, targetRect.left),
    window.scrollX + window.innerWidth - 340,
  );

  async function handleAskMona() {
    openChat();
    await sendMessage(currentTarget.helpPrompt);
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[9996] bg-[rgba(7,10,18,0.18)]"
        onClick={clearGuidance}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute z-[9997] rounded-[24px] border-2 border-[var(--mnx-accent)] shadow-[0_0_0_9999px_rgba(255,255,255,0.02)]"
        style={{
          left: targetRect.left - 6,
          top: targetRect.top - 6,
          width: targetRect.width + 12,
          height: targetRect.height + 12,
          boxShadow: "0 0 0 2px color-mix(in srgb, var(--mnx-accent) 18%, transparent), 0 18px 48px rgba(6, 12, 24, 0.18)",
        }}
      />
      <section
        className="fixed z-[9998] w-[320px] rounded-3xl border border-mono-border bg-mono-card p-4 shadow-[var(--shadow-ambient)]"
        style={{
          top: tooltipTop - window.scrollY,
          left: tooltipLeft - window.scrollX,
        }}
        aria-label="Mona guided help"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-mono-muted">
              Guided Help
            </div>
            <h3 className="mt-1 text-[15px] font-semibold text-mono-text">
              {currentTarget.label}
            </h3>
          </div>
          <Button mode="icon" variant="inverse" onClick={clearGuidance} aria-label="Close guided help">
            <X size={14} />
          </Button>
        </div>

        <p className="mt-2 text-[12px] leading-6 text-mono-text">
          {currentTarget.description}
        </p>
        <p className="mt-2 text-[11px] leading-5 text-mono-muted">
          {currentTarget.hint}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant="accent" onClick={() => void handleAskMona()}>
            <Sparkles size={14} />
            <span>Ask Mona</span>
          </Button>
          {nextTarget ? (
            <Button size="sm" variant="outline" onClick={() => startGuidance(nextTarget.id)}>
              <ArrowRight size={14} />
              <span>Next target</span>
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={clearGuidance}>
              <span>Done</span>
            </Button>
          )}
        </div>
      </section>
    </>
  );
}
