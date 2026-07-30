import React from 'react';
import { motion } from 'framer-motion';

export const TalentPipelineGraphic: React.FC<{ isHovered?: boolean }> = ({ isHovered = false }) => {
  return (
    <div className="mnx-dashboard-graphic relative w-full h-48 sm:h-56 flex items-center justify-center overflow-hidden p-4">
      <div className="mnx-dg-ambient absolute inset-0 pointer-events-none" />

      {/* Glassmorphic Talent Pipeline Graphic */}
      <div className="relative z-10 w-44 h-44 flex items-center justify-center">
        {/* Large Central Avatar Circle */}
        <motion.div
          className="mnx-dg-panel absolute w-24 h-24 rounded-full border-2 backdrop-blur-md flex items-center justify-center"
          style={{ top: '10%' }}
          animate={{
            scale: isHovered ? 1.05 : [1, 1.03, 1],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="w-14 h-14 rounded-full border mnx-dg-border-accent bg-[var(--mnx-graphic-accent-muted)] flex items-center justify-center">
            <div className="w-7 h-7 rounded-full bg-[var(--mnx-graphic-accent-soft)] border mnx-dg-border-accent" />
          </div>
        </motion.div>

        {/* Left Satellite Circle Wireframe */}
        <motion.div
          className="absolute left-2 bottom-6 w-14 h-14 rounded-full border border-dashed mnx-dg-border-accent bg-[var(--mnx-graphic-surface)] backdrop-blur-xs flex items-center justify-center"
          animate={{
            rotate: isHovered ? 180 : 0,
          }}
          transition={{ duration: 4, ease: "linear" }}
        />

        {/* Right Satellite Circle Wireframe */}
        <motion.div
          className="absolute right-2 bottom-6 w-14 h-14 rounded-full border border-dashed mnx-dg-border-accent bg-[var(--mnx-graphic-surface-soft)] backdrop-blur-xs flex items-center justify-center"
          animate={{
            rotate: isHovered ? -180 : 0,
          }}
          transition={{ duration: 4, ease: "linear" }}
        />

        {/* Bottom Arc & Golden Glowing Nodes */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-20" viewBox="0 0 176 176">
          <path className="mnx-dg-svg-accent" d="M 30 140 Q 88 100 146 140" fill="none" strokeWidth="2.5" strokeLinecap="round" />
          <motion.circle className="mnx-dg-svg-dot-muted" cx="30" cy="140" r="3.5" strokeWidth="1.5" />
          <motion.circle className="mnx-dg-svg-dot" cx="88" cy="120" r="4.5" strokeWidth="1.5"
            animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.circle className="mnx-dg-svg-dot-muted" cx="146" cy="140" r="3.5" strokeWidth="1.5" />
        </svg>
      </div>
    </div>
  );
};
