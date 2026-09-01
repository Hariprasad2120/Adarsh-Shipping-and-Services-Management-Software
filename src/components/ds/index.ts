/**
 * Monolith Design System — public entry point.
 *
 * ONE source of truth for UI. Import DS components from "@/components/ds".
 * Tokens + component CSS: src/styles/ds-tokens.css (mirrored into globals.css).
 * Usage rules + per-component "used by" ledger: DESIGN_SYSTEM.md
 */

/* primitives */
export { DsIcon, type DsIconProps, type DsIconSize } from "./ds-icon";
export {
  DsButton,
  DsButtonLink,
  type DsButtonProps,
  type DsButtonLinkProps,
  type DsButtonVariant,
  type DsButtonSize,
} from "./ds-button";
export { DsDisplay, DsBody, DsMeta } from "./ds-text";
export { Card, type CardProps, type CardVariant, type CardPad } from "./ds-card";

/* data display */
export {
  SectionHeader,
  type SectionHeaderProps,
} from "./section-header";
export {
  StatusBadge,
  TrendBadge,
  type StatusBadgeProps,
  type TrendBadgeProps,
  type BadgeTone,
  type TrendDirection,
} from "./ds-badge";
export {
  MetricCard,
  StatGrid,
  type MetricCardProps,
  type MetricTrend,
  type StatGridProps,
} from "./metric-card";
export {
  DataTable,
  DataTableCell,
  type DataTableProps,
  type DataTableColumn,
} from "./data-table";
export {
  QuickActions,
  DefinitionList,
  type QuickAction,
  type QuickActionsProps,
  type DefinitionItem,
} from "./quick-actions";
export {
  AttentionList,
  type AttentionListProps,
  type AttentionListItem,
  type AttentionSeverity,
} from "./attention-list";

/* charts */
export {
  ChartCard,
  TrendArea,
  type ChartCardProps,
  type TrendAreaProps,
} from "./chart-card";
export {
  FunnelBars,
  type FunnelBarsProps,
  type FunnelStage,
} from "./funnel-bars";

/* forms / filters */
export {
  FilterBar,
  Select,
  DateRangeSelect,
  DATE_RANGE_PRESETS,
  type FilterBarProps,
  type SelectProps,
  type SelectOption,
  type DateRangePreset,
  type DateRangeSelectProps,
} from "./filter-bar";

/* feedback / states */
export {
  LoadingState,
  EmptyState,
  ErrorState,
  PermissionState,
  Skeleton,
  type SkeletonProps,
} from "./states";

/* signature compositions */
export {
  WelcomeNote,
  type WelcomeNoteProps,
  type WelcomeNoteAction,
} from "./welcome-note";
export {
  PunchCard,
  type PunchCardProps,
  type PunchStatus,
  type PunchAction as PunchCardAction,
} from "./punch-card";
