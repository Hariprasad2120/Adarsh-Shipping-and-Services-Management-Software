"use client";

import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChaFilterMenu as FilterMenu } from "@/modules/cha/components/workspace/cha-workspace";
import { CategorizedFilterMenuPanel, FilterActiveLinks, type FilterMenuPanelSection } from "@/components/forms/filter-menu";

type CustomerFilterKey = "status" | "portal" | "balance";

export type CustomerFilters = {
  search?: string;
  status?: string;
  portal?: string;
  balance?: string;
};

export function CustomersFilterBar({
  basePath = "/cha/customers",
  createHref = "/cha/customers/new",
  filters,
  canCreateCustomer,
}: {
  basePath?: string;
  createHref?: string;
  filters: CustomerFilters;
  canCreateCustomer: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(filters.search ?? "");
  const [status, setStatus] = useState(filters.status ?? "");
  const [portal, setPortal] = useState(filters.portal ?? "");
  const [balance, setBalance] = useState(filters.balance ?? "");
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [activeFilterType, setActiveFilterType] = useState<CustomerFilterKey | "">("status");

  const activeFilterCount = [status, portal, balance].filter(Boolean).length;

  const buildParams = (nextSearch = search) => {
    const params = new URLSearchParams();
    if (nextSearch.trim()) params.set("search", nextSearch.trim());
    if (status) params.set("status", status);
    if (portal) params.set("portal", portal);
    if (balance) params.set("balance", balance);
    return params;
  };

  const applySearch = () => {
    const params = buildParams(search);
    router.push(params.size ? `${basePath}?${params.toString()}` : basePath);
  };

  const buildHref = (overrides?: Partial<CustomerFilters>) => {
    const nextSearch = overrides?.search ?? search;
    const nextStatus = overrides?.status ?? status;
    const nextPortal = overrides?.portal ?? portal;
    const nextBalance = overrides?.balance ?? balance;
    const params = new URLSearchParams();
    if (nextSearch.trim()) params.set("search", nextSearch.trim());
    if (nextStatus) params.set("status", nextStatus);
    if (nextPortal) params.set("portal", nextPortal);
    if (nextBalance) params.set("balance", nextBalance);
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  const activeLinks = [
    filters.search ? { key: "search", label: `Search: ${filters.search}`, href: buildHref({ search: "" }) } : null,
    filters.status ? { key: "status", label: `Status: ${filters.status} x`, href: buildHref({ status: "" }) } : null,
    filters.portal
      ? {
          key: "portal",
          label: `Portal: ${filters.portal === "enabled" ? "Enabled" : "Disabled"} x`,
          href: buildHref({ portal: "" }),
        }
      : null,
    filters.balance
      ? {
          key: "balance",
          label: `Balance: ${filters.balance === "outstanding" ? "Outstanding" : "No Balance"} x`,
          href: buildHref({ balance: "" }),
        }
      : null,
  ].filter(Boolean) as { href: string; key: string; label: string }[];

  const filterSections: FilterMenuPanelSection[] = [
    {
      key: "status",
      label: "Status",
      value: status || "All",
      active: Boolean(status),
      options: [
        { key: "status-all", label: "All Statuses", selected: !status, onSelect: () => setStatus("") },
        {
          key: "status-active",
          label: "Active",
          note: "Currently trading profiles",
          selected: status === "ACTIVE",
          onSelect: () => setStatus(status === "ACTIVE" ? "" : "ACTIVE"),
        },
        {
          key: "status-inactive",
          label: "Inactive",
          note: "Paused or inactive profiles",
          selected: status === "INACTIVE",
          onSelect: () => setStatus(status === "INACTIVE" ? "" : "INACTIVE"),
        },
      ],
    },
    {
      key: "portal",
      label: "Portal Access",
      value: portal === "enabled" ? "Enabled" : portal === "disabled" ? "Disabled" : "All",
      active: Boolean(portal),
      options: [
        { key: "portal-all", label: "All Portal Access", selected: !portal, onSelect: () => setPortal("") },
        {
          key: "portal-enabled",
          label: "Portal Enabled",
          note: "Customers with login access",
          selected: portal === "enabled",
          onSelect: () => setPortal(portal === "enabled" ? "" : "enabled"),
        },
        {
          key: "portal-disabled",
          label: "Portal Disabled",
          note: "Customers without login access",
          selected: portal === "disabled",
          onSelect: () => setPortal(portal === "disabled" ? "" : "disabled"),
        },
      ],
    },
    {
      key: "balance",
      label: "Balance",
      value: balance === "outstanding" ? "Outstanding" : balance === "clear" ? "No Balance" : "All",
      active: Boolean(balance),
      options: [
        { key: "balance-all", label: "All Balances", selected: !balance, onSelect: () => setBalance("") },
        {
          key: "balance-outstanding",
          label: "Outstanding",
          note: "Opening balance above zero",
          selected: balance === "outstanding",
          onSelect: () => setBalance(balance === "outstanding" ? "" : "outstanding"),
        },
        {
          key: "balance-clear",
          label: "No Balance",
          note: "Zero or unset opening balance",
          selected: balance === "clear",
          onSelect: () => setBalance(balance === "clear" ? "" : "clear"),
        },
      ],
    },
  ];

  return (
    <div className="mnx-bg-surface mnx-border p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative min-w-0 flex-1 lg:max-w-md">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 mnx-text-muted" />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                applySearch();
              }
            }}
            placeholder="Search customer, email, phone..."
            className="h-10 w-full pl-9 pr-4 text-sm"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterMenu
            open={isFilterPanelOpen}
            onOpenChange={setIsFilterPanelOpen}
            activeCount={activeFilterCount}
            ariaLabel="Open customer filters"
            contentClassName="w-[min(320px,calc(100vw-1rem))]"
            label="Filter"
          >
            <CategorizedFilterMenuPanel
              activeCategoryKey={activeFilterType}
              onActiveCategoryChange={(value) => setActiveFilterType(value as CustomerFilterKey | "")}
              sections={filterSections}
              title="Filters"
              headerActionLabel="Save view"
            />
          </FilterMenu>
          {canCreateCustomer ? (
            <Link href={createHref}>
              <Button className="h-10 gap-1.5">
                <Plus size={16} /> New Customer
              </Button>
            </Link>
          ) : null}
        </div>
      </div>
      {activeLinks.length > 0 ? (
        <FilterActiveLinks className="mt-1" links={activeLinks} clearHref={basePath} />
      ) : null}
    </div>
  );
}
