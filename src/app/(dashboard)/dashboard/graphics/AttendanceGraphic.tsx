import React from 'react';
import { motion } from 'framer-motion';

export const AttendanceGraphic: React.FC<{ isHovered?: boolean }> = ({ isHovered = false }) => {
  return (
    <div className="mnx-dashboard-graphic relative w-full h-48 sm:h-56 flex items-center justify-center overflow-hidden p-4">
      <div className="mnx-dg-ambient absolute inset-0 pointer-events-none" />

      {/* Main Glassmorphic Clock Container */}
      <div className="relative z-10 flex items-center justify-center">
        {/* Clock Dial outer ring */}
        <motion.div
          className="mnx-dg-panel-strong relative w-36 h-36 rounded-full backdrop-blur-md border-2 flex items-center justify-center"
          animate={{
            scale: isHovered ? 1.04 : 1,
            boxShadow: isHovered ? '0 16px 36px var(--mnx-graphic-glow)' : 'var(--mnx-graphic-shadow)'
          }}
          transition={{ duration: 0.3 }}
        >
          {/* Clock Ticks */}
          <div className="absolute inset-0 p-2 flex flex-col justify-between items-center pointer-events-none opacity-60">
            <div className="mnx-dg-line w-0.5 h-2 rounded-full" />
            <div className="mnx-dg-line w-0.5 h-2 rounded-full" />
          </div>
          <div className="absolute inset-0 p-2 flex justify-between items-center pointer-events-none opacity-60">
            <div className="mnx-dg-line h-0.5 w-2 rounded-full" />
            <div className="mnx-dg-line h-0.5 w-2 rounded-full" />
          </div>

          {/* Hour Hand */}
          <motion.div
            className="absolute bottom-1/2 left-1/2 w-1 h-10 bg-gradient-to-t from-[var(--mnx-graphic-accent-strong)] to-[var(--mnx-graphic-accent)] rounded-full origin-bottom -ml-0.5 shadow-2xs"
            animate={{ rotate: isHovered ? 120 : 65 }}
            transition={{ duration: isHovered ? 0.6 : 1, ease: 'easeOut' }}
          />

          {/* Minute Hand */}
          <motion.div
            className="mnx-dg-line absolute bottom-1/2 left-1/2 w-0.5 h-14 rounded-full origin-bottom -ml-0.25"
            animate={{ rotate: isHovered ? 340 : 210 }}
            transition={{ duration: isHovered ? 0.8 : 1, ease: 'easeOut' }}
          />

          {/* Center Pin & Gold Glow */}
          <div className="mnx-dg-dot-muted relative z-20 w-3 h-3 rounded-full border-2 border-[color:var(--mnx-card)] shadow-[0_0_8px_var(--mnx-graphic-glow)]" />
        </motion.div>

        {/* Floating glassmorphic status card badge */}
        <motion.div
          className="mnx-dg-panel-strong absolute -bottom-2 -right-2 z-20 backdrop-blur-md border rounded-xl px-3 py-1 flex items-center gap-2"
          animate={{
            y: isHovered ? -4 : [0, -3, 0],
          }}
          transition={{
            y: isHovered ? { duration: 0.3 } : { duration: 3, repeat: Infinity, ease: 'easeInOut' }
          }}
        >
          <div className="mnx-dg-status-dot w-2 h-2 rounded-full animate-ping" />
          <span className="mnx-dg-text text-[11px] font-semibold">09:00 AM Check-in</span>
        </motion.div>
      </div>
    </div>
  );
};
