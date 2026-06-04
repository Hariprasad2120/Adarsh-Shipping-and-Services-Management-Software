"use client";

import { usePathname } from "next/navigation";
import { motion, type Variants } from "framer-motion";

export function PageAnimator({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const variants: Variants = {
    initial: {
      opacity: 0,
      x: 10,
    },
    enter: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.16,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  return (
    <motion.div
      key={pathname}
      variants={variants}
      initial="initial"
      animate="enter"
      className="flex w-full flex-1 flex-col overflow-x-hidden [contain:layout_paint] will-change-transform"
    >
      {children}
    </motion.div>
  );
}
