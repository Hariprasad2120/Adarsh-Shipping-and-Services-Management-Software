import type { LucideIcon } from "lucide-react";
import {
  AccountingActionLink,
  AccountingPanel,
} from "@/components/monolith/accounting-workspace";

export type AccountingWorkflowCardItem = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

export function AccountingWorkflowCards({
  items,
}: {
  items: AccountingWorkflowCardItem[];
}) {
  return (
    <div className="mnx-accounting-card-grid mnx-accounting-workflow-grid">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <AccountingPanel className="mnx-accounting-workflow-card" key={item.href}>
            <header className="mnx-accounting-workflow-card-header">
              <span className="mnx-accounting-workflow-card-icon">
                <Icon aria-hidden="true" size={18} />
              </span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            </header>
            <footer className="mnx-accounting-workflow-card-footer">
              <AccountingActionLink href={item.href}>
                Open {item.title}
              </AccountingActionLink>
            </footer>
          </AccountingPanel>
        );
      })}
    </div>
  );
}
