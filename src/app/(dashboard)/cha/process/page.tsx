import { WorkspaceEmptyState } from "@/components/feedback/workspace-states";
import { ButtonLink } from "@/components/ui/button";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { listPendingChaQuoteProcesses } from "@/modules/crm/quote-process";
import {
  ChaMetricCard,
  ChaMetrics,
  ChaPageHeader,
} from "@/modules/cha/components/workspace/cha-operations-shared";
import {
  ChaSection,
  ChaStatus,
  ChaTable,
} from "@/modules/cha/components/workspace/cha-workspace";
import { redirect } from "next/navigation";

function formatQueueDate(value: Date | string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatWaiting(value: Date | string) {
  const days = Math.floor(
    (Date.now() - new Date(value).getTime()) / (24 * 60 * 60 * 1000),
  );
  if (days <= 0) return "Today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

export default async function ChaProcessPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) redirect("/setup");

  await requirePermission(session.user.id, "cha.job.read");
  const items = await listPendingChaQuoteProcesses(orgId);

  const oldest = items.reduce<Date | null>((acc, item) => {
    const created = new Date(item.createdAt);
    return !acc || created < acc ? created : acc;
  }, null);
  const distinctCustomers = new Set(items.map((item) => item.customerName)).size;

  return (
    <div className="space-y-8">
      <ChaPageHeader
        eyebrow="Customs operations"
        title="Process"
        description="Approved quotations land here first for customs processing. Open a quotation to create the real CHA job and complete the remaining operational details."
      />

      <ChaMetrics>
        <ChaMetricCard
          title="Awaiting Processing"
          value={items.length}
          note="Approved quotations not yet converted into a CHA job"
        />
        <ChaMetricCard
          title="Customers Waiting"
          value={distinctCustomers}
          note="Distinct customer accounts in the processing queue"
        />
        <ChaMetricCard
          title="Oldest In Queue"
          value={oldest ? formatWaiting(oldest) : "—"}
          note="Time the earliest quotation has been waiting for processing"
        />
      </ChaMetrics>

      <ChaSection
        index="01"
        title="Approved Quotations"
        description="Open a quotation to create the CHA job and capture the remaining operational details."
      >
        {items.length === 0 ? (
          <div className="mnx-panel-state">
            <WorkspaceEmptyState
              title="No CHA quotations are waiting for processing"
              description="New customs quotations from CRM will appear here after booking creation."
            />
            <div className="mt-4 flex justify-center">
              <ButtonLink href="/crm/quotes" variant="accent">
                Review quotations
              </ButtonLink>
            </div>
          </div>
        ) : (
          <ChaTable aria-label="CHA process queue table">
            <thead>
              <tr>
                <th>Quotation</th>
                <th>Customer</th>
                <th>Reference</th>
                <th>Location</th>
                <th>Commodity</th>
                <th>Waiting</th>
                <th>Status</th>
                <th className="text-right">Open</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="flex flex-col">
                      <span className="font-semibold">{item.quoteNumber}</span>
                      <span className="text-xs mnx-text-muted">
                        {formatQueueDate(item.createdAt)}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-col">
                      <span>{item.customerName}</span>
                      <span className="text-xs mnx-text-muted">
                        {item.ownerName || "Owner not assigned"}
                      </span>
                    </div>
                  </td>
                  <td>{item.referenceNumber}</td>
                  <td>{item.location || item.portOfLoading || "Not captured"}</td>
                  <td>{item.commodity || "Not captured"}</td>
                  <td className="mnx-text-muted">{formatWaiting(item.createdAt)}</td>
                  <td>
                    <ChaStatus>Awaiting processing</ChaStatus>
                  </td>
                  <td className="text-right">
                    <ButtonLink
                      href={`/cha/process/${item.id}`}
                      variant="outline"
                      size="sm"
                    >
                      Open
                    </ButtonLink>
                  </td>
                </tr>
              ))}
            </tbody>
          </ChaTable>
        )}
      </ChaSection>
    </div>
  );
}
