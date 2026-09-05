# Main Dashboard Data Audit

Source audit date: 2026-09-01  
Scope: active App Router routes, `src/modules`, `src/lib/navigation.ts`, dashboard services, Prisma schema, cron routes, notification services, approval/task flows, and module service files.  
Rules followed: no dashboard redesign, no component creation, no code/API/database changes.

## Modules Discovered

Active business modules and route families discovered from navigation, routes, modules, services, and schema:

- Dashboard / Command Center
- Product Catalogue
- To-Do
- Notifications
- HRMS
- Attendance and Leave
- AMS / Appraisal Management / Performance
- LMS
- CRM
- Freight Forwarding
- Expense Desk / CHA Expenses
- CHA / Customs House Agent Operations
- Accounting
- Payroll and My Payroll
- Recruitment
- Communication / Google Workspace / Google Chat
- Customer Portal
- Admin / Security / Governance
- Mona / Work Pet
- Product and Item Masters

The main dashboard should not mirror every module dashboard. The strongest global candidates are cross-module work, approvals, alerts, deadlines, operational health, financial health, people health, and recent activity.

## MODULE: Dashboard / Command Center

### Important KPIs

- Visible module health summary: current implementation already reads selected counters for HRMS, Attendance, AMS, LMS, CRM, Communication, Expense, CHA, Accounting, Recruit, and Product Catalogue. [KPI, STATUS, P2, AVAILABLE: `src/modules/dashboard/service.ts`]
- Module availability / live data failure state. [STATUS, ALERT, P3, AVAILABLE: `DashboardModuleSummary.available` in `src/modules/dashboard/service.ts`]

### Needs Attention

- Dashboard should evolve from per-module cards into global "my work" and "business health" groups where possible. [STATUS, P1, REQUIRES NEW AGGREGATION: existing service has module counters, not unified dashboard widgets]

### My Work

- Existing module snapshot has user-specific counts for HRMS tasks/cases/leaves, Attendance punches/leaves/OT, AMS appraisals/reviews/schedules, LMS enrollment, Communication subscriptions/connections, Expense requests, and Recruit job-seeker activity. [TASK, STATUS, P1, PARTIALLY AVAILABLE: `readAggregatedCounts`]

### Recent Activity

- Dashboard currently does not expose a unified recent activity stream; individual modules do. [ACTIVITY, P2, REQUIRES NEW AGGREGATION]

### Possible Trends

- Current command center is mostly counters; trends require additional aggregation except Payroll cost trend and CRM/Accounting module reports. [TREND, P2, REQUIRES NEW AGGREGATION]

### Quick Actions

- Open key workspaces from existing module actions. [QUICK ACTION, P3, AVAILABLE: `MODULE_DEFINITIONS.actions`]

### Dashboard Priority

HIGH

### Reason

This is the existing dashboard data foundation. It should be retained as source evidence, but redesigned data should combine work across modules instead of multiplying module cards.

## MODULE: Product Catalogue

### Important KPIs

- Catalogued modules, implemented modules, documented workflow stages. [KPI, STATUS, P3, AVAILABLE: `catalogueModules`, `detailedWorkflowStages`, `src/modules/dashboard/service.ts`]

### Needs Attention

- None for operating dashboard; this is reference material, not live business work.

### My Work

- None.

### Recent Activity

- None found.

### Possible Trends

- Not meaningful for the global dashboard.

### Quick Actions

- Open catalogue. [QUICK ACTION, P4, AVAILABLE: `/product-catalogue`]

### Dashboard Priority

LOW

### Reason

Useful as a system map, but it does not answer daily operational questions.

## MODULE: To-Do

### Important KPIs

- My pending tasks. [TASK, KPI, P1, AVAILABLE: `TodoTask.status`, `src/modules/todo/service.ts`]
- My overdue tasks by due date. [TASK, ALERT, DEADLINE, P1, AVAILABLE: `TodoTask.dueDate`, `status`]
- Upcoming reminders. [TASK, DEADLINE, P2, AVAILABLE: `listUpcomingTodoAlerts`]
- Checklist progress per task. [STATUS, TASK, P3, AVAILABLE: `TodoSubtask`, `computeProgress`]

### Needs Attention

- Due reminders not yet triggered. [ALERT, DEADLINE, P1, AVAILABLE: `alertAt`, `alertTriggeredAt`, `triggerDueTodoReminders`]
- Pending tasks with due dates before today. [TASK, ALERT, P1, REQUIRES NEW AGGREGATION]

### My Work

- All To-Do data is user-specific. [TASK, P1, AVAILABLE: `TodoTask.userId`]

### Recent Activity

- Recently created/updated/completed personal tasks. [ACTIVITY, P3, AVAILABLE: `createdAt`, `updatedAt`, `completedAt`]

### Possible Trends

- Completed vs pending tasks over time. [TREND, P3, REQUIRES NEW AGGREGATION]

### Quick Actions

- Create task. [QUICK ACTION, P2, AVAILABLE: `/todo` and `createTodoTask`]

### Dashboard Priority

HIGH

### Reason

Personal tasks are universal and should feed a global "My Tasks" widget rather than a separate To-Do-only dashboard card.

## MODULE: Notifications

### Important KPIs

- Active notifications for me. [ALERT, ACTIVITY, KPI, P1, AVAILABLE: `listActiveUserNotifications`]
- Unread notifications. [ALERT, KPI, P1, AVAILABLE: `Notification.readAt`, `listUserNotifications`]
- Important notifications requiring acknowledgement. [ALERT, TASK, P1, AVAILABLE: `priority`, `requiresAck`, `acknowledgedAt`]
- Failed email queue count. [ALERT, STATUS, P2, AVAILABLE: `EmailQueue.status`, `flushEmailQueue`]

### Needs Attention

- Undismissed important notifications. [ALERT, P1, AVAILABLE]
- Notifications requiring acknowledgement. [TASK, ALERT, P1, AVAILABLE]
- Failed email delivery after retries. [ALERT, P2, AVAILABLE: `EmailQueue.attempts`, `status`]

### My Work

- Acknowledge important notifications. [TASK, ALERT, P1, AVAILABLE]

### Recent Activity

- Notification activity events: created, displayed, read, acknowledged, dismissed, opened, resent. [ACTIVITY, P2, AVAILABLE: `NotificationActivity`]

### Possible Trends

- Notifications by source/kind and delivery failures over time. [TREND, P3, REQUIRES NEW AGGREGATION]

### Quick Actions

- Open notification, acknowledge, mark all read. [QUICK ACTION, P2, AVAILABLE: API routes under `src/app/api/notifications`]

### Dashboard Priority

HIGH

### Reason

Notifications are the native cross-module alert backbone and should feed "My Alerts" and "Recent Activity".

## MODULE: HRMS

### Important KPIs

- Active employees, departments, branches, reporting lines. [PEOPLE, KPI, P2, AVAILABLE: `User.active`, `Department`, `Branch`, `managerId`, HRMS pages/services]
- My open HR cases. [TASK, STATUS, P1, AVAILABLE: `HRCase.status`, `getMe`]
- My HRMS tasks. [TASK, KPI, P1, AVAILABLE: `HrmsTask.assigneeId`, `getHrmsTasks`]
- Pending HR approvals. [APPROVAL, KPI, P1, AVAILABLE: `getPendingApprovals`]
- Upcoming holidays and announcements. [ACTIVITY, DEADLINE, P3, AVAILABLE: `getDashboardWidgets`]

### Needs Attention

- Open/in-progress HR helpdesk cases. [ALERT, TASK, P2, AVAILABLE: `getHelpDeskCases`]
- Incomplete onboarding/profile information. [COMPLIANCE, PEOPLE, P2, AVAILABLE: `getOnboardingStatus`]
- Pending work report approvals. [APPROVAL, TASK, P1, AVAILABLE: `WorkReportApproval.status`]
- Missing bank/statutory IDs for payroll readiness. [COMPLIANCE, PEOPLE, P1, AVAILABLE via Payroll/HRMS user fields]

### My Work

- HRMS tasks assigned to me. [TASK, P1, AVAILABLE]
- HR approvals waiting for me: leave, regularization, OT, travel, timesheet, work reports. [APPROVAL, P1, AVAILABLE]
- My pending cases. [TASK, STATUS, P2, AVAILABLE]

### Recent Activity

- New employee, employee profile changes, HR case comments, work report decisions, announcements. [ACTIVITY, P3, PARTIALLY AVAILABLE: models exist; unified feed requires aggregation]

### Possible Trends

- Headcount, onboarding completion, HR case load, work report submissions. [TREND, P3, REQUIRES NEW AGGREGATION]

### Quick Actions

- Add Employee, View Employees, Create HR Task, Submit Work Report. [QUICK ACTION, P2/P3, AVAILABLE: HRMS routes/services]

### Dashboard Priority

HIGH

### Reason

People work affects every employee. User-specific HR tasks and approvals belong on the global dashboard; broad HR metrics should be role-aware.

## MODULE: Attendance and Leave

### Important KPIs

- My attendance status today. [PEOPLE, STATUS, P1, AVAILABLE: `AttendancePunch`, `getMe`, `punchAction`]
- My pending leave requests. [TASK, APPROVAL, P1, AVAILABLE: `LeaveRequest.status`]
- Team attendance status for reportees. [PEOPLE, STATUS, P2, AVAILABLE: `getTeamReportees`]
- Pending OT / regularization / timesheet approvals. [APPROVAL, TASK, P1, AVAILABLE: `getPendingApprovals`]
- Biometric sync status/offline alert. [ALERT, OPERATIONAL, P1, AVAILABLE: `intimateAdminsOffline`, `BIOMETRIC_OFFLINE` notification]

### Needs Attention

- Employees yet to check in or on long breaks. [ALERT, PEOPLE, P2, PARTIALLY AVAILABLE: punch/break data exists, threshold aggregation needed]
- Pending leave approvals and leave expiry/accrual jobs. [APPROVAL, DEADLINE, P1, AVAILABLE: leave cron routes and approval services]
- Failed/offline biometric host. [ALERT, P1, AVAILABLE]

### My Work

- Punch/check out, pending leave status, pending OT. [TASK, STATUS, P1, AVAILABLE]
- Manager approvals for leave, regularization, OT, timesheets. [APPROVAL, P1, AVAILABLE]

### Recent Activity

- Punch events, leave decisions, regularization, biometric sync logs. [ACTIVITY, P3, AVAILABLE: `AttendancePunchEvent`, `BiometricSyncLog`]

### Possible Trends

- Attendance trend, absenteeism, leave usage, overtime trend, biometric sync failures. [TREND, PEOPLE, P2, REQUIRES NEW AGGREGATION]

### Quick Actions

- Punch workspace, Apply Leave, Submit Timesheet, Review Approvals. [QUICK ACTION, P1/P2, AVAILABLE]

### Dashboard Priority

HIGH

### Reason

Attendance is daily and action-oriented. The dashboard should show the current user's punch state and role-aware exceptions for managers/HR.

## MODULE: AMS / Performance

### Important KPIs

- My open appraisals. [TASK, STATUS, P1, AVAILABLE: `Appraisal.stage`, `listMyAppraisals`]
- Reviews assigned to me. [TASK, APPROVAL, P1, AVAILABLE: `AppraisalReviewer`, `listMyReviewAppraisals`]
- Scheduled appraisals. [DEADLINE, STATUS, P2, AVAILABLE: `AppraisalSchedule.status`]
- Open appraisals by stage. [STATUS, KPI, P2, AVAILABLE: `sendAppraisalDigest` groupBy stage]
- Pending appraisal arrears. [FINANCIAL, APPROVAL, P2, AVAILABLE: `AppraisalArrear.status`, `listArrears`]

### Needs Attention

- Overdue appraisal stages: reviewer availability, self-assessment, reviewer rating, date voting. [ALERT, DEADLINE, P1, AVAILABLE: `escalateOverdueStages`]
- Reviewers unconfirmed past deadline. [ALERT, TASK, P1, AVAILABLE: `notifyStalePendingReviewers`]
- Arrear approvals/mark paid. [APPROVAL, FINANCIAL, P2, AVAILABLE]

### My Work

- My self-assessment due. [TASK, DEADLINE, P1, AVAILABLE]
- My reviewer/management review tasks. [TASK, APPROVAL, P1, AVAILABLE]

### Recent Activity

- Stage transitions, reviewer assignments, score changes, arrear decisions. [ACTIVITY, P2, AVAILABLE: `AppraisalAuditLog`]

### Possible Trends

- Appraisals by stage, overdue counts, ratings distribution, hike/arrear amounts. [TREND, P2, REQUIRES NEW AGGREGATION]

### Quick Actions

- Open My Appraisal, Open My Reviews, View Appraisals, Approve Arrear. [QUICK ACTION, P2, AVAILABLE]

### Dashboard Priority

HIGH

### Reason

AMS has explicit deadline escalation and personal review work. Global dashboard should surface only "my appraisal work" and overdue/unblocked exceptions, not all scoring detail.

## MODULE: LMS

### Important KPIs

- Available courses. [KPI, P3, AVAILABLE: `Course`]
- My in-progress courses. [TASK, STATUS, P2, AVAILABLE: `CourseEnrollment.status`, `progress`]
- My completed courses. [STATUS, P3, AVAILABLE]

### Needs Attention

- Courses in progress but not complete. [TASK, P3, AVAILABLE]

### My Work

- Continue assigned/enrolled learning. [TASK, P2, AVAILABLE]

### Recent Activity

- Enrollment/progress completion. [ACTIVITY, P4, AVAILABLE]

### Possible Trends

- Completion rate, course participation. [TREND, P4, REQUIRES NEW AGGREGATION]

### Quick Actions

- My Learning, Browse Courses. [QUICK ACTION, P3, AVAILABLE]

### Dashboard Priority

MEDIUM

### Reason

Learning is useful but usually less urgent than approvals, payroll, finance, CHA, and attendance unless compliance training is later modeled.

## MODULE: CRM

### Important KPIs

- Open leads. [KPI, OPERATIONAL, P2, AVAILABLE: `CrmLead.isConverted`, `status`, dashboard service]
- Active deals. [KPI, FINANCIAL, P2, AVAILABLE: `CrmDeal.stage`]
- Active customers/accounts. [KPI, P3, AVAILABLE: `CrmAccount.status`]
- Service enquiries by status/assignment. [OPERATIONAL, STATUS, P1, AVAILABLE: `CrmServiceEnquiry.status`, `assignedToId`, rate workflow services]
- Quotes/invoices waiting approval. [APPROVAL, FINANCIAL, P1, AVAILABLE: CRM approval workflow and `/crm/approvals`]
- Lead follow-up reminders due. [TASK, DEADLINE, P1, AVAILABLE: `CrmLeadReminder`, cron route `crm-reminders`]

### Needs Attention

- Leads marked not picked/not reachable with due follow-up. [ALERT, TASK, P1, AVAILABLE: `triggerCrmLeadReminders`]
- Service enquiries pending rates, agent response, pricing decision, or manager action. [TASK, OPERATIONAL, P1, AVAILABLE: `rate-workflow`, service enquiry services]
- Quotes/invoices pending approval or returned/rejected. [APPROVAL, ALERT, P1, AVAILABLE]
- Deals near expected close date. [DEADLINE, FINANCIAL, P2, AVAILABLE: `CrmDeal.expectedCloseDate`]

### My Work

- Activities/tasks/events/calls owned by me. [TASK, DEADLINE, P1, AVAILABLE: `CrmActivity.ownerId`, `dueDate`]
- Service enquiries assigned to me or my manager queue. [TASK, OPERATIONAL, P1, AVAILABLE]
- CRM approvals waiting for me. [APPROVAL, P1, AVAILABLE]

### Recent Activity

- Timeline events for leads, contacts, accounts, deals, notes, attachments, stage changes. [ACTIVITY, P2, AVAILABLE: `CrmTimelineEvent`]

### Possible Trends

- Lead conversion, enquiries by service type, deal pipeline value, quote approval cycle time, follow-up volume. [TREND, FINANCIAL, OPERATIONAL, P2, REQUIRES NEW AGGREGATION]

### Quick Actions

- Create Lead, Create Enquiry, Create Quote, Add Activity, Open Approval Queue. [QUICK ACTION, P2, AVAILABLE]

### Dashboard Priority

HIGH

### Reason

CRM is a high-business-impact source of revenue pipeline and user-specific sales work. The global dashboard should show actionable CRM work, not every CRM master count.

## MODULE: Freight Forwarding

### Important KPIs

- Workspace route availability and booking/process surfaces. [STATUS, P4, AVAILABLE: routes/navigation]
- Active jobs currently return zero in dashboard service because workflows are not configured. [STATUS, P4, AVAILABLE: `src/modules/dashboard/service.ts`]

### Needs Attention

- No active freight-specific job/milestone data found in main dashboard service. Process pages appear tied to CRM service enquiries and booking documents. [OPERATIONAL, P4, PARTIALLY AVAILABLE]

### My Work

- Potentially assigned freight service enquiries through CRM. [TASK, OPERATIONAL, P2, AVAILABLE via CRM service enquiry data]

### Recent Activity

- Not independently available as a mature module feed.

### Possible Trends

- Bookings by status and shipment milestones once workflows are persisted. [TREND, P4, NOT CURRENTLY AVAILABLE as direct global metric]

### Quick Actions

- Create booking, Open process. [QUICK ACTION, P3, AVAILABLE]

### Dashboard Priority

LOW

### Reason

Freight forwarding exists as a workspace but current dashboard data marks it as not configured. Surface related operational work through CRM/service-enquiry or CHA widgets for now.

## MODULE: Expense Desk / CHA Expenses

### Important KPIs

- My open expense requests. [TASK, FINANCIAL, P1, AVAILABLE: `ChaExpenseRequest.requestedById`, status set in dashboard service]
- Urgent expense requests. [ALERT, FINANCIAL, P1, AVAILABLE: `isUrgent`, `getChaDashboardMetrics`]
- Ready for disbursement / approved / paid counts. [FINANCIAL, STATUS, P2, AVAILABLE: `ChaExpenseRequest.status`]

### Needs Attention

- Clarification required or query raised. [ALERT, TASK, P1, AVAILABLE: `CLARIFICATION_REQUIRED`, `QUERY_RAISED`]
- Accounts review and ready-for-disbursement queue. [APPROVAL, FINANCIAL, P1, AVAILABLE]

### My Work

- My expense requests needing clarification or status follow-up. [TASK, ALERT, P1, AVAILABLE]
- Finance/account approver expense queue. [APPROVAL, FINANCIAL, P1, AVAILABLE]

### Recent Activity

- Expense status history and payments. [ACTIVITY, P2, AVAILABLE: `ChaExpenseStatusHistory`, `ChaExpensePayment`]

### Possible Trends

- Monthly spend, urgent expense rate, approval turnaround, paid vs pending. [TREND, FINANCIAL, P2, REQUIRES NEW AGGREGATION]

### Quick Actions

- Add Expense, Review Expenses, Disburse Approved. [QUICK ACTION, P2, AVAILABLE]

### Dashboard Priority

HIGH

### Reason

Expense data is both user-specific and finance-critical. It should be folded into "My Approvals", "My Alerts", and "Financial Overview".

## MODULE: CHA / Customs House Agent Operations

### Important KPIs

- Active CHA jobs. [OPERATIONAL, KPI, P1, AVAILABLE: `ChaJob.status`, `getChaDashboardMetrics`]
- High-priority / urgent jobs. [ALERT, OPERATIONAL, P1, AVAILABLE: `ChaJob.priority`]
- Jobs on hold. [ALERT, STATUS, P1, AVAILABLE: dashboard service]
- Pending checklist approvals. [APPROVAL, OPERATIONAL, P1, AVAILABLE: `ChaChecklistImport.status = PENDING_APPROVAL`]
- Pending filings. [TASK, OPERATIONAL, P1, AVAILABLE: `ChaFiling.status = PENDING`]
- Outstanding customer advances. [FINANCIAL, ALERT, P1, AVAILABLE: `ChaCustomerAdvance`, receipts in `getChaDashboardMetrics`]

### Needs Attention

- Pending/overdue filing dates and query reminders. [ALERT, DEADLINE, P1, AVAILABLE: filing/query cron routes, due-date warning components]
- Missing/reworked checklist documents. [COMPLIANCE, ALERT, P1, AVAILABLE: checklist/document requirement models]
- Section 49 validity warning. [COMPLIANCE, DEADLINE, P1, AVAILABLE: `FilingSection49Flag.validityDate`, warning components]
- Job deletion requests awaiting approval. [APPROVAL, ALERT, P2, AVAILABLE: `ChaJobDeletionRequest` and `/cha/approvals`]
- Urgent expenses and outstanding advances. [FINANCIAL, ALERT, P1, AVAILABLE]

### My Work

- Jobs assigned to me. [TASK, OPERATIONAL, P1, AVAILABLE: `ChaJobAssignment`]
- Checklist approvals waiting for manager. [APPROVAL, P1, AVAILABLE]
- Filing/process jobs needing action. [TASK, DEADLINE, P1, AVAILABLE]

### Recent Activity

- CHA audit log events. [ACTIVITY, P2, AVAILABLE: `listChaRecentActivity`, `ChaAuditLog`]

### Possible Trends

- Active jobs by stage/status, filing aging, approvals aging, urgent expenses, outstanding advances. [TREND, OPERATIONAL, FINANCIAL, P2, REQUIRES NEW AGGREGATION]

### Quick Actions

- Create Job, Open Jobs, Review Checklist Approvals, Open Expenses, Search Job. [QUICK ACTION, P1/P2, AVAILABLE]

### Dashboard Priority

HIGH

### Reason

CHA is a core operational module with explicit deadlines, compliance warnings, financial dependencies, approvals, and recent activity.

## MODULE: Accounting

### Important KPIs

- Open receivables. [FINANCIAL, KPI, P1, AVAILABLE: `SalesInvoice.status IN UNPAID/PARTLY_PAID/OVERDUE`]
- Open payables. [FINANCIAL, KPI, P1, AVAILABLE: `PurchaseInvoice.status IN UNPAID/PARTLY_PAID/OVERDUE`]
- Draft journals. [FINANCIAL, TASK, P2, AVAILABLE: `JournalEntry.status = DRAFT`]
- Pending document/payment approvals. [APPROVAL, FINANCIAL, P1, AVAILABLE: `AccountingDocument`, `AccountingPayment`, `/accounting/approvals`, API summary]
- Manual review / integration inbox/outbox failures. [ALERT, OPERATIONAL, P1, AVAILABLE: `AccountingIntegrationInbox`, `AccountingIntegrationOutbox`, `AccountingPostingAttempt`]
- Bank statement imports and uncategorized lines. [FINANCIAL, TASK, P2, AVAILABLE: banking service/import models]
- Period lock/close status. [COMPLIANCE, FINANCIAL, P2, AVAILABLE: `AccountingPeriod`, `AccountingPeriodLockRequest`, close runs]
- Statutory filing periods due. [COMPLIANCE, DEADLINE, P1, AVAILABLE: `AccountingStatutoryFilingPeriod`]

### Needs Attention

- Overdue receivables/payables. [ALERT, FINANCIAL, P1, AVAILABLE: invoice statuses and due dates]
- Approval queue awaiting current user or role. [APPROVAL, P1, PARTIALLY AVAILABLE: approval policy models exist; user-specific aggregation needed]
- Failed posting attempts / outbox retry/manual review. [ALERT, OPERATIONAL, P1, AVAILABLE]
- Missing accounting settings for salary/payroll posting. [COMPLIANCE, FINANCIAL, P1, AVAILABLE: AccountingSettings, Payroll snapshot]

### My Work

- Approvals assigned by accounting approval policy. [APPROVAL, P1, PARTIALLY AVAILABLE]
- Manual review/outbox actions for finance users. [TASK, ALERT, P1, AVAILABLE]

### Recent Activity

- Accounting audit logs, document/payment status changes, journal posting, bank imports. [ACTIVITY, P2, AVAILABLE: `AccountingAuditLog`, document/payment timestamps]

### Possible Trends

- Revenue/expense, receivables aging, payables aging, monthly cash/bank movement, invoice volume, posting failures. [TREND, FINANCIAL, P1/P2, PARTIALLY AVAILABLE]

### Quick Actions

- Create Sales Invoice, Create Purchase Invoice, Create Journal Entry, Record Payment, Import Bank Statement, Review Approvals. [QUICK ACTION, P2, AVAILABLE]

### Dashboard Priority

HIGH

### Reason

Accounting is the primary financial-health source. P1 items should be role-aware for finance/management and not shown as noise to every employee.

## MODULE: Payroll and My Payroll

### Important KPIs

- Current payroll period net pay, liabilities, ready/review employee counts. [FINANCIAL, PEOPLE, KPI, P1, AVAILABLE: `getPayrollModuleSnapshot`, `getPayrollWorkspaceData`]
- Payroll batches approved/posted. [STATUS, FINANCIAL, P1, AVAILABLE: `PayrollBatch`, Accounting integration]
- Employees missing payment setup. [COMPLIANCE, PEOPLE, ALERT, P1, AVAILABLE]
- Employees missing salary setup. [COMPLIANCE, PEOPLE, ALERT, P1, AVAILABLE]
- Approved incentives this month. [FINANCIAL, KPI, P2, AVAILABLE: incentives service and payroll snapshot]
- Pending salary revisions. [APPROVAL, FINANCIAL, P2, AVAILABLE: salary revision summaries]
- Payroll cost trend. [TREND, FINANCIAL, P2, AVAILABLE: `buildPayrollCostTrend`]

### Needs Attention

- Payroll employees in review/issues. [ALERT, TASK, P1, AVAILABLE: `workspace.summary.reviewEmployees`, row issues]
- Missing bank/PAN/UAN/salary configuration before pay run. [COMPLIANCE, ALERT, P1, AVAILABLE]
- Unposted approved payroll batch. [FINANCIAL, TASK, P1, AVAILABLE]
- Loans supported but automatic EMI deduction not wired. [STATUS, P3, AVAILABLE: snapshot reason]

### My Work

- Employee self-service payslips, salary details, investment declarations. [TASK, FINANCIAL, P2, AVAILABLE: My Payroll routes/models]
- Payroll admin approvals and pay-run tasks. [APPROVAL, TASK, P1, AVAILABLE]

### Recent Activity

- Pay run creation/approval/posting, payslip generation, salary revisions, tax challans. [ACTIVITY, P2, AVAILABLE: payroll/accounting models]

### Possible Trends

- Net pay, TDS, benefits, deductions over six months already computed. [TREND, FINANCIAL, P2, AVAILABLE]
- Employee payroll readiness trend. [TREND, P3, REQUIRES NEW AGGREGATION]

### Quick Actions

- Run Payroll, Review Pay Runs, Open Approvals, View Payslips, Submit Investments. [QUICK ACTION, P1/P2, AVAILABLE]

### Dashboard Priority

HIGH

### Reason

Payroll creates time-sensitive financial and compliance work. It should be prominent for HR/finance/admin, while employee-facing payroll should stay personal and compact.

## MODULE: Recruitment

### Important KPIs

- Open positions. [KPI, PEOPLE, P2, AVAILABLE: `RecruitJobOpening.status`]
- Active applications. [KPI, STATUS, P2, AVAILABLE: `RecruitApplication.stage`]
- Candidates. [KPI, P3, AVAILABLE: `RecruitCandidate`]
- My job-seeker active applications and matches. [TASK, STATUS, P2, AVAILABLE: `RecruitJobSeekerApplication`, `RecruitJobMatch`]
- Interviews/offer approvals. [APPROVAL, DEADLINE, P2, AVAILABLE: `RecruitInterview`, `RecruitOfferApproval`]

### Needs Attention

- Applications stalled in active stages. [ALERT, STATUS, P2, REQUIRES NEW AGGREGATION]
- Offer approvals awaiting decision. [APPROVAL, P1, AVAILABLE]
- Interviews scheduled soon. [DEADLINE, TASK, P2, AVAILABLE]

### My Work

- Hiring manager/recruiter applications to review. [TASK, APPROVAL, P1, AVAILABLE]
- Candidate/job-seeker applications and alerts. [TASK, DEADLINE, P2, AVAILABLE]

### Recent Activity

- Application stage history, audit events, automation runs. [ACTIVITY, P2, AVAILABLE]

### Possible Trends

- Applications by stage, time-to-hire, source performance, automation success/failure. [TREND, PEOPLE, P3, REQUIRES NEW AGGREGATION]

### Quick Actions

- Create Job Opening, Add Candidate, Review Applications, Search Jobs. [QUICK ACTION, P2/P3, AVAILABLE]

### Dashboard Priority

MEDIUM

### Reason

Recruitment is important but role-specific. It should appear for recruiters, HR, hiring managers, and job seekers; global management can see high-level hiring health.

## MODULE: Communication / Google Workspace / Google Chat

### Important KPIs

- Active Google Chat spaces. [KPI, STATUS, P2, AVAILABLE: `GoogleChatSpace.linkStatus`]
- My subscriptions. [STATUS, P3, AVAILABLE: `GoogleChatSubscription.enabled`]
- My Workspace connection status. [STATUS, ALERT, P1, AVAILABLE: `GoogleWorkspaceConnection.status`]
- Google Chat delivery failures/retry queue. [ALERT, OPERATIONAL, P2, AVAILABLE: `GoogleChatDelivery`, cron retry route]

### Needs Attention

- Disconnected Workspace account for current user. [ALERT, TASK, P1, AVAILABLE]
- Failed chat/email deliveries. [ALERT, OPERATIONAL, P2, AVAILABLE]

### My Work

- Connect Workspace, review job spaces/subscriptions. [TASK, STATUS, P2, AVAILABLE]

### Recent Activity

- Chat deliveries, audit events, communication activity. [ACTIVITY, P3, AVAILABLE]

### Possible Trends

- Delivery success/failure, active job spaces. [TREND, P4, REQUIRES NEW AGGREGATION]

### Quick Actions

- Connect Workspace, Open Job Spaces, Open Mail/Chat/Calendar. [QUICK ACTION, P3, AVAILABLE]

### Dashboard Priority

MEDIUM

### Reason

Communication matters most as a connectivity/failed-delivery alert and as infrastructure for notifications.

## MODULE: Customer Portal

### Important KPIs

- Customer portal notifications/unread. [ALERT, ACTIVITY, P2, AVAILABLE: `CustomerPortalNotification`]
- Customer document submissions and checklist responses. [TASK, COMPLIANCE, P2, AVAILABLE: `CustomerDocumentSubmission`, `CustomerChecklistResponse`]
- Customer query threads/messages. [TASK, ALERT, P2, AVAILABLE: `CustomerQueryThread`, `CustomerQueryMessage`]
- Shipment ratings/feedback. [ACTIVITY, P3, AVAILABLE: `ShipmentServiceRating`]

### Needs Attention

- Customer-submitted documents awaiting internal review. [TASK, COMPLIANCE, P1, PARTIALLY AVAILABLE]
- Customer queries unanswered. [ALERT, TASK, P1, PARTIALLY AVAILABLE]
- Customer portal invitations/sessions/admin issues. [STATUS, P3, AVAILABLE]

### My Work

- Customer-side unread notifications and pending checklist/document responses. [TASK, ALERT, P2, AVAILABLE]
- Internal review queue for customer submissions. [TASK, P1, PARTIALLY AVAILABLE]

### Recent Activity

- Portal audit logs, notifications, document submissions, queries. [ACTIVITY, P2, AVAILABLE]

### Possible Trends

- Customer response time, document completion, service ratings. [TREND, P3, REQUIRES NEW AGGREGATION]

### Quick Actions

- Open Customer Portal dashboard, Review submissions, Reply to query. [QUICK ACTION, P3, AVAILABLE/PARTIAL]

### Dashboard Priority

MEDIUM

### Reason

Important when customer collaboration is active, but global dashboard should only include customer actions that block operations.

## MODULE: Admin / Security / Governance

### Important KPIs

- Active users, roles, permissions. [STATUS, PEOPLE, P2, AVAILABLE: `User`, `Role`, `Permission`]
- MFA/passkey/session security status. [COMPLIANCE, ALERT, P2, AVAILABLE: auth/security models and admin session routes]
- Notification delivery/admin resend state. [ALERT, STATUS, P2, AVAILABLE: admin notification service]
- Organisation/module configuration status. [STATUS, P3, AVAILABLE: module config/navigation]
- Work Pet governance rollout/audit. [STATUS, ACTIVITY, P4, AVAILABLE: Mona governance/admin routes]

### Needs Attention

- Security sessions/anomalies and passkey reset requests. [ALERT, COMPLIANCE, P2, PARTIALLY AVAILABLE]
- Failed notification/email/chat delivery. [ALERT, OPERATIONAL, P2, AVAILABLE]
- Missing critical setup/configuration. [COMPLIANCE, P2, PARTIALLY AVAILABLE]

### My Work

- Admin review queues: roles, sessions, passkeys, notifications, data tools. [TASK, P2, PARTIALLY AVAILABLE]

### Recent Activity

- Admin audit/session/security events. [ACTIVITY, P3, PARTIALLY AVAILABLE]

### Possible Trends

- Login/session activity, failed delivery counts, permission changes. [TREND, P4, REQUIRES NEW AGGREGATION]

### Quick Actions

- Manage Roles, Session Monitor, Notification Admin, Data Tools. [QUICK ACTION, P3, AVAILABLE]

### Dashboard Priority

MEDIUM

### Reason

Admin information is critical for administrators but irrelevant for most users. It belongs in role-aware dashboard sections.

## MODULE: Mona / Work Pet

### Important KPIs

- Conversation/audit activity and governance rollout. [ACTIVITY, STATUS, P4, AVAILABLE: `MonaConversation`, `MonaAuditEvent`, `/admin/work-pet`]

### Needs Attention

- Governance/audit review for admins. [COMPLIANCE, P4, AVAILABLE]

### My Work

- None discovered as a core business dashboard item.

### Recent Activity

- Mona conversation and audit events. [ACTIVITY, P4, AVAILABLE]

### Possible Trends

- Usage and feedback trends. [TREND, P4, REQUIRES NEW AGGREGATION]

### Quick Actions

- Open Work Pet governance. [QUICK ACTION, P4, AVAILABLE]

### Dashboard Priority

LOW

### Reason

This is governance/supporting infrastructure, not a core operating metric for the main dashboard.

## MODULE: Product and Item Masters

### Important KPIs

- Active item/product/service masters. [KPI, P4, AVAILABLE: `AccountingItemMaster`, `CrmProduct`, item routes]
- Price books and vendors. [KPI, P4, AVAILABLE: CRM/accounting masters]

### Needs Attention

- Missing master setup can block quotes/invoices/jobs, but no explicit global alert found. [ALERT, P3, PARTIALLY AVAILABLE]

### My Work

- None generally; master maintenance is role-specific.

### Recent Activity

- Item/product create/update. [ACTIVITY, P4, AVAILABLE via timestamps/audit where implemented]

### Possible Trends

- Product/service usage in quotes/invoices. [TREND, P4, REQUIRES NEW AGGREGATION]

### Quick Actions

- Add Item/Product, View Masters. [QUICK ACTION, P4, AVAILABLE]

### Dashboard Priority

LOW

### Reason

Masters are configuration/support data. Show only when missing setup blocks a workflow.

# Global Cross-Module Dashboard Concepts

## My Tasks

Unify:

- To-Do pending/overdue tasks
- HRMS tasks
- CRM activities/follow-ups/calls/events
- AMS self-assessment/reviewer work
- LMS in-progress learning
- Recruit applications/interviews
- CHA assigned jobs/filings
- Payroll employee self-service tasks

Priority: P1  
Data availability: PARTIALLY AVAILABLE. Individual sources exist; unified normalized task shape requires aggregation.

## My Approvals

Unify:

- HRMS leave/regularization/OT/travel/timesheet/work-report approvals
- AMS reviewer/management review and arrear approvals
- CRM quote/invoice/sales order approvals
- CHA checklist approvals/job deletion requests/expenses
- Accounting document/payment/period-lock/capability approvals
- Payroll approvals
- Recruit offer/application approvals

Priority: P1  
Data availability: PARTIALLY AVAILABLE. Multiple approval sources exist; unified assignee/role resolution needs aggregation.

## My Alerts

Unify:

- Important notifications requiring acknowledgement
- Overdue tasks and reminders
- Biometric offline
- Appraisal overdue stages
- CRM follow-up reminders
- CHA filing/query/document/Section 49 warnings
- Accounting overdue receivables/payables/posting failures
- Payroll readiness/compliance gaps
- Communication delivery failures

Priority: P1  
Data availability: PARTIALLY AVAILABLE. Notification center is available, but some module alerts are not all normalized into notifications.

## Upcoming Deadlines

Unify:

- Todo due dates/reminders
- Leave dates and approval deadlines
- Appraisal deadlines
- CRM follow-ups/activities/expected close dates
- CHA filing/document/validity dates
- Accounting statutory filing periods/recurring schedules
- Payroll period/pay-run/tax deadlines
- Recruit interviews/offers

Priority: P1  
Data availability: PARTIALLY AVAILABLE. Date fields exist; cross-module timeline aggregation needed.

## Recent Activity

Unify:

- NotificationActivity
- CrmTimelineEvent
- ChaAuditLog
- AccountingAuditLog
- AppraisalAuditLog
- RecruitAuditEvent
- CustomerPortalAuditLog
- Admin/security audit where available

Priority: P2  
Data availability: PARTIALLY AVAILABLE. Activity models exist; common feed shape needed.

## Operational Health

Combine:

- Active/on-hold/urgent CHA jobs
- CRM service enquiries waiting for rates/pricing/manager action
- Freight forwarding process readiness
- Communication delivery status
- Customer portal blocking customer queries/documents

Priority: P1/P2  
Data availability: PARTIALLY AVAILABLE.

## Financial Overview

Combine:

- Accounting receivables/payables/overdue invoices
- Payroll net pay/liabilities/posted status
- CHA urgent expenses/outstanding customer advances
- Expense disbursement queue
- CRM deal pipeline/quote approvals

Priority: P1  
Data availability: PARTIALLY AVAILABLE.

## People Overview

Combine:

- Active employees
- Attendance today/team exceptions
- Leave pending/today
- Payroll readiness gaps
- Appraisal/review overdue
- Recruitment hiring pipeline

Priority: P2  
Data availability: PARTIALLY AVAILABLE.

# Role-Aware Information

| Role / Persona | Dashboard Should Emphasize |
|---|---|
| Employee | My punch status, My Tasks, My Alerts, My leave/payroll/appraisal/learning/recruit items, unread notifications |
| Manager / Team Lead | Team attendance exceptions, leave/OT/timesheet/work-report approvals, appraisal reviewer work, CRM/CHA assigned operational blockers |
| HR | Employee onboarding gaps, HR cases, leave/work-report approvals, attendance exceptions, appraisal overdue stages, recruitment pipeline |
| Finance / Accounting | Receivables/payables, overdue payments, accounting approvals, posting failures, payroll posting/readiness, expense disbursement |
| Operations / CHA | Active/urgent/on-hold jobs, pending filings/checklists, assigned jobs, outstanding advances, document/compliance warnings |
| Sales / CRM | Lead follow-ups, service enquiries, pending quotes/approvals, active deals, expected close deadlines, customer activity |
| Recruiter / Hiring Manager | Open positions, application stages, interviews, offer approvals, stalled candidates |
| Administrator | Security/session/MFA/passkey issues, role/permission/admin notifications, failed delivery queues, module setup |
| Management | Financial overview, operational health, people overview, sales pipeline, major P1 alerts and approvals only |
| Customer Portal User | Shipment/customer notifications, document submissions, checklist responses, query threads |

# Alerts and Deadlines Inventory

- Todo reminders/due dates. [P1, AVAILABLE]
- Unread/important/ack-required notifications. [P1, AVAILABLE]
- Attendance biometric offline. [P1, AVAILABLE]
- Leave approval and leave expiry/accrual related work. [P1, AVAILABLE]
- Appraisal overdue stage escalation. [P1, AVAILABLE]
- CRM lead follow-up reminders. [P1, AVAILABLE]
- CRM service enquiry rate/pricing workflow blockers. [P1, AVAILABLE]
- CHA filing, checklist, document, query, Section 49 validity warnings. [P1, AVAILABLE/PARTIAL]
- CHA urgent expenses and customer advances. [P1, AVAILABLE]
- Accounting overdue receivables/payables, posting failures, statutory filing periods. [P1, AVAILABLE/PARTIAL]
- Payroll missing setup, employees in review, unposted pay runs. [P1, AVAILABLE]
- Communication email/chat delivery failures. [P2, AVAILABLE]
- Recruit interviews/offers/applications stalled. [P2, AVAILABLE/PARTIAL]

# Quick Actions Inventory

- Create Task. [P1/P2, To-Do]
- Punch / Open My Attendance. [P1, Attendance]
- Apply Leave. [P2, Attendance]
- Review My Approvals. [P1, Multiple]
- Create Lead / Add CRM Activity / Create Quote. [P2, CRM]
- Create CHA Job / Open Jobs / Review Checklist Approvals. [P1/P2, CHA]
- Add Expense / Review Expense Queue. [P2, Expense]
- Create Sales Invoice / Record Payment / Create Journal / Import Bank Statement. [P2, Accounting]
- Run Payroll / Review Pay Run / View Payslips. [P1/P2, Payroll]
- Add Employee / View Employees. [P2/P3, HRMS]
- Continue Learning. [P3, LMS]
- Create Job Opening / Review Applications. [P2/P3, Recruit]
- Connect Workspace / Open Job Spaces. [P3, Communication]

# Trend and Chart Opportunities

- Financial: receivables/payables aging, revenue/expense, payroll cost trend, outstanding advance trend. [P1/P2]
- Operational: CHA jobs by stage/status, filings aging, CRM service enquiries by service/status, urgent/on-hold work. [P2]
- Sales: lead conversion, active deal value by stage, quote approval cycle time, follow-up volume. [P2]
- People: attendance trend, leave usage, payroll readiness, appraisal stage distribution, recruitment funnel. [P2/P3]
- Reliability: notification/email/chat delivery failures, biometric sync failure trend, accounting posting failures. [P2/P3]

# RECOMMENDED MAIN DASHBOARD DATA

## P1 - Must Have

- My Pending Tasks: To-Do, HRMS tasks, CRM activities/follow-ups, AMS review/self-assessment work, CHA assigned work, Payroll self/admin tasks. [TASK, AVAILABLE/PARTIAL]
- My Pending Approvals: HRMS approvals, AMS reviews/arrears, CRM approvals, CHA checklist/expense/deletion approvals, Accounting/Payroll approvals. [APPROVAL, PARTIAL]
- My Alerts: important/ack-required notifications plus overdue module warnings. [ALERT, PARTIAL]
- Today Attendance / Punch State. [PEOPLE, STATUS, AVAILABLE]
- Upcoming Deadlines timeline. [DEADLINE, PARTIAL]
- Financial Attention: overdue receivables/payables, payroll readiness/posting, urgent expenses, outstanding advances. [FINANCIAL, PARTIAL]
- Operational Attention: urgent/on-hold CHA jobs, pending filings/checklists, CRM service enquiry blockers. [OPERATIONAL, PARTIAL]
- Payroll Readiness and Current Pay Run Status for HR/finance/admin. [FINANCIAL, PEOPLE, AVAILABLE]
- Accounting Posting/Approval/Manual Review Failures for finance users. [FINANCIAL, ALERT, AVAILABLE]

## P2 - Should Have

- Recent Activity feed from notifications, CRM timeline, CHA audit, accounting audit, appraisal audit, recruit audit. [ACTIVITY, PARTIAL]
- People Overview for HR/management: active employees, attendance exceptions, leave pending, onboarding/payroll setup gaps. [PEOPLE, PARTIAL]
- CRM Pipeline: open leads, active deals, quote approvals, follow-ups due. [FINANCIAL, OPERATIONAL, AVAILABLE/PARTIAL]
- Appraisal Health: overdue stages, my reviews, open appraisals by stage. [PEOPLE, DEADLINE, AVAILABLE]
- Expense Queue: urgent, clarification required, ready for disbursement, paid. [FINANCIAL, AVAILABLE]
- Communication Health: Workspace connection and failed deliveries. [STATUS, ALERT, AVAILABLE]
- Recruit Pipeline role-aware summary. [PEOPLE, PARTIAL]

## P3 - Useful

- LMS learning progress. [TASK, AVAILABLE]
- Announcements and upcoming holidays. [ACTIVITY, DEADLINE, AVAILABLE]
- Dashboard module availability/status. [STATUS, AVAILABLE]
- Admin security/session/MFA/passkey review summaries. [COMPLIANCE, PARTIAL]
- Customer portal customer-submission/query blockers. [OPERATIONAL, PARTIAL]
- Payroll/finance trend charts beyond current payroll cost trend. [TREND, PARTIAL]

## P4 - Module Dashboard Only

- Product catalogue counts.
- Item/product/price-book/vendor master counts.
- Mona / Work Pet usage and governance, except admin-only audit.
- Freight forwarding standalone zero-count metrics until shipment workflows are persisted.
- Detailed LMS course catalogue metrics.
- Detailed CRM masters, campaigns, social, documents, and non-urgent reports.
- Detailed accounting configuration, dimensions, policies, number series, and settings.
- Detailed payroll settings/statutory configuration pages unless misconfiguration blocks payroll.

# Final Summary Table

| Dashboard Item | Source Module | Type | Priority | User Specific | Data Available | Suggested Display |
|---|---|---|---|---|---|---|
| My Pending Tasks | Multiple | Task | P1 | Yes | Partially Available | Compact list |
| My Pending Approvals | Multiple | Approval | P1 | Yes / role-based | Partially Available | Counter + compact list |
| My Alerts | Notifications + modules | Alert | P1 | Yes | Partially Available | Alert stack |
| Today Attendance | Attendance | People / Status | P1 | Yes | Available | KPI + action |
| Upcoming Deadlines | Multiple | Deadline | P1 | Yes / role-based | Partially Available | Timeline |
| Financial Attention | Accounting / Payroll / Expense / CHA / CRM | Financial | P1 | Role-based | Partially Available | KPI strip + alerts |
| Operational Attention | CHA / CRM / Freight / Customer Portal | Operational | P1 | Role-based | Partially Available | Status summary |
| CHA Active/Urgent Jobs | CHA | Operational | P1 | Role-based | Available | KPI + list |
| Pending CHA Filings/Checklists | CHA | Task / Approval | P1 | Role-based | Available | Counter + list |
| Outstanding Customer Advances | CHA | Financial / Alert | P1 | Role-based | Available | KPI |
| Overdue Receivables/Payables | Accounting | Financial / Alert | P1 | Role-based | Available | KPI |
| Accounting Manual Review / Outbox Failures | Accounting | Alert / Operational | P1 | Role-based | Available | Alert |
| Payroll Readiness Gaps | Payroll | People / Compliance | P1 | Role-based | Available | Alert + KPI |
| Current Pay Run Status | Payroll | Financial / Status | P1 | Role-based | Available | Status summary |
| CRM Follow-Ups Due | CRM | Task / Deadline | P1 | Yes | Available | Compact list |
| CRM Service Enquiry Blockers | CRM | Operational / Task | P1 | Role-based | Available | Queue summary |
| Appraisal Overdue Stages | AMS | Deadline / Alert | P1 | Role-based | Available | Alert |
| My Appraisal / Review Work | AMS | Task | P1 | Yes | Available | Compact list |
| Notification Ack Required | Notifications | Alert / Task | P1 | Yes | Available | Alert |
| Biometric Offline | Attendance | Alert / Operational | P1 | Role-based | Available | Alert |
| Recent Activity | Multiple | Activity | P2 | Role-based | Partially Available | Activity feed |
| People Overview | HRMS / Attendance / Payroll / AMS / Recruit | People | P2 | Role-based | Partially Available | KPI strip |
| CRM Pipeline | CRM | Financial / Operational | P2 | Role-based | Available | KPI + chart |
| Expense Disbursement Queue | Expense / CHA | Financial / Approval | P2 | Role-based | Available | Counter + list |
| Recruit Pipeline | Recruit | People / Status | P2 | Role-based | Available | Funnel summary |
| Communication Connection Health | Communication | Status / Alert | P2 | Yes | Available | Status chip |
| Customer Query / Document Blockers | Customer Portal | Task / Operational | P2 | Role-based | Partially Available | Compact list |
| Announcements / Holidays | HRMS | Activity / Deadline | P3 | No / branch-aware | Available | Compact list |
| LMS Progress | LMS | Task / Status | P3 | Yes | Available | Progress |
| Admin Security Review | Admin | Compliance / Alert | P3 | Admin only | Partially Available | Alert summary |
| Product Catalogue Summary | Product Catalogue | Status | P4 | No | Available | Module dashboard only |
| Item/Product Master Counts | Masters | KPI | P4 | Role-based | Available | Module dashboard only |
| Mona Governance Activity | Mona / Admin | Activity | P4 | Admin only | Available | Module dashboard only |

