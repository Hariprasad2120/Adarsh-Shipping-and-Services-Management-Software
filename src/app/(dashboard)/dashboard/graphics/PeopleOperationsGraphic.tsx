import React from 'react';
import { motion } from 'framer-motion';

export const PeopleOperationsGraphic: React.FC<{ isHovered?: boolean }> = ({ isHovered = false }) => {
  return (
    <div className="mnx-dashboard-graphic relative w-full h-48 sm:h-56 flex items-center justify-center overflow-hidden p-4">
      <div className="mnx-dg-ambient absolute inset-0 pointer-events-none" />

      {/* Main glassmorphic concentric circle avatars graphic */}
      <div className="relative z-10 w-44 h-44 flex items-center justify-center">
        {/* Large back circle frosted glass wireframe */}
        <motion.div
          className="mnx-dg-panel absolute w-28 h-28 rounded-full border-2 backdrop-blur-md flex items-center justify-center"
          style={{ top: '6%', right: '12%' }}
          animate={{
            scale: isHovered ? 1.05 : [1, 1.03, 1],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          {/* Inner avatar silhouette */}
          <div className="w-16 h-16 rounded-full border mnx-dg-border-accent bg-[var(--mnx-graphic-accent-muted)] backdrop-blur-xs flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-[var(--mnx-graphic-accent-soft)] border mnx-dg-border-accent" />
          </div>
        </motion.div>

        {/* Foreground overlapping frosted glass card */}
        <motion.div
          className="mnx-dg-panel-strong absolute z-20 w-36 rounded-xl backdrop-blur-md border p-2.5"
          style={{ bottom: '12%', left: '8%' }}
          animate={{
            y: isHovered ? -5 : [0, -3, 0],
            rotate: isHovered ? 2 : -2,
          }}
          transition={{
            y: isHovered ? { duration: 0.3 } : { duration: 3.5, repeat: Infinity, ease: 'easeInOut' },
            rotate: { duration: 0.3 }
          }}
        >
          <div className="flex items-center gap-2">
            <div className="mnx-dg-icon w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 shadow-2xs">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className="flex-1 space-y-1">
              <div className="mnx-dg-line h-1.5 w-full rounded-full" />
              <div className="mnx-dg-line-soft h-1.5 w-3/4 rounded-full" />
            </div>
          </div>
        </motion.div>

        {/* Floating glowing glass dot node */}
        <motion.div 
          className="mnx-dg-dot absolute z-30 w-3 h-3 rounded-full border-2"
          style={{ top: '24%', left: '16%' }}
          animate={{
            scale: [1, 1.3, 1],
            y: isHovered ? [0, -4, 0] : 0,
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </div>
    </div>
  );
};
