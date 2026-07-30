import type { ReactNode } from "react";
import {
  ChaMetric,
  ChaMetrics,
  ChaPanel,
  ChaRoutePageHeader,
  ChaSection,
} from "@/modules/cha/components/workspace/cha-workspace";
import { cn } from "@/lib/utils";
import { WorkspaceSectionHeading } from "@/components/layout/workspace";

export type AccentTone = "cyan" | "orange" | "green" | "violet" | "blue";
export { ChaMetrics };

export function ChaPageHeader({
  eyebrow,
  title,
  description,
  graphic,
  icon,
  actions,
}: {
  eyebrow: ReactNode;
  title: string;
  description?: string;
  graphic?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <ChaRoutePageHeader
      eyebrow={eyebrow}
      title={title}
      description={description}
      graphic={graphic}
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
  icon?: ReactNode;
  accent?: AccentTone;
}) {
  return <ChaMetric label={title} value={value} detail={note} icon={icon} />;
}

export function ChaControlPanel({
  title,
  description,
  children,
  actions,
  contentClassName,
  index = "01",
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  contentClassName?: string;
  index?: ReactNode;
}) {
  return (
    <section className="mnx-cha-section-block">
      <WorkspaceSectionHeading
        className="mnx-cha-outside-heading"
        index={index}
        title={title}
        description={description}
        actions={actions}
      />
      <ChaPanel>
        {children ? (
          <div className={cn("mnx-cha-section-content", contentClassName)}>
            {children}
          </div>
        ) : null}
      </ChaPanel>
    </section>
  );
}

export function ChaSectionShell({
  title,
  description,
  badge,
  actions,
  children,
  index,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  badge?: string;
  count?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  accent?: AccentTone;
  index?: ReactNode;
}) {
  return (
    <ChaSection
      index={index}
      title={title}
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
