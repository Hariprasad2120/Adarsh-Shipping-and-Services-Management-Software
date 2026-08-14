"use client";

import { useEffect, useState } from "react";

export function useCollapsiblePanel(storageKey: string, defaultCollapsed = false) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      const stored = window.localStorage.getItem(storageKey);
      setCollapsed(stored === null ? defaultCollapsed : stored === "true");
      setLoaded(true);
    });
    return () => window.cancelAnimationFrame(frameId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only load once per storageKey
  }, [storageKey]);

  useEffect(() => {
    if (!loaded) return;
    window.localStorage.setItem(storageKey, String(collapsed));
  }, [collapsed, loaded, storageKey]);

  function toggle() {
    setCollapsed((current) => !current);
  }

  return { collapsed, toggle, setCollapsed };
}
