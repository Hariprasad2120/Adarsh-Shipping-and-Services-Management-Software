import React from "react";
import { motion } from "framer-motion";

export const CommunicationGraphic: React.FC<{ isHovered?: boolean }> = ({
  isHovered = false,
}) => {
  return (
    <div className="mnx-dashboard-graphic relative w-full h-48 sm:h-56 flex items-center justify-center overflow-hidden p-4">
      <div className="mnx-dg-ambient absolute inset-0 pointer-events-none" />

      <div className="relative z-10 w-48 h-40 flex items-center justify-center">
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-0"
          viewBox="0 0 192 160"
        >
          <path
            className="mnx-dg-svg-line"
            d="M 50 80 Q 96 40 142 80 M 50 80 Q 96 120 142 80"
            fill="none"
            strokeWidth="2"
          />
          <motion.path
            d="M 50 80 Q 96 40 142 80"
            fill="none"
            stroke="var(--mnx-graphic-accent)"
            strokeWidth="3"
            strokeDasharray="10 20"
            initial={{ strokeDashoffset: 0 }}
            animate={{ strokeDashoffset: [0, -30] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
        </svg>

        <motion.div
          className="mnx-dg-panel-strong absolute z-20 w-14 h-14 rounded-2xl backdrop-blur-md border flex items-center justify-center"
          animate={{ scale: isHovered ? 1.1 : [1, 1.05, 1] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        >
          <div className="mnx-dg-icon w-8 h-8 rounded-xl border flex items-center justify-center">
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
        </motion.div>

        <motion.div
          className="mnx-dg-panel-soft absolute left-3 z-10 w-12 h-10 rounded-xl backdrop-blur-md border p-1.5 flex flex-col justify-center gap-1"
          animate={{ y: isHovered ? -4 : [0, 3, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <div className="mnx-dg-line h-1.5 w-full rounded-full" />
          <div className="mnx-dg-line-soft h-1 w-2/3 rounded-full" />
        </motion.div>

        <motion.div
          className="mnx-dg-panel absolute right-3 z-10 w-12 h-10 rounded-xl backdrop-blur-md border p-1.5 flex flex-col justify-center gap-1"
          animate={{ y: isHovered ? 4 : [0, -3, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <div className="mnx-dg-line h-1.5 w-full rounded-full" />
          <div className="mnx-dg-line-soft h-1 w-3/4 rounded-full" />
        </motion.div>
      </div>
    </div>
  );
};
