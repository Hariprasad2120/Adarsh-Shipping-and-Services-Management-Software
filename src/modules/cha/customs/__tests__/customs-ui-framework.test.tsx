import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WorkspaceField, WorkspaceInput, WorkspaceTable } from "@/components/monolith/workspace";
import {
  DEFAULT_CHA_CUSTOMS_FEATURE_FLAGS,
  type ChaCustomsFeatureFlags,
} from "../feature-flags";
import {
  CHA_CUSTOMS_ROUTE_METADATA,
  getGroupedChaCustomsRouteMetadata,
  getVisibleChaCustomsRouteMetadata,
} from "../routes";
import {
  canShowCustomsRoute,
  CustomsBulkImportPreview,
  CustomsConcurrencyConflictDialog,
  CustomsDirtyStateWarning,
  CustomsFilingSection,
  CustomsFilingTabs,
  CustomsFormGrid,
  CustomsLineItemTable,
  CustomsMasterHeader,
  CustomsMasterTable,
  CustomsMasterToolbar,
  CustomsPagination,
  CustomsPermissionDeniedState,
  CustomsSaveIndicator,
  CustomsValidationSummary,
  updateCustomsMasterSearchParams,
} from "../ui/customs-workspace";

const root = process.cwd();

function source(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("CHA customs shared UI framework", () => {
  it("renders the master page framework with search, sticky table, pagination, and import preview", () => {
    const markup = renderToStaticMarkup(
      <>
        <CustomsMasterHeader title="RITC Unit" sourceVersion="2026.07" lastImportedAt="31 Jul 2026" />
        <CustomsMasterToolbar search="0101" activeFilterCount={1}>
          <WorkspaceField label="Status">
            <WorkspaceInput defaultValue="Active" />
          </WorkspaceField>
        </CustomsMasterToolbar>
        <CustomsMasterTable
          rows={[{ id: "1", code: "01012100", description: "Pure-bred breeding animals", status: "Active" }]}
          sort={{ key: "code", direction: "asc" }}
          pagination={<CustomsPagination page={1} pageSize={10} totalCount={1} />}
          columns={[
            { key: "code", header: "Code", sticky: "start", filterable: true, cell: (row) => row.code },
            { key: "description", header: "Description", filterable: true, cell: (row) => row.description },
            { key: "status", header: "Status", sticky: "end", cell: (row) => row.status },
          ]}
        />
        <CustomsBulkImportPreview inserted={2} updated={3} unchanged={4} rejected={1} />
      </>,
    );

    expect(markup).toContain("mnx-customs-master-header");
    expect(markup).toContain("Source version:");
    expect(markup).toContain("mnx-customs-master-toolbar");
    expect(markup).toContain("Search customs master data");
    expect(markup).toContain("mnx-customs-master-table");
    expect(markup).toContain("is-sticky-start");
    expect(markup).toContain("is-sticky-end");
    expect(markup).toContain('aria-sort="ascending"');
    expect(markup).toContain('aria-label="Customs master pagination"');
    expect(markup).toContain("Bulk import dry-run summary");
  });

  it("renders the filing framework with accessible tabs, form grids, line items, dirty state, and validation jumps", () => {
    const markup = renderToStaticMarkup(
      <CustomsFilingSection title="BE main details" actions={<CustomsSaveIndicator state="dirty" />}>
        <CustomsFilingTabs
          tabs={[
            { id: "be", label: "BE Main", status: "complete", selected: true },
            { id: "igm", label: "IGM", status: "in_progress" },
          ]}
        />
        <CustomsFormGrid columns={4}>
          <WorkspaceField label="Customs house">
            <WorkspaceInput id="customs-house" defaultValue="" />
          </WorkspaceField>
        </CustomsFormGrid>
        <CustomsLineItemTable title="Items" footer={<span>Total amount 0.00</span>}>
          <WorkspaceTable>
            <tbody><tr><td>No data</td></tr></tbody>
          </WorkspaceTable>
        </CustomsLineItemTable>
        <CustomsDirtyStateWarning active />
        <CustomsValidationSummary
          errors={[{ fieldId: "customs-house", label: "Customs house", message: "Required" }]}
        />
      </CustomsFilingSection>,
    );

    expect(markup).toContain("mnx-customs-filing-section");
    expect(markup).toContain('role="tablist"');
    expect(markup).toContain('role="tab"');
    expect(markup).toContain('aria-selected="true"');
    expect(markup).toContain('data-columns="4"');
    expect(markup).toContain("mnx-customs-line-table");
    expect(markup).toContain("mnx-customs-totals-footer");
    expect(markup).toContain("This filing draft has unsaved changes.");
    expect(markup).toContain('href="#customs-house"');
  });

  it("updates URL filter, pagination, and sort state without losing leading zeroes", () => {
    const params = updateCustomsMasterSearchParams("q=old&page=4&filter.code=001002", {
      search: "01012100",
      page: 1,
      pageSize: 25,
      sortKey: "tariffItem",
      sortDirection: "asc",
      filters: { code: "001002", status: null },
    });

    expect(params.get("q")).toBe("01012100");
    expect(params.get("page")).toBe("1");
    expect(params.get("pageSize")).toBe("25");
    expect(params.get("sort")).toBe("tariffItem");
    expect(params.get("dir")).toBe("asc");
    expect(params.get("filter.code")).toBe("001002");
    expect(params.has("filter.status")).toBe(false);
  });

  it("keeps customs route metadata hidden unless flags and permissions both allow it", () => {
    const enabledFlags: ChaCustomsFeatureFlags = {
      ...DEFAULT_CHA_CUSTOMS_FEATURE_FLAGS,
      CHA_CUSTOMS_MASTER_DATA: true,
      CHA_IMPORT_FILING_WORKSPACE: true,
      CHA_EXPORT_FILING_WORKSPACE: true,
    };
    const caps = {
      "cha.customs.master.view": true,
      "cha.customs.filing.view": true,
    };

    expect(getVisibleChaCustomsRouteMetadata(DEFAULT_CHA_CUSTOMS_FEATURE_FLAGS, caps)).toEqual([]);
    expect(canShowCustomsRoute(CHA_CUSTOMS_ROUTE_METADATA[0], enabledFlags, {})).toBe(false);
    expect(getVisibleChaCustomsRouteMetadata(enabledFlags, caps)).toHaveLength(16);
    const groups = getGroupedChaCustomsRouteMetadata(enabledFlags, caps);
    expect(groups["Customs Masters"]).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Customs Masters" }),
      expect.objectContaining({ label: "RITC Unit" }),
      expect.objectContaining({ label: "RoDTEP EOU" }),
      expect.objectContaining({ label: "SW CTH" }),
      expect.objectContaining({ label: "UOM Master" }),
    ]));
    expect(groups.Import).toEqual([expect.objectContaining({ label: "Import Jobs", href: "/cha/jobs/import" })]);
    expect(groups.Export).toEqual([expect.objectContaining({ label: "Export Jobs", href: "/cha/jobs/export" })]);
  });

  it("routes modal and conflict states through the shared focus-managed dialog source", () => {
    const uiSource = source("src/modules/cha/customs/ui/customs-workspace.tsx");
    const dialogSource = source("src/components/monolith/workspace-dialog.tsx");

    expect(uiSource).toContain("<ChaDialogLayer");
    expect(uiSource).toContain("labelledBy=\"customs-conflict-title\"");
    expect(dialogSource).toContain('event.key === "Escape"');
    expect(dialogSource).toContain('event.key !== "Tab"');
    expect(dialogSource).toContain("previouslyFocused?.focus");
    expect(renderToStaticMarkup(<CustomsConcurrencyConflictDialog open={false} onClose={() => undefined} />)).toBe("");
  });

  it("provides permission and read-only states for guarded or signed workspaces", () => {
    const markup = renderToStaticMarkup(
      <>
        <CustomsPermissionDeniedState />
        <CustomsFilingSection title="Flat file" readonly>
          <WorkspaceInput readOnly defaultValue="Signed" />
        </CustomsFilingSection>
      </>,
    );

    expect(markup).toContain("Customs workspace access required");
    expect(markup).toContain("Read only after signing");
    expect(markup).toContain("is-readonly");
  });

  it("uses semantic tokens and responsive rules for all three Monolith themes", () => {
    const styles = source("src/styles/monolith-system.css");
    const catalogue = source("src/app/(dashboard)/admin/design-system/design-system-client.tsx");

    expect(styles).toContain(".mnx-customs-master-table thead th");
    expect(styles).toContain("background: var(--mnx-surface)");
    expect(styles).toContain("color: var(--mnx-text");
    expect(styles).toContain("@media (max-width: 42rem)");
    expect(styles).not.toContain(".mnx-customs-master-table { background: #");
    expect(catalogue).toContain("CustomsBulkImportPreview");
    expect(catalogue).toContain("CustomsValidationSummary");
    expect(catalogue).toContain("Light, Night, and Violet");
  });
});
