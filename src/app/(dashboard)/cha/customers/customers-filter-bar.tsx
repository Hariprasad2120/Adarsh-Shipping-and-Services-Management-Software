"use client";

import { Input } from "@/components/monolith/input";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/monolith/button";
import { FilterMenu } from "@/components/monolith/filter-menu";
import { cn } from "@/lib/utils";

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
  const [activeFilterType, setActiveFilterType] = useState<CustomerFilterKey>("status");

  const activeFilterCount = [status, portal, balance].filter(Boolean).length;

  const buildParams = (nextSearch = search) => {
    const params = new URLSearchParams();
    if (nextSearch.trim()) params.set("search", nextSearch.trim());
    if (status) params.set("status", status);
    if (portal) params.set("portal", portal);
    if (balance) params.set("balance", balance);
    return params;
  };

  const applyFilters = () => {
    const params = buildParams();
    router.push(params.size ? `${basePath}?${params.toString()}` : basePath);
    setIsFilterPanelOpen(false);
  };

  const resetFilters = () => {
    setStatus("");
    setPortal("");
    setBalance("");
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    router.push(params.size ? `${basePath}?${params.toString()}` : basePath);
    setIsFilterPanelOpen(false);
  };

  const applySearch = () => {
    const params = buildParams(search);
    router.push(params.size ? `${basePath}?${params.toString()}` : basePath);
  };

  const filterTypes: { key: CustomerFilterKey; label: string; value: string; active: boolean }[] = [
    { key: "status", label: "Status", value: status || "All", active: Boolean(status) },
    {
      key: "portal",
      label: "Portal Access",
      value: portal === "enabled" ? "Enabled" : portal === "disabled" ? "Disabled" : "All",
      active: Boolean(portal),
    },
    {
      key: "balance",
      label: "Balance",
      value: balance === "outstanding" ? "Outstanding" : balance === "clear" ? "No Balance" : "All",
      active: Boolean(balance),
    },
  ];

  const filterOptionButton = ({
    label,
    note,
    selected,
    onClick,
  }: {
    label: string;
    note?: string;
    selected: boolean;
    onClick: () => void;
  }) => (
    <Button
      key={`${activeFilterType}-${label}-${note ?? ""}`}
      type="button"
      onClick={onClick}
      className={cn("mnx-plain mnx-menu-option py-2 text-sm", selected && "mnx-menu-option-active")}
    >
      <span className="min-w-0">
        <span className="block truncate">{label}</span>
        {note ? <span className="mt-0.5 block truncate text-xs mnx-text-muted">{note}</span> : null}
      </span>
      {selected ? <span className="mnx-state-dot" /> : null}
    </Button>
  );

  const renderFilterOptions = () => {
    if (activeFilterType === "portal") {
      return [
        filterOptionButton({ label: "All Portal Access", selected: !portal, onClick: () => setPortal("") }),
        filterOptionButton({ label: "Portal Enabled", note: "Customers with login access", selected: portal === "enabled", onClick: () => setPortal("enabled") }),
        filterOptionButton({ label: "Portal Disabled", note: "Customers without login access", selected: portal === "disabled", onClick: () => setPortal("disabled") }),
      ];
    }

    if (activeFilterType === "balance") {
      return [
        filterOptionButton({ label: "All Balances", selected: !balance, onClick: () => setBalance("") }),
        filterOptionButton({ label: "Outstanding", note: "Opening balance above zero", selected: balance === "outstanding", onClick: () => setBalance("outstanding") }),
        filterOptionButton({ label: "No Balance", note: "Zero or unset opening balance", selected: balance === "clear", onClick: () => setBalance("clear") }),
      ];
    }

    return [
      filterOptionButton({ label: "All Statuses", selected: !status, onClick: () => setStatus("") }),
      filterOptionButton({ label: "Active", note: "Currently trading profiles", selected: status === "ACTIVE", onClick: () => setStatus("ACTIVE") }),
      filterOptionButton({ label: "Inactive", note: "Paused or inactive profiles", selected: status === "INACTIVE", onClick: () => setStatus("INACTIVE") }),
    ];
  };

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
            contentClassName="w-[min(460px,calc(100vw-2rem))]"
            label="Filter"
          >
            <div className="overflow-hidden mnx-bg-surface">
              <div className="grid min-h-[220px] grid-cols-1 sm:grid-cols-[168px_minmax(0,1fr)]">
                <div className="border-b mnx-border mnx-bg-soft sm:border-b-0 sm:border-r">
                  {filterTypes.map((item) => (
                    <Button
                      key={item.key}
                      type="button"
                      onClick={() => setActiveFilterType(item.key)}
                      className={cn("mnx-plain mnx-menu-option gap-2", activeFilterType === item.key && "mnx-menu-option-active")}
                    >
                      <span className="min-w-0">
                        <span className="mnx-label block truncate mnx-text-primary">{item.label}</span>
                        <span className="mt-1 block truncate text-xs mnx-text-muted">{item.value}</span>
                      </span>
                      {item.active ? <span className="mnx-state-dot" /> : null}
                    </Button>
                  ))}
                </div>
                <div>{renderFilterOptions()}</div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 border-t mnx-border mnx-bg-surface p-3">
              <Button variant="outline" onClick={resetFilters} className="flex-1">
                Reset
              </Button>
              <Button onClick={applyFilters} className="flex-1">
                Apply Filters
              </Button>
            </div>
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
    </div>
  );
}
