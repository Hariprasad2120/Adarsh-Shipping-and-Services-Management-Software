"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Settings2, Plus } from "lucide-react";
import {
  OperationalDataTableHeader,
  OperationalVisibleRecords,
} from "@/components/data-display/operational-data-table";
import {
  CategorizedFilterMenuPanel,
  FilterActiveLinks,
  type FilterMenuPanelSection,
} from "@/components/forms/filter-menu";
import { Input } from "@/components/ui/input";
import { ChaFilterMenu as FilterMenu } from "@/components/monolith";
import { CrmActionLink } from "@/modules/crm/components/workspace/crm-workspace";

export type EnquiryTypeFilter = "all" | "perishable" | "future_follow";

function buildEnquiriesHref({
  search,
  type,
}: {
  search?: string;
  type: EnquiryTypeFilter;
}) {
  const params = new URLSearchParams();
  if (search?.trim()) {
    params.set("search", search.trim());
  }
  if (type !== "all") {
    params.set("type", type);
  }
  const query = params.toString();
  return query ? `/crm/enquiries?${query}` : "/crm/enquiries";
}

export function EnquiryRegisterToolbar({
  displayedCount,
  search,
  totalCount,
  type,
  typeCounts,
}: {
  displayedCount: number;
  search: string;
  totalCount: number;
  type: EnquiryTypeFilter;
  typeCounts: Record<EnquiryTypeFilter, number>;
}) {
  const router = useRouter();
  const [searchDraft, setSearchDraft] = useState(search);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeCategoryKey, setActiveCategoryKey] = useState("type");

  const activeFilterCount = [Boolean(search), type !== "all"].filter(Boolean).length;

  const pushFilters = ({
    nextSearch = searchDraft,
    nextType = type,
  }: {
    nextSearch?: string;
    nextType?: EnquiryTypeFilter;
  }) => {
    router.push(
      buildEnquiriesHref({
        search: nextSearch,
        type: nextType,
      }),
    );
  };

  const sections: FilterMenuPanelSection[] = [
    {
      key: "type",
      label: "Enquiry Type",
      value:
        type === "perishable"
          ? "Perishable"
          : type === "future_follow"
            ? "Future Follow Up"
            : "All",
      active: type !== "all",
      options: [
        {
          key: "type-all",
          label: "All Enquiries",
          note: `${typeCounts.all} records`,
          selected: type === "all",
          onSelect: () => {
            setMenuOpen(false);
            pushFilters({ nextType: "all" });
          },
        },
        {
          key: "type-perishable",
          label: "Perishable",
          note: `${typeCounts.perishable} records`,
          selected: type === "perishable",
          onSelect: () => {
            setMenuOpen(false);
            pushFilters({
              nextType: type === "perishable" ? "all" : "perishable",
            });
          },
        },
        {
          key: "type-future-follow",
          label: "Future Follow Up",
          note: `${typeCounts.future_follow} records`,
          selected: type === "future_follow",
          onSelect: () => {
            setMenuOpen(false);
            pushFilters({
              nextType: type === "future_follow" ? "all" : "future_follow",
            });
          },
        },
      ],
    },
  ];

  const activeLinks = [
    search
      ? {
          key: "search",
          label: `Search: ${search} x`,
          href: buildEnquiriesHref({ search: "", type }),
        }
      : null,
    type !== "all"
      ? {
          key: "type",
          label: `Type: ${type === "perishable" ? "Perishable" : "Future Follow Up"} x`,
          href: buildEnquiriesHref({ search, type: "all" }),
        }
      : null,
  ].filter(Boolean) as { href: string; key: string; label: string }[];

  return (
    <>
      <OperationalDataTableHeader
        hideIdentity
        actions={
          <>
            <form
              method="GET"
              className="contents"
              onSubmit={(event) => {
                event.preventDefault();
                pushFilters({ nextSearch: searchDraft });
              }}
            >
              <label className="mnx-search-field">
                <Search aria-hidden="true" />
                <Input
                  aria-label="Search enquiries"
                  type="search"
                  name="search"
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  placeholder="Search enquiries by name, ref, company..."
                />
              </label>
              <FilterMenu
                open={menuOpen}
                onOpenChange={setMenuOpen}
                activeCount={activeFilterCount}
                ariaLabel="Open enquiry filters"
                contentClassName="w-[min(320px,calc(100vw-1rem))]"
              >
                <CategorizedFilterMenuPanel
                  activeCategoryKey={activeCategoryKey}
                  onActiveCategoryChange={setActiveCategoryKey}
                  sections={sections}
                  title="Filters"
                />
              </FilterMenu>
            </form>
            <CrmActionLink href="/crm/lead-sources">
              <Settings2 className="size-4" />
              <span>Lead Sources</span>
            </CrmActionLink>
            <CrmActionLink href="/crm/enquiries/new" primary>
              <Plus className="size-4" />
              <span>New Enquiry</span>
            </CrmActionLink>
            <OperationalVisibleRecords visible={displayedCount} total={totalCount} />
          </>
        }
      />
      {activeLinks.length > 0 ? (
        <div className="border-b border-[var(--mnx-border)] px-4 py-3">
          <FilterActiveLinks links={activeLinks} clearHref="/crm/enquiries" />
        </div>
      ) : null}
    </>
  );
}
