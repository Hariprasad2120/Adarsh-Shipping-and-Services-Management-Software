"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { FilterMenu } from "@/components/ui/filter-menu";
import { Input } from "@/components/ui/input";

type CycleOption = {
  id: string;
  name: string;
};

type InProgressDraft = {
  cycleId: string;
  stage: string;
};

function buildUrl(pathname: string, params: URLSearchParams) {
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function inProgressDraftFromSearchParams(sp: ReturnType<typeof useSearchParams>): InProgressDraft {
  return {
    cycleId: sp.get("cycleId") ?? "",
    stage: sp.get("stage") ?? "",
  };
}

function inProgressFilterCount(draft: InProgressDraft) {
  let count = 0;
  if (draft.cycleId) count += 1;
  if (draft.stage) count += 1;
  return count;
}

export function InProgressFilterMenu({
  cycles,
  stageOptions,
}: {
  cycles: CycleOption[];
  stageOptions: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const currentDraft = useMemo(() => inProgressDraftFromSearchParams(sp), [sp]);
  const [draft, setDraft] = useState<InProgressDraft>(currentDraft);

  function applyFilters() {
    const params = new URLSearchParams(sp.toString());
    if (draft.cycleId) params.set("cycleId", draft.cycleId);
    else params.delete("cycleId");

    if (draft.stage) params.set("stage", draft.stage);
    else params.delete("stage");

    startTransition(() => router.push(buildUrl(pathname, params)));
    setOpen(false);
  }

  function clearFilters() {
    const params = new URLSearchParams(sp.toString());
    params.delete("cycleId");
    params.delete("stage");
    setDraft({ cycleId: "", stage: "" });
    startTransition(() => router.push(buildUrl(pathname, params)));
    setOpen(false);
  }

  return (
    <FilterMenu
      activeCount={inProgressFilterCount(currentDraft)}
      ariaLabel="Open in-progress appraisal filters"
      contentClassName="w-[340px]"
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) setDraft(currentDraft);
        setOpen(nextOpen);
      }}
      title="Filter in-progress appraisals"
    >
      <div className="space-y-4">
        <div className="space-y-3">
          <DropdownSelect
            ariaLabel="Cycle"
            onValueChange={(value) => setDraft((current) => ({ ...current, cycleId: value }))}
            options={[
              { value: "", label: "All cycles" },
              ...cycles.map((cycle) => ({ value: cycle.id, label: cycle.name })),
            ]}
            triggerClassName="h-10 py-2 text-sm"
            value={draft.cycleId}
          />
          <DropdownSelect
            ariaLabel="Stage"
            onValueChange={(value) => setDraft((current) => ({ ...current, stage: value }))}
            options={[
              { value: "", label: "All stages" },
              ...stageOptions.map((stage) => ({ value: stage, label: stage.replace(/_/g, " ") })),
            ]}
            triggerClassName="h-10 py-2 text-sm"
            value={draft.stage}
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
            onClick={applyFilters}
            className="rounded-xl bg-[#00cec4] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#00b5ad]"
          >
            Apply filters
          </button>
        </div>
      </div>
    </FilterMenu>
  );
}

export function EligibleAppraisalFilterMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const currentMonth = sp.get("dueMonth") ?? "";
  const [draftMonth, setDraftMonth] = useState(currentMonth);

  function applyFilters() {
    const params = new URLSearchParams(sp.toString());
    if (draftMonth) params.set("dueMonth", draftMonth);
    else params.delete("dueMonth");
    startTransition(() => router.push(buildUrl(pathname, params)));
    setOpen(false);
  }

  function clearFilters() {
    const params = new URLSearchParams(sp.toString());
    params.delete("dueMonth");
    setDraftMonth("");
    startTransition(() => router.push(buildUrl(pathname, params)));
    setOpen(false);
  }

  return (
    <div className="flex items-center gap-3">
      <FilterMenu
        activeCount={currentMonth ? 1 : 0}
        ariaLabel="Open eligible appraisal filters"
        contentClassName="w-[320px]"
        open={open}
        onOpenChange={(nextOpen) => {
          if (nextOpen) setDraftMonth(currentMonth);
          setOpen(nextOpen);
        }}
        title="Filter eligible employees"
      >
        <div className="space-y-4">
          <Input
            type="month"
            value={draftMonth}
            onChange={(event) => setDraftMonth(event.target.value)}
            className="h-10 py-2 text-sm"
          />
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
              onClick={applyFilters}
              className="rounded-xl bg-[#00cec4] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#00b5ad]"
            >
              Apply filters
            </button>
          </div>
        </div>
      </FilterMenu>

      {currentMonth ? (
        <Link
          href={`/ams/appraisals${
            sp.get("cycleId") || sp.get("stage")
              ? `?${new URLSearchParams({
                  ...(sp.get("cycleId") ? { cycleId: sp.get("cycleId")! } : {}),
                  ...(sp.get("stage") ? { stage: sp.get("stage")! } : {}),
                }).toString()}`
              : ""
          }`}
          className="rounded-lg border border-outline-variant/40 px-3 py-1.5 text-sm text-on-surface-variant transition hover:border-[#00cec4]/45 hover:text-on-surface"
        >
          Clear Filter
        </Link>
      ) : null}
    </div>
  );
}
