import type { ReactNode } from "react";
import Link from "next/link";
import {
  Bell,
  BriefcaseBusiness,
  ExternalLink,
  FileSearch,
  MessagesSquare,
  PackageCheck,
  Star,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableEmpty,
  DataTableHead,
  DataTableHeader,
  DataTableToolbar,
} from "@/components/data-table";
import { requirePortalSession } from "@/modules/customer-portal/auth";
import { getCustomerPortalDashboardData } from "@/modules/customer-portal/dashboard";

export default async function CustomerPortalDashboardPage() {
  const session = await requirePortalSession();
  const dashboard = await getCustomerPortalDashboardData(session);

  return (
    <div className="space-y-6">
      <section className="card-top-accent rounded-xl border border-outline-variant/50 bg-surface px-5 py-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="ds-label">CHA Customer Dashboard</p>
            <h2 className="ds-h1 text-on-surface">Account Shipment Overview</h2>
            <p className="max-w-3xl text-sm text-on-surface-variant">
              Track active CHA jobs, customer-facing updates, checklist decisions, queries, notifications, and any extra
              documents you have shared for{" "}
              {session.portalUser.customer.name}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/customer-portal/shipments">
              <Button variant="outline" size="sm" className="gap-1.5">
                Shipments
                <ExternalLink className="size-3.5" />
              </Button>
            </Link>
            <Link href="/customer-portal/notifications">
              <Button size="sm" className="gap-1.5">
                Notifications
                <Bell className="size-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Active Jobs"
          value={dashboard.topStats.activeJobs}
          helper="Shipments currently moving through CHA operations"
          href="/customer-portal/shipments"
          icon={<BriefcaseBusiness size={16} />}
        />
        <StatCard
          title="Awaiting Your Action"
          value={dashboard.topStats.awaitingCustomerAction}
          helper="Jobs with checklist or query follow-up"
          href="/customer-portal/shipments"
          icon={<TriangleAlert size={16} />}
          tone={dashboard.topStats.awaitingCustomerAction > 0 ? "warning" : "primary"}
        />
        <StatCard
          title="Open Queries"
          value={dashboard.topStats.openQueries}
          helper="Customer-visible query threads still in progress"
          href="/customer-portal/shipments"
          icon={<MessagesSquare size={16} />}
        />
        <StatCard
          title="Unread Notifications"
          value={dashboard.topStats.unreadNotifications}
          helper="Portal alerts that have not been read yet"
          href="/customer-portal/notifications"
          icon={<Bell size={16} />}
          tone={dashboard.topStats.unreadNotifications > 0 ? "warning" : "primary"}
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-7">
          <ActionRequiredTable data={dashboard} />
          <RecentUpdatesPanel data={dashboard} />
          <OutstandingQueriesTable data={dashboard} />
        </div>

        <div className="space-y-6 xl:col-span-5">
          <ShipmentSnapshotCard data={dashboard} />
          <DocumentStatusCard data={dashboard} />
          <NotificationSummaryCard data={dashboard} />
        </div>
      </section>

      <section>
        <ServiceFeedbackCard data={dashboard} />
      </section>
    </div>
  );
}

function StatCard({
  title,
  value,
  helper,
  href,
  icon,
  tone = "primary",
}: {
  title: string;
  value: number;
  helper: string;
  href: string;
  icon: ReactNode;
  tone?: "primary" | "warning";
}) {
  const iconStyle = tone === "warning"
    ? { background: "rgba(251,146,60,0.10)", color: "#fb923c" }
    : undefined;

  return (
    <Link href={href} className="block">
      <Card
        className={`rounded-xl border-outline-variant/40 bg-surface p-5 transition-all hover:-translate-y-0.5 hover-cyan ${
          tone === "warning" ? "card-top-accent-orange" : "card-top-accent"
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <p className="ds-label">{title}</p>
            <p className={`text-3xl text-on-surface ds-numeric ${tone === "warning" && value > 0 ? "text-[#fb923c]" : ""}`}>
              {value}
            </p>
          </div>
          <span className="ds-icon-badge" style={iconStyle}>
            {icon}
          </span>
        </div>
        <p className="mt-3 text-xs text-on-surface-variant">{helper}</p>
      </Card>
    </Link>
  );
}

function ActionRequiredTable({
  data,
}: {
  data: Awaited<ReturnType<typeof getCustomerPortalDashboardData>>;
}) {
  const error = data.sectionErrors.actionRequired;

  return (
    <DataTable className="border border-outline-variant/45">
      <DataTableToolbar className="bg-surface">
        <div className="flex items-center gap-3">
          <span className="ds-icon-badge" style={{ background: "rgba(251,146,60,0.10)", color: "#fb923c" }}>
            <TriangleAlert size={16} />
          </span>
          <div>
            <h2 className="ds-h2 text-on-surface">Action Required</h2>
          </div>
        </div>
        <Link href="/customer-portal/shipments">
          <Button variant="outline" size="sm">Open Shipments</Button>
        </Link>
      </DataTableToolbar>
      {error ? (
        <SectionErrorRow colSpan={4} message={error} />
      ) : (
        <>
          <DataTableHeader>
            <tr>
              <DataTableHead>Shipment</DataTableHead>
              <DataTableHead>Task</DataTableHead>
              <DataTableHead>Status</DataTableHead>
              <DataTableHead>Updated</DataTableHead>
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {data.actionRequired.length === 0 ? (
              <DataTableEmpty colSpan={4} message="No customer action is pending right now." />
            ) : (
              data.actionRequired.map((item) => (
                <tr key={item.id}>
                  <DataTableCell className="font-medium">
                    <Link href={item.href} className="text-[#00cec4] transition-colors hover:text-[#00b8af]">
                      {item.jobNumber}
                    </Link>
                  </DataTableCell>
                  <DataTableCell>
                    <div className="font-medium text-on-surface">{item.title}</div>
                    <div className="mt-1 text-xs text-on-surface-variant">{truncate(item.detail, 52)}</div>
                  </DataTableCell>
                  <DataTableCell>
                    <Badge variant={badgeVariantForStatus(item.status, item.tone === "warning")}>{item.status}</Badge>
                  </DataTableCell>
                  <DataTableCell className="text-on-surface-variant">
                    <div>{formatDateTime(item.updatedAt)}</div>
                  </DataTableCell>
                </tr>
              ))
            )}
          </DataTableBody>
        </>
      )}
    </DataTable>
  );
}

function RecentUpdatesPanel({
  data,
}: {
  data: Awaited<ReturnType<typeof getCustomerPortalDashboardData>>;
}) {
  const error = data.sectionErrors.recentUpdates;

  return (
    <Card className="card-top-accent rounded-xl border border-outline-variant/45">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <span className="ds-icon-badge">
            <PackageCheck size={16} />
          </span>
          <div>
            <CardTitle>Recent Shipment Updates</CardTitle>
            <p className="text-xs text-on-surface-variant">Latest customer-safe activity from your CHA workflow.</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? (
          <SectionFallback message={error} />
        ) : data.recentUpdates.length === 0 ? (
          <SectionFallback message="No recent customer-facing shipment updates are available yet." />
        ) : (
          data.recentUpdates.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="card-left-accent block rounded-xl border border-outline-variant/45 bg-surface-container-low/30 p-4 transition-all hover-cyan"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-on-surface">{item.title}</p>
                  <p className="text-xs text-on-surface-variant">{item.jobNumber} • {item.stageLabel}</p>
                  <p className="text-sm text-on-surface-variant">{item.detail}</p>
                </div>
                <span className="text-[11px] uppercase tracking-[0.16em] text-on-surface-variant">
                  {formatDateTime(item.occurredAt)}
                </span>
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function OutstandingQueriesTable({
  data,
}: {
  data: Awaited<ReturnType<typeof getCustomerPortalDashboardData>>;
}) {
  const error = data.sectionErrors.outstandingQueries;

  return (
    <DataTable className="border border-outline-variant/45">
      <DataTableToolbar className="bg-surface">
        <div className="flex items-center gap-3">
          <span className="ds-icon-badge">
            <MessagesSquare size={16} />
          </span>
          <div>
            <h2 className="ds-h2 text-on-surface">Outstanding Queries</h2>
            <p className="text-xs text-on-surface-variant">Open threads and customer-response deadlines across your jobs.</p>
          </div>
        </div>
      </DataTableToolbar>
      {error ? (
        <SectionErrorRow colSpan={4} message={error} />
      ) : (
        <>
          <DataTableHeader>
            <tr>
              <DataTableHead>Shipment</DataTableHead>
              <DataTableHead>Query</DataTableHead>
              <DataTableHead>Status</DataTableHead>
              <DataTableHead>Last Activity</DataTableHead>
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {data.outstandingQueries.length === 0 ? (
              <DataTableEmpty colSpan={4} message="No open customer query threads are pending." />
            ) : (
              data.outstandingQueries.map((query) => (
                <tr key={query.id}>
                  <DataTableCell className="font-medium">
                    <Link href={query.href} className="text-[#00cec4] transition-colors hover:text-[#00b8af]">
                      {query.jobNumber}
                    </Link>
                    <div className="mt-1 text-xs text-on-surface-variant">{query.jobTitle}</div>
                  </DataTableCell>
                  <DataTableCell>
                    <div className="font-medium text-on-surface">{query.title}</div>
                    <div className="mt-1 text-xs text-on-surface-variant">{query.detail}</div>
                    {query.lastMessagePreview ? (
                      <div className="mt-1 text-xs text-on-surface-variant">Latest: {truncate(query.lastMessagePreview, 88)}</div>
                    ) : null}
                  </DataTableCell>
                  <DataTableCell>
                    <div className="flex flex-col gap-2">
                      <Badge variant={badgeVariantForStatus(query.status, query.requiresCustomerAction)}>{query.status}</Badge>
                      <span className="text-[11px] uppercase tracking-[0.16em] text-on-surface-variant">
                        {query.priority} • {query.stageLabel}
                      </span>
                      {query.requiredResponseBy ? (
                        <span className="text-xs text-on-surface-variant">Due {formatDate(query.requiredResponseBy)}</span>
                      ) : null}
                    </div>
                  </DataTableCell>
                  <DataTableCell className="text-on-surface-variant">
                    {query.lastMessageAt
                      ? formatDateTime(query.lastMessageAt)
                      : query.requiredResponseBy
                        ? `Due ${formatDate(query.requiredResponseBy)}`
                        : "—"}
                  </DataTableCell>
                </tr>
              ))
            )}
          </DataTableBody>
        </>
      )}
    </DataTable>
  );
}

function ShipmentSnapshotCard({
  data,
}: {
  data: Awaited<ReturnType<typeof getCustomerPortalDashboardData>>;
}) {
  const summary = data.shipmentSnapshot;

  return (
    <Card className="card-top-accent rounded-xl border border-outline-variant/45">
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="ds-icon-badge">
            <BriefcaseBusiness size={16} />
          </span>
          <div>
            <CardTitle>My Shipments Snapshot</CardTitle>
            <p className="text-xs text-on-surface-variant">A quick job-level view of your CHA account activity.</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.sectionErrors.shipmentSnapshot ? (
          <SectionFallback message={data.sectionErrors.shipmentSnapshot} />
        ) : summary.totalJobs === 0 ? (
          <SectionFallback message="No CHA jobs are linked to this customer account yet." />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <SnapshotMetric label="Total Jobs" value={summary.totalJobs} />
            <SnapshotMetric label="Active Jobs" value={summary.activeJobs} />
            <SnapshotMetric label="In Progress" value={summary.inProgressJobs} />
            <SnapshotMetric
              label="Awaiting Customer"
              value={summary.awaitingCustomerJobs}
              tone={summary.awaitingCustomerJobs > 0 ? "warning" : "primary"}
            />
            <SnapshotMetric label="Recently Completed" value={summary.recentlyCompletedJobs} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DocumentStatusCard({
  data,
}: {
  data: Awaited<ReturnType<typeof getCustomerPortalDashboardData>>;
}) {
  const error = data.sectionErrors.documentStatus;
  const counts = data.documentStatus.counts;

  return (
    <Card className="card-top-accent rounded-xl border border-outline-variant/45">
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="ds-icon-badge">
            <FileSearch size={16} />
          </span>
          <div>
            <CardTitle>Additional Documents Shared</CardTitle>
            <p className="text-xs text-on-surface-variant">Status of extra customer files that were shared from the portal.</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <SectionFallback message={error} />
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <StatusCount label="Uploaded" count={counts.uploaded} variant="default" />
              <StatusCount label="Under Review" count={counts.underReview} variant="secondary" />
              <StatusCount label="Accepted" count={counts.accepted} variant="success" />
              <StatusCount label="Rejected" count={counts.rejected} variant="destructive" />
              <StatusCount label="Clarification" count={counts.clarificationRequired} variant="warning" />
              <StatusCount label="Re-upload" count={counts.reuploadRequired} variant="warning" />
            </div>

            <DataTable className="border border-outline-variant/35 shadow-none">
              <DataTableHeader>
                <tr>
                  <DataTableHead>Shipment</DataTableHead>
                  <DataTableHead>Requirement</DataTableHead>
                  <DataTableHead>Status</DataTableHead>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                {data.documentStatus.recentItems.length === 0 ? (
                  <DataTableEmpty colSpan={3} message="No additional customer documents have been shared yet." />
                ) : (
                  data.documentStatus.recentItems.map((item) => (
                    <tr key={item.id}>
                      <DataTableCell className="font-medium">
                        <Link href={item.href} className="text-[#00cec4] transition-colors hover:text-[#00b8af]">
                          {item.jobNumber}
                        </Link>
                        <div className="mt-1 text-xs text-on-surface-variant">{formatDateTime(item.updatedAt)}</div>
                      </DataTableCell>
                      <DataTableCell>
                        <div className="font-medium text-on-surface">{item.requirementName}</div>
                        {item.reviewerComment ? (
                          <div className="mt-1 text-xs text-on-surface-variant">{truncate(item.reviewerComment, 88)}</div>
                        ) : null}
                      </DataTableCell>
                      <DataTableCell>
                        <Badge variant={badgeVariantForStatus(item.status, true)}>{item.status}</Badge>
                      </DataTableCell>
                    </tr>
                  ))
                )}
              </DataTableBody>
            </DataTable>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function NotificationSummaryCard({
  data,
}: {
  data: Awaited<ReturnType<typeof getCustomerPortalDashboardData>>;
}) {
  const error = data.sectionErrors.notificationSummary;

  return (
    <Card className="card-top-accent rounded-xl border border-outline-variant/45">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="ds-icon-badge">
              <Bell size={16} />
            </span>
            <div>
              <CardTitle>Notifications Summary</CardTitle>
              <p className="text-xs text-on-surface-variant">Recent portal alerts for this signed-in customer contact.</p>
            </div>
          </div>
          <Link href="/customer-portal/notifications">
            <Button variant="outline" size="sm">Open</Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <SectionFallback message={error} />
        ) : (
          <>
            <div className="rounded-xl border border-outline-variant/40 bg-surface-container-low/50 px-4 py-3">
              <p className="ds-label">Unread Alerts</p>
              <p className={`mt-2 text-3xl ds-numeric ${data.notificationSummary.unreadCount > 0 ? "text-[#fb923c]" : "text-on-surface"}`}>
                {data.notificationSummary.unreadCount}
              </p>
            </div>
            {data.notificationSummary.recent.length === 0 ? (
              <SectionFallback message="No customer portal notifications have been generated yet." />
            ) : (
              <div className="space-y-3">
                {data.notificationSummary.recent.map((notification) => (
                  <Link
                    key={notification.id}
                    href={notification.href || "/customer-portal/notifications"}
                    className={`block rounded-xl border px-4 py-3 transition-all hover-cyan ${
                      notification.readAt
                        ? "border-outline-variant/40 bg-surface-container-low/25"
                        : "card-left-accent-orange border-[#fb923c]/30 bg-surface"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-on-surface">{notification.title}</p>
                        {notification.body ? <p className="text-xs text-on-surface-variant">{truncate(notification.body, 96)}</p> : null}
                      </div>
                      <Badge variant={notification.readAt ? "secondary" : "warning"}>
                        {notification.readAt ? "Read" : "Unread"}
                      </Badge>
                    </div>
                    <div className="mt-2 text-[11px] uppercase tracking-[0.16em] text-on-surface-variant">
                      {notification.kind.replaceAll("_", " ")} • {formatDateTime(notification.createdAt)}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ServiceFeedbackCard({
  data,
}: {
  data: Awaited<ReturnType<typeof getCustomerPortalDashboardData>>;
}) {
  const error = data.sectionErrors.serviceFeedback;
  const hasNoFeedback =
    data.serviceFeedback.pending.length === 0 && data.serviceFeedback.recentSubmitted.length === 0;

  return (
    <Card className="card-top-accent rounded-xl border border-outline-variant/45">
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="ds-icon-badge">
            <Star size={16} />
          </span>
          <div>
            <CardTitle>Service Feedback</CardTitle>
            <p className="text-xs text-on-surface-variant">Completed shipments waiting for rating, plus recent submitted feedback.</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {error ? (
          <SectionFallback message={error} />
        ) : hasNoFeedback ? (
          <SectionFallback message="No feedback prompts or recent shipment ratings are available yet." />
        ) : (
          <>
            <div className="space-y-3">
              <p className="ds-label">Awaiting Rating</p>
              {data.serviceFeedback.pending.length === 0 ? (
                <p className="text-sm text-on-surface-variant">No completed shipments are waiting for a rating.</p>
              ) : (
                data.serviceFeedback.pending.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="card-left-accent block rounded-xl border border-outline-variant/45 bg-surface px-4 py-3 transition-all hover-cyan"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-on-surface">{item.jobNumber}</p>
                        <p className="text-xs text-on-surface-variant">{item.jobTitle} • {item.stageLabel}</p>
                      </div>
                      <Badge variant="warning">Pending Rating</Badge>
                    </div>
                  </Link>
                ))
              )}
            </div>

            <div className="space-y-3">
              <p className="ds-label">Recently Submitted</p>
              {data.serviceFeedback.recentSubmitted.length === 0 ? (
                <p className="text-sm text-on-surface-variant">No shipment ratings have been submitted by this contact yet.</p>
              ) : (
                data.serviceFeedback.recentSubmitted.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="block rounded-xl border border-outline-variant/45 bg-surface-container-low/30 px-4 py-3 transition-all hover-cyan"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-on-surface">{item.jobNumber}</p>
                        <p className="text-xs text-on-surface-variant">
                          {item.overallRating ? `${item.overallRating}/5 rating` : "Rating submitted"}
                          {item.categoryLabel ? ` • ${item.categoryLabel}` : ""}
                          {item.submittedAt ? ` • ${formatDate(item.submittedAt)}` : ""}
                        </p>
                      </div>
                      <Badge variant={item.followUpStatus === "CLOSED" ? "success" : "secondary"}>
                        {item.followUpStatus || "Submitted"}
                      </Badge>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function SnapshotMetric({
  label,
  value,
  tone = "primary",
}: {
  label: string;
  value: number;
  tone?: "primary" | "warning";
}) {
  return (
    <div className={`rounded-xl border px-4 py-4 ${tone === "warning" ? "border-[#fb923c]/35 bg-[#fb923c]/[0.06]" : "border-outline-variant/45 bg-surface-container-low/30"}`}>
      <p className="ds-label">{label}</p>
      <p className={`mt-2 text-2xl ds-numeric ${tone === "warning" ? "text-[#fb923c]" : "text-on-surface"}`}>{value}</p>
    </div>
  );
}

function StatusCount({
  label,
  count,
  variant,
}: {
  label: string;
  count: number;
  variant: React.ComponentProps<typeof Badge>["variant"];
}) {
  return (
    <Badge variant={variant}>
      {label}: <span className="ml-1 ds-numeric">{count}</span>
    </Badge>
  );
}

function SectionFallback({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-outline-variant/60 bg-surface-container-low/20 px-4 py-6 text-sm text-on-surface-variant">
      {message}
    </div>
  );
}

function SectionErrorRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <>
      <DataTableHeader>
        <tr>
          <DataTableHead>Section Status</DataTableHead>
        </tr>
      </DataTableHeader>
      <DataTableBody>
        <DataTableEmpty colSpan={colSpan} message={message} />
      </DataTableBody>
    </>
  );
}

function badgeVariantForStatus(status: string, emphasizeWarning = false): React.ComponentProps<typeof Badge>["variant"] {
  const normalized = status.toUpperCase();
  if (normalized.includes("REJECT") || normalized.includes("FAILED")) return "destructive";
  if (normalized.includes("ACCEPT") || normalized.includes("FILED") || normalized.includes("READ") || normalized.includes("CLOSED")) return "success";
  if (emphasizeWarning || normalized.includes("PENDING") || normalized.includes("REUPLOAD") || normalized.includes("CLARIFICATION") || normalized.includes("AWAITING")) {
    return "warning";
  }
  return "secondary";
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function truncate(value: string, limit: number) {
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
}
