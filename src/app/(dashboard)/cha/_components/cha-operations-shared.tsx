import type { ReactNode } from "react";
import {
  ChaMetric,
  ChaMetrics,
  ChaPanel,
  ChaRoutePageHeader,
  ChaSection,
} from "@/components/monolith/cha-workspace";
import { WorkspacePanelHeader } from "@/components/monolith/workspace";
import { cn } from "@/lib/utils";

export type AccentTone = "cyan" | "orange" | "green" | "violet" | "blue";
export { ChaMetrics };

export function ChaPageHeader({
  eyebrow,
  title,
  description,
  icon,
  actions,
}: {
  eyebrow: ReactNode;
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <ChaRoutePageHeader
      eyebrow={eyebrow}
      title={title}
      description={description}
      icon={icon}
      actions={actions}
    />
  );
}

export function ChaMetricCard({
  title,
  value,
  note,
  icon,
}: {
  title: string;
  value: ReactNode;
  note?: string;
  icon: ReactNode;
  accent?: AccentTone;
}) {
  return <ChaMetric label={title} value={value} detail={note} icon={icon} />;
}

export function ChaControlPanel({
  title,
  description,
  icon,
  children,
  actions,
  contentClassName,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  contentClassName?: string;
}) {
  return (
    <ChaPanel>
      <WorkspacePanelHeader
        eyebrow="Operations"
        title={
          <span className="mnx-cha-section-title">
            {icon}
            {title}
          </span>
        }
        description={description}
        actions={actions}
      />
      {children ? (
        <div className={cn("mnx-cha-section-content", contentClassName)}>
          {children}
        </div>
      ) : null}
    </ChaPanel>
  );
}

export function ChaSectionShell({
  title,
  description,
  icon,
  badge,
  actions,
  children,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  badge?: string;
  count?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  accent?: AccentTone;
}) {
  return (
    <ChaSection
      eyebrow="Customs operations"
      title={
        <span className="mnx-cha-section-title">
          {icon}
          {title}
        </span>
      }
      description={description}
      badge={badge}
      actions={actions}
    >
      {children}
    </ChaSection>
  );
}

export function ChaVisibleRecords({
  visible,
  total,
}: {
  visible: number;
  total: number;
  tone?: AccentTone;
}) {
  return (
    <div className="mnx-cha-visible-records">
      <strong>{visible}</strong>
      <span>
        Visible records
        <small>
          {visible} / {total}
        </small>
      </span>
    </div>
  );
}
