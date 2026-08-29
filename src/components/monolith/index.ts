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
export * from "@/components/layout/trial-checkout";
export * from "@/components/feedback/workspace-states";
export * from "@/components/feedback/development-build-watermark";
export * from "@/components/forms/filter-menu";
export * from "@/components/forms/file-upload/file-upload-field";
export * from "@/components/forms/file-upload/document-dropzone-field";
export * from "@/components/feedback/warning-indicator-popover";
export * from "@/components/data-display/operational-data-table";
export * from "@/components/data-display/dashboard-insights";
export * from "@/components/navigation/clickable-row";
export * from "@/components/navigation/monolith-search-command";
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
export * from "@/modules/accounting/components/accounting-note-reason-select";
export * from "@/modules/accounting/components/accounting-operational-actions";
export * from "@/modules/accounting/components/accounting-operational-views";
export * from "@/modules/accounting/components/accounting-optional-invoice-link";
export * from "@/modules/accounting/components/accounting-workflow-cards";
export * from "@/components/layout/customer-portal-workspace";
export {
  MonolithThemePicker,
  MonolithThemeProvider,
  monolithThemes,
} from "@/modules/core/components/monolith-app-shell";
