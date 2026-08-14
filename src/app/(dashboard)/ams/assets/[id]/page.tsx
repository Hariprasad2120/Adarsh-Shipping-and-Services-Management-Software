import NextLink from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Settings,
  ShieldAlert,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { getAsset } from "@/modules/accounting/service";
import {
  PerformanceActionLink,
  PerformanceGrid,
  PerformanceSection,
  PerformanceSectionHeader,
  PerformanceTable,
  PerformanceTableBody,
  PerformanceTableCell,
  PerformanceTableHead,
  PerformanceTableHeader,
  PerformanceTableRow,
} from "@/modules/performance/components/performance-workspace";
import {
  WorkspaceBadge,
  WorkspaceState,
} from "@/components/layout/workspace";

interface AssetDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AssetDetailPage({
  params,
}: AssetDetailPageProps) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) {
    return (
      <WorkspaceState
        variant="danger"
        eyebrow="Asset operations"
        title="Configuration error"
        description="Missing organisation context."
        icon={<ShieldAlert aria-hidden="true" />}
      />
    );
  }

  const { id } = await params;
  const asset = await getAsset(orgId, id);

  if (!asset) notFound();

  const purchaseValue = Number(asset.purchaseValue);
  const accumulatedDepreciation = Number(asset.accumulatedDepreciation);
  const bookValue = Number(asset.bookValue);

  return (
    <div className="space-y-6">
      <PerformanceSection>
        <PerformanceSectionHeader
          eyebrow="Asset record"
          title={asset.assetName}
          description={`Asset code ${asset.assetCode} with assignment, value, and depreciation history.`}
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <WorkspaceBadge
                variant={asset.status === "ACTIVE" ? "success" : "warning"}
              >
                {asset.status.replace("_", " ")}
              </WorkspaceBadge>
              <PerformanceActionLink href="/ams/assets">
                <ArrowLeft size={14} aria-hidden="true" />
                Back to register
              </PerformanceActionLink>
            </div>
          }
        />

        <div className="px-5 pb-5">
          <PerformanceGrid className="grid-cols-1 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <article className="mnx-performance-card">
              <div className="flex items-center gap-3 border-b border-[var(--mnx-border)] pb-3">
                <span className="mnx-icon-badge">
                  <Settings aria-hidden="true" />
                </span>
                <div>
                  <h2 className="mnx-title-3">Asset profile</h2>
                  <p className="mnx-text-muted text-sm">
                    Key ownership, acquisition, and value details.
                  </p>
                </div>
              </div>

              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4 border-b border-[var(--mnx-border)] pb-3">
                  <dt className="mnx-text-muted">Acquisition date</dt>
                  <dd className="font-medium">
                    {asset.purchaseDate.toLocaleDateString("en-IN")}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 border-b border-[var(--mnx-border)] pb-3">
                  <dt className="mnx-text-muted">Original cost</dt>
                  <dd className="mnx-numeric font-semibold">
                    Rs.{" "}
                    {purchaseValue.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 border-b border-[var(--mnx-border)] pb-3">
                  <dt className="mnx-text-muted">Depreciation rate</dt>
                  <dd className="font-medium">{asset.depreciationRate}% p.a.</dd>
                </div>
                <div className="flex items-center justify-between gap-4 border-b border-[var(--mnx-border)] pb-3">
                  <dt className="mnx-text-muted">Accumulated depreciation</dt>
                  <dd className="mnx-numeric font-semibold">
                    Rs.{" "}
                    {accumulatedDepreciation.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="font-semibold text-[var(--mnx-accent-text)]">
                    Net book value
                  </dt>
                  <dd className="mnx-numeric font-semibold text-[var(--mnx-accent-text)]">
                    Rs.{" "}
                    {bookValue.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </dd>
                </div>
              </dl>
            </article>

            <article className="mnx-performance-card">
              <div className="flex items-center gap-3 border-b border-[var(--mnx-border)] pb-3">
                <span className="mnx-icon-badge">
                  <Calendar aria-hidden="true" />
                </span>
                <div>
                  <h2 className="mnx-title-3">Depreciation journal history</h2>
                  <p className="mnx-text-muted text-sm">
                    Monthly straight-line depreciation postings linked to this asset.
                  </p>
                </div>
              </div>

              {asset.depreciationEntries.length === 0 ? (
                <div className="mnx-empty-state mt-5">
                  No depreciation postings are registered yet. Apply monthly runs
                  from the asset register.
                </div>
              ) : (
                <div className="mt-5">
                  <PerformanceTable>
                    <PerformanceTableHeader>
                      <PerformanceTableRow>
                        <PerformanceTableHead>
                          Depreciation date
                        </PerformanceTableHead>
                        <PerformanceTableHead>
                          Applied amount
                        </PerformanceTableHead>
                        <PerformanceTableHead>
                          Linked journal entry
                        </PerformanceTableHead>
                      </PerformanceTableRow>
                    </PerformanceTableHeader>
                    <PerformanceTableBody>
                      {asset.depreciationEntries.map((entry) => {
                        const depDate = new Date(entry.depreciationDate);
                        const monthStr = depDate.toLocaleString("en-IN", {
                          month: "long",
                          year: "numeric",
                        });

                        return (
                          <PerformanceTableRow key={entry.id}>
                            <PerformanceTableCell className="font-medium">
                              {monthStr}
                            </PerformanceTableCell>
                            <PerformanceTableCell className="mnx-numeric font-semibold">
                              Rs.{" "}
                              {Number(entry.depreciationAmount).toLocaleString(
                                "en-IN",
                                { minimumFractionDigits: 2 },
                              )}
                            </PerformanceTableCell>
                            <PerformanceTableCell>
                              {entry.journalEntry ? (
                                <NextLink
                                  href={`/accounting/journal-entries/${entry.journalEntry.id}`}
                                  className="mnx-performance-record-link"
                                >
                                  {entry.journalEntry.voucherNo}
                                </NextLink>
                              ) : (
                                <span className="mnx-text-muted">Not linked</span>
                              )}
                            </PerformanceTableCell>
                          </PerformanceTableRow>
                        );
                      })}
                    </PerformanceTableBody>
                  </PerformanceTable>
                </div>
              )}
            </article>
          </PerformanceGrid>
        </div>
      </PerformanceSection>
    </div>
  );
}
