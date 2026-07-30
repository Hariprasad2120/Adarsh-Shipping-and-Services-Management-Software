import React from 'react';
import { motion } from 'framer-motion';

export const PeopleOperationsGraphic: React.FC<{ isHovered?: boolean }> = ({ isHovered = false }) => {
  return (
    <div className="relative w-full h-48 sm:h-56 flex items-center justify-center overflow-hidden p-4">
      <div className="absolute inset-0 bg-radial from-[#faeccb]/35 via-transparent to-transparent pointer-events-none" />

      {/* Main glassmorphic concentric circle avatars graphic */}
      <div className="relative z-10 w-44 h-44 flex items-center justify-center">
        {/* Large back circle frosted glass wireframe */}
        <motion.div
          className="absolute w-28 h-28 rounded-full border-2 border-white/80 bg-white/40 backdrop-blur-md flex items-center justify-center shadow-[0_8px_20px_-6px_rgba(200,165,90,0.18)]"
          style={{ top: '6%', right: '12%' }}
          animate={{
            scale: isHovered ? 1.05 : [1, 1.03, 1],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          {/* Inner avatar silhouette */}
          <div className="w-16 h-16 rounded-full border border-[#d6be85]/60 bg-[#f7eed6]/50 backdrop-blur-xs flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-[#d9bd7e]/40 border border-[#c4a054]/50" />
          </div>
        </motion.div>

        {/* Foreground overlapping frosted glass card */}
        <motion.div
          className="absolute z-20 w-36 rounded-xl bg-white/75 backdrop-blur-md border border-white/90 p-2.5 shadow-[0_10px_24px_-6px_rgba(190,150,70,0.22)]"
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
            <div className="w-5 h-5 rounded-md bg-[#f6ebcf] border border-[#d4b97a] flex items-center justify-center text-[#ba8e34] flex-shrink-0 shadow-2xs">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className="flex-1 space-y-1">
              <div className="h-1.5 w-full rounded-full bg-[#c9a04a]" />
              <div className="h-1.5 w-3/4 rounded-full bg-[#e8dcb8]" />
            </div>
          </div>
        </motion.div>

        {/* Floating glowing glass dot node */}
        <motion.div
          className="absolute z-30 w-3 h-3 rounded-full bg-[#e5b33a] border-2 border-white shadow-[0_0_10px_rgba(229,179,58,0.9)]"
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
