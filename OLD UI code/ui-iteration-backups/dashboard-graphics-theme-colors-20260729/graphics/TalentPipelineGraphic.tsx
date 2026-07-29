import React from 'react';
import { motion } from 'framer-motion';

export const TalentPipelineGraphic: React.FC<{ isHovered?: boolean }> = ({ isHovered = false }) => {
  return (
    <div className="relative w-full h-48 sm:h-56 flex items-center justify-center overflow-hidden p-4">
      <div className="absolute inset-0 bg-radial from-[#faeccb]/35 via-transparent to-transparent pointer-events-none" />

      {/* Glassmorphic Talent Pipeline Graphic */}
      <div className="relative z-10 w-44 h-44 flex items-center justify-center">
        {/* Large Central Avatar Circle */}
        <motion.div
          className="absolute w-24 h-24 rounded-full border-2 border-white/80 bg-white/40 backdrop-blur-md flex items-center justify-center shadow-[0_8px_20px_-6px_rgba(200,165,90,0.18)]"
          style={{ top: '10%' }}
          animate={{
            scale: isHovered ? 1.05 : [1, 1.03, 1],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="w-14 h-14 rounded-full border border-[#d6be85]/60 bg-[#f7eed6]/50 flex items-center justify-center">
            <div className="w-7 h-7 rounded-full bg-[#d9bd7e]/40 border border-[#c4a054]/50" />
          </div>
        </motion.div>

        {/* Left Satellite Circle Wireframe */}
        <motion.div
          className="absolute left-2 bottom-6 w-14 h-14 rounded-full border border-dashed border-[#d6bd83] bg-white/30 backdrop-blur-xs flex items-center justify-center"
          animate={{
            rotate: isHovered ? 180 : 0,
          }}
          transition={{ duration: 4, ease: "linear" }}
        />

        {/* Right Satellite Circle Wireframe */}
        <motion.div
          className="absolute right-2 bottom-6 w-14 h-14 rounded-full border border-dashed border-[#d6bd83] bg-[#faf4e3]/40 backdrop-blur-xs flex items-center justify-center"
          animate={{
            rotate: isHovered ? -180 : 0,
          }}
          transition={{ duration: 4, ease: "linear" }}
        />

        {/* Bottom Arc & Golden Glowing Nodes */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-20" viewBox="0 0 176 176">
          <path d="M 30 140 Q 88 100 146 140" fill="none" stroke="#c99f42" strokeWidth="2.5" strokeLinecap="round" />
          <motion.circle cx="30" cy="140" r="3.5" fill="#ba8e34" stroke="#ffffff" strokeWidth="1.5" />
          <motion.circle cx="88" cy="120" r="4.5" fill="#e5b33a" stroke="#ffffff" strokeWidth="1.5"
            animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.circle cx="146" cy="140" r="3.5" fill="#ba8e34" stroke="#ffffff" strokeWidth="1.5" />
        </svg>
      </div>
    </div>
  );
};
