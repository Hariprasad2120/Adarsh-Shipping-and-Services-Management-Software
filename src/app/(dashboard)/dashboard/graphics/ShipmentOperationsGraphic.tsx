import React from 'react';
import { motion } from 'framer-motion';

export const ShipmentOperationsGraphic: React.FC<{ isHovered?: boolean }> = ({ isHovered = false }) => {
  return (
    <div className="mnx-dashboard-graphic relative w-full h-48 sm:h-56 flex items-center justify-center overflow-hidden p-4">
      {/* Background ambient radial highlight */}
      <div className="mnx-dg-ambient absolute inset-0 pointer-events-none" />

      {/* Glassmorphic Cargo & Trajectory Graphic */}
      <div className="relative z-10 w-48 h-40 flex items-center justify-center">
        {/* SVG Arc Trajectory line connecting nodes */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 192 160">
          <motion.path
            d="M 25 105 Q 96 25 167 105"
            fill="none"
            stroke="var(--mnx-graphic-accent-strong)"
            strokeWidth="2.5"
            strokeDasharray="4 4"
            animate={{
              strokeDashoffset: isHovered ? [0, -20] : 0,
            }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          />

          {/* Node dots on trajectory */}
          <motion.circle cx="25" cy="105" r="4" fill="var(--mnx-graphic-accent-strong)" stroke="var(--mnx-card)" strokeWidth="1.5" />
          <motion.circle cx="96" cy="48" r="4.5" fill="var(--mnx-graphic-accent)" stroke="var(--mnx-card)" strokeWidth="1.5"
            animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.circle cx="167" cy="105" r="4" fill="var(--mnx-graphic-accent-strong)" stroke="var(--mnx-card)" strokeWidth="1.5" />
        </svg>

        {/* Left Container Box */}
        <motion.div
          className="mnx-dg-panel absolute left-4 z-10 w-16 h-16 rounded-2xl backdrop-blur-md border p-2 flex flex-col justify-center gap-1.5"
          animate={{
            y: isHovered ? -4 : [0, 3, 0],
          }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <div className="mnx-dg-line h-2 w-3/4 rounded-full" />
          <div className="mnx-dg-line-soft h-1.5 w-1/2 rounded-full" />
        </motion.div>

        {/* Right Container Box */}
        <motion.div
          className="mnx-dg-panel-soft absolute right-4 z-10 w-16 h-20 rounded-2xl backdrop-blur-md border p-2.5 flex flex-col justify-between"
          animate={{
            y: isHovered ? 4 : [0, -3, 0],
          }}
          transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
        >
          <div className="space-y-1.5">
            <div className="mnx-dg-line h-1.5 w-full rounded-full" />
            <div className="mnx-dg-line-soft h-1.5 w-full rounded-full" />
            <div className="mnx-dg-line-faint h-1.5 w-3/4 rounded-full" />
          </div>
          <div className="mnx-dg-dot w-2 h-2 rounded-full self-end" />
        </motion.div>
      </div>
    </div>
  );
};
