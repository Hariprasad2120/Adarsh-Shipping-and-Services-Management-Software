import React from 'react';
import { motion } from 'framer-motion';

export const ShipmentOperationsGraphic: React.FC<{ isHovered?: boolean }> = ({ isHovered = false }) => {
  return (
    <div className="relative w-full h-48 sm:h-56 flex items-center justify-center overflow-hidden p-4">
      {/* Background ambient radial highlight */}
      <div className="absolute inset-0 bg-radial from-[#faeccb]/35 via-transparent to-transparent pointer-events-none" />

      {/* Glassmorphic Cargo & Trajectory Graphic */}
      <div className="relative z-10 w-48 h-40 flex items-center justify-center">
        {/* SVG Arc Trajectory line connecting nodes */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 192 160">
          <motion.path
            d="M 25 105 Q 96 25 167 105"
            fill="none"
            stroke="#c99f42"
            strokeWidth="2.5"
            strokeDasharray="4 4"
            animate={{
              strokeDashoffset: isHovered ? [0, -20] : 0,
            }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          />

          {/* Node dots on trajectory */}
          <motion.circle cx="25" cy="105" r="4" fill="#ba8e34" stroke="#ffffff" strokeWidth="1.5" />
          <motion.circle cx="96" cy="48" r="4.5" fill="#e5b33a" stroke="#ffffff" strokeWidth="1.5"
            animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.circle cx="167" cy="105" r="4" fill="#ba8e34" stroke="#ffffff" strokeWidth="1.5" />
        </svg>

        {/* Left Container Box */}
        <motion.div
          className="absolute left-4 z-10 w-16 h-16 rounded-2xl bg-white/75 backdrop-blur-md border border-white/80 p-2 shadow-sm flex flex-col justify-center gap-1.5"
          animate={{
            y: isHovered ? -4 : [0, 3, 0],
          }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <div className="h-2 w-3/4 bg-[#c9a04a] rounded-full" />
          <div className="h-1.5 w-1/2 bg-[#e8dcb8] rounded-full" />
        </motion.div>

        {/* Right Container Box */}
        <motion.div
          className="absolute right-4 z-10 w-16 h-20 rounded-2xl bg-[#faf4e3]/85 backdrop-blur-md border border-white/80 p-2.5 shadow-sm flex flex-col justify-between"
          animate={{
            y: isHovered ? 4 : [0, -3, 0],
          }}
          transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
        >
          <div className="space-y-1.5">
            <div className="h-1.5 w-full bg-[#c9a04a] rounded-full" />
            <div className="h-1.5 w-full bg-[#e8dcb8] rounded-full" />
            <div className="h-1.5 w-3/4 bg-[#e8dcb8] rounded-full" />
          </div>
          <div className="w-2 h-2 rounded-full bg-[#e5b33a] self-end shadow-[0_0_6px_rgba(229,179,58,0.8)]" />
        </motion.div>
      </div>
    </div>
  );
};
