import React from 'react';
import { motion } from 'framer-motion';

export const PerformanceGraphic: React.FC<{ isHovered?: boolean }> = ({ isHovered = false }) => {
  // Bar data: x coordinate, top y position, height, center X for trendline node
  const barsData = [
    { id: 1, x: 20, y: 95, height: 35, cx: 32 },
    { id: 2, x: 65, y: 65, height: 65, cx: 77 },
    { id: 3, x: 110, y: 78, height: 52, cx: 122 },
    { id: 4, x: 155, y: 25, height: 105, cx: 167 },
  ];

  return (
    <div className="relative w-full h-48 sm:h-56 flex items-center justify-center overflow-hidden p-4">
      {/* Background ambient radial highlight */}
      <div className="absolute inset-0 bg-radial from-[#faeccb]/35 via-transparent to-transparent pointer-events-none" />

      {/* Glassmorphic Statistics Bar Graphic */}
      <div className="relative z-10 w-48 h-44 flex items-center justify-center">
        <svg className="w-full h-full overflow-visible" viewBox="0 0 200 150">
          <defs>
            {/* Glassmorphic Bar Fill Gradients */}
            <linearGradient id="glassBarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.88" />
              <stop offset="25%" stopColor="#fdfbf7" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#f5e8cd" stopOpacity="0.35" />
            </linearGradient>

            <linearGradient id="glassBarGradHover" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="30%" stopColor="#fef8ea" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#f2e2bf" stopOpacity="0.5" />
            </linearGradient>

            {/* Top Specular Glass Reflection */}
            <linearGradient id="glassSpecular" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.4" />
            </linearGradient>

            {/* Glass Soft Drop Shadow Filter */}
            <filter id="glassShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#b89547" floodOpacity="0.16" />
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.04" />
            </filter>
          </defs>

          {/* 4 Vertical Glassmorphic Statistic Bar Columns */}
          {barsData.map((bar, idx) => (
            <g key={bar.id} filter="url(#glassShadow)">
              {/* Glassmorphic Bar Column extending from baseline */}
              <motion.rect
                x={bar.x}
                width={24}
                rx={7}
                ry={7}
                fill={isHovered ? "url(#glassBarGradHover)" : "url(#glassBarGrad)"}
                stroke="rgba(226, 213, 178, 0.85)"
                strokeWidth="1.2"
                initial={{ y: 130, height: 0 }}
                animate={{
                  y: isHovered ? bar.y - 4 : bar.y,
                  height: isHovered ? bar.height + 4 : bar.height,
                }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
              />

              {/* Specular Top Glass Border Highlight */}
              <motion.path
                d={`M ${bar.x + 3} ${bar.y + 1} H ${bar.x + 21}`}
                stroke="url(#glassSpecular)"
                strokeWidth="1.5"
                strokeLinecap="round"
                animate={{
                  d: `M ${bar.x + 3} ${isHovered ? bar.y - 3 : bar.y + 1} H ${bar.x + 21}`,
                }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
              />

              {/* Inner Glass Pill Badge */}
              <motion.rect
                x={bar.x + 4}
                width={16}
                height={4}
                rx={2}
                fill="#ffffff"
                opacity={0.9}
                animate={{
                  y: isHovered ? bar.y + 2 : bar.y + 6,
                }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
              />
            </g>
          ))}

          {/* Trend Line connecting centers of top of each glass statistic bar */}
          <motion.path
            d="M 32 95 L 77 65 L 122 78 L 167 25"
            fill="none"
            stroke="#c99f42"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0.8 }}
            animate={{
              pathLength: isHovered ? [0, 1] : 1,
            }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
          />

          {/* Node Dots on Trend Line */}
          {barsData.map((bar, idx) => {
            const isLast = idx === barsData.length - 1;
            return (
              <g key={idx}>
                {isLast && (
                  <motion.circle
                    cx={bar.cx}
                    cy={isHovered ? bar.y - 4 : bar.y}
                    r={9}
                    fill="#e5b33a"
                    opacity={0.35}
                    animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0.5, 0.2] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}

                <motion.circle
                  cx={bar.cx}
                  cy={bar.y}
                  r={isLast ? 5 : 3.5}
                  fill={isLast ? "#e5b33a" : "#ba8e34"}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  animate={{
                    cy: isHovered ? bar.y - 4 : bar.y,
                    scale: isHovered ? [1, 1.25, 1] : 1,
                  }}
                  transition={{ duration: 0.4, delay: idx * 0.08 }}
                />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
