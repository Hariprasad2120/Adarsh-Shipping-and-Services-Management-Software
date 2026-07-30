"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChaFilterMenu } from "@/components/monolith/cha-workspace";
import { WorkspaceAction } from "@/components/monolith/workspace";
import { MonolithSpecLabel } from "@/components/monolith/foundation";
import { formatChaBadgeLabel } from "@/lib/cha-badges";

type FilterGroup = {
  label: string;
  param: "category" | "jobType" | "stage";
  options: Array<{ label: string; value: string }>;
};

type ChaDashboardFilterActionProps = {
  jobTypes: string[];
  selectedCategories: string[];
  selectedJobTypes: string[];
  selectedStages: string[];
  stages: string[];
};

export function ChaDashboardFilterAction({
  jobTypes,
  selectedCategories,
  selectedJobTypes,
  selectedStages,
  stages,
}: ChaDashboardFilterActionProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Record<FilterGroup["param"], string[]>>({
    category: selectedCategories,
    jobType: selectedJobTypes,
    stage: selectedStages,
  });
  const filterGroups: FilterGroup[] = [
    {
      label: "Categories",
      param: "category",
      options: [
        { label: "High priority", value: "high-priority" },
        { label: "Pending filing", value: "pending-filing" },
      ],
    },
    {
      label: "Job type",
      param: "jobType",
      options: (jobTypes.length > 0 ? jobTypes.slice(0, 6) : ["Import clearance", "Export clearance"])
        .map((jobType) => ({ label: jobType, value: jobType })),
    },
    {
      label: "Current stages",
      param: "stage",
      options: stages.map((stage) => ({ label: formatChaBadgeLabel(stage), value: stage })),
    },
  ];
  const activeCount = selected.category.length + selected.jobType.length + selected.stage.length;

  function toggleFilter(param: FilterGroup["param"], option: string) {
    setSelected((current) =>
      current[param].includes(option)
        ? { ...current, [param]: current[param].filter((item) => item !== option) }
        : { ...current, [param]: [...current[param], option] },
    );
  }

  function applyFilters(nextSelected = selected) {
    const nextParams = new URLSearchParams(searchParams.toString());

    (["category", "jobType", "stage"] as const).forEach((param) => {
      nextParams.delete(param);
      nextSelected[param].forEach((value) => nextParams.append(param, value));
    });

    const query = nextParams.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
    setOpen(false);
  }

  function clearFilters() {
    const nextSelected = { category: [], jobType: [], stage: [] };
    setSelected(nextSelected);
    applyFilters(nextSelected);
  }

  return (
    <ChaFilterMenu
      activeCount={activeCount}
      ariaLabel="Open assigned job filters"
      contentClassName="mnx-cha-dashboard-filter-menu w-[360px]"
      onOpenChange={setOpen}
      open={open}
    >
      <div className="mnx-cha-dashboard-filter-content">
        <div>
          <MonolithSpecLabel as="p">Assigned jobs</MonolithSpecLabel>
          <p>Filter the jobs shown in this dashboard register.</p>
        </div>
        <div className="mnx-cha-dashboard-filter-groups">
          {filterGroups.map((group, index) => (
            <details
              key={group.label}
              className="mnx-cha-dashboard-filter-group"
              open={index === 0 || selected[group.param].length > 0}
            >
              <summary>
                <MonolithSpecLabel as="span">{group.label}</MonolithSpecLabel>
                <i aria-label={`${selected[group.param].length} selected`}>
                  {selected[group.param].length}
                </i>
              </summary>
              <div className="mnx-cha-dashboard-filter-options">
                {group.options.map((option) => {
                  const active = selected[group.param].includes(option.value);

                  return (
                    <WorkspaceAction
                      key={option.value}
                      type="button"
                      size="compact"
                      variant="secondary"
                      className={`mnx-plain mnx-menu-option ${active ? "mnx-menu-option-active" : ""}`}
                      onClick={() => toggleFilter(group.param, option.value)}
                    >
                      <span>{option.label}</span>
                      {active ? <Check aria-hidden="true" /> : null}
                    </WorkspaceAction>
                  );
                })}
              </div>
            </details>
          ))}
        </div>
        <div className="mnx-cha-dashboard-filter-actions">
          <WorkspaceAction
            size="compact"
            type="button"
            variant="outline"
            onClick={clearFilters}
          >
            Clear
          </WorkspaceAction>
          <WorkspaceAction size="compact" type="button" onClick={() => applyFilters()}>
            Apply
          </WorkspaceAction>
        </div>
      </div>
    </ChaFilterMenu>
  );
}
