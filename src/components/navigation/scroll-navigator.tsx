"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type ScrollState = "top" | "middle" | "bottom";

const SCROLLABLE_RATIO_THRESHOLD = 1.08;
const TOP_THRESHOLD_RATIO = 0.15;
const BOTTOM_THRESHOLD_PX = 96;

export function ScrollNavigator() {
  const pathname = usePathname();
  const usesDedicatedPublicWorkspace =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/setup" ||
    pathname === "/google-chat-link" ||
    pathname.startsWith("/verify/");
  const [isScrollable, setIsScrollable] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [scrollState, setScrollState] = useState<ScrollState>("top");

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(media.matches);

    updatePreference();
    media.addEventListener("change", updatePreference);
    return () => media.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    function updateScrollState() {
      const root = document.documentElement;
      const body = document.body;
      const scrollHeight = Math.max(root.scrollHeight, body.scrollHeight);
      const viewportHeight = window.innerHeight;
      const scrollTop = window.scrollY || root.scrollTop || 0;
      const maxScrollTop = Math.max(0, scrollHeight - viewportHeight);
      const nextScrollable =
        scrollHeight > viewportHeight * SCROLLABLE_RATIO_THRESHOLD;

      setIsScrollable(nextScrollable);

      if (!nextScrollable) {
        setScrollState("top");
        return;
      }

      const topThreshold = Math.max(
        viewportHeight,
        scrollHeight * TOP_THRESHOLD_RATIO,
      );
      const distanceFromBottom = maxScrollTop - scrollTop;

      if (scrollTop <= topThreshold) {
        setScrollState("top");
        return;
      }

      if (distanceFromBottom <= BOTTOM_THRESHOLD_PX) {
        setScrollState("bottom");
        return;
      }

      setScrollState("middle");
    }

    const scheduleUpdate = () => {
      window.requestAnimationFrame(updateScrollState);
    };

    updateScrollState();
    scheduleUpdate();

    window.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    const observer = new ResizeObserver(scheduleUpdate);
    observer.observe(document.documentElement);
    observer.observe(document.body);

    return () => {
      window.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", scheduleUpdate);
      observer.disconnect();
    };
  }, [pathname]);

  if (!isScrollable || usesDedicatedPublicWorkspace) {
    return null;
  }

  const motion = prefersReducedMotion ? "auto" : "smooth";

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: motion });
  }

  function scrollToBottom() {
    const root = document.documentElement;
    const body = document.body;
    const maxTop =
      Math.max(root.scrollHeight, body.scrollHeight) - window.innerHeight;
    window.scrollTo({ top: Math.max(0, maxTop), behavior: motion });
  }

  const primaryDirection = scrollState === "top" ? "down" : "up";

  return (
    <div className="mnx-scroll-navigator-shell">
      <div
        className={cn(
          "mnx-scroll-navigator",
          prefersReducedMotion
            ? ""
            : "transition-[box-shadow,background-color] duration-200",
        )}
      >
        <div className="mnx-scroll-navigator-inner">
          <span className="mnx-scroll-navigator-label">
            PAGE
          </span>

          <div className="mnx-scroll-navigator-actions">
            <InlineActionButton
              label="TOP"
              direction="up"
              onClick={scrollToTop}
              prefersReducedMotion={prefersReducedMotion}
              isActive={scrollState !== "top"}
            />

            <div
              className="mnx-scroll-navigator-status"
              aria-hidden="true"
              data-state={scrollState}
            >
              <span />
            </div>

            <InlineActionButton
              label="BOTTOM"
              direction="down"
              onClick={scrollToBottom}
              prefersReducedMotion={prefersReducedMotion}
              isActive={scrollState !== "bottom"}
            />
          </div>

          <span className="mnx-scroll-navigator-hint">
            {scrollState === "middle"
              ? "Jump"
              : scrollState === "top"
                ? "Down"
                : "Up"}
          </span>
        </div>
      </div>
    </div>
  );
}

function InlineActionButton({
  direction,
  label,
  onClick,
  prefersReducedMotion,
  isActive,
}: {
  direction: "up" | "down";
  label: string;
  onClick: () => void;
  prefersReducedMotion: boolean;
  isActive: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label === "TOP" ? "Scroll to top" : "Scroll to bottom"}
      aria-pressed={isActive}
      className={cn(
        "mnx-scroll-navigator-action",
        "focus:outline-none focus-visible:ring-2",
        isActive ? "is-active" : "is-idle",
        prefersReducedMotion ? "" : "transition-colors duration-150",
      )}
    >
      <span className="mnx-scroll-navigator-action-text">{label}</span>
      <div className="flex flex-col items-center leading-none">
        <ChevronMark direction={direction} />
      </div>
    </button>
  );
}

function ChevronMark({
  direction,
  className,
}: {
  direction: "up" | "down";
  className?: string;
}) {
  const rotation = direction === "up" ? "rotate(180 6 6)" : undefined;

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 12"
      className={cn("h-2.5 w-2.5", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform={rotation}>
        <path
          d="M2 4.25L6 8L10 4.25"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
