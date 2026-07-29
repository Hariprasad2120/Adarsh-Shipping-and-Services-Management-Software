import React from 'react';
import { motion } from 'framer-motion';

export const ProductCatalogueGraphic: React.FC<{ isHovered?: boolean }> = ({ isHovered = false }) => {
  return (
    <div className="mnx-dashboard-graphic relative w-full h-48 sm:h-56 flex items-center justify-center overflow-hidden p-4">
      {/* Ambient background highlight */}
      <div className="mnx-dg-ambient absolute inset-0 pointer-events-none" />

      {/* Main floating glassmorphic tilted document card */}
      <motion.div
        className="mnx-dg-panel-strong relative z-10 w-44 h-40 rounded-2xl backdrop-blur-md border p-4 flex flex-col justify-between"
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
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--mnx-graphic-surface-strong)] to-transparent" />

        {/* Top fold icon & glowing dot */}
        <div className="flex items-center justify-between border-b border-[color:var(--mnx-graphic-border)] pb-2">
          <div className="flex items-center gap-1.5">
            <motion.div 
              className="mnx-dg-icon w-4 h-4 rounded-md border flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-2xs"
              animate={{ scale: isHovered ? [1, 1.15, 1] : 1 }}
              transition={{ duration: 0.8, repeat: isHovered ? Infinity : 0 }}
            >
              <svg className="w-2.5 h-2.5 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </motion.div>
            <span className="mnx-dg-text text-[10px] font-semibold tracking-wider uppercase">Module</span>
          </div>

          {/* Glowing dot */}
          <motion.div 
            className="mnx-dg-dot w-2.5 h-2.5 rounded-full"
            animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>

        {/* Golden lines */}
        <div className="space-y-2.5 my-auto">
          <motion.div 
            className="h-1.5 rounded-full bg-gradient-to-r from-[var(--mnx-graphic-accent-strong)] to-[var(--mnx-graphic-accent)]"
            animate={{ width: isHovered ? '90%' : '75%' }}
            transition={{ duration: 0.3 }}
          />
          <motion.div 
            className="mnx-dg-line-soft h-1.5 rounded-full"
            animate={{ width: isHovered ? '100%' : '90%' }}
            transition={{ duration: 0.3, delay: 0.05 }}
          />
          <motion.div 
            className="mnx-dg-line-faint h-1.5 rounded-full"
            animate={{ width: isHovered ? '80%' : '60%' }}
            transition={{ duration: 0.3, delay: 0.1 }}
          />
        </div>

        {/* Bottom indicator */}
        <div className="mnx-dg-text flex items-center justify-between text-[9px] font-medium pt-1 border-t border-[color:var(--mnx-graphic-border)]">
          <span>09 Modules</span>
          <span className="mnx-dg-dot-muted w-1.5 h-1.5 rounded-full" />
        </div>
      </motion.div>

      {/* Secondary glassmorphic card */}
      <motion.div
        className="mnx-dg-panel-soft absolute z-0 w-40 h-36 rounded-2xl backdrop-blur-md border p-3"
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
          <div className="mnx-dg-line-soft h-1.5 w-4/5 rounded-full" />
          <div className="mnx-dg-line-faint h-1.5 w-3/5 rounded-full" />
        </div>
      </motion.div>
    </div>
  );
};
