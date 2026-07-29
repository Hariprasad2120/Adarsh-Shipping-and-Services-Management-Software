import React from 'react';
import { motion } from 'framer-motion';

export const ProductCatalogueGraphic: React.FC<{ isHovered?: boolean }> = ({ isHovered = false }) => {
  return (
    <div className="relative w-full h-48 sm:h-56 flex items-center justify-center overflow-hidden p-4">
      {/* Ambient background highlight */}
      <div className="absolute inset-0 bg-radial from-[#faeccb]/35 via-transparent to-transparent pointer-events-none" />

      {/* Main floating glassmorphic tilted document card */}
      <motion.div
        className="relative z-10 w-44 h-40 rounded-2xl bg-white/65 backdrop-blur-md border border-white/80 p-4 shadow-[0_12px_28px_-6px_rgba(200,165,90,0.2)] flex flex-col justify-between"
        animate={{
          y: isHovered ? -6 : [0, -4, 0],
          rotate: isHovered ? -2 : -4,
        }}
        transition={{
          y: isHovered ? { duration: 0.3 } : { duration: 4, repeat: Infinity, ease: 'easeInOut' },
          rotate: { duration: 0.3 }
        }}
      >
        {/* Specular top sheen */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />

        {/* Top fold icon & glowing dot */}
        <div className="flex items-center justify-between border-b border-[#ebdcb8]/50 pb-2">
          <div className="flex items-center gap-1.5">
            <motion.div 
              className="w-4 h-4 rounded-md bg-[#f6e9c9]/90 border border-[#d6be85] flex items-center justify-center text-xs font-bold text-[#b5882b] flex-shrink-0 shadow-2xs"
              animate={{ scale: isHovered ? [1, 1.15, 1] : 1 }}
              transition={{ duration: 0.8, repeat: isHovered ? Infinity : 0 }}
            >
              <svg className="w-2.5 h-2.5 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </motion.div>
            <span className="text-[10px] font-semibold tracking-wider text-[#a38b55] uppercase">Module</span>
          </div>

          {/* Glowing dot */}
          <motion.div 
            className="w-2.5 h-2.5 rounded-full bg-[#e8b535] shadow-[0_0_10px_rgba(232,181,53,0.9)]"
            animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>

        {/* Golden lines */}
        <div className="space-y-2.5 my-auto">
          <motion.div 
            className="h-1.5 rounded-full bg-gradient-to-r from-[#cfa951] to-[#e5c26b]"
            animate={{ width: isHovered ? '90%' : '75%' }}
            transition={{ duration: 0.3 }}
          />
          <motion.div 
            className="h-1.5 rounded-full bg-[#e8dcb8]"
            animate={{ width: isHovered ? '100%' : '90%' }}
            transition={{ duration: 0.3, delay: 0.05 }}
          />
          <motion.div 
            className="h-1.5 rounded-full bg-[#efe5c9]"
            animate={{ width: isHovered ? '80%' : '60%' }}
            transition={{ duration: 0.3, delay: 0.1 }}
          />
        </div>

        {/* Bottom indicator */}
        <div className="flex items-center justify-between text-[9px] text-[#9c844e] font-medium pt-1 border-t border-[#f0e4c7]/70">
          <span>09 Modules</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#cfa951]" />
        </div>
      </motion.div>

      {/* Secondary glassmorphic card */}
      <motion.div
        className="absolute z-0 w-40 h-36 rounded-2xl bg-[#faf3e2]/60 backdrop-blur-md border border-white/70 p-3 shadow-sm"
        style={{ right: '10%', bottom: '10%' }}
        animate={{
          rotate: isHovered ? 6 : 4,
          y: isHovered ? 4 : [0, 4, 0],
        }}
        transition={{
          y: isHovered ? { duration: 0.3 } : { duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 },
          rotate: { duration: 0.3 }
        }}
      >
        <div className="space-y-2 mt-4 opacity-75">
          <div className="h-1.5 w-4/5 rounded-full bg-[#d6bd83]" />
          <div className="h-1.5 w-3/5 rounded-full bg-[#e8d9b4]" />
        </div>
      </motion.div>
    </div>
  );
};
