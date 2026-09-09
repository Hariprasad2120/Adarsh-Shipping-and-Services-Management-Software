/**
 * DASHBOARD WIDGET KIT — transitional barrel.
 *
 * ⚠️  This namespace is being folded into the ONE Monolith design system.
 *     - `Card`     → re-exports the canonical `@/components/ui` Card
 *                    (variant="interactive" | "flat" | "plain").
 *     - `DsButton` → re-exports the canonical `@/components/ui` Button.
 *     The remaining entries (MetricCard, StatGrid, SectionHeader,
 *     DefinitionList, QuickActions, FilterBar, StatusBadge, TrendBadge) are
 *     dashboard COMPOSITIONS built strictly on those canonical primitives and
 *     the shared token layer — not a competing system.
 *
 * New code: import primitives from `@/components/ui` and page/section
 * structure from `@/components/monolith`. Do not add new exports here.
 */

export { Card, type CardProps, type CardVariant, type CardPad } from "./ds-card";
export {
  StatusBadge,
  TrendBadge,
  type StatusBadgeProps,
  type TrendBadgeProps,
  type BadgeTone,
  type TrendDirection,
} from "./ds-badge";
export {
  DsButton,
  DsButtonLink,
  type DsButtonProps,
  type DsButtonLinkProps,
  type DsButtonVariant,
  type DsButtonSize,
} from "./ds-button";
export {
  SectionHeader,
  type SectionHeaderProps,
} from "./section-header";
export {
  MetricCard,
  StatGrid,
  type MetricCardProps,
  type MetricTrend,
  type StatGridProps,
} from "./metric-card";
export {
  QuickActions,
  DefinitionList,
  type QuickAction,
  type QuickActionsProps,
  type DefinitionItem,
} from "./quick-actions";
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
