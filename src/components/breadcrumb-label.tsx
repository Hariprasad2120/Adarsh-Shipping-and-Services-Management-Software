"use client";

import { useEffect } from "react";
import { setBreadcrumbLabel } from "@/lib/breadcrumb-store";

export function BreadcrumbLabel({ segment, label }: { segment: string; label: string }) {
  useEffect(() => {
    setBreadcrumbLabel(segment, label);
  }, [segment, label]);
  return null;
}
