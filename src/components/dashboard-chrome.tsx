"use client";

import {
  createContext,
  useContext,
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";

type DashboardChromeContextValue = {
  isDesktop: boolean;
  mobileNavId: string;
  mobileNavOpen: boolean;
  closeMobileNav: () => void;
  openMobileNav: () => void;
  toggleMobileNav: () => void;
  setMenuTrigger: (node: HTMLButtonElement | null) => void;
};

const DashboardChromeContext = createContext<DashboardChromeContextValue | null>(null);

const DESKTOP_MEDIA_QUERY = "(min-width: 1024px)";

export function DashboardChromeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const mobileNavId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const wasMobileNavOpenRef = useRef(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);
    const syncViewport = () => setIsDesktop(mediaQuery.matches);

    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);
    return () => mediaQuery.removeEventListener("change", syncViewport);
  }, []);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setMobileNavOpen(false);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [pathname]);

  useEffect(() => {
    if (!isDesktop || !mobileNavOpen) return;

    const frameId = window.requestAnimationFrame(() => {
      setMobileNavOpen(false);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [isDesktop, mobileNavOpen]);

  useEffect(() => {
    if (isDesktop || !mobileNavOpen) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isDesktop, mobileNavOpen]);

  const handleEscape = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === "Escape") {
      setMobileNavOpen(false);
    }
  });

  useEffect(() => {
    if (isDesktop || !mobileNavOpen) return;

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isDesktop, mobileNavOpen]);

  useEffect(() => {
    const wasOpen = wasMobileNavOpenRef.current;

    if (wasOpen && !mobileNavOpen && !isDesktop) {
      triggerRef.current?.focus();
    }

    wasMobileNavOpenRef.current = mobileNavOpen;
  }, [isDesktop, mobileNavOpen]);

  const value: DashboardChromeContextValue = {
    isDesktop,
    mobileNavId,
    mobileNavOpen,
    closeMobileNav: () => setMobileNavOpen(false),
    openMobileNav: () => setMobileNavOpen(true),
    toggleMobileNav: () => setMobileNavOpen((open) => !open),
    setMenuTrigger: (node) => {
      triggerRef.current = node;
    },
  };

  return (
    <DashboardChromeContext.Provider value={value}>
      {children}
    </DashboardChromeContext.Provider>
  );
}

export function useDashboardChrome() {
  const context = useContext(DashboardChromeContext);

  if (!context) {
    throw new Error("useDashboardChrome must be used within DashboardChromeProvider");
  }

  return context;
}
