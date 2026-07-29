"use client";

import type { JSX } from "react";
import { motion } from "framer-motion";

export function ChaHeaderGraphic(): JSX.Element {
  return (
    <div className="mnx-dashboard-graphic relative w-[280px] h-[110px] flex items-center justify-end select-none pointer-events-none overflow-visible">
      {/* Background Soft Glow */}
      <div className="mnx-dg-ambient absolute inset-0 blur-xl" />

      {/* Base Stacked Card (Lower, offset, higher transparency) */}
      <motion.div
        className="mnx-dg-panel absolute w-[190px] h-[70px] rounded-[20px] border shadow-xs flex items-center p-3 gap-3"
        style={{ top: "35px", right: "10px", transformOrigin: "center center" }}
        animate={{
          y: [0, 4, 0],
          rotate: [3, 5, 3],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* Minimal Cargo Container Icon */}
        <div className="mnx-dg-text w-7 h-7 rounded-xl flex items-center justify-center opacity-60">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
            <path d="m3.3 7 8.7 5 8.7-5" />
            <path d="M12 22V12" />
          </svg>
        </div>
        {/* Skeleton Lines */}
        <div className="flex-1 space-y-2 opacity-40">
          <div className="mnx-dg-line h-1.5 w-24 rounded-full" />
          <div className="mnx-dg-line h-1.5 w-16 rounded-full" />
        </div>
      </motion.div>

      {/* Top Primary Card (Clean, subtle semi-transparent glass) */}
      <motion.div
        className="mnx-dg-panel-strong absolute w-[205px] h-[76px] rounded-[22px] backdrop-blur-xs border p-3.5 shadow-sm flex items-center gap-3.5"
        style={{ top: "8px", right: "25px", transformOrigin: "center center" }}
        animate={{
          y: [0, -4, 0],
          rotate: [-2, 0, -2],
        }}
        transition={{
          duration: 4.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* Minimal Customs Clearance Ship / File Icon */}
        <div className="mnx-dg-icon w-8 h-8 rounded-xl border flex items-center justify-center shrink-0">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
            <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76" />
            <path d="M19 9V4a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v5" />
            <path d="M12 3v7" />
          </svg>
        </div>

        {/* Minimal Skeleton Lines */}
        <div className="flex-1 space-y-2.5">
          <div className="mnx-dg-line-soft h-1.5 w-28 rounded-full" />
          <div className="mnx-dg-line-faint h-1.5 w-20 rounded-full" />
        </div>

        {/* Small Accent Dot */}
        <div className="mnx-dg-dot w-2 h-2 rounded-full shrink-0 self-start mt-1" />
      </motion.div>
    </div>
  );
}

export default ChaHeaderGraphic;
