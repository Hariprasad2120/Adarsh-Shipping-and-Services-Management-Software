import Link from "next/link";
import { WorkspaceEmptyState } from "@/components/feedback/workspace-states";
import { ButtonLink } from "@/components/ui/button";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { listPendingChaQuoteProcesses } from "@/modules/crm/quote-process";
import { ChaPageHeader } from "@/modules/cha/components/workspace/cha-operations-shared";
import {
  ChaSection,
  ChaStatus,
  ChaTable,
} from "@/modules/cha/components/workspace/cha-workspace";
import { redirect } from "next/navigation";

export default async function ChaProcessPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) redirect("/setup");

  await requirePermission(session.user.id, "cha.job.read");
  const items = await listPendingChaQuoteProcesses(orgId);

  return (
    <div className="space-y-8">
      <ChaPageHeader
        eyebrow="Customs operations"
        title="Process"
        description="Approved quotations land here first for customs processing. Open a quotation to create the real CHA job and complete the remaining operational details."
      />

      <ChaSection
        index="01"
        title="CHA process queue"
        description="Only quotation details are shown here until a job is created from the process page."
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
                        {new Date(item.createdAt).toLocaleDateString("en-GB")}
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
                  <td>
                    <ChaStatus>Awaiting processing</ChaStatus>
                  </td>
                  <td className="text-right">
                    <Link
                      href={`/cha/process/${item.id}`}
                      className="inline-flex items-center rounded-xl bg-[var(--mnx-surface)] px-3 py-2 text-xs font-semibold text-[var(--mnx-text-strong)]"
                    >
                      Open
                    </Link>
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
