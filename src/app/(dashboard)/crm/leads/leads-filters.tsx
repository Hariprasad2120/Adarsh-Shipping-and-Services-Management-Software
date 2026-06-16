"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { FilterMenu } from "@/components/ui/filter-menu";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { Input } from "@/components/ui/input";

type LeadsFilterDraft = {
  search: string;
  status: string;
};

function buildUrl(pathname: string, params: URLSearchParams) {
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function currentFilterDraft(sp: ReturnType<typeof useSearchParams>): LeadsFilterDraft {
  return {
    search: sp.get("search") ?? "",
    status: sp.get("status") ?? "",
  };
}

function filterCount(draft: LeadsFilterDraft) {
  let count = 0;

  if (draft.search.trim()) count += 1;
  if (draft.status) count += 1;

  return count;
}

export function LeadsFilters({
  leadStatuses,
  resultCount,
}: {
  leadStatuses: string[];
  resultCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const currentDraft = useMemo(() => currentFilterDraft(sp), [sp]);
  const [draft, setDraft] = useState<LeadsFilterDraft>(currentDraft);

  const activeCount = filterCount(currentDraft);

  function updateDraft<K extends keyof LeadsFilterDraft>(key: K, value: LeadsFilterDraft[K]) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function applyFilters(nextDraft: LeadsFilterDraft = draft) {
    const params = new URLSearchParams(sp.toString());

    if (nextDraft.search.trim()) {
      params.set("search", nextDraft.search.trim());
    } else {
      params.delete("search");
    }

    if (nextDraft.status) {
      params.set("status", nextDraft.status);
    } else {
      params.delete("status");
    }

    startTransition(() => {
      router.push(buildUrl(pathname, params));
    });

    setOpen(false);
  }

  function clearFilters() {
    const resetDraft = {
      search: "",
      status: "",
    };

    setDraft(resetDraft);
    startTransition(() => {
      router.push(pathname);
    });
    setOpen(false);
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-outline-variant/40 bg-surface p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        <form
          className="relative w-full max-w-md"
          onSubmit={(event) => {
            event.preventDefault();
            applyFilters();
          }}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
          <Input
            value={draft.search}
            onChange={(event) => updateDraft("search", event.target.value)}
            placeholder="Search leads by name, email, company..."
            className="h-10 pl-9 pr-4 text-sm"
          />
        </form>

        <div className="flex items-center gap-2">
          <FilterMenu
            activeCount={activeCount}
            ariaLabel="Open lead filters"
            contentClassName="w-[320px]"
            open={open}
            onOpenChange={(nextOpen) => {
              if (nextOpen) {
                setDraft(currentDraft);
              }

              setOpen(nextOpen);
            }}
            title="Filter leads"
          >
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-on-surface-variant">
                  Lead status
                </p>
                <DropdownSelect
                  ariaLabel="Lead status"
                  onValueChange={(value) => updateDraft("status", value)}
                  options={[
                    { value: "", label: "All statuses" },
                    ...leadStatuses.map((leadStatus) => ({
                      value: leadStatus,
                      label: leadStatus.replaceAll("_", " "),
                    })),
                  ]}
                  placeholder="All statuses"
                  triggerClassName="h-10 py-2 text-sm"
                  value={draft.status}
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-xl border border-outline-variant/40 px-3 py-2 text-sm text-on-surface-variant transition hover:border-[#00cec4]/45 hover:text-on-surface"
                >
                  Clear
                </button>

                <button
                  type="button"
                  onClick={() => applyFilters()}
                  className="rounded-xl bg-[#00cec4] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#00b5ad]"
                >
                  Apply filters
                </button>
              </div>
            </div>
          </FilterMenu>

          {activeCount > 0 ? (
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm font-medium text-on-surface-variant transition hover:text-on-surface"
            >
              Reset
            </button>
          ) : null}
        </div>
      </div>

      <div className="text-sm font-medium text-on-surface-variant">
        Showing {resultCount} {resultCount === 1 ? "lead" : "leads"}
      </div>
    </div>
  );
}
