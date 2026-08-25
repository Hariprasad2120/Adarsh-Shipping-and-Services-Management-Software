"use client";

import Link from "next/link";
import { useState } from "react";
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
import { ChaFilterMenu as FilterMenu } from "@/modules/cha/components/workspace/cha-workspace";
import { CrmActionLink } from "@/modules/crm/components/workspace/crm-workspace";
import { Plus, Search, Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";

type LeadTabKey = "unopened" | "not_interested" | "unreachable";

function formatStatusLabel(value: string) {
  return value.replaceAll("_", " ");
}

function buildLeadsHref({
  search,
  status,
  tab,
}: {
  search?: string;
  status?: string;
  tab: LeadTabKey;
}) {
  const params = new URLSearchParams();
  params.set("tab", tab);
  if (search?.trim()) params.set("search", search.trim());
  if (status) params.set("status", status);
  return `/crm/leads?${params.toString()}`;
}

export function LeadRegisterToolbar({
  displayedCount,
  leadStatuses,
  search,
  status,
  tab,
  tabCounts,
  totalCount,
}: {
  displayedCount: number;
  leadStatuses: string[];
  search: string;
  status: string;
  tab: LeadTabKey;
  tabCounts: Record<LeadTabKey, number>;
  totalCount: number;
}) {
  const router = useRouter();
  const [searchDraft, setSearchDraft] = useState(search);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeCategoryKey, setActiveCategoryKey] = useState("status");

  const activeFilterCount = [Boolean(search), Boolean(status)].filter(Boolean).length;

  const pushFilters = ({
    nextSearch = searchDraft,
    nextStatus = status,
    nextTab = tab,
  }: {
    nextSearch?: string;
    nextStatus?: string;
    nextTab?: LeadTabKey;
  }) => {
    router.push(
      buildLeadsHref({
        search: nextSearch,
        status: nextStatus,
        tab: nextTab,
      }),
    );
  };

  const sections: FilterMenuPanelSection[] = [
    {
      key: "status",
      label: "Lead Status",
      value: status ? formatStatusLabel(status) : "All",
      active: Boolean(status),
      options: [
        {
          key: "status-all",
          label: "All Statuses",
          selected: !status,
          onSelect: () => {
            setMenuOpen(false);
            pushFilters({ nextStatus: "" });
          },
        },
        ...leadStatuses.map((item) => ({
          key: `status-${item}`,
          label: formatStatusLabel(item),
          selected: status === item,
          onSelect: () => {
            setMenuOpen(false);
            pushFilters({ nextStatus: status === item ? "" : item });
          },
        })),
      ],
    },
  ];

  const activeLinks = [
    search
      ? {
          key: "search",
          label: `Search: ${search} x`,
          href: buildLeadsHref({ search: "", status, tab }),
        }
      : null,
    status
      ? {
          key: "status",
          label: `Status: ${formatStatusLabel(status)} x`,
          href: buildLeadsHref({ search, status: "", tab }),
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
              className="mnx-operational-toolbar-search"
              onSubmit={(event) => {
                event.preventDefault();
                pushFilters({ nextSearch: searchDraft });
              }}
            >
              <label className="mnx-search-field">
                <Search aria-hidden="true" />
                <Input
                  aria-label="Search leads"
                  type="search"
                  name="search"
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  placeholder="Search leads by name, email, company..."
                />
              </label>
              <FilterMenu
                open={menuOpen}
                onOpenChange={setMenuOpen}
                activeCount={activeFilterCount}
                ariaLabel="Open lead filters"
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
            <CrmActionLink href="/crm/leads/new" primary>
              <Plus className="size-4" />
              <span>Create Lead</span>
            </CrmActionLink>
            <OperationalVisibleRecords visible={displayedCount} total={totalCount} />
          </>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--mnx-border)] px-4 py-3">
        <div className="mnx-operational-filter-group">
          <Link
            href={buildLeadsHref({ search, status, tab: "unopened" })}
            className={tab === "unopened" ? "active" : undefined}
          >
            Unopened / Due
            <span>{tabCounts.unopened}</span>
          </Link>
          <Link
            href={buildLeadsHref({ search, status, tab: "not_interested" })}
            className={tab === "not_interested" ? "active" : undefined}
          >
            Not Interested
            <span>{tabCounts.not_interested}</span>
          </Link>
          <Link
            href={buildLeadsHref({ search, status, tab: "unreachable" })}
            className={tab === "unreachable" ? "active" : undefined}
          >
            Unreachable
            <span>{tabCounts.unreachable}</span>
          </Link>
        </div>
        {activeLinks.length > 0 ? (
          <FilterActiveLinks links={activeLinks} clearHref={buildLeadsHref({ tab })} />
        ) : null}
      </div>
    </>
  );
}
