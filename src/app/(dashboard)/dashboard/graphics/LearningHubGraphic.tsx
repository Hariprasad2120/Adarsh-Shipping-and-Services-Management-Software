import React from 'react';
import { motion } from 'framer-motion';

export const LearningHubGraphic: React.FC<{ isHovered?: boolean }> = ({ isHovered = false }) => {
  return (
    <div className="mnx-dashboard-graphic relative w-full h-48 sm:h-56 flex items-center justify-center overflow-hidden p-4">
      <div className="mnx-dg-ambient absolute inset-0 pointer-events-none" />

      {/* Main Glassmorphic Open Book Graphic */}
      <div className="relative z-10 w-48 h-36 flex items-center justify-center">
        {/* Book spine line */}
        <div className="mnx-dg-line absolute h-28 w-0.5 z-20 rounded-full shadow-2xs" />

        {/* Left Book Page */}
        <motion.div
          className="mnx-dg-panel-strong w-22 h-28 rounded-l-2xl backdrop-blur-md border-y border-l p-3 flex flex-col justify-between origin-right"
          animate={{
            rotateY: isHovered ? -12 : -5,
            y: isHovered ? -3 : 0,
          }}
          transition={{ duration: 0.4 }}
        >
          <div className="space-y-2 mt-2">
            <div className="mnx-dg-line h-1.5 w-full rounded-full" />
            <div className="mnx-dg-line-soft h-1.5 w-4/5 rounded-full" />
            <div className="mnx-dg-line-faint h-1.5 w-3/4 rounded-full" />
          </div>
          <div className="flex items-center gap-1">
            <div className="mnx-dg-dot-muted w-2 h-2 rounded-full" />
            <div className="mnx-dg-line-soft h-1 w-8 rounded-full" />
          </div>
        </motion.div>

        {/* Right Book Page */}
        <motion.div
          className="mnx-dg-panel-soft w-22 h-28 rounded-r-2xl backdrop-blur-md border-y border-r p-3 flex flex-col justify-between origin-left"
          animate={{
            rotateY: isHovered ? 12 : 5,
            y: isHovered ? -3 : 0,
          }}
          transition={{ duration: 0.4 }}
        >
          <div className="space-y-2 mt-2">
            <div className="mnx-dg-line h-1.5 w-full rounded-full" />
            <div className="mnx-dg-line-soft h-1.5 w-5/6 rounded-full" />
            <div className="mnx-dg-line-faint h-1.5 w-2/3 rounded-full" />
          </div>
          <div className="flex justify-end">
            <motion.div 
              className="mnx-dg-dot w-3.5 h-3.5 rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
};
