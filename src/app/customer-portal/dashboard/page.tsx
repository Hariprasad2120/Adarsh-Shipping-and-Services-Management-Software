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
import { Badge } from "@/components/monolith/badge";
import { Button } from "@/components/monolith/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/monolith/card";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableEmpty,
  DataTableHead,
  DataTableHeader,
  DataTableToolbar,
} from "@/components/shared/data-table";
import { requirePortalSession } from "@/modules/customer-portal/auth";
import { getCustomerPortalDashboardData } from "@/modules/customer-portal/dashboard";

export default async function CustomerPortalDashboardPage() {
  const session = await requirePortalSession();
  const dashboard = await getCustomerPortalDashboardData(session);

  return (
    <div className="space-y-6">
      <section className="monolith-card monolith-accent rounded-xl border border-mono-border/50 bg-mono-card px-5 py-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="monolith-label">CHA Customer Dashboard</p>
            <h2 className="monolith-h1 text-mono-text">Account Shipment Overview</h2>
            <p className="max-w-3xl text-sm text-mono-muted">
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
    ? { background: "rgba(251,146,60,0.10)", color: "#D88700" }
    : undefined;

  return (
    <Link href={href} className="block">
      <Card
        className={`rounded-xl border-mono-border/40 bg-mono-card p-5 transition-all hover:-translate-y-0.5 monolith-hover ${
          tone === "warning" ? "monolith-card monolith-accent-warning" : "monolith-card monolith-accent"
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <p className="monolith-label">{title}</p>
            <p className={`text-3xl text-mono-text monolith-numeric ${tone === "warning" && value > 0 ? "text-[#D88700]" : ""}`}>
              {value}
            </p>
          </div>
          <span className="monolith-icon-badge" style={iconStyle}>
            {icon}
          </span>
        </div>
        <p className="mt-3 text-xs text-mono-muted">{helper}</p>
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
    <DataTable className="border border-mono-border/45">
      <DataTableToolbar className="bg-mono-card">
        <div className="flex items-center gap-3">
          <span className="monolith-icon-badge" style={{ background: "rgba(251,146,60,0.10)", color: "#D88700" }}>
            <TriangleAlert size={16} />
          </span>
          <div>
            <h2 className="monolith-h2 text-mono-text">Action Required</h2>
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
                    <Link href={item.href} className="text-[#F9D972] transition-colors hover:text-[#E8C85D]">
                      {item.jobNumber}
                    </Link>
                  </DataTableCell>
                  <DataTableCell>
                    <div className="font-medium text-mono-text">{item.title}</div>
                    <div className="mt-1 text-xs text-mono-muted">{truncate(item.detail, 52)}</div>
                  </DataTableCell>
                  <DataTableCell>
                    <Badge variant={badgeVariantForStatus(item.status, item.tone === "warning")}>{item.status}</Badge>
                  </DataTableCell>
                  <DataTableCell className="text-mono-muted">
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
    <Card className="monolith-card monolith-accent rounded-xl border border-mono-border/45">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <span className="monolith-icon-badge">
            <PackageCheck size={16} />
          </span>
          <div>
            <CardTitle>Recent Shipment Updates</CardTitle>
            <p className="text-xs text-mono-muted">Latest customer-safe activity from your CHA workflow.</p>
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
              className="monolith-card monolith-accent block rounded-xl border border-mono-border/45 bg-mono-soft/30 p-4 transition-all monolith-hover"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-mono-text">{item.title}</p>
                  <p className="text-xs text-mono-muted">{item.jobNumber} • {item.stageLabel}</p>
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
    <DataTable className="border border-mono-border/45">
      <DataTableToolbar className="bg-mono-card">
        <div className="flex items-center gap-3">
          <span className="monolith-icon-badge">
            <MessagesSquare size={16} />
          </span>
          <div>
            <h2 className="monolith-h2 text-mono-text">Outstanding Queries</h2>
            <p className="text-xs text-mono-muted">Open threads and customer-response deadlines across your jobs.</p>
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
                    <Link href={query.href} className="text-[#F9D972] transition-colors hover:text-[#E8C85D]">
                      {query.jobNumber}
                    </Link>
                    <div className="mt-1 text-xs text-mono-muted">{query.jobTitle}</div>
                  </DataTableCell>
                  <DataTableCell>
                    <div className="font-medium text-mono-text">{query.title}</div>
                    <div className="mt-1 text-xs text-mono-muted">{query.detail}</div>
                    {query.lastMessagePreview ? (
                      <div className="mt-1 text-xs text-mono-muted">Latest: {truncate(query.lastMessagePreview, 88)}</div>
                    ) : null}
                  </DataTableCell>
                  <DataTableCell>
                    <div className="flex flex-col gap-2">
                      <Badge variant={badgeVariantForStatus(query.status, query.requiresCustomerAction)}>{query.status}</Badge>
                      <span className="text-[11px] uppercase tracking-[0.16em] text-mono-muted">
                        {query.priority} • {query.stageLabel}
                      </span>
                      {query.requiredResponseBy ? (
                        <span className="text-xs text-mono-muted">Due {formatDate(query.requiredResponseBy)}</span>
                      ) : null}
                    </div>
                  </DataTableCell>
                  <DataTableCell className="text-mono-muted">
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

function DocumentStatusCard({
  data,
}: {
  data: Awaited<ReturnType<typeof getCustomerPortalDashboardData>>;
}) {
  const error = data.sectionErrors.documentStatus;
  const counts = data.documentStatus.counts;

  return (
    <Card className="monolith-card monolith-accent rounded-xl border border-mono-border/45">
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="monolith-icon-badge">
            <FileSearch size={16} />
          </span>
          <div>
            <CardTitle>Additional Documents Shared</CardTitle>
            <p className="text-xs text-mono-muted">Status of extra customer files that were shared from the portal.</p>
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

            <DataTable className="border border-mono-border/35 shadow-none">
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
                        <Link href={item.href} className="text-[#F9D972] transition-colors hover:text-[#E8C85D]">
                          {item.jobNumber}
                        </Link>
                        <div className="mt-1 text-xs text-mono-muted">{formatDateTime(item.updatedAt)}</div>
                      </DataTableCell>
                      <DataTableCell>
                        <div className="font-medium text-mono-text">{item.requirementName}</div>
                        {item.reviewerComment ? (
                          <div className="mt-1 text-xs text-mono-muted">{truncate(item.reviewerComment, 88)}</div>
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
    <Card className="monolith-card monolith-accent rounded-xl border border-mono-border/45">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="monolith-icon-badge">
              <Bell size={16} />
            </span>
            <div>
              <CardTitle>Notifications Summary</CardTitle>
              <p className="text-xs text-mono-muted">Recent portal alerts for this signed-in customer contact.</p>
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
            <div className="rounded-xl border border-mono-border/40 bg-mono-soft/50 px-4 py-3">
              <p className="monolith-label">Unread Alerts</p>
              <p className={`mt-2 text-3xl monolith-numeric ${data.notificationSummary.unreadCount > 0 ? "text-[#D88700]" : "text-mono-text"}`}>
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
                    className={`block rounded-xl border px-4 py-3 transition-all monolith-hover ${
                      notification.readAt
                        ? "border-mono-border/40 bg-mono-soft/25"
                        : "monolith-card monolith-accent-warning border-[#D88700]/30 bg-mono-card"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-mono-text">{notification.title}</p>
                        {notification.body ? <p className="text-xs text-mono-muted">{truncate(notification.body, 96)}</p> : null}
                      </div>
                      <Badge variant={notification.readAt ? "secondary" : "warning"}>
                        {notification.readAt ? "Read" : "Unread"}
                      </Badge>
                    </div>
                    <div className="mt-2 text-[11px] uppercase tracking-[0.16em] text-mono-muted">
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
    <Card className="monolith-card monolith-accent rounded-xl border border-mono-border/45">
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="monolith-icon-badge">
            <Star size={16} />
          </span>
          <div>
            <CardTitle>Service Feedback</CardTitle>
            <p className="text-xs text-mono-muted">Completed shipments waiting for rating, plus recent submitted feedback.</p>
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
              <p className="monolith-label">Awaiting Rating</p>
              {data.serviceFeedback.pending.length === 0 ? (
                <p className="text-sm text-mono-muted">No completed shipments are waiting for a rating.</p>
              ) : (
                data.serviceFeedback.pending.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="monolith-card monolith-accent block rounded-xl border border-mono-border/45 bg-mono-card px-4 py-3 transition-all monolith-hover"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-mono-text">{item.jobNumber}</p>
                        <p className="text-xs text-mono-muted">{item.jobTitle} • {item.stageLabel}</p>
                      </div>
                      <Badge variant="warning">Pending Rating</Badge>
                    </div>
                  </Link>
                ))
              )}
            </div>

            <div className="space-y-3">
              <p className="monolith-label">Recently Submitted</p>
              {data.serviceFeedback.recentSubmitted.length === 0 ? (
                <p className="text-sm text-mono-muted">No shipment ratings have been submitted by this contact yet.</p>
              ) : (
                data.serviceFeedback.recentSubmitted.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="block rounded-xl border border-mono-border/45 bg-mono-soft/30 px-4 py-3 transition-all monolith-hover"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-mono-text">{item.jobNumber}</p>
                        <p className="text-xs text-mono-muted">
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
      {label}: <span className="ml-1 monolith-numeric">{count}</span>
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
