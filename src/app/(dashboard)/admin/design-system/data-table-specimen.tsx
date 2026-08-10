"use client";

import { useState } from "react";
import {
  ArrowUpDown,
  ChevronDown,
  Heart,
  ListFilter,
  Menu,
  MessageCircle,
  X,
} from "lucide-react";
import {
  Badge,
  Button,
  Input,
  NativeSelect,
  NeonCheckbox,
  OperationalDataTable,
  OperationalDataTableWrap,
  OperationalTable,
  OperationalTableCell,
  OperationalTableHead,
} from "@/components/monolith";

const statusOptions = [
  { value: "Lead", label: "Lead" },
  { value: "Prospect", label: "Prospect" },
  { value: "Customer", label: "Customer" },
] as const;

export function DataTableSpecimen() {
  const [mobileControlsOpen, setMobileControlsOpen] = useState(false);
  const [status, setStatus] = useState("Lead");
  const [selected, setSelected] = useState(true);

  return (
    <section className="ds-datatable-specimen" aria-label="Data table specimen">
      <OperationalDataTable className="ds-datatable-shell">
        <div className="ds-datatable-toolbar-layer">
        <div className="ds-datatable-mobile-toggle">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="ds-toolbar-button ds-datatable-mobile-button"
            aria-expanded={mobileControlsOpen}
            aria-controls="ds-datatable-toolbar-controls"
            onClick={() => setMobileControlsOpen((current) => !current)}
          >
            <Menu size={16} aria-hidden="true" />
            {mobileControlsOpen ? "Hide controls" : "Show controls"}
          </Button>
        </div>

        <div
          id="ds-datatable-toolbar-controls"
          className={`ds-datatable-toolbar ${mobileControlsOpen ? "is-mobile-open" : ""}`}
        >
          <div className="ds-datatable-toolbar-grid">
            <div className="ds-datatable-control ds-datatable-control-input">
              <Input defaultValue="ID" aria-label="Filter by ID" />
              <Button
                type="button"
                mode="icon"
                variant="outline"
                className="ds-datatable-control-button"
                aria-label="Sort by ID"
              >
                <ArrowUpDown size={15} aria-hidden="true" />
              </Button>
            </div>

            <div className="ds-datatable-control ds-datatable-control-input">
              <Input defaultValue="Job Title" aria-label="Filter by Job Title" />
              <Button
                type="button"
                mode="icon"
                variant="outline"
                className="ds-datatable-control-button"
                aria-label="Sort by Job Title"
              >
                <ArrowUpDown size={15} aria-hidden="true" />
              </Button>
            </div>

            <NativeSelect
              className="ds-datatable-control ds-datatable-control-select"
              aria-label="Filter by status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>

            <div className="ds-datatable-control ds-datatable-control-input">
              <Input
                defaultValue="Organization Name"
                aria-label="Filter by Organization Name"
              />
              <Button
                type="button"
                mode="icon"
                variant="outline"
                className="ds-datatable-control-button"
                aria-label="Sort by Organization Name"
              >
                <ArrowUpDown size={15} aria-hidden="true" />
              </Button>
            </div>

            <Input
              className="ds-datatable-control"
              defaultValue="Territory"
              aria-label="Filter by Territory"
            />

            <div className="ds-datatable-control ds-datatable-control-input">
              <Input defaultValue="Title" aria-label="Filter by Title" />
              <Button
                type="button"
                mode="icon"
                variant="outline"
                className="ds-datatable-control-button"
                aria-label="Sort by Title"
              >
                <ArrowUpDown size={15} aria-hidden="true" />
              </Button>
            </div>
          </div>

          <div className="ds-datatable-actions">
            <Button
              variant="outline"
              className="ds-datatable-action ds-datatable-action-filter"
            >
              <ListFilter size={16} aria-hidden="true" />
              Filter
            </Button>
            <Button
              variant="outline"
              mode="icon"
              className="ds-datatable-action ds-datatable-action-clear"
              aria-label="Clear filters"
            >
              <X size={16} aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              className="ds-datatable-action ds-datatable-action-sort"
            >
              <ArrowUpDown size={16} aria-hidden="true" />
              Created On
              <ChevronDown size={16} aria-hidden="true" />
            </Button>
          </div>
        </div>
        </div>

        <OperationalDataTableWrap className="ds-datatable-wrap">
          <OperationalTable className="ds-datatable-table">
            <thead>
              <tr className="ds-datatable-header-row">
                <OperationalTableHead className="ds-datatable-checkbox-cell">
                  <NeonCheckbox
                    checked={selected}
                    aria-label="Select all rows"
                    onChange={(event) => setSelected(event.target.checked)}
                  />
                </OperationalTableHead>
                <OperationalTableHead>Title</OperationalTableHead>
                <OperationalTableHead>Status</OperationalTableHead>
                <OperationalTableHead>Job Title</OperationalTableHead>
                <OperationalTableHead>Organization Name</OperationalTableHead>
                <OperationalTableHead>Territory</OperationalTableHead>
                <OperationalTableHead>ID</OperationalTableHead>
                <OperationalTableHead className="ds-datatable-meta-head">
                  <span>1 of 1</span>
                  <Heart size={18} aria-hidden="true" />
                </OperationalTableHead>
              </tr>
            </thead>
            <tbody>
              <tr className="ds-datatable-body-row">
                <OperationalTableCell className="ds-datatable-checkbox-cell">
                  <NeonCheckbox
                    checked={selected}
                    aria-label="Select row j"
                    onChange={(event) => setSelected(event.target.checked)}
                  />
                </OperationalTableCell>
                <OperationalTableCell className="ds-datatable-title-cell">
                  j
                </OperationalTableCell>
                <OperationalTableCell>
                  <Badge variant="secondary" className="ds-datatable-status">
                    Lead
                  </Badge>
                </OperationalTableCell>
                <OperationalTableCell />
                <OperationalTableCell>j</OperationalTableCell>
                <OperationalTableCell />
                <OperationalTableCell className="ds-datatable-id-cell">
                  CRM-LEAD-2026-00001
                </OperationalTableCell>
                <OperationalTableCell className="ds-datatable-meta-cell">
                  <span>2 d</span>
                  <span className="ds-datatable-meta-inline">
                    <MessageCircle size={18} aria-hidden="true" />
                    <span>0</span>
                  </span>
                  <Heart size={18} aria-hidden="true" />
                </OperationalTableCell>
              </tr>
            </tbody>
          </OperationalTable>
        </OperationalDataTableWrap>
      </OperationalDataTable>
    </section>
  );
}
