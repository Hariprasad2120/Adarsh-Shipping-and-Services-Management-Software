import Link from "next/link";
import { ChevronRight } from "lucide-react";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex max-w-full flex-wrap items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-on-surface-variant"
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <span key={`${item.label}-${index}`} className="inline-flex min-w-0 items-center gap-1.5">
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="truncate text-on-surface-variant transition hover:text-[#008b85]"
              >
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? "truncate text-on-surface" : "truncate text-on-surface-variant"}>
                {item.label}
              </span>
            )}
            {!isLast ? <ChevronRight className="size-3 shrink-0 text-outline-variant" /> : null}
          </span>
        );
      })}
    </nav>
  );
}
