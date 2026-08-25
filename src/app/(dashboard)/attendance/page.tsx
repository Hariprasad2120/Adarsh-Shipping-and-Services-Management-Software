import {
  AlertTriangle,
  CalendarCheck2,
  CalendarClock,
  Clock3,
  Fingerprint,
  Settings2,
  ShieldCheck,
  TimerReset,
  Users,
} from "lucide-react";
import Link from "next/link";
import {
  PeopleActionLink,
  PeoplePerson,
  PeopleRecordLink,
  PeopleSection,
  PeopleSectionHeader,
  PeopleStatus,
  PeopleSummary,
  PeopleSummaryGrid,
  PeopleTable,
  PeopleTableBody,
  PeopleTableCell,
  PeopleTableEmpty,
  PeopleTableHead,
  PeopleTableHeader,
  PeopleTableRow,
} from "@/modules/people/components/people-workspace";
import {
  DashboardInsightCard,
  DashboardInsightGrid,
  DashboardMiniBarChart,
  DashboardSegmentList,
  DashboardTrend,
} from "@/components/data-display/dashboard-insights";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getNow } from "@/lib/clock";
import { toAttendanceDate } from "@/lib/attendance-date";
import { getVisibleSectionById } from "@/lib/navigation";
import { can, loadCaps } from "@/lib/rbac";
import {
  getHolidays,
  getLeaveRequests,
  getMonthAttendance,
  getMonthlyReport,
} from "@/modules/attendance/service";
import { redirect } from "next/navigation";

type AttendanceLink = {
  href: string;
  label: string;
  description: string;
};

type AttendanceLane = {
  title: string;
  description: string;
  href: string;
  cta: string;
  linkHrefs: string[];
};

type AttendanceLaneView = AttendanceLane & {
  links: AttendanceLink[];
};

function formatMonth(value: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
  }).format(value);
}

function formatShortDate(value: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
  }).format(value);
}

function formatDateRange(fromDate: Date, toDate: Date) {
  const from = formatShortDate(fromDate);
  const to = formatShortDate(toDate);
  return from === to ? from : `${from} - ${to}`;
}

function formatRelativeSyncTime(value: Date | null) {
  if (!value) return "No sync logged";

  const diffMs = Date.now() - value.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMinutes < 60) {
    return `${diffMinutes || 1} min ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hr${diffHours === 1 ? "" : "s"} ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

export default async function AttendancePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const orgId = session.user.orgId!;
  const now = await getNow();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const canApprove = await can(session.user.id, "attendance.leave.approve");
  const todayAttendanceDate = toAttendanceDate(now);

  const [
    caps,
    myPunches,
    myLeaveRequests,
    pendingApprovals,
    monthlyReport,
    activeEmployees,
    todayCheckedInCount,
    todayBiometricCount,
    pendingOtCount,
    biometricLastSync,
    workingCalendar,
    otSettings,
    holidays,
  ] = await Promise.all([
    loadCaps(session.user.id),
    getMonthAttendance(session.user.id, year, month),
    getLeaveRequests(orgId, { userId: session.user.id }),
    canApprove
      ? getLeaveRequests(orgId, { status: "pending" })
      : Promise.resolve([]),
    getMonthlyReport(orgId, year, month),
    db.user.count({ where: { orgId, active: true } }),
    db.attendancePunch.count({
      where: {
        user: { orgId },
        date: todayAttendanceDate,
        inAt: { not: null },
      },
    }),
    db.attendancePunch.count({
      where: {
        user: { orgId },
        date: todayAttendanceDate,
        biometricSynced: true,
      },
    }),
    db.otRecord.count({
      where: {
        user: { orgId },
        date: {
          gte: new Date(year, month - 1, 1),
          lte: new Date(year, month, 0),
        },
        approvalStatus: { in: ["PENDING", "PENDING_MANAGER"] },
      },
    }),
    db.biometricSyncLog.findFirst({
      where: { orgId },
      orderBy: { syncTime: "desc" },
    }),
    db.workingCalendar.findUnique({ where: { orgId } }),
    db.otSettings.findUnique({ where: { orgId } }),
    getHolidays(orgId, year),
  ]);

  const section = getVisibleSectionById(caps, "attendance");
  const linkDescriptions: Record<string, string> = {
    "/attendance/punch":
      "Run daily check-in, biometric review, correction checks, and personal punch visibility.",
    "/attendance/leaves":
      "Handle leave requests, balances, approvals, and attendance exceptions in one workflow.",
    "/attendance/ot":
      "Control shifts, overtime, comp-off, LOP, holidays, and payroll-facing attendance outcomes.",
    "/attendance/timesheets":
      "Track time submissions and manager approval readiness for job-based time capture.",
    "/attendance/biometric-sync":
      "Monitor device imports, live sync posture, and unresolved biometric mapping issues.",
    "/attendance/reports":
      "Validate monthly presence totals before payroll closure and attendance sign-off.",
    "/attendance/settings":
      "Review attendance rules, working calendars, leave policy touchpoints, and integration controls.",
  };

  const quickLinks: AttendanceLink[] =
    section?.items
      .filter((item) => item.href !== "/attendance")
      .map((item) => ({
        href: item.href,
        label: item.label,
        description:
          linkDescriptions[item.href] ?? "Open this attendance workspace.",
      })) ?? [];

  const visibleLinks = new Map(quickLinks.map((link) => [link.href, link]));
  const lanes: AttendanceLaneView[] = [
    {
      title: "Daily capture and regularization",
      description:
        "Keep punches, live attendance, and missing-day follow-up under one operator lane.",
      href: "/attendance/punch",
      cta: "Open capture lane",
      linkHrefs: ["/attendance/punch", "/attendance/timesheets"],
    },
    {
      title: "Leave and exception control",
      description:
        "Manage leave movement, approvals, balances, and attendance exceptions before they spill into payroll.",
      href: "/attendance/leaves",
      cta: "Open leave lane",
      linkHrefs: ["/attendance/leaves", "/attendance/reports"],
    },
    {
      title: "Shifts, overtime, and month-end",
      description:
        "Watch overtime, comp-off, holidays, working rules, and payroll closure dependencies together.",
      href: "/attendance/ot",
      cta: "Open OT lane",
      linkHrefs: ["/attendance/ot", "/attendance/settings"],
    },
    {
      title: "Integrations and audit visibility",
      description:
        "Monitor biometric connectivity, import recency, and reporting outputs that prove attendance integrity.",
      href: "/attendance/biometric-sync",
      cta: "Open sync lane",
      linkHrefs: ["/attendance/biometric-sync", "/attendance/reports"],
    },
  ]
    .map((lane) => ({
      ...lane,
      links: lane.linkHrefs
        .map((href) => visibleLinks.get(href))
        .filter((link): link is AttendanceLink => Boolean(link)),
    }))
    .filter((lane) => lane.links.length > 0);

  const myRecordedPunchDays = myPunches.filter((entry) => entry.inAt).length;
  const leaveStatusCounts = {
    pending: myLeaveRequests.filter((request) => request.status === "pending")
      .length,
    approved: myLeaveRequests.filter((request) => request.status === "approved")
      .length,
    rejected: myLeaveRequests.filter((request) => request.status === "rejected")
      .length,
  };
  const attendanceTrend = [
    {
      label: "Week 1",
      value: myPunches.slice(0, 7).filter((entry) => entry.inAt).length,
    },
    {
      label: "Week 2",
      value: myPunches.slice(7, 14).filter((entry) => entry.inAt).length,
    },
    {
      label: "Week 3",
      value: myPunches.slice(14, 21).filter((entry) => entry.inAt).length,
    },
    {
      label: "Week 4",
      value: myPunches.slice(21, 31).filter((entry) => entry.inAt).length,
    },
  ];
  const employeesWithPunches = monthlyReport.filter((entry) => entry.days > 0).length;
  const coverageRate = activeEmployees
    ? Math.round((employeesWithPunches / activeEmployees) * 100)
    : 0;
  const todayMissingCount = Math.max(activeEmployees - todayCheckedInCount, 0);
  const todayManualOrPendingSyncCount = Math.max(
    todayCheckedInCount - todayBiometricCount,
    0,
  );
  const upcomingHolidays = holidays
    .filter((holiday) => holiday.date >= todayAttendanceDate)
    .slice(0, 3);
  const nextHoliday = upcomingHolidays[0] ?? null;
  const totalPresenceDays = monthlyReport.reduce((sum, entry) => sum + entry.days, 0);
  const averagePresenceDays = monthlyReport.length
    ? (totalPresenceDays / monthlyReport.length).toFixed(1)
    : "0.0";
  const syncRecency = formatRelativeSyncTime(biometricLastSync?.syncTime ?? null);
  const attendanceLeaders = [...monthlyReport]
    .sort((left, right) => right.days - left.days)
    .slice(0, 5);

  const approvalActionHref = canApprove ? "/attendance/leaves" : "/attendance/punch";
  const approvalActionLabel = canApprove
    ? "Open approval desk"
    : "Open punch workspace";

  const priorityCards = [
    {
      eyebrow: "Approvals desk",
      title: canApprove ? "Leave approvals waiting" : "My leave pipeline",
      value: canApprove ? pendingApprovals.length : leaveStatusCounts.pending,
      description: canApprove
        ? "Use the queue before payroll locking so pending attendance exceptions do not remain unresolved."
        : "Track whether your attendance exceptions are still waiting, already approved, or need follow-up.",
      href: "/attendance/leaves",
      metrics: canApprove
        ? [
            { label: "Pending leaves", value: pendingApprovals.length },
            { label: "Pending OT", value: pendingOtCount },
            { label: "Reported staff", value: monthlyReport.length },
          ]
        : [
            { label: "Pending", value: leaveStatusCounts.pending },
            { label: "Approved", value: leaveStatusCounts.approved },
            { label: "Rejected", value: leaveStatusCounts.rejected },
          ],
      cta: canApprove ? "Review approvals" : "Review my requests",
    },
    {
      eyebrow: "Capture health",
      title: "Today’s punch posture",
      value: todayCheckedInCount,
      description:
        "Watch who is already captured today, who is still missing, and whether those entries came through biometric sync.",
      href: "/attendance/punch",
      metrics: [
        { label: "Checked in", value: todayCheckedInCount },
        { label: "Missing", value: todayMissingCount },
        { label: "Biometric", value: todayBiometricCount },
      ],
      cta: "Open punch desk",
    },
    {
      eyebrow: "Biometric sync",
      title: "Integration and import watch",
      value: biometricLastSync ? syncRecency : "Alert",
      description:
        "Attendance command centres need explicit visibility into sync recency and manual-capture fallback before month-end trust breaks down.",
      href: "/attendance/biometric-sync",
      metrics: [
        { label: "Last sync", value: biometricLastSync ? "Logged" : "None" },
        { label: "Today synced", value: todayBiometricCount },
        { label: "Manual/web", value: todayManualOrPendingSyncCount },
      ],
      cta: "Open sync watch",
    },
    {
      eyebrow: "Rules and payroll closure",
      title: "Working calendar readiness",
      value: workingCalendar && otSettings ? "Ready" : "Needs setup",
      description:
        "Monthly closure is stronger when working rules, OT settings, holidays, and reports are treated as one governed operating lane.",
      href: "/attendance/settings",
      metrics: [
        { label: "Calendar", value: workingCalendar ? "Yes" : "No" },
        { label: "OT rules", value: otSettings ? "Yes" : "No" },
        { label: "Next holiday", value: nextHoliday ? formatShortDate(nextHoliday.date) : "None" },
      ],
      cta: "Review controls",
    },
  ];

  return (
    <>
      <PeopleSummaryGrid>
        <PeopleSummary
          icon={<Clock3 aria-hidden="true" />}
          label="Recorded punch days"
          value={myRecordedPunchDays}
          detail={`${formatMonth(now)} personal capture`}
        />
        <PeopleSummary
          icon={<CalendarClock aria-hidden="true" />}
          label="My pending leaves"
          value={leaveStatusCounts.pending}
          detail={`${myLeaveRequests.length} requests in flight`}
        />
        <PeopleSummary
          icon={<ShieldCheck aria-hidden="true" />}
          label="Pending approvals"
          value={pendingApprovals.length}
          detail={
            canApprove
              ? "Attendance exceptions ready for action"
              : "Approval access not assigned"
          }
        />
        <PeopleSummary
          icon={<Users aria-hidden="true" />}
          label="Workforce reported"
          value={`${coverageRate}%`}
          detail={`${employeesWithPunches}/${activeEmployees} active employees logged this month`}
        />
        <PeopleSummary
          icon={<Fingerprint aria-hidden="true" />}
          label="Biometric sync"
          value={biometricLastSync ? syncRecency : "Offline"}
          detail={
            biometricLastSync
              ? `Latest log captured ${formatShortDate(biometricLastSync.syncTime)}`
              : "No biometric sync log has been recorded yet"
          }
        />
        <PeopleSummary
          icon={<TimerReset aria-hidden="true" />}
          label="Pending OT review"
          value={pendingOtCount}
          detail="Month-to-date overtime approvals"
        />
      </PeopleSummaryGrid>

      <PeopleSection className="mnx-attendance-command-centre">
        <PeopleSectionHeader
          eyebrow="Executive workspace"
          title="Attendance command centre"
          description="Reframed as a control tower rather than a summary board, this workspace now keeps daily capture, leave exceptions, biometric trust, overtime governance, and payroll-month closure in one operating view."
          actions={
            <PeopleActionLink href={approvalActionHref}>
              {approvalActionLabel}
            </PeopleActionLink>
          }
        />
        <div className="mnx-attendance-command-grid">
          <DashboardInsightGrid className="mnx-attendance-command-primary">
            <DashboardInsightCard
              eyebrow="Personal rhythm"
              title="Attendance trend this month"
              detail="A modern attendance home should show your month-to-date punch rhythm, not just a launcher into the punch page."
              chart={<DashboardTrend items={attendanceTrend} />}
              footer={
                <span>
                  {myRecordedPunchDays} recorded attendance day
                  {myRecordedPunchDays === 1 ? "" : "s"} so far in {formatMonth(now)}.
                </span>
              }
            />
            <DashboardInsightCard
              eyebrow="Capture integrity"
              title="Today’s attendance capture posture"
              detail="Inspired by ERP attendance control centres, this card separates checked-in volume, missing presence, biometric coverage, and manual follow-up risk."
              chart={
                <DashboardMiniBarChart
                  items={[
                    {
                      label: "Checked in today",
                      value: todayCheckedInCount,
                      tone: "success",
                    },
                    {
                      label: "Missing today",
                      value: todayMissingCount,
                      tone: "danger",
                    },
                    {
                      label: "Biometric today",
                      value: todayBiometricCount,
                      tone: "info",
                    },
                    {
                      label: "Manual or pending sync",
                      value: todayManualOrPendingSyncCount,
                      tone: "warning",
                    },
                  ]}
                />
              }
              footer={
                <span>
                  {todayCheckedInCount} people are currently captured today across the live workforce.
                </span>
              }
            />
            <DashboardInsightCard
              eyebrow="Exceptions and closure"
              title="Attendance workload shaping payroll"
              detail="Leave approvals, OT review, holidays, and month-to-date coverage are surfaced together because they all influence payroll-facing attendance status."
              chart={
                <DashboardSegmentList
                  items={[
                    {
                      label: "Pending approvals",
                      value: pendingApprovals.length,
                      tone: "warning",
                    },
                    {
                      label: "Pending OT",
                      value: pendingOtCount,
                      tone: "accent",
                    },
                    {
                      label: "Upcoming holidays",
                      value: upcomingHolidays.length,
                      tone: "info",
                    },
                    {
                      label: "My pending",
                      value: leaveStatusCounts.pending,
                      tone: "neutral",
                    },
                  ]}
                />
              }
              footer={
                <span>
                  Average recorded presence is {averagePresenceDays} days per active employee this month.
                </span>
              }
            />
          </DashboardInsightGrid>

          <div className="mnx-attendance-command-rail">
            {priorityCards.map((card) => (
              <article className="mnx-attendance-priority-card" key={card.title}>
                <div className="mnx-attendance-priority-top">
                  <div>
                    <p>{card.eyebrow}</p>
                    <strong>{card.title}</strong>
                  </div>
                  <span>{card.value}</span>
                </div>
                <p className="mnx-attendance-priority-copy">{card.description}</p>
                <div className="mnx-attendance-priority-metrics">
                  {card.metrics.map((metric) => (
                    <div key={metric.label}>
                      <span>{metric.label}</span>
                      <strong>{metric.value}</strong>
                    </div>
                  ))}
                </div>
                <PeopleActionLink
                  className="mnx-attendance-priority-action"
                  href={card.href}
                >
                  {card.cta}
                </PeopleActionLink>
              </article>
            ))}
          </div>
        </div>
      </PeopleSection>

      <PeopleSection>
        <PeopleSectionHeader
          eyebrow="Operational lanes"
          title="Manage attendance by control lane"
          description="The module is grouped the way advanced attendance systems are worked in practice: daily capture, leave exceptions, OT and rules, then sync plus reporting."
        />
        <div className="mnx-attendance-lane-grid">
          {lanes.map((lane) => (
            <article className="mnx-attendance-lane-card" key={lane.title}>
              <div className="mnx-attendance-lane-top">
                <div>
                  <strong>{lane.title}</strong>
                  <p>{lane.description}</p>
                </div>
                <PeopleActionLink
                  className="mnx-attendance-priority-action"
                  href={lane.href}
                >
                  {lane.cta}
                </PeopleActionLink>
              </div>
              <div className="mnx-attendance-lane-links">
                {lane.links.map((link) => (
                  <Link className="mnx-attendance-lane-link" href={link.href} key={link.href}>
                    <span>{link.label}</span>
                    <small>{link.description}</small>
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </div>
      </PeopleSection>

      <PeopleSection>
        <PeopleSectionHeader
          eyebrow="Operational watchlist"
          title="Keep approvals and attendance leaders visible"
          description="A command centre is more useful when the next requests to clear and the workforce patterns to watch are visible without opening secondary pages."
        />
        <div className="mnx-attendance-watch-grid">
          <article className="mnx-attendance-watch-card">
            <div className="mnx-attendance-watch-card-head">
              <div>
                <strong>
                  {canApprove ? "Pending leave approvals" : "My recent leave requests"}
                </strong>
                <p>
                  {canApprove
                    ? "Clear pending attendance exceptions before payroll closure and downstream employee questions build up."
                    : "Your latest attendance exceptions stay visible here so follow-up is quick."}
                </p>
              </div>
              <PeopleStatus
                variant={canApprove && pendingApprovals.length > 0 ? "warning" : "neutral"}
              >
                {canApprove ? `${pendingApprovals.length} waiting` : `${myLeaveRequests.length} total`}
              </PeopleStatus>
            </div>
            <PeopleTable className="mnx-attendance-watch-table">
              <PeopleTableHeader>
                <tr>
                  <PeopleTableHead>Employee</PeopleTableHead>
                  <PeopleTableHead>Leave type</PeopleTableHead>
                  <PeopleTableHead>Period</PeopleTableHead>
                </tr>
              </PeopleTableHeader>
              <PeopleTableBody>
                {(canApprove ? pendingApprovals : myLeaveRequests).length === 0 ? (
                  <PeopleTableEmpty
                    colSpan={3}
                    message={
                      canApprove
                        ? "No leave approvals are waiting right now."
                        : "No leave requests have been submitted yet."
                    }
                  />
                ) : (
                  (canApprove ? pendingApprovals : myLeaveRequests)
                    .slice(0, 5)
                    .map((request) => (
                      <PeopleTableRow key={request.id}>
                        <PeopleTableCell>
                          <PeopleRecordLink href="/attendance/leaves">
                            <PeoplePerson
                              name={request.user.name}
                              secondary={
                                canApprove
                                  ? request.approver?.name
                                    ? `Approver: ${request.approver.name}`
                                    : "Awaiting approver action"
                                  : request.status
                              }
                            />
                          </PeopleRecordLink>
                        </PeopleTableCell>
                        <PeopleTableCell className="mnx-people-muted">
                          {request.leaveType.name}
                        </PeopleTableCell>
                        <PeopleTableCell className="mnx-people-muted">
                          {formatDateRange(request.fromDate, request.toDate)}
                        </PeopleTableCell>
                      </PeopleTableRow>
                    ))
                )}
              </PeopleTableBody>
            </PeopleTable>
          </article>

          <article className="mnx-attendance-watch-card">
            <div className="mnx-attendance-watch-card-head">
              <div>
                <strong>Month-to-date attendance leaders</strong>
                <p>
                  Reported employees with the strongest presence totals stay visible here so HR can quickly spot coverage patterns.
                </p>
              </div>
              <PeopleStatus variant="accent">
                {employeesWithPunches}/{activeEmployees} active
              </PeopleStatus>
            </div>
            <PeopleTable className="mnx-attendance-watch-table">
              <PeopleTableHeader>
                <tr>
                  <PeopleTableHead>Employee</PeopleTableHead>
                  <PeopleTableHead>Designation</PeopleTableHead>
                  <PeopleTableHead>Days present</PeopleTableHead>
                </tr>
              </PeopleTableHeader>
              <PeopleTableBody>
                {attendanceLeaders.length === 0 ? (
                  <PeopleTableEmpty
                    colSpan={3}
                    message="No attendance presence totals have been recorded yet."
                  />
                ) : (
                  attendanceLeaders.map((entry) => (
                    <PeopleTableRow key={entry.user.id}>
                      <PeopleTableCell>
                        <PeopleRecordLink href="/attendance/reports">
                          <PeoplePerson
                            name={entry.user.name}
                            secondary={`${entry.days} day${entry.days === 1 ? "" : "s"} present`}
                          />
                        </PeopleRecordLink>
                      </PeopleTableCell>
                      <PeopleTableCell className="mnx-people-muted">
                        {entry.user.designation ?? "—"}
                      </PeopleTableCell>
                      <PeopleTableCell>{entry.days}</PeopleTableCell>
                    </PeopleTableRow>
                  ))
                )}
              </PeopleTableBody>
            </PeopleTable>
          </article>
        </div>
      </PeopleSection>

      <PeopleSection>
        <PeopleSectionHeader
          eyebrow="Month-end control"
          title="Policy, sync, and closure checkpoints"
          description="These checkpoint cards frame the same capabilities ERP attendance suites emphasize: policy readiness, shift or OT control, biometric reliability, and closing reports."
        />
        <div className="mnx-attendance-check-grid">
          <article className="mnx-attendance-check-card">
            <div className="mnx-attendance-check-icon">
              <Settings2 aria-hidden="true" />
            </div>
            <div>
              <strong>Working rules</strong>
              <p>
                {workingCalendar
                  ? `Configured around ${workingCalendar.workStart} to ${workingCalendar.workEnd} with ${workingCalendar.workingDays.split(",").length} working-day slots.`
                  : "Working calendar rules still need configuration before attendance closure becomes reliable."}
              </p>
            </div>
          </article>
          <article className="mnx-attendance-check-card">
            <div className="mnx-attendance-check-icon">
              <Clock3 aria-hidden="true" />
            </div>
            <div>
              <strong>Overtime control</strong>
              <p>
                {otSettings
                  ? `OT is configured with ${otSettings.standardHours} standard hours and a ${otSettings.otRate}x overtime rate.`
                  : "OT rates and slabs are still missing, so payroll-facing OT review is not fully governed yet."}
              </p>
            </div>
          </article>
          <article className="mnx-attendance-check-card">
            <div className="mnx-attendance-check-icon">
              <Fingerprint aria-hidden="true" />
            </div>
            <div>
              <strong>Biometric trust</strong>
              <p>
                {biometricLastSync
                  ? `Latest biometric sync was ${syncRecency}; ${todayBiometricCount} employees are already synced today.`
                  : "No biometric sync log has been recorded, so attendance capture is relying on manual or unsurfaced channels."}
              </p>
            </div>
          </article>
          <article className="mnx-attendance-check-card">
            <div className="mnx-attendance-check-icon">
              {nextHoliday ? (
                <CalendarCheck2 aria-hidden="true" />
              ) : (
                <AlertTriangle aria-hidden="true" />
              )}
            </div>
            <div>
              <strong>Holiday and report closure</strong>
              <p>
                {nextHoliday
                  ? `${nextHoliday.name} is the next recorded holiday on ${formatShortDate(nextHoliday.date)}.`
                  : "No upcoming holiday is currently recorded in the attendance calendar."}
              </p>
            </div>
          </article>
        </div>
      </PeopleSection>
    </>
  );
}
