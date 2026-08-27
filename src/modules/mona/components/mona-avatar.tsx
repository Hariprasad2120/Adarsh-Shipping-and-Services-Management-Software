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
  const tileInset = size * 0.12;
  const frontBubbleWidth = size * 0.36;
  const frontBubbleHeight = size * 0.42;
  const backBubbleWidth = size * 0.38;
  const backBubbleHeight = size * 0.44;
  const badgeSize = Math.max(size * 0.2, 8);
  const dotSize = Math.max(size * 0.07, 2.2);

  return (
    <div
      className="relative flex items-center justify-center"
      data-mona-avatar=""
      style={{ width: size, height: size }}
    >
      {showRing && (
        <motion.div
          className="absolute inset-0 rounded-[30%]"
          style={{
            background:
              "radial-gradient(circle at 50% 55%, color-mix(in srgb, var(--mnx-success) 18%, transparent), transparent 68%)",
            opacity: 0.82,
            filter: `blur(${Math.max(size * 0.08, 4)}px)`,
          }}
          animate={
            isActive ? { scale: [1, 1.04, 1], opacity: [0.68, 0.9, 0.68] } : { opacity: [0.62, 0.78, 0.62] }
          }
          transition={
            isActive
              ? {
                  scale: { duration: 1.7, repeat: Infinity, ease: "easeInOut" },
                  opacity: { duration: 1.7, repeat: Infinity, ease: "easeInOut" },
                }
              : { opacity: { duration: 3.6, repeat: Infinity, ease: "easeInOut" } }
          }
        />
      )}

      <motion.div
        className="absolute"
        style={{
          inset: tileInset,
          borderRadius: size * 0.18,
          background: `
            radial-gradient(circle at 18% 16%, color-mix(in srgb, white 96%, transparent), transparent 16%),
            radial-gradient(circle at 82% 18%, color-mix(in srgb, white 84%, transparent), transparent 18%),
            linear-gradient(180deg, color-mix(in srgb, white 86%, var(--mnx-surface)) 0%, color-mix(in srgb, var(--mnx-success) 8%, var(--mnx-surface-soft)) 100%)
          `,
          border: "1px solid color-mix(in srgb, var(--mnx-success) 12%, var(--mnx-border))",
          boxShadow: `
            inset 0 1px 0 color-mix(in srgb, white 78%, transparent),
            0 ${size * 0.08}px ${size * 0.18}px color-mix(in srgb, var(--mnx-success) 8%, transparent)
          `,
        }}
        animate={isActive ? { scale: [1, 0.985, 1] } : undefined}
        transition={
          isActive ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : {}
        }
      />

      <motion.div
        className="absolute"
        style={{
          width: backBubbleWidth,
          height: backBubbleHeight,
          left: size * 0.34,
          top: size * 0.27,
          background:
            "linear-gradient(180deg, color-mix(in srgb, white 58%, var(--mnx-surface)) 0%, color-mix(in srgb, var(--mnx-success) 12%, var(--mnx-surface-soft)) 100%)",
          border: "1px solid color-mix(in srgb, var(--mnx-success) 14%, var(--mnx-border))",
          boxShadow: "inset 0 1px 0 color-mix(in srgb, white 52%, transparent)",
          opacity: 0.7,
          borderRadius: `${size * 0.2}px`,
        }}
      />

      <motion.div
        className="absolute"
        style={{
          width: size * 0.58,
          height: size * 0.18,
          left: size * 0.18,
          top: size * 0.5,
          borderRadius: "999px",
          border: "1px solid color-mix(in srgb, var(--mnx-success) 34%, transparent)",
          transform: "rotate(-16deg)",
          opacity: 0.9,
        }}
        animate={isActive ? { rotate: [-16, -12, -16] } : undefined}
        transition={isActive ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" } : undefined}
      >
        <span
          className="absolute rounded-full"
          style={{
            width: Math.max(size * 0.1, 5),
            height: Math.max(size * 0.1, 5),
            left: -size * 0.015,
            bottom: -size * 0.025,
            background:
              "radial-gradient(circle at 35% 35%, color-mix(in srgb, white 88%, transparent), color-mix(in srgb, var(--mnx-success) 72%, transparent) 54%, var(--mnx-success) 100%)",
            boxShadow: `0 0 ${Math.max(size * 0.08, 5)}px color-mix(in srgb, var(--mnx-success) 20%, transparent)`,
          }}
        />
      </motion.div>

      <motion.div
        className="absolute"
        style={{
          width: frontBubbleWidth,
          height: frontBubbleHeight,
          left: size * 0.41,
          top: size * 0.35,
          borderRadius: size * 0.2,
          background: `
            radial-gradient(circle at 34% 20%, color-mix(in srgb, white 82%, transparent), transparent 18%),
            linear-gradient(180deg, color-mix(in srgb, white 16%, var(--mnx-success)) 0%, color-mix(in srgb, var(--mnx-success) 88%, transparent) 42%, color-mix(in srgb, var(--mnx-success-text, var(--mnx-accent-text)) 76%, transparent) 100%)
          `,
          border: "1px solid color-mix(in srgb, var(--mnx-success) 20%, var(--mnx-border))",
          boxShadow: `
            inset 0 1px 0 color-mix(in srgb, white 42%, transparent),
            0 ${size * 0.05}px ${size * 0.12}px color-mix(in srgb, var(--mnx-success) 12%, transparent)
          `,
          overflow: "hidden",
        }}
        animate={isActive ? { y: [0, -size * 0.012, 0] } : undefined}
        transition={isActive ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" } : undefined}
      >
        <span
          className="absolute inset-x-[8%] top-[44%] h-[46%] rounded-[45%] opacity-88"
          style={{
            background:
              "linear-gradient(145deg, color-mix(in srgb, var(--mnx-success-text, var(--mnx-accent-text)) 72%, transparent), color-mix(in srgb, var(--mnx-success) 74%, transparent))",
          }}
        />
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            className="absolute rounded-full"
            style={{
              width: dotSize,
              height: dotSize,
              top: "47%",
              left: `${31 + dot * 19}%`,
              background: "color-mix(in srgb, white 90%, var(--mnx-surface))",
              boxShadow: "0 0 0 1px color-mix(in srgb, white 24%, transparent)",
              transform: "translate(-50%, -50%)",
            }}
          />
        ))}
      </motion.div>

      <div
        className="absolute rounded-full"
        style={{
          width: badgeSize,
          height: badgeSize,
          right: size * 0.075,
          bottom: size * 0.075,
          display: "grid",
          placeItems: "center",
          background:
            "linear-gradient(180deg, color-mix(in srgb, white 88%, var(--mnx-surface)) 0%, color-mix(in srgb, var(--mnx-surface) 96%, var(--mnx-surface-soft)) 100%)",
          border: "1px solid color-mix(in srgb, var(--mnx-success) 14%, var(--mnx-border))",
          boxShadow: "0 4px 10px color-mix(in srgb, var(--mnx-success) 10%, transparent)",
        }}
      >
        <span
          style={{
            width: badgeSize * 0.36,
            height: badgeSize * 0.36,
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--mnx-success) 90%, white), color-mix(in srgb, var(--mnx-success-text, var(--mnx-accent-text)) 84%, white))",
            clipPath: "path('M 50 0 C 56 24 76 44 100 50 C 76 56 56 76 50 100 C 44 76 24 56 0 50 C 24 44 44 24 50 0 Z')",
            display: "block",
          }}
        />
      </div>

      {isActive && (
        <>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: 3,
                height: 3,
                background: "color-mix(in srgb, white 72%, var(--mnx-success))",
              }}
              animate={{
                x: [0, Math.cos((i * 120 * Math.PI) / 180) * size * 0.48],
                y: [0, Math.sin((i * 120 * Math.PI) / 180) * size * 0.42],
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
      className="flex shrink-0 items-center justify-center"
      style={{
        width: 28,
        height: 28,
      }}
    >
      <MonaAvatar size={28} showRing={false} />
    </div>
  );
}
