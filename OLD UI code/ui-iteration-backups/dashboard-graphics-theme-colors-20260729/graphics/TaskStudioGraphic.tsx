import React from 'react';
import { motion } from 'framer-motion';

interface TaskStudioGraphicProps {
  onCreateTaskClick?: () => void;
  isHovered?: boolean;
  className?: string;
}

export const TaskStudioGraphic: React.FC<TaskStudioGraphicProps> = ({
  onCreateTaskClick,
  isHovered = false,
  className = ''
}) => {
  return (
    <div className={`relative w-full min-h-[220px] sm:min-h-[260px] flex items-center justify-center overflow-hidden p-6 rounded-3xl bg-gradient-to-br from-[#fcf7ea] via-[#f7ebcf] to-[#f5e4c3] border border-[#e6d6b0] shadow-[0_12px_36px_-10px_rgba(200,165,80,0.18)] ${className}`}>
      {/* Radial warmth background glow */}
      <div className="absolute inset-0 bg-radial from-[#faeccb]/60 via-transparent to-transparent pointer-events-none" />

      {/* Decorative background wireframe rings */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-25" viewBox="0 0 400 300">
        <circle cx="200" cy="150" r="110" fill="none" stroke="#c99f42" strokeWidth="1" strokeDasharray="4 6" />
        <circle cx="200" cy="150" r="160" fill="none" stroke="#d4b568" strokeWidth="1" />
      </svg>

      {/* Container for the stacked tilted task cards (Exact structure of Image 2) */}
      <div className="relative z-10 w-full max-w-sm h-44 flex items-center justify-center">

        {/* CARD 1 (TOP TILTED CARD - Image 2) */}
        <motion.div
          className="absolute z-10 w-64 sm:w-72 rounded-2xl bg-white/85 backdrop-blur-md border border-[#e4d7b5] p-4 shadow-[0_14px_32px_-8px_rgba(190,150,70,0.22)] flex items-center gap-3.5"
          initial={{ rotate: -5, y: -10 }}
          animate={{
            rotate: isHovered ? -3 : -5,
            y: isHovered ? -16 : [-8, -12, -8],
          }}
          transition={{
            y: isHovered ? { duration: 0.3 } : { duration: 4, repeat: Infinity, ease: 'easeInOut' },
            rotate: { duration: 0.3 }
          }}
        >
          {/* Gold checkmark icon */}
          <div className="w-9 h-9 rounded-xl bg-[#f6ebcf] border border-[#d4b97a] flex items-center justify-center text-[#ba8e34] shadow-sm flex-shrink-0">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          {/* Skeleton lines (Gold top bar, warm grey lower lines) */}
          <div className="flex-1 space-y-2">
            <div className="h-2 w-full rounded-full bg-[#b88e36]" />
            <div className="h-1.5 w-4/5 rounded-full bg-[#d9cbab]" />
            <div className="h-1.5 w-2/3 rounded-full bg-[#e8dcb8]" />
          </div>

          {/* Golden glowing dot node near edge */}
          <motion.div
            className="w-3 h-3 rounded-full bg-[#e8b535] border-2 border-white shadow-[0_0_10px_rgba(232,181,53,0.9)] flex-shrink-0"
            animate={{ scale: [1, 1.25, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.div>

        {/* CARD 2 (BOTTOM OVERLAPPING CARD - Image 2) */}
        <motion.div
          className="absolute z-0 w-60 sm:w-68 rounded-2xl bg-[#faf3e1]/90 backdrop-blur-md border border-[#e6d8b3] p-4 shadow-md flex items-center gap-3.5"
          initial={{ rotate: 5, y: 15 }}
          animate={{
            rotate: isHovered ? 7 : 5,
            y: isHovered ? 20 : [15, 11, 15],
          }}
          transition={{
            y: isHovered ? { duration: 0.3 } : { duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 },
            rotate: { duration: 0.3 }
          }}
        >
          {/* Gold checkmark icon */}
          <div className="w-8 h-8 rounded-xl bg-[#f6ebcf]/80 border border-[#d4b97a]/70 flex items-center justify-center text-[#ba8e34] flex-shrink-0">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          {/* Skeleton lines */}
          <div className="flex-1 space-y-1.5">
            <div className="h-1.5 w-3/4 rounded-full bg-[#c9a04a]" />
            <div className="h-1.5 w-1/2 rounded-full bg-[#e8dcb8]" />
          </div>
        </motion.div>

        {/* FLOATING DARK GLOSSY "+ Create task" BUTTON (Exact Image 2 style!) */}
        <motion.button
          type="button"
          onClick={onCreateTaskClick}
          className="absolute z-30 right-4 sm:right-8 bottom-1 px-5 py-2.5 sm:px-6 sm:py-3 rounded-full dark-pill-button text-white font-medium text-xs sm:text-sm flex items-center gap-2 tracking-wide cursor-pointer transition-all duration-300 group"
          animate={{
            y: isHovered ? -4 : [0, -3, 0],
            scale: isHovered ? 1.05 : 1,
          }}
          transition={{
            y: isHovered ? { duration: 0.2 } : { duration: 3, repeat: Infinity, ease: 'easeInOut' },
            scale: { duration: 0.2 }
          }}
          whileTap={{ scale: 0.96 }}
        >
          <span className="text-base font-bold text-amber-300 group-hover:rotate-90 transition-transform duration-300">+</span>
          <span>Create task</span>
        </motion.button>

      </div>
    </div>
  );
};
