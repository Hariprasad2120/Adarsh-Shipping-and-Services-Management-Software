import React from 'react';
import { motion } from 'framer-motion';

export const AttendanceGraphic: React.FC<{ isHovered?: boolean }> = ({ isHovered = false }) => {
  return (
    <div className="relative w-full h-48 sm:h-56 flex items-center justify-center overflow-hidden p-4">
      <div className="absolute inset-0 bg-radial from-[#faeccb]/35 via-transparent to-transparent pointer-events-none" />

      {/* Main Glassmorphic Clock Container */}
      <div className="relative z-10 flex items-center justify-center">
        {/* Clock Dial outer ring */}
        <motion.div
          className="relative w-36 h-36 rounded-full bg-white/65 backdrop-blur-md border-2 border-white/80 shadow-[0_12px_30px_-6px_rgba(195,160,90,0.22)] flex items-center justify-center"
          animate={{
            scale: isHovered ? 1.04 : 1,
            boxShadow: isHovered ? '0 16px 36px -6px rgba(185,145,70,0.28)' : '0 12px 30px -6px rgba(195,160,90,0.22)'
          }}
          transition={{ duration: 0.3 }}
        >
          {/* Clock Ticks */}
          <div className="absolute inset-0 p-2 flex flex-col justify-between items-center pointer-events-none opacity-60">
            <div className="w-0.5 h-2 bg-[#b89547] rounded-full" />
            <div className="w-0.5 h-2 bg-[#b89547] rounded-full" />
          </div>
          <div className="absolute inset-0 p-2 flex justify-between items-center pointer-events-none opacity-60">
            <div className="h-0.5 w-2 bg-[#b89547] rounded-full" />
            <div className="h-0.5 w-2 bg-[#b89547] rounded-full" />
          </div>

          {/* Hour Hand */}
          <motion.div
            className="absolute bottom-1/2 left-1/2 w-1 h-10 bg-gradient-to-t from-[#ab8430] to-[#cba44c] rounded-full origin-bottom -ml-0.5 shadow-2xs"
            animate={{ rotate: isHovered ? 120 : 65 }}
            transition={{ duration: isHovered ? 0.6 : 1, ease: 'easeOut' }}
          />

          {/* Minute Hand */}
          <motion.div
            className="absolute bottom-1/2 left-1/2 w-0.5 h-14 bg-[#d4aa48] rounded-full origin-bottom -ml-0.25"
            animate={{ rotate: isHovered ? 340 : 210 }}
            transition={{ duration: isHovered ? 0.8 : 1, ease: 'easeOut' }}
          />

          {/* Center Pin & Gold Glow */}
          <div className="relative z-20 w-3 h-3 rounded-full bg-[#ba8e34] border-2 border-white shadow-[0_0_8px_rgba(186,142,52,0.8)]" />
        </motion.div>

        {/* Floating glassmorphic status card badge */}
        <motion.div
          className="absolute -bottom-2 -right-2 z-20 bg-white/80 backdrop-blur-md border border-white/90 rounded-xl px-3 py-1 shadow-sm flex items-center gap-2"
          animate={{
            y: isHovered ? -4 : [0, -3, 0],
          }}
          transition={{
            y: isHovered ? { duration: 0.3 } : { duration: 3, repeat: Infinity, ease: 'easeInOut' }
          }}
        >
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-[11px] font-semibold text-[#8a723e]">09:00 AM Check-in</span>
        </motion.div>
      </div>
    </div>
  );
};
