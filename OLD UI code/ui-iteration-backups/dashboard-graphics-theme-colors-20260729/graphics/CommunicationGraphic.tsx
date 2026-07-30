import React from 'react';
import { motion } from 'framer-motion';

export const CommunicationGraphic: React.FC<{ isHovered?: boolean }> = ({ isHovered = false }) => {
  return (
    <div className="relative w-full h-48 sm:h-56 flex items-center justify-center overflow-hidden p-4">
      <div className="absolute inset-0 bg-radial from-[#faeccb]/35 via-transparent to-transparent pointer-events-none" />

      <div className="relative z-10 w-48 h-40 flex items-center justify-center">
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 192 160">
          <path d="M 50 80 Q 96 40 142 80 M 50 80 Q 96 120 142 80" fill="none" stroke="#d6bd83" strokeWidth="2" />
          <motion.path
            d="M 50 80 Q 96 40 142 80"
            fill="none"
            stroke="#e5b33a"
            strokeWidth="3"
            strokeDasharray="10 20"
            animate={{ strokeDashoffset: [0, -30] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />
        </svg>

        <motion.div
          className="absolute z-20 w-14 h-14 rounded-2xl bg-white/80 backdrop-blur-md border border-white/90 shadow-[0_8px_20px_-4px_rgba(200,165,90,0.2)] flex items-center justify-center"
          animate={{ scale: isHovered ? 1.1 : [1, 1.05, 1] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        >
          <div className="w-8 h-8 rounded-xl bg-[#f6ebcf] border border-[#d4b97a] flex items-center justify-center text-[#ba8e34]">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
        </motion.div>

        <motion.div
          className="absolute left-3 z-10 w-12 h-10 rounded-xl bg-[#faf4e3]/80 backdrop-blur-md border border-white/80 p-1.5 flex flex-col justify-center gap-1 shadow-xs"
          animate={{ y: isHovered ? -4 : [0, 3, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <div className="h-1.5 w-full bg-[#c9a04a] rounded-full" />
          <div className="h-1 w-2/3 bg-[#e8dcb8] rounded-full" />
        </motion.div>

        <motion.div
          className="absolute right-3 z-10 w-12 h-10 rounded-xl bg-white/80 backdrop-blur-md border border-white/80 p-1.5 flex flex-col justify-center gap-1 shadow-xs"
          animate={{ y: isHovered ? 4 : [0, -3, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <div className="h-1.5 w-full bg-[#e5b33a] rounded-full" />
          <div className="h-1 w-3/4 bg-[#e8dcb8] rounded-full" />
        </motion.div>
      </div>
    </div>
  );
};
