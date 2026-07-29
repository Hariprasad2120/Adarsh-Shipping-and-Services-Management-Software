import React from 'react';
import { motion } from 'framer-motion';

export const CustomerPipelineGraphic: React.FC<{ isHovered?: boolean }> = ({ isHovered = false }) => {
  return (
    <div className="mnx-dashboard-graphic relative w-full h-48 sm:h-56 flex items-center justify-center overflow-hidden p-4">
      <div className="mnx-dg-ambient absolute inset-0 pointer-events-none" />

      {/* Main Glassmorphic Node Diagram */}
      <div className="relative z-10 w-48 h-40 flex items-center justify-center">
        {/* SVG wires connecting nodes */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 192 160">
          <path className="mnx-dg-svg-line" d="M 96 45 L 96 85 M 96 85 L 50 120 M 96 85 L 142 120" fill="none" strokeWidth="2" strokeDasharray="3 3" />
          
          <motion.circle
            r="3.5"
            fill="var(--mnx-graphic-accent)"
            animate={{
              cx: [96, 96, 50, 96, 142],
              cy: [45, 85, 120, 85, 120]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          />
        </svg>

        {/* Node 1: Top Center */}
        <motion.div
          className="mnx-dg-panel-strong absolute top-2 w-28 h-12 rounded-xl backdrop-blur-md border p-2 flex items-center gap-2 z-10"
          animate={{
            y: isHovered ? -3 : 0,
          }}
          transition={{ duration: 0.3 }}
        >
          <div className="mnx-dg-icon w-4 h-4 rounded border flex items-center justify-center text-[9px] font-bold">✓</div>
          <div className="flex-1 space-y-1">
            <div className="mnx-dg-line h-1.5 w-3/4 rounded-full" />
            <div className="mnx-dg-line-soft h-1 w-1/2 rounded-full" />
          </div>
        </motion.div>

        {/* Node 2: Bottom Left */}
        <motion.div
          className="mnx-dg-panel-soft absolute bottom-2 left-2 w-24 h-11 rounded-xl backdrop-blur-md border p-2 flex items-center gap-1.5 z-10"
          animate={{
            x: isHovered ? -3 : 0,
          }}
          transition={{ duration: 0.3 }}
        >
          <div className="mnx-dg-dot-muted w-1.5 h-1.5 rounded-full" />
          <div className="mnx-dg-line-soft h-1.5 w-full rounded-full" />
        </motion.div>

        {/* Node 3: Bottom Right */}
        <motion.div
          className="mnx-dg-panel absolute bottom-2 right-2 w-24 h-11 rounded-xl backdrop-blur-md border p-2 flex items-center gap-1.5 z-10"
          animate={{
            x: isHovered ? 3 : 0,
          }}
          transition={{ duration: 0.3 }}
        >
          <div className="mnx-dg-dot w-1.5 h-1.5 rounded-full" />
          <div className="mnx-dg-line h-1.5 w-full rounded-full" />
        </motion.div>
      </div>
    </div>
  );
};
