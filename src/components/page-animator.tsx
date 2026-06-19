"use client";

import { usePathname } from "next/navigation";

// CSS-only page transition — replaces the framer-motion import that was forcing
// the full framer-motion runtime into every page's JS bundle. The same visual
// effect (opacity + translateX) runs via a Tailwind animation at zero JS cost.
export function PageAnimator({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div
      key={pathname}
      className="flex w-full flex-1 flex-col overflow-x-clip contain-[layout_paint] will-change-transform animate-page-enter"
    >
      {children}
    </div>
  );
}
