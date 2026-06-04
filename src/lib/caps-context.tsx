"use client";

import { createContext, useContext } from "react";
import type { Caps } from "@/lib/rbac";

const CapsContext = createContext<Caps>({});

export function CapsProvider({ value, children }: { value: Caps; children: React.ReactNode }) {
  return <CapsContext.Provider value={value}>{children}</CapsContext.Provider>;
}

export function useCaps(): Caps {
  return useContext(CapsContext);
}

export function useCan(key: string): boolean {
  return !!useContext(CapsContext)[key];
}

export function useCanAny(keys: string[]): boolean {
  const caps = useContext(CapsContext);
  return keys.some((k) => caps[k]);
}
