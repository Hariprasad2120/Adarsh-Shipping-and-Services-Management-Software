/* eslint-disable no-restricted-syntax -- intentional custom segmented filter and sort widget specimen */
"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUpDown,
  ChevronDown,
  Ellipsis,
  Filter,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const sortMenuItems = [
  "Last Updated On",
  "Created On",
  "ID",
  "Most Used",
  "Company",
  "Abbr",
  "Default Currency",
  "Country",
  "Is Group",
  "Enable Perpetual Inventory",
  "Default Stock Valuation Method",
] as const;

const fieldOptions = ["Enabled", "Company", "Created On", "Country"] as const;
const operatorOptions = ["Equals", "Not Equals", "Contains"] as const;
const valueOptions = ["Yes", "No"] as const;

type FilterRow = {
  id: string;
  field: (typeof fieldOptions)[number];
  operator: (typeof operatorOptions)[number];
  value: (typeof valueOptions)[number];
};

const defaultFilterRow = (): FilterRow => ({
  id: crypto.randomUUID(),
  field: "Enabled",
  operator: "Equals",
  value: "Yes",
});

export function ActionFilterSpecimen() {
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilterMenu, setActiveFilterMenu] = useState<string | null>(null);
  const [selectedSort, setSelectedSort] =
    useState<(typeof sortMenuItems)[number]>("Created On");
  const [appliedFilters, setAppliedFilters] = useState<FilterRow[]>([]);
  const [draftFilters, setDraftFilters] = useState<FilterRow[]>(appliedFilters);
  const rootRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsSortOpen(false);
        setIsFilterOpen(false);
        setActiveFilterMenu(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsSortOpen(false);
        setIsFilterOpen(false);
        setActiveFilterMenu(null);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function openFilters() {
    setDraftFilters(appliedFilters);
    setIsFilterOpen(true);
    setIsSortOpen(false);
    setActiveFilterMenu(null);
  }

  function closeFilters() {
    setIsFilterOpen(false);
    setActiveFilterMenu(null);
  }

  function updateDraftFilter(
    id: string,
    key: keyof Omit<FilterRow, "id">,
    value: string,
  ) {
    setDraftFilters((current) =>
      current.map((filter) =>
        filter.id === id ? { ...filter, [key]: value } : filter,
      ),
    );
  }

  function removeDraftFilter(id: string) {
    setDraftFilters((current) => current.filter((filter) => filter.id !== id));
    setActiveFilterMenu((current) =>
      current?.startsWith(id) ? null : current,
    );
  }

  function addDraftFilter() {
    setDraftFilters((current) => [...current, defaultFilterRow()]);
  }

  function clearFilters() {
    setDraftFilters([]);
    setAppliedFilters([]);
    closeFilters();
  }

  function applyFilters() {
    setAppliedFilters(draftFilters);
    closeFilters();
  }

  return (
    <section
      ref={rootRef}
      className="ds-controls-specimen"
      aria-label="Action and filter controls"
    >
      <div className="ds-controls-toolbar">
        <Button
          mode="icon"
          variant="outline"
          size="sm"
          className="ds-toolbar-button"
          aria-label="Refresh"
        >
          <RefreshCw size={16} aria-hidden="true" />
        </Button>
        <Button
          mode="icon"
          variant="outline"
          size="sm"
          className="ds-toolbar-button"
          aria-label="More actions"
        >
          <Ellipsis size={16} aria-hidden="true" />
        </Button>
        <Button size="sm" className="ds-toolbar-button ds-toolbar-button-primary">
          <Plus size={16} aria-hidden="true" />
          Add Company
        </Button>
      </div>

      <div className="ds-filter-demo">
        <div className="ds-filter-toolbar">
          <div className="ds-filter-combobox">
            <button
              type="button"
              className="ds-filter-chip ds-filter-chip-main"
              onClick={() => (isFilterOpen ? closeFilters() : openFilters())}
              aria-expanded={isFilterOpen}
            >
              <Filter size={16} aria-hidden="true" />
              <span>Filters</span>
            </button>
            <button
              type="button"
              className="ds-filter-chip ds-filter-chip-clear"
              aria-label="Clear filters"
              onClick={clearFilters}
            >
              <X size={16} aria-hidden="true" />
            </button>

            {isFilterOpen ? (
              <div className="ds-filter-panel">
                <div className="ds-filter-panel-caret" aria-hidden="true" />
                {draftFilters.length ? (
                  draftFilters.map((filter) => (
                  <div className="ds-filter-row" key={filter.id}>
                    <div className="ds-filter-select">
                      <button
                        type="button"
                        className="ds-filter-field ds-filter-field-select"
                        onClick={() =>
                          setActiveFilterMenu((current) =>
                            current === `${filter.id}-field`
                              ? null
                              : `${filter.id}-field`,
                          )
                        }
                      >
                        <span>{filter.field}</span>
                        <ChevronDown size={16} aria-hidden="true" />
                      </button>
                      {activeFilterMenu === `${filter.id}-field` ? (
                        <div className="ds-filter-select-menu">
                          {fieldOptions.map((option) => (
                            <button
                              type="button"
                              className="ds-sort-menu-item"
                              key={option}
                              onClick={() => {
                                updateDraftFilter(filter.id, "field", option);
                                setActiveFilterMenu(null);
                              }}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="ds-filter-select">
                      <button
                        type="button"
                        className="ds-filter-field ds-filter-field-select"
                        onClick={() =>
                          setActiveFilterMenu((current) =>
                            current === `${filter.id}-operator`
                              ? null
                              : `${filter.id}-operator`,
                          )
                        }
                      >
                        <span>{filter.operator}</span>
                        <ChevronDown size={16} aria-hidden="true" />
                      </button>
                      {activeFilterMenu === `${filter.id}-operator` ? (
                        <div className="ds-filter-select-menu">
                          {operatorOptions.map((option) => (
                            <button
                              type="button"
                              className="ds-sort-menu-item"
                              key={option}
                              onClick={() => {
                                updateDraftFilter(filter.id, "operator", option);
                                setActiveFilterMenu(null);
                              }}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="ds-filter-select">
                      <button
                        type="button"
                        className="ds-filter-field ds-filter-field-select"
                        onClick={() =>
                          setActiveFilterMenu((current) =>
                            current === `${filter.id}-value`
                              ? null
                              : `${filter.id}-value`,
                          )
                        }
                      >
                        <span>{filter.value}</span>
                        <ChevronDown size={16} aria-hidden="true" />
                      </button>
                      {activeFilterMenu === `${filter.id}-value` ? (
                        <div className="ds-filter-select-menu">
                          {valueOptions.map((option) => (
                            <button
                              type="button"
                              className="ds-sort-menu-item"
                              key={option}
                              onClick={() => {
                                updateDraftFilter(filter.id, "value", option);
                                setActiveFilterMenu(null);
                              }}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      className="ds-filter-remove"
                      aria-label="Remove filter"
                      onClick={() => removeDraftFilter(filter.id)}
                    >
                      <X size={16} aria-hidden="true" />
                    </button>
                  </div>
                  ))
                ) : (
                  <div className="ds-filter-empty">No filters applied.</div>
                )}

                <div className="ds-filter-actions">
                  <button
                    type="button"
                    className="ds-filter-link"
                    onClick={addDraftFilter}
                  >
                    + Add a Filter
                  </button>
                  <div className="ds-filter-action-buttons">
                    <Button
                      variant="inverse"
                      className="ds-filter-action-button ds-filter-action-button-secondary"
                      onClick={clearFilters}
                    >
                      Clear Filters
                    </Button>
                    <Button
                      className="ds-filter-action-button"
                      onClick={applyFilters}
                    >
                      Apply Filters
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="ds-sort-combobox">
            <button
              type="button"
              className="ds-filter-chip ds-filter-chip-main ds-filter-chip-sort"
              onClick={() => setIsSortOpen((current) => !current)}
              aria-expanded={isSortOpen}
            >
              <ArrowUpDown size={16} aria-hidden="true" />
              <span>{selectedSort}</span>
              <ChevronDown
                size={16}
                aria-hidden="true"
                className={isSortOpen ? "is-open" : undefined}
              />
            </button>

            {isSortOpen ? (
              <div className="ds-sort-menu">
                {sortMenuItems.map((item) => (
                  <button
                    type="button"
                    className="ds-sort-menu-item"
                    key={item}
                    onClick={() => {
                      setSelectedSort(item);
                      setIsSortOpen(false);
                    }}
                  >
                    {item}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
