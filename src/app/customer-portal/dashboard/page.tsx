import type { ReactNode } from "react";
import Link from "next/link";
import {
  Bell,
  ArrowUpRight,
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
  CustomerPortalMetrics,
  CustomerPortalPage,
  CustomerPortalPageHeader,
  CustomerPortalSectionHeading,
} from "@/components/monolith";
import { WorkspaceMetric } from "@/components/layout/workspace";
import {
  OperationalDataTable,
  OperationalDataTableHeader,
  OperationalDataTableWrap,
  OperationalTable,
  OperationalTableCell,
  OperationalTableEmpty,
  OperationalTableHead,
} from "@/components/data-display/operational-data-table";
import { requirePortalSession } from "@/modules/customer-portal/auth";
import { getCustomerPortalDashboardData } from "@/modules/customer-portal/dashboard";

export default async function CustomerPortalDashboardPage() {
  const session = await requirePortalSession();
  const dashboard = await getCustomerPortalDashboardData(session);

  return (
    <CustomerPortalPage>
      <CustomerPortalPageHeader
        eyebrow="CHA customer dashboard"
        title="Account Shipment Overview"
        description={
          <>
            Track active CHA jobs, customer-facing updates, checklist decisions,
            queries, notifications, and documents shared for{" "}
            {session.portalUser.customer.name}.
          </>
        }
        icon={<BriefcaseBusiness size={22} />}
        actions={
          <>
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
          </>
        }
      />

      <CustomerPortalMetrics>
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
          tone={
            dashboard.topStats.awaitingCustomerAction > 0
              ? "warning"
              : "primary"
          }
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
          tone={
            dashboard.topStats.unreadNotifications > 0 ? "warning" : "primary"
          }
        />
      </CustomerPortalMetrics>

      <CustomerPortalSectionHeading
        index="01"
        title="Operational priorities"
        description="Customer actions, recent workflow updates, document states, and query deadlines in one production workspace."
      />
      <section className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-7">
          <ActionRequiredTable data={dashboard} />
          <RecentUpdatesPanel data={dashboard} />
          <OutstandingQueriesTable data={dashboard} />
        </div>

        <div className="space-y-6 xl:col-span-5">
          <DocumentStatusCard data={dashboard} />
          <NotificationSummaryCard data={dashboard} />
        </div>
      </section>

      <section>
        <ServiceFeedbackCard data={dashboard} />
      </section>
    </CustomerPortalPage>
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
  return (
    <WorkspaceMetric
      href={href}
      actionLabel={`Open ${title}`}
      actionIcon={<ArrowUpRight size={15} />}
      icon={icon}
      label={title}
      value={value}
      detail={helper}
      className={
        tone === "warning" && value > 0 ? "mnx-portal-panel-warning" : undefined
      }
    />
  );
}

function ActionRequiredTable({
  data,
}: {
  data: Awaited<ReturnType<typeof getCustomerPortalDashboardData>>;
}) {
  const error = data.sectionErrors.actionRequired;

  return (
    <OperationalDataTable>
      <OperationalDataTableHeader
        eyebrow="Needs attention"
        title="Action Required"
        actions={
          <Link href="/customer-portal/shipments">
            <Button variant="outline" size="sm">
              Open Shipments
            </Button>
          </Link>
        }
      />
      {error ? (
        <OperationalDataTableWrap>
          <OperationalTable>
            <thead>
              <tr>
                <OperationalTableHead>Section Status</OperationalTableHead>
              </tr>
            </thead>
            <tbody>
              <OperationalTableEmpty colSpan={4}>{error}</OperationalTableEmpty>
            </tbody>
          </OperationalTable>
        </OperationalDataTableWrap>
      ) : (
        <OperationalDataTableWrap>
          <OperationalTable>
            <thead>
              <tr>
                <OperationalTableHead>Shipment</OperationalTableHead>
                <OperationalTableHead>Task</OperationalTableHead>
                <OperationalTableHead>Status</OperationalTableHead>
                <OperationalTableHead>Updated</OperationalTableHead>
              </tr>
            </thead>
            <tbody>
              {data.actionRequired.length === 0 ? (
                <OperationalTableEmpty colSpan={4}>
                  No customer action is pending right now.
                </OperationalTableEmpty>
              ) : (
                data.actionRequired.map((item) => (
                  <tr key={item.id}>
                    <OperationalTableCell className="font-medium">
                      <Link
                        href={item.href}
                        className="mnx-portal-accent-text transition-colors "
                      >
                        {item.jobNumber}
                      </Link>
                    </OperationalTableCell>
                    <OperationalTableCell>
                      <div className="font-medium text-mono-text">
                        {item.title}
                      </div>
                      <div className="mt-1 text-xs text-mono-muted">
                        {truncate(item.detail, 52)}
                      </div>
                    </OperationalTableCell>
                    <OperationalTableCell>
                      <Badge
                        variant={badgeVariantForStatus(
                          item.status,
                          item.tone === "warning",
                        )}
                      >
                        {item.status}
                      </Badge>
                    </OperationalTableCell>
                    <OperationalTableCell className="text-mono-muted">
                      <div>{formatDateTime(item.updatedAt)}</div>
                    </OperationalTableCell>
                  </tr>
                ))
              )}
            </tbody>
          </OperationalTable>
        </OperationalDataTableWrap>
      )}
    </OperationalDataTable>
  );
}

function RecentUpdatesPanel({
  data,
}: {
  data: Awaited<ReturnType<typeof getCustomerPortalDashboardData>>;
}) {
  const error = data.sectionErrors.recentUpdates;

  return (
    <Card className="mnx-portal-panel rounded-xl border border-mono-border/45">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <span className="mnx-portal-leading-icon">
            <PackageCheck size={16} />
          </span>
          <div>
            <CardTitle>Recent Shipment Updates</CardTitle>
            <p className="text-xs text-mono-muted">
              Latest customer-safe activity from your CHA workflow.
            </p>
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
              className="mnx-portal-panel block rounded-xl border border-mono-border/45 bg-mono-soft/30 p-4 transition-all mnx-portal-interactive"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-mono-text">
                    {item.title}
                  </p>
                  <p className="text-xs text-mono-muted">
                    {item.jobNumber} • {item.stageLabel}
                  </p>
                  <p className="text-sm text-mono-muted">{item.detail}</p>
                </div>
                <span className="text-[11px] uppercase tracking-[0.16em] text-mono-muted">
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
    <OperationalDataTable>
      <OperationalDataTableHeader eyebrow="Query threads" title="Outstanding Queries">
        <p>Open threads and customer-response deadlines across your jobs.</p>
      </OperationalDataTableHeader>
      {error ? (
        <OperationalDataTableWrap>
          <OperationalTable>
            <thead>
              <tr>
                <OperationalTableHead>Section Status</OperationalTableHead>
              </tr>
            </thead>
            <tbody>
              <OperationalTableEmpty colSpan={4}>{error}</OperationalTableEmpty>
            </tbody>
          </OperationalTable>
        </OperationalDataTableWrap>
      ) : (
        <OperationalDataTableWrap>
          <OperationalTable>
            <thead>
              <tr>
                <OperationalTableHead>Shipment</OperationalTableHead>
                <OperationalTableHead>Query</OperationalTableHead>
                <OperationalTableHead>Status</OperationalTableHead>
                <OperationalTableHead>Last Activity</OperationalTableHead>
              </tr>
            </thead>
            <tbody>
              {data.outstandingQueries.length === 0 ? (
                <OperationalTableEmpty colSpan={4}>
                  No open customer query threads are pending.
                </OperationalTableEmpty>
              ) : (
                data.outstandingQueries.map((query) => (
                  <tr key={query.id}>
                    <OperationalTableCell className="font-medium">
                      <Link
                        href={query.href}
                        className="mnx-portal-accent-text transition-colors "
                      >
                        {query.jobNumber}
                      </Link>
                      <div className="mt-1 text-xs text-mono-muted">
                        {query.jobTitle}
                      </div>
                    </OperationalTableCell>
                    <OperationalTableCell>
                      <div className="font-medium text-mono-text">
                        {query.title}
                      </div>
                      <div className="mt-1 text-xs text-mono-muted">
                        {query.detail}
                      </div>
                      {query.lastMessagePreview ? (
                        <div className="mt-1 text-xs text-mono-muted">
                          Latest: {truncate(query.lastMessagePreview, 88)}
                        </div>
                      ) : null}
                    </OperationalTableCell>
                    <OperationalTableCell>
                      <div className="flex flex-col gap-2">
                        <Badge
                          variant={badgeVariantForStatus(
                            query.status,
                            query.requiresCustomerAction,
                          )}
                        >
                          {query.status}
                        </Badge>
                        <span className="text-[11px] uppercase tracking-[0.16em] text-mono-muted">
                          {query.priority} • {query.stageLabel}
                        </span>
                        {query.requiredResponseBy ? (
                          <span className="text-xs text-mono-muted">
                            Due {formatDate(query.requiredResponseBy)}
                          </span>
                        ) : null}
                      </div>
                    </OperationalTableCell>
                    <OperationalTableCell className="text-mono-muted">
                      {query.lastMessageAt
                        ? formatDateTime(query.lastMessageAt)
                        : query.requiredResponseBy
                          ? `Due ${formatDate(query.requiredResponseBy)}`
                          : "—"}
                    </OperationalTableCell>
                  </tr>
                ))
              )}
            </tbody>
          </OperationalTable>
        </OperationalDataTableWrap>
      )}
    </OperationalDataTable>
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
    <Card className="mnx-portal-panel rounded-xl border border-mono-border/45">
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="mnx-portal-leading-icon">
            <FileSearch size={16} />
          </span>
          <div>
            <CardTitle>Additional Documents Shared</CardTitle>
            <p className="text-xs text-mono-muted">
              Status of extra customer files that were shared from the portal.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <SectionFallback message={error} />
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <StatusCount
                label="Uploaded"
                count={counts.uploaded}
                variant="default"
              />
              <StatusCount
                label="Under Review"
                count={counts.underReview}
                variant="secondary"
              />
              <StatusCount
                label="Accepted"
                count={counts.accepted}
                variant="success"
              />
              <StatusCount
                label="Rejected"
                count={counts.rejected}
                variant="destructive"
              />
              <StatusCount
                label="Clarification"
                count={counts.clarificationRequired}
                variant="warning"
              />
              <StatusCount
                label="Re-upload"
                count={counts.reuploadRequired}
                variant="warning"
              />
            </div>

            <OperationalDataTableWrap>
              <OperationalTable>
                <thead>
                  <tr>
                    <OperationalTableHead>Shipment</OperationalTableHead>
                    <OperationalTableHead>Requirement</OperationalTableHead>
                    <OperationalTableHead>Status</OperationalTableHead>
                  </tr>
                </thead>
                <tbody>
                  {data.documentStatus.recentItems.length === 0 ? (
                    <OperationalTableEmpty colSpan={3}>
                      No additional customer documents have been shared yet.
                    </OperationalTableEmpty>
                  ) : (
                    data.documentStatus.recentItems.map((item) => (
                      <tr key={item.id}>
                        <OperationalTableCell className="font-medium">
                          <Link
                            href={item.href}
                            className="mnx-portal-accent-text transition-colors "
                          >
                            {item.jobNumber}
                          </Link>
                          <div className="mt-1 text-xs text-mono-muted">
                            {formatDateTime(item.updatedAt)}
                          </div>
                        </OperationalTableCell>
                        <OperationalTableCell>
                          <div className="font-medium text-mono-text">
                            {item.requirementName}
                          </div>
                          {item.reviewerComment ? (
                            <div className="mt-1 text-xs text-mono-muted">
                              {truncate(item.reviewerComment, 88)}
                            </div>
                          ) : null}
                        </OperationalTableCell>
                        <OperationalTableCell>
                          <Badge
                            variant={badgeVariantForStatus(item.status, true)}
                          >
                            {item.status}
                          </Badge>
                        </OperationalTableCell>
                      </tr>
                    ))
                  )}
                </tbody>
              </OperationalTable>
            </OperationalDataTableWrap>
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
    <Card className="mnx-portal-panel rounded-xl border border-mono-border/45">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="mnx-portal-leading-icon">
              <Bell size={16} />
            </span>
            <div>
              <CardTitle>Notifications Summary</CardTitle>
              <p className="text-xs text-mono-muted">
                Recent portal alerts for this signed-in customer contact.
              </p>
            </div>
          </div>
          <Link href="/customer-portal/notifications">
            <Button variant="outline" size="sm">
              Open
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <SectionFallback message={error} />
        ) : (
          <>
            <div className="rounded-xl border border-mono-border/40 bg-mono-soft/50 px-4 py-3">
              <p className="mnx-portal-eyebrow">Unread Alerts</p>
              <p
                className={`mt-2 text-3xl mnx-portal-number ${data.notificationSummary.unreadCount > 0 ? "mnx-portal-warning-text" : "text-mono-text"}`}
              >
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
                    className={`block rounded-xl border px-4 py-3 transition-all mnx-portal-interactive ${
                      notification.readAt
                        ? "border-mono-border/40 bg-mono-soft/25"
                        : "mnx-portal-panel mnx-portal-panel-warning mnx-portal-warning-border bg-mono-card"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-mono-text">
                          {notification.title}
                        </p>
                        {notification.body ? (
                          <p className="text-xs text-mono-muted">
                            {truncate(notification.body, 96)}
                          </p>
                        ) : null}
                      </div>
                      <Badge
                        variant={notification.readAt ? "secondary" : "warning"}
                      >
                        {notification.readAt ? "Read" : "Unread"}
                      </Badge>
                    </div>
                    <div className="mt-2 text-[11px] uppercase tracking-[0.16em] text-mono-muted">
                      {notification.kind.replaceAll("_", " ")} •{" "}
                      {formatDateTime(notification.createdAt)}
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
    data.serviceFeedback.pending.length === 0 &&
    data.serviceFeedback.recentSubmitted.length === 0;

  return (
    <Card className="mnx-portal-panel rounded-xl border border-mono-border/45">
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="mnx-portal-leading-icon">
            <Star size={16} />
          </span>
          <div>
            <CardTitle>Service Feedback</CardTitle>
            <p className="text-xs text-mono-muted">
              Completed shipments waiting for rating, plus recent submitted
              feedback.
            </p>
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
              <p className="mnx-portal-eyebrow">Awaiting Rating</p>
              {data.serviceFeedback.pending.length === 0 ? (
                <p className="text-sm text-mono-muted">
                  No completed shipments are waiting for a rating.
                </p>
              ) : (
                data.serviceFeedback.pending.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="mnx-portal-panel block rounded-xl border border-mono-border/45 bg-mono-card px-4 py-3 transition-all mnx-portal-interactive"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-mono-text">
                          {item.jobNumber}
                        </p>
                        <p className="text-xs text-mono-muted">
                          {item.jobTitle} • {item.stageLabel}
                        </p>
                      </div>
                      <Badge variant="warning">Pending Rating</Badge>
                    </div>
                  </Link>
                ))
              )}
            </div>

            <div className="space-y-3">
              <p className="mnx-portal-eyebrow">Recently Submitted</p>
              {data.serviceFeedback.recentSubmitted.length === 0 ? (
                <p className="text-sm text-mono-muted">
                  No shipment ratings have been submitted by this contact yet.
                </p>
              ) : (
                data.serviceFeedback.recentSubmitted.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="block rounded-xl border border-mono-border/45 bg-mono-soft/30 px-4 py-3 transition-all mnx-portal-interactive"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-mono-text">
                          {item.jobNumber}
                        </p>
                        <p className="text-xs text-mono-muted">
                          {item.overallRating
                            ? `${item.overallRating}/5 rating`
                            : "Rating submitted"}
                          {item.categoryLabel ? ` • ${item.categoryLabel}` : ""}
                          {item.submittedAt
                            ? ` • ${formatDate(item.submittedAt)}`
                            : ""}
                        </p>
                      </div>
                      <Badge
                        variant={
                          item.followUpStatus === "CLOSED"
                            ? "success"
                            : "secondary"
                        }
                      >
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
      {label}: <span className="ml-1 mnx-portal-number">{count}</span>
    </Badge>
  );
}

function SectionFallback({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-mono-border/60 bg-mono-soft/20 px-4 py-6 text-sm text-mono-muted">
      {message}
    </div>
  );
}

function badgeVariantForStatus(
  status: string,
  emphasizeWarning = false,
): React.ComponentProps<typeof Badge>["variant"] {
  const normalized = status.toUpperCase();
  if (normalized.includes("REJECT") || normalized.includes("FAILED"))
    return "destructive";
  if (
    normalized.includes("ACCEPT") ||
    normalized.includes("FILED") ||
    normalized.includes("READ") ||
    normalized.includes("CLOSED")
  )
    return "success";
  if (
    emphasizeWarning ||
    normalized.includes("PENDING") ||
    normalized.includes("REUPLOAD") ||
    normalized.includes("CLARIFICATION") ||
    normalized.includes("AWAITING")
  ) {
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
