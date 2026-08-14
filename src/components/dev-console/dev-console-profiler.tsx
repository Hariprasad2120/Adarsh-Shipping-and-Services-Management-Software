"use client";

import { Profiler, type ProfilerOnRenderCallback, type ReactNode } from "react";
import { devConsoleStore } from "./dev-console-store";

const SLOW_RENDER_THRESHOLD_MS = 16;

const handleRender: ProfilerOnRenderCallback = (id, phase, actualDuration) => {
  if (actualDuration < SLOW_RENDER_THRESHOLD_MS) return;
  devConsoleStore.recordComponentTiming({
    name: id,
    phase: phase === "mount" ? "mount" : "update",
    durationMs: Math.round(actualDuration * 100) / 100,
  });
};

/** Wraps page content in a React Profiler to catch components whose render blows the frame budget. */
export function DevConsoleProfiler({ id, children }: { id: string; children: ReactNode }) {
  return (
    <Profiler id={id} onRender={handleRender}>
      {children}
    </Profiler>
  );
}
