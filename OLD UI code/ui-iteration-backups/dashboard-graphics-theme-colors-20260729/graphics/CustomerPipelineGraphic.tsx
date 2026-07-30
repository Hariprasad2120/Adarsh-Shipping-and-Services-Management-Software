import React from 'react';
import { motion } from 'framer-motion';

export const CustomerPipelineGraphic: React.FC<{ isHovered?: boolean }> = ({ isHovered = false }) => {
  return (
    <div className="relative w-full h-48 sm:h-56 flex items-center justify-center overflow-hidden p-4">
      <div className="absolute inset-0 bg-radial from-[#faeccb]/35 via-transparent to-transparent pointer-events-none" />

      {/* Main Glassmorphic Node Diagram */}
      <div className="relative z-10 w-48 h-40 flex items-center justify-center">
        {/* SVG wires connecting nodes */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 192 160">
          <path d="M 96 45 L 96 85 M 96 85 L 50 120 M 96 85 L 142 120" fill="none" stroke="#d6bd83" strokeWidth="2" strokeDasharray="3 3" />

          <motion.circle
            r="3.5"
            fill="#e5b33a"
            animate={{
              cx: [96, 96, 50, 96, 142],
              cy: [45, 85, 120, 85, 120]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          />
        </svg>

        {/* Node 1: Top Center */}
        <motion.div
          className="absolute top-2 w-28 h-12 rounded-xl bg-white/75 backdrop-blur-md border border-white/80 p-2 shadow-sm flex items-center gap-2 z-10"
          animate={{
            y: isHovered ? -3 : 0,
          }}
          transition={{ duration: 0.3 }}
        >
          <div className="w-4 h-4 rounded bg-[#f6ebcf] border border-[#d4b97a] flex items-center justify-center text-[#ba8e34] text-[9px] font-bold">✓</div>
          <div className="flex-1 space-y-1">
            <div className="h-1.5 w-3/4 rounded-full bg-[#c9a04a]" />
            <div className="h-1 w-1/2 rounded-full bg-[#e8dcb8]" />
          </div>
        </motion.div>

        {/* Node 2: Bottom Left */}
        <motion.div
          className="absolute bottom-2 left-2 w-24 h-11 rounded-xl bg-[#faf4e3]/80 backdrop-blur-md border border-white/80 p-2 shadow-sm flex items-center gap-1.5 z-10"
          animate={{
            x: isHovered ? -3 : 0,
          }}
          transition={{ duration: 0.3 }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-[#ba8e34]" />
          <div className="h-1.5 w-full rounded-full bg-[#d9ba75]" />
        </motion.div>

        {/* Node 3: Bottom Right */}
        <motion.div
          className="absolute bottom-2 right-2 w-24 h-11 rounded-xl bg-white/75 backdrop-blur-md border border-white/80 p-2 shadow-sm flex items-center gap-1.5 z-10"
          animate={{
            x: isHovered ? 3 : 0,
          }}
          transition={{ duration: 0.3 }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-[#e5b33a] shadow-[0_0_6px_rgba(229,179,58,0.8)]" />
          <div className="h-1.5 w-full rounded-full bg-[#c9a04a]" />
        </motion.div>
      </div>
    </div>
  );
};
