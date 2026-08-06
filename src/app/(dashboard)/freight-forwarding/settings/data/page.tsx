import {
  Database,
  FolderX,
  Settings2,
  ShieldAlert,
} from "lucide-react";
import { WorkspacePermissionState } from "@/components/feedback/workspace-states";
import {
  WorkspaceAlert,
  WorkspaceBadge,
  WorkspaceMetric,
  WorkspacePage,
  WorkspacePageHeader,
  WorkspacePanel,
  WorkspacePanelHeader,
  WorkspaceSectionHeading,
} from "@/components/layout/workspace";
import { ButtonLink } from "@/components/ui/button";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import {
  groupFreightBookingTransactions,
  listFreightBookingTransactions,
} from "@/modules/freight-forwarding/service";
import { redirect } from "next/navigation";
import { DeleteFreightForwardingDataAction } from "./delete-freight-forwarding-data-action";

export const metadata = {
  title: "Freight Forwarding Data | Adarsh Shipping",
};

export default async function FreightForwardingDataSettingsPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");
  if (!session.user.orgId) redirect("/login");

  const [transactions, canManageDelete] = await Promise.all([
    listFreightBookingTransactions(session.user.orgId),
    can(session.user.id, "admin.org.manage"),
  ]);
  const bookingGroups = groupFreightBookingTransactions(transactions);
  const mblCount = transactions.filter(
    (transaction) => transaction.transactionType === "MBL",
  ).length;
  const hblCount = transactions.length - mblCount;

  return (
    <WorkspacePage>
      <WorkspacePageHeader
        eyebrow="Freight forwarding data"
        title="Data management"
        description="Review the current Freight Forwarding record volume and use the guarded cleanup action only when a full module reset is required."
        actions={
          <ButtonLink href="/freight-forwarding/settings" variant="inverse">
            Back to settings
          </ButtonLink>
        }
      />

      <section
        className="mnx-workspace-metrics"
        aria-label="Freight forwarding data summary"
      >
        <WorkspaceMetric
          icon={<Database size={17} aria-hidden="true" />}
          label="Transactions"
          value={transactions.length}
          detail="All stored Freight Forwarding booking transactions"
        />
        <WorkspaceMetric
          icon={<FolderX size={17} aria-hidden="true" />}
          label="Booking groups"
          value={bookingGroups.length}
          detail="Linked MBL and HBL booking sets"
        />
        <WorkspaceMetric
          icon={<Settings2 size={17} aria-hidden="true" />}
          label="Bill split"
          value={`${mblCount} MBL / ${hblCount} HBL`}
          detail="Current register distribution"
        />
      </section>

      <WorkspaceSectionHeading
        index="01"
        title="Danger zone"
        description="This action permanently removes Freight Forwarding transactions, linked booking groups, and the associated CRM approval log entries."
        badge={<WorkspaceBadge variant="danger">Irreversible</WorkspaceBadge>}
      />

      <WorkspacePanel>
        <WorkspacePanelHeader
          eyebrow="Admin-only cleanup"
          title="Delete all Freight Forwarding data"
          description="Use this only for controlled local reset scenarios when the module needs to be cleared completely."
          actions={<ShieldAlert aria-hidden="true" />}
        />
        <div className="space-y-4 px-5 pb-5">
          <WorkspaceAlert variant="danger">
            This permanently deletes all Freight Forwarding transactions,
            booking links, and audit records for this organisation. There is no
            undo.
          </WorkspaceAlert>

          {canManageDelete ? (
            <div className="space-y-3">
              <p className="mnx-text-muted text-sm leading-6">
                You will be asked to type{" "}
                <strong>DELETE ALL FREIGHT DATA</strong> before the purge runs.
              </p>
              <DeleteFreightForwardingDataAction
                disabled={transactions.length === 0}
              />
            </div>
          ) : (
            <WorkspacePermissionState
              title="Administrator approval required"
              description="Only organisation administrators can run the Freight Forwarding full-data deletion action."
            />
          )}
        </div>
      </WorkspacePanel>
    </WorkspacePage>
  );
}
