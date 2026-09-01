"use client";

import { motion } from "motion/react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@/lib/utils";

type SwitchProps = Omit<ComponentPropsWithoutRef<"button">, "children" | "onClick" | "value"> & {
  value: boolean;
  onToggle: () => void;
  iconOn: ReactNode;
  iconOff: ReactNode;
  className?: string;
};

export function Switch({
  value,
  onToggle,
  iconOn,
  iconOff,
  className = "",
  type = "button",
  ...props
}: SwitchProps) {
  return (
    <button
      type={type}
      className={cn(
        "bg-card-foreground/15 flex w-12 cursor-pointer rounded-full p-0.5",
        value ? "justify-end" : "justify-start",
        className,
      )}
      onClick={onToggle}
      aria-pressed={value}
      {...props}
    >
      <motion.div
        className="flex size-6 items-center justify-center rounded-full bg-background"
        layout
        transition={{
          type: "spring",
          duration: 0.6,
          bounce: 0.2,
        }}
      >
        {value ? (
          <motion.div
            key="on"
            initial={{ opacity: 0, rotate: -60 }}
            animate={{ opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, rotate: 60 }}
            transition={{ duration: 0.3 }}
            className="flex size-5 items-center justify-center"
          >
            {iconOn}
          </motion.div>
        ) : (
          <motion.div
            key="off"
            initial={{ opacity: 0, rotate: 60 }}
            animate={{ opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, rotate: -60 }}
            transition={{ duration: 0.3 }}
            className="flex size-5 items-center justify-center"
          >
            {iconOff}
          </motion.div>
        )}
      </motion.div>
    </button>
  );
}
