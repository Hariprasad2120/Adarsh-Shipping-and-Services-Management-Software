import React from 'react';
import { motion } from 'framer-motion';

export const ExpenseDeskGraphic: React.FC<{ isHovered?: boolean }> = ({ isHovered = false }) => {
  const barsData = [
    { id: 1, x: 25, y: 105, height: 25, cx: 37 },
    { id: 2, x: 75, y: 75, height: 55, cx: 87 },
    { id: 3, x: 125, y: 35, height: 95, cx: 137 },
  ];

  return (
    <div className="mnx-dashboard-graphic relative w-full h-48 sm:h-56 flex items-center justify-center overflow-hidden p-4">
      {/* Background ambient radial highlight */}
      <div className="mnx-dg-ambient absolute inset-0 pointer-events-none" />

      {/* Glassmorphic Expense Desk Statistics Bar */}
      <div className="relative z-10 w-48 h-44 flex items-center justify-center">
        <svg className="w-full h-full overflow-visible" viewBox="0 0 180 150">
          <defs>
            <linearGradient id="expGlassBarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--mnx-graphic-surface-strong)" stopOpacity="0.88" />
              <stop offset="30%" stopColor="var(--mnx-graphic-surface)" stopOpacity="0.75" />
              <stop offset="100%" stopColor="var(--mnx-graphic-accent-muted)" stopOpacity="0.35" />
            </linearGradient>

            <linearGradient id="expGlassSpecular" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--mnx-graphic-surface-strong)" stopOpacity="0.95" />
              <stop offset="100%" stopColor="var(--mnx-graphic-surface-strong)" stopOpacity="0.4" />
            </linearGradient>

            <filter id="expGlassShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="var(--mnx-graphic-accent)" floodOpacity="0.16" />
            </filter>
          </defs>

          {/* 3 Vertical Glassmorphic Statistic Bar Columns */}
          {barsData.map((bar, idx) => (
            <g key={bar.id} filter="url(#expGlassShadow)">
              <motion.rect
                x={bar.x}
                width={24}
                rx={7}
                ry={7}
                fill="url(#expGlassBarGrad)"
                stroke="var(--mnx-graphic-border-strong)"
                strokeWidth="1.2"
                initial={{ y: 130, height: 0 }}
                animate={{
                  y: isHovered ? bar.y - 4 : bar.y,
                  height: isHovered ? bar.height + 4 : bar.height,
                }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
              />

              <motion.path
                d={`M ${bar.x + 3} ${bar.y + 1} H ${bar.x + 21}`}
                stroke="url(#expGlassSpecular)"
                strokeWidth="1.5"
                strokeLinecap="round"
                animate={{
                  d: `M ${bar.x + 3} ${isHovered ? bar.y - 3 : bar.y + 1} H ${bar.x + 21}`,
                }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
              />

              <motion.rect
                x={bar.x + 4}
                width={16}
                height={4}
                rx={2}
                fill="var(--mnx-graphic-surface-strong)"
                opacity={0.9}
                animate={{
                  y: isHovered ? bar.y + 2 : bar.y + 6,
                }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
              />
            </g>
          ))}

          {/* Trend Line Path */}
          <motion.path
            d="M 37 105 L 87 75 L 137 35"
            fill="none"
            stroke="var(--mnx-graphic-accent-strong)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            animate={{
              pathLength: isHovered ? [0, 1] : 1,
            }}
            transition={{ duration: 0.8 }}
          />

          {/* Trend Line Node Dots */}
          {barsData.map((bar, idx) => {
            const isLast = idx === barsData.length - 1;
            return (
              <g key={idx}>
                {isLast && (
                  <motion.circle
                    cx={bar.cx}
                    cy={isHovered ? bar.y - 4 : bar.y}
                    r={9}
                    fill="var(--mnx-graphic-accent)"
                    opacity={0.35}
                    animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0.5, 0.2] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}

                <motion.circle
                  cx={bar.cx}
                  cy={bar.y}
                  r={isLast ? 5 : 3.5}
                  fill={isLast ? "var(--mnx-graphic-accent)" : "var(--mnx-graphic-accent-strong)"}
                  stroke="var(--mnx-card)"
                  strokeWidth="1.5"
                  animate={{
                    cy: isHovered ? bar.y - 4 : bar.y,
                  }}
                  transition={{ duration: 0.4 }}
                />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
