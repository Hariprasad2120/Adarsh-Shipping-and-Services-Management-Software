import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getPathLabel, segmentToLabel } from "@/lib/route-labels";

type MonolithBreadcrumbItem = {
  href: string;
  label: string;
};

function buildBreadcrumbItems(pathname: string): MonolithBreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean);
  const items: MonolithBreadcrumbItem[] = [{ href: "/dashboard", label: "Home" }];

  if (segments.length === 0 || pathname === "/dashboard") {
    return [...items, { href: "/dashboard", label: "Dashboard" }];
  }

  let currentPath = "";
  for (const segment of segments) {
    currentPath += `/${segment}`;
    const label = getPathLabel(currentPath) ?? segmentToLabel(segment);

    if (currentPath === "/dashboard") continue;
    items.push({ href: currentPath, label });
  }

  return items;
}

export function MonolithBreadcrumb({ pathname }: { pathname: string }) {
  const items = buildBreadcrumbItems(pathname);

  return (
    <nav className="mnx-breadcrumb" aria-label="Breadcrumb">
      <ol>
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;

          return (
            <li key={`${item.href}-${index}`}>
              {index > 0 ? (
                <ChevronRight
                  className="mnx-breadcrumb-separator"
                  size={13}
                  aria-hidden="true"
                />
              ) : null}
              {isCurrent ? (
                <span aria-current="page">{item.label}</span>
              ) : (
                <Link href={item.href}>{item.label}</Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
