"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { getBreadcrumbLabels, subscribeBreadcrumb } from "@/lib/breadcrumb-store";
import { getPathLabel, segmentToLabel } from "@/lib/route-labels";
import { Breadcrumbs } from "./breadcrumbs";

const TOP_LEVEL_ONLY = new Set(["/dashboard", "/todo", "/notifications"]);

export function AutoBreadcrumb() {
  const pathname = usePathname();
  const dynamicLabels = useSyncExternalStore(
    subscribeBreadcrumb,
    getBreadcrumbLabels,
    getBreadcrumbLabels,
  );

  if (TOP_LEVEL_ONLY.has(pathname)) return null;

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  const items = segments.map((seg, i) => {
    const path = "/" + segments.slice(0, i + 1).join("/");
    const label = dynamicLabels[seg] ?? getPathLabel(path) ?? segmentToLabel(seg);
    const isLast = i === segments.length - 1;
    return { label, href: isLast ? undefined : path };
  });

  return (
    <div className="w-full shrink-0 px-6 py-1.5 lg:px-8 xl:px-10">
      <Breadcrumbs items={items} />
    </div>
  );
}
