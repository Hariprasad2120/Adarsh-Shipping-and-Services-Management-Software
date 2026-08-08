/**
 * Canonical public API for Monolith production UI.
 *
 * Implementations retain their focused ownership folders; application routes
 * and the live catalogue import through this barrel so there is one supported
 * component contract without duplicating implementation.
 */
export * from "@/components/ui";
export * from "@/components/layout/workspace";
export * from "@/components/layout/workspace-dialog";
export * from "@/components/feedback/workspace-states";
export * from "@/components/forms/filter-menu";
export * from "@/components/forms/file-upload/file-upload-field";
export * from "@/components/forms/file-upload/document-dropzone-field";
export * from "@/components/feedback/warning-indicator-popover";
export * from "@/components/data-display/operational-data-table";
export * from "@/components/data-display/dashboard-insights";
export * from "@/components/navigation/clickable-row";
export * from "@/modules/admin/components/admin-workspace";
export * from "@/modules/accounting/components/accounting-workspace";
export * from "@/modules/accounting/components/accounting-invoice-form";
export * from "@/modules/accounting/components/accounting-invoice-detail";
export * from "@/modules/accounting/components/accounting-items";
export * from "@/modules/accounting/components/accounting-commercial-document-form";
export * from "@/modules/accounting/components/accounting-delete-action";
export * from "@/modules/auth/components/public-workspace";
export * from "@/modules/cha/components/workspace/cha-workspace";
export * from "@/modules/communication/components/workspace/communication-workspace";
export * from "@/modules/crm/components/workspace/crm-workspace";
export * from "@/modules/people/components/people-controls";
export * from "@/modules/people/components/people-workspace";
export * from "@/modules/performance/components/performance-workspace";
export * from "./accounting-note-reason-select";
export * from "./accounting-operational-actions";
export * from "./accounting-operational-views";
export * from "./accounting-optional-invoice-link";
export * from "./accounting-workflow-cards";
export * from "./customer-portal-workspace";
export * from "./vendor-master-create-form";
export {
  type ColumnDef as PeopleColumnDef,
  AvatarCell as PeopleAvatarCell,
  Badge as PeopleStatusBadge,
  DataTable as PeopleDataTable,
  DataTableBody as PeopleDataTableBody,
  DataTableCell as PeopleDataTableCell,
  DataTableEmpty as PeopleDataTableEmpty,
  DataTableFooter as PeopleDataTableFooter,
  DataTableHead as PeopleDataTableHead,
  DataTableHeader as PeopleDataTableHeader,
  DataTablePrimaryLinkCell as PeopleDataTablePrimaryLinkCell,
  DataTableRow as PeopleDataTableRow,
  DataTableToolbar as PeopleDataTableToolbar,
  MetaText as PeopleMetaText,
} from "@/modules/people/components/people-data-table";
export {
  AvatarCell as DataTableAvatarCell,
  Badge as DataTableStatusBadge,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableEmpty,
  DataTableFooter,
  DataTableHead,
  DataTableHeader,
  DataTablePrimaryLinkCell,
  DataTableRow,
  DataTableToolbar,
  MetaText as DataTableMetaText,
} from "@/components/data-display/data-table";
export {
  MonolithThemePicker,
  MonolithThemeProvider,
  monolithThemes,
} from "@/modules/core/components/monolith-app-shell";
