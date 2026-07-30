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
export * from "@/components/feedback/warning-indicator-popover";
export * from "@/components/data-display/operational-data-table";
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
  monolithThemes,
} from "@/modules/core/components/monolith-app-shell";
