"use client";

import { motion } from "framer-motion";

/**
 * Mona's animated avatar uses the active theme's accent and surface tokens.
 */
export function MonaAvatar({
  size = 40,
  isActive = false,
  showRing = true,
}: {
  size?: number;
  isActive?: boolean;
  showRing?: boolean;
}) {
  const innerSize = size * 0.7;
  const fontSize = size * 0.3;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Glow ring — conic gradient using brand accent */}
      {showRing && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, var(--mnx-accent), var(--mnx-accent-soft), var(--mnx-accent-text), var(--mnx-accent))",
            opacity: 0.6,
          }}
          animate={
            isActive ? { rotate: 360, scale: [1, 1.08, 1] } : { rotate: 360 }
          }
          transition={
            isActive
              ? {
                  rotate: { duration: 3, repeat: Infinity, ease: "linear" },
                  scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
                }
              : { rotate: { duration: 8, repeat: Infinity, ease: "linear" } }
          }
        />
      )}

      {/* Inner circle — uses surface-container for dark/light compat */}
      <motion.div
        className="absolute flex items-center justify-center rounded-full bg-mono-soft"
        style={{
          width: innerSize,
          height: innerSize,
          boxShadow: isActive
            ? "var(--mn-shadow-accent)"
            : "var(--mn-shadow-accent-soft)",
        }}
        animate={isActive ? { scale: [1, 0.95, 1] } : {}}
        transition={
          isActive ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : {}
        }
      >
        {/* "M" letter — gradient accent */}
        <span
          className="font-bold select-none"
          style={{
            fontSize,
            background: "var(--mn-gradient-accent)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontFamily: "var(--mn-font-sans)",
            letterSpacing: "0.05em",
          }}
        >
          M
        </span>
      </motion.div>

      {/* Active sparkles — accent dots */}
      {isActive && (
        <>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: 3,
                height: 3,
                background: "var(--mnx-accent)",
              }}
              animate={{
                x: [0, Math.cos((i * 120 * Math.PI) / 180) * size * 0.6],
                y: [0, Math.sin((i * 120 * Math.PI) / 180) * size * 0.6],
                opacity: [1, 0],
                scale: [1, 0],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.4,
                ease: "easeOut",
              }}
            />
          ))}
        </>
      )}
    </div>
  );
}

/**
 * Small inline avatar for message bubbles.
 * Uses semantic surface tokens for dark/light compat.
 */
export function MonaAvatarSmall() {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-mono-soft border border-mono-border"
      style={{
        width: 28,
        height: 28,
        boxShadow: "var(--mn-shadow-accent-soft)",
      }}
    >
      <span
        className="font-bold select-none"
        style={{
          fontSize: 10,
          background: "var(--mn-gradient-accent)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          fontFamily: "var(--mn-font-sans)",
        }}
      >
        M
      </span>
    </div>
  );
}
