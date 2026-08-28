"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Slim top progress bar that gives instant feedback on route navigation.
 * Mounted once in the root layout. Intercepts in-app <a> clicks to start the
 * bar, and completes it when the pathname / search params change. Purely CSS
 * driven (no animation library) and disabled under prefers-reduced-motion —
 * where it degrades to a short static flash.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);
  const [width, setWidth] = useState(0);
  const trickleRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const routeKeyRef = useRef(`${pathname}?${searchParams.toString()}`);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
  }, []);

  function clearTimers() {
    if (trickleRef.current) clearInterval(trickleRef.current);
    if (hideRef.current) clearTimeout(hideRef.current);
    trickleRef.current = null;
    hideRef.current = null;
  }

  function start() {
    clearTimers();
    setActive(true);
    setWidth(10);
    if (reducedMotionRef.current) return;
    let current = 10;
    trickleRef.current = setInterval(() => {
      current += (90 - current) * 0.1;
      setWidth(Math.min(current, 90));
    }, 140);
  }

  function finish() {
    clearTimers();
    setWidth(100);
    hideRef.current = setTimeout(() => {
      setActive(false);
      setWidth(0);
    }, 260);
  }

  // Complete the bar whenever the resolved route changes.
  useEffect(() => {
    const key = `${pathname}?${searchParams.toString()}`;
    if (key !== routeKeyRef.current) {
      routeKeyRef.current = key;
      finish();
    }
    // finish() only touches refs + setState, which are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  // Start the bar on in-app link activation.
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("http") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      ) {
        return;
      }
      const current = `${window.location.pathname}${window.location.search}`;
      if (href === current || href === window.location.pathname) return;
      start();
    }

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      clearTimers();
    };
    // start() / clearTimers() only touch refs + setState, which are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!active) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "2px",
        zIndex: 100000,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${width}%`,
          background:
            "linear-gradient(90deg, var(--frappe-primary-active, var(--frappe-primary)), var(--frappe-primary), var(--frappe-primary-hover, var(--frappe-primary)))",
          boxShadow: "0 0 8px color-mix(in srgb, var(--frappe-primary) 70%, transparent)",
          transition: "width 0.2s ease-out, opacity 0.26s ease-out",
          opacity: width >= 100 ? 0 : 1,
        }}
      />
    </div>
  );
}
