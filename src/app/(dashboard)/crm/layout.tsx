"use client";

import React from "react";

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="crm-theme flex-1 min-w-0 h-full overflow-hidden bg-background text-on-surface">
      <div className="h-full overflow-y-auto bg-transparent">
        {children}
      </div>
    </div>
  );
}
