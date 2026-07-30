import React from 'react';
import { motion } from 'framer-motion';

export const LearningHubGraphic: React.FC<{ isHovered?: boolean }> = ({ isHovered = false }) => {
  return (
    <div className="relative w-full h-48 sm:h-56 flex items-center justify-center overflow-hidden p-4">
      <div className="absolute inset-0 bg-radial from-[#faeccb]/35 via-transparent to-transparent pointer-events-none" />

      {/* Main Glassmorphic Open Book Graphic */}
      <div className="relative z-10 w-48 h-36 flex items-center justify-center">
        {/* Book spine line */}
        <div className="absolute h-28 w-0.5 bg-[#d4b979] z-20 rounded-full shadow-2xs" />

        {/* Left Book Page */}
        <motion.div
          className="w-22 h-28 rounded-l-2xl bg-white/75 backdrop-blur-md border-y border-l border-white/80 p-3 shadow-sm flex flex-col justify-between origin-right"
          animate={{
            rotateY: isHovered ? -12 : -5,
            y: isHovered ? -3 : 0,
          }}
          transition={{ duration: 0.4 }}
        >
          <div className="space-y-2 mt-2">
            <div className="h-1.5 w-full rounded-full bg-[#cfa951]" />
            <div className="h-1.5 w-4/5 rounded-full bg-[#e8dcb8]" />
            <div className="h-1.5 w-3/4 rounded-full bg-[#f2e8cb]" />
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-[#d6be85]" />
            <div className="h-1 w-8 bg-[#ebdcb8] rounded-full" />
          </div>
        </motion.div>

        {/* Right Book Page */}
        <motion.div
          className="w-22 h-28 rounded-r-2xl bg-[#faf4e3]/85 backdrop-blur-md border-y border-r border-white/80 p-3 shadow-sm flex flex-col justify-between origin-left"
          animate={{
            rotateY: isHovered ? 12 : 5,
            y: isHovered ? -3 : 0,
          }}
          transition={{ duration: 0.4 }}
        >
          <div className="space-y-2 mt-2">
            <div className="h-1.5 w-full rounded-full bg-[#cfa951]" />
            <div className="h-1.5 w-5/6 rounded-full bg-[#e8dcb8]" />
            <div className="h-1.5 w-2/3 rounded-full bg-[#f2e8cb]" />
          </div>
          <div className="flex justify-end">
            <motion.div
              className="w-3.5 h-3.5 rounded-full bg-[#e5b33a] shadow-[0_0_8px_rgba(229,179,58,0.8)]"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
};
