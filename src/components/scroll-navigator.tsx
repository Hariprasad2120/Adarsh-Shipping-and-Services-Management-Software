"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type ScrollState = "top" | "middle" | "bottom";

const SCROLLABLE_RATIO_THRESHOLD = 1.25;
const TOP_THRESHOLD_RATIO = 0.15;
const BOTTOM_THRESHOLD_PX = 96;

export function ScrollNavigator() {
  const pathname = usePathname();
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
      const nextScrollable = scrollHeight > viewportHeight * SCROLLABLE_RATIO_THRESHOLD;

      setIsScrollable(nextScrollable);

      if (!nextScrollable) {
        setScrollState("top");
        return;
      }

      const topThreshold = Math.max(viewportHeight, scrollHeight * TOP_THRESHOLD_RATIO);
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

  if (!isScrollable) {
    return null;
  }

  const motion = prefersReducedMotion ? "auto" : "smooth";

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: motion });
  }

  function scrollToBottom() {
    const root = document.documentElement;
    const body = document.body;
    const maxTop = Math.max(root.scrollHeight, body.scrollHeight) - window.innerHeight;
    window.scrollTo({ top: Math.max(0, maxTop), behavior: motion });
  }

  const primaryDirection = scrollState === "top" ? "down" : "up";

  return (
    <div className="fixed bottom-0 right-3 z-[60] sm:right-6">
      <div
        className={cn(
          "overflow-hidden rounded-t-[20px] rounded-b-none backdrop-blur-xl",
          "bg-[radial-gradient(circle_at_center_bottom,rgba(34,211,238,0.34),rgba(34,211,238,0.16)_36%,rgba(255,255,255,0.08)_72%,rgba(255,255,255,0.04)_100%)]",
          "shadow-[0_10px_24px_-18px_rgba(34,211,238,0.28)]",
          "supports-[backdrop-filter]:bg-[radial-gradient(circle_at_center_bottom,rgba(34,211,238,0.32),rgba(34,211,238,0.14)_38%,rgba(255,255,255,0.1)_72%,rgba(255,255,255,0.05)_100%)]",
          prefersReducedMotion ? "" : "transition-[box-shadow,background-color] duration-200 hover:shadow-[0_14px_30px_-20px_rgba(34,211,238,0.34)]",
        )}
      >
        <div className="flex min-w-[156px] items-center gap-2 px-3 pb-[max(0.72rem,env(safe-area-inset-bottom))] pt-2.5">
          <span className="pr-1 text-[9px] font-semibold tracking-[0.3em] text-white">SCROLL</span>

          {scrollState === "middle" ? (
            <div className="flex items-center gap-1.5">
              <InlineActionButton
                label="TOP"
                direction="up"
                onClick={scrollToTop}
                prefersReducedMotion={prefersReducedMotion}
              />
              <span className="text-white/26">/</span>
              <InlineActionButton
                label="BOTTOM"
                direction="down"
                onClick={scrollToBottom}
                prefersReducedMotion={prefersReducedMotion}
              />
            </div>
          ) : (
            <InlineActionButton
              label={scrollState === "top" ? "BOTTOM" : "TOP"}
              direction={primaryDirection}
              onClick={scrollState === "top" ? scrollToBottom : scrollToTop}
              prefersReducedMotion={prefersReducedMotion}
            />
          )}
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
}: {
  direction: "up" | "down";
  label: string;
  onClick: () => void;
  prefersReducedMotion: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label === "TOP" ? "Scroll to top" : "Scroll to bottom"}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-white/88",
        "hover:bg-white/10 focus:bg-white/12 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#22d3ee]/28",
        prefersReducedMotion ? "" : "transition-colors duration-150",
      )}
    >
      <span className="text-[8px] font-semibold tracking-[0.22em]">{label}</span>
      <div className="flex flex-col items-center leading-none text-white/76">
        <ChevronMark direction={direction} />
        <ChevronMark direction={direction} className="-mt-1" />
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
