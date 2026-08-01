"use client";

import { useEffect, useState, useTransition } from "react";
import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { WorkspaceInput } from "@/components/layout/workspace";

type ChaDashboardSearchActionProps = {
  value: string;
};

export function ChaDashboardSearchAction({ value }: ChaDashboardSearchActionProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(value);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const nextParams = new URLSearchParams(searchParams.toString());
      const nextQuery = query.trim();
      const currentQuery = searchParams.get("assignedSearch")?.trim() ?? "";

      if (nextQuery === currentQuery) {
        return;
      }

      if (nextQuery) {
        nextParams.set("assignedSearch", nextQuery);
      } else {
        nextParams.delete("assignedSearch");
      }

      const nextUrl = nextParams.toString() ? `${pathname}?${nextParams}` : pathname;

      startTransition(() => {
        router.replace(nextUrl, { scroll: false });
      });
    }, 120);

    return () => window.clearTimeout(timeout);
  }, [pathname, query, router, searchParams]);

  return (
    <div className="mnx-cha-actions-search" role="search">
      <Search aria-hidden="true" />
      <WorkspaceInput
        aria-label="Search assigned jobs"
        name="assignedSearch"
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search customers, job numbers..."
        type="search"
        value={query}
      />
    </div>
  );
}
