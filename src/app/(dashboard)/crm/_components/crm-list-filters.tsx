"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { FilterMenu } from "@/components/ui/filter-menu";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { Input } from "@/components/ui/input";

type FilterOption = {
  label: string;
  paramKey: string;
  placeholder: string;
  options: Array<{ label: string; value: string }>;
};

type Draft = {
  search: string;
  filters: Record<string, string>;
};

function buildUrl(pathname: string, params: URLSearchParams) {
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function currentDraft(
  sp: ReturnType<typeof useSearchParams>,
  filterOptions: FilterOption[],
): Draft {
  const filters: Record<string, string> = {};

  for (const option of filterOptions) {
    filters[option.paramKey] = sp.get(option.paramKey) ?? "";
  }

  return {
    search: sp.get("search") ?? "",
    filters,
  };
}

function activeFilterCount(draft: Draft) {
  let count = draft.search.trim() ? 1 : 0;

  for (const value of Object.values(draft.filters)) {
    if (value) count += 1;
  }

  return count;
}

export function CrmListFilters({
  filterOptions = [],
  resultCount,
  searchPlaceholder,
  singularLabel,
}: {
  filterOptions?: FilterOption[];
  resultCount: number;
  searchPlaceholder: string;
  singularLabel: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const current = useMemo(() => currentDraft(sp, filterOptions), [sp, filterOptions]);
  const [draft, setDraft] = useState<Draft>(current);

  const count = activeFilterCount(current);

  function updateSearch(search: string) {
    setDraft((existing) => ({
      ...existing,
      search,
    }));
  }

  function updateFilter(paramKey: string, value: string) {
    setDraft((existing) => ({
      ...existing,
      filters: {
        ...existing.filters,
        [paramKey]: value,
      },
    }));
  }

  function applyFilters(nextDraft: Draft = draft) {
    const params = new URLSearchParams(sp.toString());

    if (nextDraft.search.trim()) {
      params.set("search", nextDraft.search.trim());
    } else {
      params.delete("search");
    }

    for (const option of filterOptions) {
      const value = nextDraft.filters[option.paramKey];
      if (value) {
        params.set(option.paramKey, value);
      } else {
        params.delete(option.paramKey);
      }
    }

    startTransition(() => {
      router.push(buildUrl(pathname, params));
    });

    setOpen(false);
  }

  function clearFilters() {
    const nextDraft: Draft = {
      search: "",
      filters: Object.fromEntries(filterOptions.map((option) => [option.paramKey, ""])),
    };

    setDraft(nextDraft);
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
            onChange={(event) => updateSearch(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-10 pl-9 pr-4 text-sm"
          />
        </form>

        {filterOptions.length > 0 ? (
          <div className="flex items-center gap-2">
            <FilterMenu
              activeCount={count}
              ariaLabel="Open CRM filters"
              contentClassName="w-[320px]"
              open={open}
              onOpenChange={(nextOpen) => {
                if (nextOpen) {
                  setDraft(current);
                }

                setOpen(nextOpen);
              }}
              title="Filter items"
            >
              <div className="space-y-4">
                {filterOptions.map((option) => (
                  <div className="space-y-1" key={option.paramKey}>
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-on-surface-variant">
                      {option.label}
                    </p>
                    <DropdownSelect
                      ariaLabel={option.label}
                      onValueChange={(value) => updateFilter(option.paramKey, value)}
                      options={option.options.map((item) => ({
                        value: item.value,
                        label: item.label,
                      }))}
                      placeholder={option.placeholder}
                      triggerClassName="h-10 py-2 text-sm"
                      value={draft.filters[option.paramKey] ?? ""}
                    />
                  </div>
                ))}

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

            {count > 0 ? (
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm font-medium text-on-surface-variant transition hover:text-on-surface"
              >
                Reset
              </button>
            ) : null}
          </div>
        ) : count > 0 ? (
          <button
            type="button"
            onClick={clearFilters}
            className="text-sm font-medium text-on-surface-variant transition hover:text-on-surface"
          >
            Reset
          </button>
        ) : null}
      </div>

      <div className="text-sm font-medium text-on-surface-variant">
        Showing {resultCount} {resultCount === 1 ? singularLabel : `${singularLabel}s`}
      </div>
    </div>
  );
}
