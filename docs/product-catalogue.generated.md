# Monolith Engine — Product Catalogue (Auto-Generated)

> Generated at: 2026-06-26T07:58:19.027Z
> Version: 0.1.0

## Codebase Statistics

| Metric | Count |
|---|---|
| App Routes (Pages) | 201 |
| API Routes | 172 |
| Prisma Models | 256 |
| Module Service Files | 70 |
| UI Components | 89 |

## Modules Overview

| Module | Pages | APIs | Models | Services | Components |
|---|---|---|---|---|---|
| accounting | 32 | 0 | 18 | 6 | 0 |
| admin | 9 | 6 | 0 | 0 | 0 |
| ams | 18 | 17 | 17 | 11 | 3 |
| attendance | 7 | 10 | 8 | 1 | 0 |
| auth | 0 | 1 | 0 | 0 | 0 |
| cha | 12 | 3 | 33 | 3 | 2 |
| communication | 11 | 18 | 2 | 1 | 0 |
| core | 2 | 0 | 56 | 5 | 0 |
| crm | 59 | 4 | 26 | 7 | 1 |
| cron | 0 | 6 | 0 | 0 | 0 |
| dashboard | 1 | 0 | 0 | 0 | 0 |
| expense | 1 | 0 | 0 | 0 | 0 |
| google-chat | 0 | 6 | 6 | 8 | 0 |
| health | 0 | 1 | 0 | 0 | 0 |
| hrms | 39 | 34 | 38 | 14 | 25 |
| items | 0 | 0 | 0 | 0 | 17 |
| landing-page | 0 | 0 | 0 | 0 | 5 |
| lms | 5 | 0 | 5 | 0 | 0 |
| login | 1 | 0 | 0 | 0 | 1 |
| mobile | 0 | 18 | 0 | 0 | 0 |
| mona | 0 | 2 | 0 | 7 | 5 |
| notifications | 1 | 9 | 2 | 2 | 1 |
| org | 0 | 7 | 0 | 0 | 0 |
| product-catalogue | 1 | 0 | 0 | 0 | 0 |
| recruit | 0 | 18 | 43 | 4 | 0 |
| roles | 0 | 2 | 0 | 0 | 0 |
| setup | 1 | 1 | 0 | 0 | 0 |
| shared | 0 | 0 | 0 | 0 | 16 |
| todo | 1 | 0 | 2 | 1 | 1 |
| todos | 0 | 5 | 0 | 0 | 0 |
| ui | 0 | 0 | 0 | 0 | 12 |
| users | 0 | 4 | 0 | 0 | 0 |

## API Routes

| Method(s) | Path | Module |
|---|---|---|
| POST | `/api/admin/ams-reset` | admin |
| GET, PATCH | `/api/admin/modules` | admin |
| GET | `/api/admin/notifications` | admin |
| POST | `/api/admin/notifications/[id]/resend` | admin |
| GET, PATCH | `/api/admin/settings` | admin |
| GET, POST, PATCH | `/api/admin/simulation` | admin |
| GET, POST | `/api/ams/appraisals` | ams |
| POST | `/api/ams/appraisals/[id]/availability` | ams |
| POST | `/api/ams/appraisals/[id]/claim-management` | ams |
| POST | `/api/ams/appraisals/[id]/hike` | ams |
| POST | `/api/ams/appraisals/[id]/management-review` | ams |
| POST | `/api/ams/appraisals/[id]/meeting` | ams |
| POST | `/api/ams/appraisals/[id]/minutes` | ams |
| POST | `/api/ams/appraisals/[id]/reviewer-rating` | ams |
| POST | `/api/ams/appraisals/[id]/reviewers` | ams |
| GET | `/api/ams/appraisals/[id]` | ams |
| POST | `/api/ams/appraisals/[id]/score-preview` | ams |
| POST | `/api/ams/appraisals/[id]/self-assessment` | ams |
| GET, POST, PATCH, DELETE | `/api/ams/criteria` | ams |
| POST | `/api/ams/criteria/seed` | ams |
| GET, POST | `/api/ams/cycles` | ams |
| PATCH | `/api/ams/cycles/[id]` | ams |
| GET, PUT | `/api/ams/self-form-template` | ams |
| GET | `/api/attendance/day-punches` | attendance |
| GET, POST | `/api/attendance/holidays` | attendance |
| GET, POST | `/api/attendance/leave-types` | attendance |
| GET, POST | `/api/attendance/leaves` | attendance |
| POST | `/api/attendance/leaves/[id]` | attendance |
| GET, POST | `/api/attendance/ot` | attendance |
| POST | `/api/attendance/ot/[id]` | attendance |
| GET, POST | `/api/attendance/punch` | attendance |
| GET, POST | `/api/attendance/sync/biometric/live` | attendance |
| GET, POST | `/api/attendance/sync/biometric` | attendance |
|  | `/api/auth/[...nextauth]` | auth |
| GET | `/api/cha/checklist-files/[id]` | cha |
| GET | `/api/cha/do-validity/expiring` | cha |
| GET | `/api/cha/documents/[id]` | cha |
| GET | `/api/communication/chat/check-new` | communication |
| POST | `/api/communication/chat/dm` | communication |
| GET | `/api/communication/chat/list` | communication |
| GET, POST | `/api/communication/chat/messages` | communication |
| GET, POST, DELETE | `/api/communication/chat/space/members` | communication |
| GET, POST, PATCH | `/api/communication/chat/space` | communication |
| GET | `/api/communication/chat/sse` | communication |
| POST | `/api/communication/chat/sync` | communication |
| GET, POST, DELETE | `/api/communication/mail/labels` | communication |
| GET, POST | `/api/communication/mail/link` | communication |
| GET | `/api/communication/mail/list` | communication |
| POST | `/api/communication/mail/modify` | communication |
| POST | `/api/communication/mail/send` | communication |
| GET | `/api/communication/mail/thread` | communication |
| GET | `/api/communication/oauth/callback` | communication |
| GET | `/api/communication/oauth/connect` | communication |
| POST | `/api/communication/oauth/disconnect` | communication |
| GET | `/api/communication/search` | communication |
| GET | `/api/crm/justdial-live` | crm |
| GET | `/api/crm/recordings/[id]/download` | crm |
| GET | `/api/crm/recordings/[id]/playback` | crm |
| POST | `/api/crm/recordings/[id]/reviews` | crm |
| GET | `/api/cron/appraisal-trigger` | cron |
| GET | `/api/cron/crm-reminders` | cron |
| GET | `/api/cron/email-flush` | cron |
| GET | `/api/cron/google-chat-retry` | cron |
| GET | `/api/cron/justdial-import` | cron |
| GET | `/api/cron/tracking-alerts` | cron |
| GET | `/api/google-chat/admin` | google-chat |
| POST | `/api/google-chat/debug` | google-chat |
| GET, POST | `/api/google-chat/link` | google-chat |
|  | `/api/google-chat` | google-chat |
| GET | `/api/google-chat/spaces` | google-chat |
| POST | `/api/google-chat/webhook` | google-chat |
| GET | `/api/health` | health |
| GET, POST | `/api/hrms/approvals` | hrms |
| GET | `/api/hrms/attendance/month` | hrms |
| POST | `/api/hrms/attendance/punch` | hrms |
| GET, PATCH | `/api/hrms/dashboard` | hrms |
| GET, PATCH | `/api/hrms/employees` | hrms |
| POST | `/api/hrms/employees/[id]/salary-structure` | hrms |
| GET, POST | `/api/hrms/files` | hrms |
| GET, POST | `/api/hrms/hr-cases` | hrms |
| POST | `/api/hrms/hr-cases/[id]/comments` | hrms |
| POST | `/api/hrms/leave/requests` | hrms |
| GET | `/api/hrms/leave/summary` | hrms |
| POST | `/api/hrms/letters/assets/upload` | hrms |
| GET, POST | `/api/hrms/letters` | hrms |
| GET, POST, PUT | `/api/hrms/letters/settings` | hrms |
| POST | `/api/hrms/letters/share-mail` | hrms |
| POST | `/api/hrms/letters/templates/upload` | hrms |
| GET | `/api/hrms/letters/verify` | hrms |
| POST | `/api/hrms/letters/[id]/accept` | hrms |
| POST | `/api/hrms/letters/[id]/action` | hrms |
| GET, PUT, DELETE | `/api/hrms/letters/[id]` | hrms |
| GET, POST, PATCH | `/api/hrms/lms` | hrms |
| GET | `/api/hrms/me` | hrms |
| GET, POST | `/api/hrms/on-duty` | hrms |
| GET, POST | `/api/hrms/onboarding` | hrms |
| GET, POST | `/api/hrms/performance` | hrms |
| GET, POST | `/api/hrms/reimbursement` | hrms |
| GET, PATCH | `/api/hrms/settings/services` | hrms |
| GET, POST | `/api/hrms/tasks` | hrms |
| GET | `/api/hrms/team/reportees` | hrms |
| GET, POST | `/api/hrms/timetracker` | hrms |
| GET | `/api/hrms/tracking` | hrms |
| GET, POST | `/api/hrms/travel` | hrms |
| GET, POST | `/api/hrms/work-reports` | hrms |
| POST | `/api/hrms/work-reports/[id]/approve` | hrms |
| POST, OPTIONS | `/api/mobile/auth/login` | mobile |
| POST, OPTIONS | `/api/mobile/crm/auth/login` | mobile |
| PATCH, OPTIONS | `/api/mobile/crm/call-attempts/[callAttemptId]/complete` | mobile |
| POST, OPTIONS | `/api/mobile/crm/call-attempts/[callAttemptId]/recording` | mobile |
| PATCH | `/api/mobile/crm/call-attempts/[callAttemptId]/recording/status` | mobile |
| GET, OPTIONS | `/api/mobile/crm/leads` | mobile |
| POST, OPTIONS | `/api/mobile/crm/leads/[leadId]/call-attempts` | mobile |
| PATCH, OPTIONS | `/api/mobile/crm/leads/[leadId]/status` | mobile |
| GET, OPTIONS | `/api/mobile/crm/update` | mobile |
| GET, POST, OPTIONS | `/api/mobile/hrms/agreement` | mobile |
| POST, OPTIONS | `/api/mobile/hrms/attendance/check-in` | mobile |
| POST, OPTIONS | `/api/mobile/hrms/attendance/check-out` | mobile |
| GET, OPTIONS | `/api/mobile/hrms/attendance/history` | mobile |
| GET, OPTIONS | `/api/mobile/hrms/dashboard` | mobile |
| GET, POST, OPTIONS | `/api/mobile/hrms/face/enroll` | mobile |
| GET, POST, OPTIONS | `/api/mobile/hrms/on-duty` | mobile |
| GET, POST, OPTIONS | `/api/mobile/hrms/tracking/heartbeat` | mobile |
| POST, OPTIONS | `/api/mobile/mona/chat` | mobile |
| POST | `/api/mona/chat` | mona |
| GET, POST | `/api/mona/model` | mona |
| GET | `/api/notifications/active` | notifications |
| POST | `/api/notifications/dismiss-all` | notifications |
| POST | `/api/notifications/presented` | notifications |
| POST | `/api/notifications/read-all` | notifications |
| GET | `/api/notifications` | notifications |
| POST | `/api/notifications/[id]/ack` | notifications |
| POST | `/api/notifications/[id]/dismiss` | notifications |
| POST | `/api/notifications/[id]/open` | notifications |
| POST | `/api/notifications/[id]/read` | notifications |
| POST | `/api/org/branches` | org |
| PATCH, DELETE | `/api/org/branches/[id]` | org |
| POST | `/api/org/departments` | org |
| POST | `/api/org/departments/[id]/divisions` | org |
| PATCH, DELETE | `/api/org/departments/[id]` | org |
| PATCH, DELETE | `/api/org/divisions/[id]` | org |
| GET | `/api/org` | org |
| GET, POST | `/api/recruit/applications` | recruit |
| GET | `/api/recruit/applications/[id]` | recruit |
| POST | `/api/recruit/applications/[id]/stage` | recruit |
| GET | `/api/recruit/audit` | recruit |
| GET, POST | `/api/recruit/candidates` | recruit |
| GET, PATCH, DELETE | `/api/recruit/candidates/[id]` | recruit |
| GET | `/api/recruit/dashboard` | recruit |
| GET, POST | `/api/recruit/jobs` | recruit |
| GET, PUT, PATCH | `/api/recruit/jobs/[id]` | recruit |
| GET, POST | `/api/recruit/jobseeker/applications` | recruit |
| GET, POST | `/api/recruit/jobseeker/career/conversations` | recruit |
| POST | `/api/recruit/jobseeker/career/conversations/[id]/messages` | recruit |
| GET | `/api/recruit/jobseeker/career/conversations/[id]` | recruit |
| GET | `/api/recruit/jobseeker/dashboard` | recruit |
| GET, POST | `/api/recruit/jobseeker/listings` | recruit |
| GET, PATCH | `/api/recruit/jobseeker/profile` | recruit |
| GET, POST, PATCH | `/api/recruit/jobseeker/resumes` | recruit |
| GET, PATCH | `/api/recruit/settings` | recruit |
| GET, POST | `/api/roles` | roles |
| PUT | `/api/roles/[id]/permissions` | roles |
| GET, POST | `/api/setup` | setup |
| POST | `/api/todos/reminders/check` | todos |
| GET | `/api/todos/reminders/upcoming` | todos |
| GET, POST | `/api/todos` | todos |
| PATCH | `/api/todos/subtasks/[id]` | todos |
| PATCH, DELETE | `/api/todos/[id]` | todos |
| GET, POST | `/api/users` | users |
| POST | `/api/users/[id]/password` | users |
| PUT | `/api/users/[id]/roles` | users |
| GET, PATCH | `/api/users/[id]` | users |

## App Routes (Pages)

| Route | Module | Type |
|---|---|---|
| `/accounting/accounts` | accounting | page |
| `/accounting/balance-sheet` | accounting | page |
| `/accounting/banking` | accounting | page |
| `/accounting/general-ledger` | accounting | page |
| `/accounting/invoices-sales/new` | accounting | page |
| `/accounting/invoices-sales` | accounting | page |
| `/accounting/items/new` | accounting | page |
| `/accounting/items` | accounting | page |
| `/accounting/items/[id]` | accounting | page |
| `/accounting/jobs` | accounting | page |
| `/accounting/journal-entries/new` | accounting | page |
| `/accounting/journal-entries` | accounting | page |
| `/accounting/journal-entries/[id]` | accounting | page |
| `/accounting` | accounting | page |
| `/accounting/payment-entries/new` | accounting | page |
| `/accounting/payment-entries` | accounting | page |
| `/accounting/payment-entries/[id]` | accounting | page |
| `/accounting/profit-loss` | accounting | page |
| `/accounting/purchase-invoices/new` | accounting | page |
| `/accounting/purchase-invoices` | accounting | page |
| `/accounting/purchase-invoices/[id]` | accounting | page |
| `/accounting/purchase-orders/new` | accounting | page |
| `/accounting/purchase-orders` | accounting | page |
| `/accounting/quotations` | accounting | page |
| `/accounting/reports` | accounting | page |
| `/accounting/sales-invoices/new` | accounting | page |
| `/accounting/sales-invoices` | accounting | page |
| `/accounting/sales-invoices/[id]` | accounting | page |
| `/accounting/sales-orders/new` | accounting | page |
| `/accounting/sales-orders` | accounting | page |
| `/accounting/settings` | accounting | page |
| `/accounting/trial-balance` | accounting | page |
| `/admin/data-tools` | admin | page |
| `/admin/google-chat` | admin | page |
| `/admin/notifications` | admin | page |
| `/admin` | admin | page |
| `/admin/passkeys` | admin | page |
| `/admin/roles` | admin | page |
| `/admin/sessions` | admin | page |
| `/admin/settings` | admin | page |
| `/admin/simulation` | admin | page |
| `/ams/appraisals/assign/[employeeId]` | ams | page |
| `/ams/appraisals` | ams | page |
| `/ams/appraisals/[id]/management-review` | ams | page |
| `/ams/appraisals/[id]` | ams | page |
| `/ams/assets` | ams | page |
| `/ams/assets/[id]` | ams | page |
| `/ams/criteria` | ams | page |
| `/ams/cycles` | ams | page |
| `/ams/extensions` | ams | page |
| `/ams/history` | ams | page |
| `/ams/kpi` | ams | page |
| `/ams/my-appraisal` | ams | page |
| `/ams/my-appraisal/[id]/self-assessment` | ams | page |
| `/ams/my-reviews` | ams | page |
| `/ams/my-reviews/[id]` | ams | page |
| `/ams` | ams | page |
| `/ams/pms` | ams | page |
| `/ams/slabs` | ams | page |
| `/attendance/biometric-sync` | attendance | page |
| `/attendance/leaves` | attendance | page |
| `/attendance/ot` | attendance | page |
| `/attendance` | attendance | page |
| `/attendance/punch` | attendance | page |
| `/attendance/reports` | attendance | page |
| `/attendance/timesheets` | attendance | page |
| `/cha/approvals` | cha | page |
| `/cha/customers/new` | cha | page |
| `/cha/customers` | cha | page |
| `/cha/customers/[id]/edit` | cha | page |
| `/cha/expenses` | cha | page |
| `/cha/jobs` | cha | page |
| `/cha/jobs/[jobId]` | cha | page |
| `/cha` | cha | page |
| `/cha/reports` | cha | page |
| `/cha/settings/filing-workflows` | cha | page |
| `/cha/settings` | cha | page |
| `/communication/calendar` | communication | page |
| `/communication/chat` | communication | page |
| `/communication/drive` | communication | page |
| `/communication/google-chat-live-view` | communication | page |
| `/communication/job-spaces` | communication | page |
| `/communication/mail` | communication | page |
| `/communication/meetings` | communication | page |
| `/communication` | communication | page |
| `/communication/search` | communication | page |
| `/communication/settings` | communication | page |
| `/crm/approvals` | crm | page |
| `/crm/calls` | crm | page |
| `/crm/campaigns` | crm | page |
| `/crm/contacts/new` | crm | page |
| `/crm/contacts` | crm | page |
| `/crm/contacts/[id]/edit` | crm | page |
| `/crm/contacts/[id]` | crm | page |
| `/crm/customers/new` | crm | page |
| `/crm/customers` | crm | page |
| `/crm/customers/[id]/edit` | crm | page |
| `/crm/customers/[id]` | crm | page |
| `/crm/dashboard` | crm | page |
| `/crm/deals/new` | crm | page |
| `/crm/deals` | crm | page |
| `/crm/deals/[id]/edit` | crm | page |
| `/crm/deals/[id]` | crm | page |
| `/crm/documents` | crm | page |
| `/crm/efficiency` | crm | page |
| `/crm/enquiries` | crm | page |
| `/crm/enquiries/[id]` | crm | page |
| `/crm/events` | crm | page |
| `/crm/forecasts` | crm | page |
| `/crm/invoices/new` | crm | page |
| `/crm/invoices` | crm | page |
| `/crm/invoices/[invoiceId]` | crm | page |
| `/crm/items/new` | crm | page |
| `/crm/items` | crm | page |
| `/crm/items/[id]` | crm | page |
| `/crm/lead-sources/justdial` | crm | page |
| `/crm/lead-sources/logs` | crm | page |
| `/crm/lead-sources` | crm | page |
| `/crm/leads/new` | crm | page |
| `/crm/leads` | crm | page |
| `/crm/leads/[id]/edit` | crm | page |
| `/crm/leads/[id]` | crm | page |
| `/crm` | crm | page |
| `/crm/price-books` | crm | page |
| `/crm/products` | crm | page |
| `/crm/projects` | crm | page |
| `/crm/purchase-orders` | crm | page |
| `/crm/quotes/new` | crm | page |
| `/crm/quotes` | crm | page |
| `/crm/quotes/[quoteId]/edit` | crm | page |
| `/crm/quotes/[quoteId]` | crm | page |
| `/crm/sales-inbox` | crm | page |
| `/crm/sales-orders` | crm | page |
| `/crm/services` | crm | page |
| `/crm/social` | crm | page |
| `/crm/solutions` | crm | page |
| `/crm/tasks` | crm | page |
| `/crm/tickets/new` | crm | page |
| `/crm/tickets` | crm | page |
| `/crm/tickets/[id]` | crm | page |
| `/crm/vendors` | crm | page |
| `/crm/visits` | crm | page |
| `/crm/voc` | crm | page |
| `/crm/[...slug]` | crm | page |
| `/dashboard` | dashboard | page |
| `/expense` | expense | page |
| `/hrms/approvals` | hrms | page |
| `/hrms/employees/new` | hrms | page |
| `/hrms/employees` | hrms | page |
| `/hrms/employees/[id]` | hrms | page |
| `/hrms/files` | hrms | page |
| `/hrms/helpdesk` | hrms | page |
| `/hrms/letters` | hrms | page |
| `/hrms/letters/view/[id]` | hrms | page |
| `/hrms/on-duty-admin` | hrms | page |
| `/hrms/onboarding` | hrms | page |
| `/hrms/org-structure` | hrms | page |
| `/hrms/ownership` | hrms | page |
| `/hrms` | hrms | page |
| `/hrms/payroll` | hrms | page |
| `/hrms/recruit/audit` | hrms | page |
| `/hrms/recruit/career/applications` | hrms | page |
| `/hrms/recruit/career/assistant` | hrms | page |
| `/hrms/recruit/career/jobs` | hrms | page |
| `/hrms/recruit/career` | hrms | page |
| `/hrms/recruit/career/profile` | hrms | page |
| `/hrms/recruit/career/resumes` | hrms | page |
| `/hrms/recruit/employer/applications` | hrms | page |
| `/hrms/recruit/employer/candidates/new` | hrms | page |
| `/hrms/recruit/employer/candidates` | hrms | page |
| `/hrms/recruit/employer/jobs/new` | hrms | page |
| `/hrms/recruit/employer/jobs` | hrms | page |
| `/hrms/recruit/employer` | hrms | page |
| `/hrms/recruit` | hrms | page |
| `/hrms/recruit/settings` | hrms | page |
| `/hrms/reimbursement` | hrms | page |
| `/hrms/salary-revisions` | hrms | page |
| `/hrms/salary-structure` | hrms | page |
| `/hrms/settings` | hrms | page |
| `/hrms/tasks` | hrms | page |
| `/hrms/tracking` | hrms | page |
| `/hrms/travel` | hrms | page |
| `/hrms/users` | hrms | page |
| `/hrms/work-reports` | hrms | page |
| `/lms/assignments` | lms | page |
| `/lms/courses` | lms | page |
| `/lms/my-learning` | lms | page |
| `/lms` | lms | page |
| `/lms/reports` | lms | page |
| `/notifications` | notifications | page |
| `/product-catalogue` | product-catalogue | page |
| `/todo` | todo | page |
| `/login` | login | page |
| `/setup` | setup | page |

## Database Models

| Model | Module | Fields | Relations |
|---|---|---|---|
| Organisation | core | 73 | Branch, Department, Division, Role, User, AppraisalCycle, AppraisalSchedule, AppraisalCriterion, AppraisalSelfTemplate, OrgAppraisalSettings, LeaveType, Holiday, Notification, NotificationActivity, TodoTask, Announcement, CrmApprovalLog, CrmWorkTimeLog, BiometricSyncLog, WorkingCalendar, OtSettings, Account, FiscalYear, JournalEntry, GeneralLedgerEntry, SalesInvoice, PurchaseInvoice, PaymentEntry, CustomerLedgerEntry, SupplierLedgerEntry, AccountingSettings, AccountingAuditLog, PayrollBatch, Asset, AssetDepreciationEntry, JobCosting, Quotation, CustomerNote, VendorNote, RecurringExpense, RecurringJournal, TransactionLock, PartnerAccount, ChaSettings, ChaJob, ChaJobDeletionRequest, ChaExpenseRequest, ChaAuditLog, ChaTeamGroup, ChaBranchNumberingRule, ChaShipmentType, ChaDocumentRequirementCategory, FilingWorkflowTemplate, GoogleChatSpace, GoogleChatSubscription, GoogleChatDelivery, GoogleWorkspaceConnection, GoogleWorkspaceSetting, JobWorkspaceProfile, CommunicationAuditEvent, RecruitJobOpening, RecruitCandidate, RecruitApplication, RecruitAuditEvent, RecruitSetting, RecruitAutomationRun |
| Branch | core | 24 | Organisation, User, Holiday, Account, JournalEntry, GeneralLedgerEntry, SalesInvoice, PurchaseInvoice, PaymentEntry, CustomerLedgerEntry, SupplierLedgerEntry, Asset, JobCosting, Quotation, CustomerNote, VendorNote, RecurringExpense, RecurringJournal, ChaJob, ChaBranchNumberingRule |
| Department | core | 7 | Organisation, Division, User |
| Division | core | 7 | Organisation, Department, User |
| Role | core | 8 | Organisation, RolePermission, UserRole, AppraisalCriterion |
| Permission | core | 5 | RolePermission |
| RolePermission | core | 4 | Role, Permission |
| User | core | 156 | Organisation, Branch, Department, Division, User, UserRole, Notification, NotificationActivity, EmploymentRecord, Document, TodoTask, AttendancePunch, LeaveBalance, LeaveRequest, OTEntry, OtRecord, AttendanceRegularization, EmployeeLop, BiometricSyncLog, Appraisal, AppraisalReviewer, ManagementReview, AppraisalMeeting, MeetingMinute, HikeDecision, AppraisalSchedule, AppraisalExtensionRequest, MeetingReschedule, CrmTicket, CrmTicketComment, PasskeyResetRequest, SecurityEvent, UserSession, CrmInvoice, CrmApprovalLog, CrmLead, CrmContact, CrmAccount, CrmDeal, CrmActivity, CrmVendor, CrmProject, CrmNote, CrmAttachment, CrmTimelineEvent, CrmLeadSourceJustdialConfig, CrmExternalLeadSnapshot, CrmLeadReminder, CrmWorkTimeLog, EmployeePreference, EmployeeContact, ShiftAssignment, AttendancePermissionRequest, OnDutyRequest, TimesheetSubmission, Goal, EmployeeSkill, PerformanceFeedback, SalaryRevisionLetter, CourseEnrollment, SurveyResponse, HRCase, HRLetterRequest, TravelRequest, HrmsTask, HrmsAuditLog, WorkReport, MobileDevice, EmployeeFaceEnrollment, AttendanceSession, LocationTrackingSession, TrackingAlert, FuelReimbursementClaim, UserAgreementAcceptance, AccountingAuditLog, CrmCallAttempt, CrmCallReview, CrmCallRecordingAuditLog, GoogleWorkspaceConnection, CommunicationAuditEvent, GoogleChatUserLink, RecruitJobSeekerProfile, RecruitJobListing, RecruitJobMatch, RecruitJobSeekerResume, RecruitTailoredResume, RecruitCoverLetter, RecruitJobSeekerApplication, RecruitJobAlert, RecruitCareerConversation, RecruitInterviewPrep, RecruitPrivateShare, ChaJob, ChaJobAssignment, ChaJobDeletionRequest, ChaDocumentVersion, ChaDocumentException, ChaChecklistImport, ChaChecklistApproval, ChaChecklistReworkNote, ChaFilingDateHistory, ChaExpenseRequest, ChaExpensePayment, ChaExpenseQuery, FilingNodeRun, FilingAttachment, FilingSection49Flag |
| UserRole | core | 4 | User, Role |
| Notification | notifications | 26 | Organisation, User, Notification, NotificationActivity |
| NotificationActivity | notifications | 10 | Notification, Organisation, User |
| EmailQueue | core | 8 | — |
| TodoTask | todo | 17 | User, Organisation, TodoSubtask |
| TodoSubtask | todo | 9 | TodoTask |
| EmploymentRecord | hrms | 17 | User |
| Document | core | 6 | User |
| AttendancePunch | attendance | 12 | User |
| LeaveType | hrms | 6 | — |
| LeaveBalance | hrms | 7 | User, LeaveType |
| LeaveRequest | hrms | 14 | User, LeaveType |
| Holiday | hrms | 8 | Organisation, Branch |
| OTEntry | hrms | 10 | User |
| AppraisalCycle | ams | 8 | Organisation, Appraisal |
| AppraisalSchedule | ams | 13 | Organisation, User, Appraisal |
| AppraisalCriterion | ams | 20 | Organisation, Role, AppraisalCriterion |
| AppraisalSelfTemplate | ams | 6 | Organisation |
| Appraisal | ams | 23 | AppraisalCycle, User, AppraisalReviewer, SelfAssessment, ReviewerRating, ManagementReview, AppraisalMeeting, HikeDecision, AppraisalAuditLog, AppraisalSchedule, AppraisalExtensionRequest, MeetingReschedule |
| AppraisalReviewer | ams | 10 | Appraisal, User, ReviewerRating |
| SelfAssessment | ams | 9 | Appraisal |
| ReviewerRating | ams | 11 | Appraisal, AppraisalReviewer |
| ManagementReview | ams | 11 | Appraisal, User |
| AppraisalMeeting | ams | 10 | Appraisal, User, MeetingMinute |
| MeetingMinute | core | 9 | AppraisalMeeting, User |
| HikeDecision | ams | 20 | Appraisal, User, IncrementSlab |
| AppraisalAuditLog | ams | 12 | Appraisal |
| OrgAppraisalSettings | ams | 4 | — |
| SystemClock | core | 3 | — |
| BiometricSyncLog | core | 10 | Organisation, User |
| WorkingCalendar | core | 9 | Organisation |
| OtSettings | hrms | 7 | Organisation |
| OtRecord | hrms | 17 | User |
| AttendanceRegularization | attendance | 13 | User |
| EmployeeLop | hrms | 9 | User |
| SystemSetting | core | 3 | — |
| IncrementSlab | core | 7 | HikeDecision |
| AppraisalExtensionRequest | ams | 12 | Appraisal, User |
| MeetingReschedule | core | 12 | Appraisal, User |
| CrmTicket | crm | 13 | User, CrmTicketComment |
| CrmTicketComment | crm | 7 | CrmTicket, User |
| PasskeyResetRequest | core | 9 | User |
| SecurityEvent | core | 11 | User |
| UserSession | core | 11 | User |
| CrmLead | crm | 47 | User, CrmExternalLeadSnapshot, CrmLeadReminder, CrmWorkTimeLog, CrmInvoice, CrmCallAttempt |
| CrmLeadReminder | crm | 11 | CrmLead, User |
| CrmContact | crm | 23 | User, CrmAccount, CrmDeal, CrmInvoice |
| CrmAccount | crm | 48 | User, CrmContact, CrmDeal, CrmInvoice, CrmProject, SalesInvoice, CustomerLedgerEntry, Quotation, CustomerNote, JobCosting, ChaJob |
| CrmDeal | crm | 27 | User, CrmAccount, CrmContact, CrmInvoice, SalesInvoice |
| CrmActivity | crm | 21 | User |
| CrmProduct | crm | 11 | — |
| CrmVendor | crm | 21 | User, CrmInvoice, PurchaseInvoice, SupplierLedgerEntry, VendorNote, RecurringExpense |
| CrmInvoice | crm | 52 | User, CrmAccount, CrmContact, CrmDeal, CrmVendor, CrmLead, CrmInvoiceItem, CrmApprovalLog |
| CrmApprovalLog | crm | 11 | Organisation, CrmInvoice, User |
| CrmInvoiceItem | crm | 13 | CrmInvoice |
| CrmProject | crm | 15 | User, CrmAccount |
| CrmNote | crm | 10 | User |
| CrmAttachment | crm | 11 | User |
| CrmTimelineEvent | crm | 10 | User |
| CrmLeadSourceJustdialConfig | crm | 16 | User |
| CrmExternalLeadSnapshot | crm | 23 | CrmLead, User |
| CrmLeadImportLog | crm | 12 | — |
| EmployeePreference | hrms | 3 | — |
| EmployeeContact | hrms | 12 | User |
| ServiceDefinition | core | 8 | ServiceForm |
| ServiceForm | core | 8 | ServiceDefinition, CustomField |
| CustomField | core | 7 | ServiceForm |
| Shift | attendance | 7 | ShiftAssignment |
| ShiftAssignment | attendance | 7 | Shift, User |
| AttendanceBreak | attendance | 5 | — |
| AttendancePermissionRequest | attendance | 11 | User |
| OnDutyRequest | core | 21 | — |
| BiometricDevice | core | 7 | — |
| BiometricPunchImport | attendance | 9 | — |
| TimesheetClient | hrms | 6 | TimesheetProject |
| TimesheetProject | hrms | 8 | TimesheetClient, TimesheetJob |
| TimesheetJob | hrms | 7 | TimesheetProject, TimeLog |
| TimeLog | core | 9 | TimesheetJob |
| TimesheetSubmission | hrms | 9 | User |
| Goal | hrms | 10 | User |
| Skill | hrms | 5 | EmployeeSkill |
| EmployeeSkill | hrms | 6 | Skill, User |
| PerformanceFeedback | hrms | 9 | User |
| SalaryRevisionLetter | hrms | 8 | User |
| Course | lms | 7 | CourseEnrollment |
| CourseEnrollment | lms | 9 | Course, User |
| Survey | lms | 7 | — |
| SurveyQuestion | lms | 7 | Survey |
| SurveyResponse | lms | 5 | — |
| FileFolder | core | 8 | FileAsset |
| FileAsset | ams | 11 | FileFolder |
| HRCaseCategory | hrms | 5 | FAQ |
| FAQ | core | 6 | HRCaseCategory |
| HRCase | hrms | 14 | HRCaseComment, User |
| HRCaseComment | hrms | 6 | HRCase |
| HRLetterTemplate | hrms | 18 | — |
| HRLetterRequest | hrms | 21 | — |
| HRLetterSetting | hrms | 3 | — |
| TravelRequest | hrms | 12 | TravelExpense, User |
| TravelExpense | hrms | 8 | TravelRequest |
| HrmsTask | core | 12 | User |
| HrmsAuditLog | core | 7 | User |
| Announcement | hrms | 5 | — |
| WorkReport | hrms | 14 | User, WorkReportApproval |
| WorkReportApproval | hrms | 7 | WorkReport |
| Account | accounting | 28 | Organisation, Branch, Account, JournalEntryLine, GeneralLedgerEntry, PaymentEntry, TaxLine, RecurringExpense, RecurringJournal, PartnerAccount |
| FiscalYear | accounting | 9 | Organisation |
| JournalEntry | accounting | 18 | Organisation, Branch, JournalEntryLine, GeneralLedgerEntry, PayrollBatch, AssetDepreciationEntry |
| JournalEntryLine | accounting | 10 | JournalEntry, Account |
| GeneralLedgerEntry | accounting | 22 | JobCosting, Organisation, Branch, Account, JournalEntry |
| SalesInvoice | accounting | 30 | JobCosting, Organisation, Branch, CrmAccount, CrmDeal, SalesInvoiceItem, TaxLine, PaymentAllocation, CustomerNote |
| SalesInvoiceItem | accounting | 9 | SalesInvoice |
| PurchaseInvoice | accounting | 26 | JobCosting, Organisation, Branch, CrmVendor, PurchaseInvoiceItem, TaxLine, PaymentAllocation, VendorNote |
| PurchaseInvoiceItem | accounting | 7 | PurchaseInvoice |
| PaymentEntry | accounting | 21 | Organisation, Branch, Account, PaymentAllocation |
| PaymentAllocation | accounting | 8 | PaymentEntry, SalesInvoice, PurchaseInvoice |
| TaxLine | accounting | 9 | Account, SalesInvoice, PurchaseInvoice |
| CustomerLedgerEntry | accounting | 14 | Organisation, Branch, CrmAccount |
| SupplierLedgerEntry | accounting | 14 | Organisation, Branch, CrmVendor |
| AccountingSettings | accounting | 15 | Organisation |
| AccountingAuditLog | accounting | 11 | Organisation, User |
| PayrollBatch | core | 10 | Organisation, JournalEntry |
| Asset | ams | 20 | Organisation, Branch, AssetDepreciationEntry |
| AssetDepreciationEntry | ams | 10 | Organisation, Asset, JournalEntry |
| Quotation | core | 21 | Organisation, Branch, CrmAccount, QuotationItem |
| QuotationItem | core | 12 | Quotation |
| CustomerNote | core | 22 | Organisation, Branch, CrmAccount, SalesInvoice, CustomerNoteItem |
| CustomerNoteItem | core | 9 | CustomerNote |
| VendorNote | core | 22 | Organisation, Branch, CrmVendor, PurchaseInvoice, VendorNoteItem |
| VendorNoteItem | core | 9 | VendorNote |
| RecurringExpense | core | 21 | Organisation, Branch, CrmVendor, Account |
| RecurringJournal | accounting | 20 | Organisation, Branch, Account |
| TransactionLock | core | 9 | Organisation |
| PartnerAccount | accounting | 16 | Organisation, Account |
| JobCosting | core | 20 | Organisation, Branch, CrmAccount, SalesInvoice, PurchaseInvoice, GeneralLedgerEntry |
| CrmWorkTimeLog | crm | 15 | User, CrmLead, Organisation |
| CrmCallAttempt | crm | 14 | CrmLead, User, CrmCallRecording |
| CrmCallRecording | crm | 26 | CrmCallAttempt, CrmCallTranscript, CrmCallReview, CrmCallRecordingAuditLog |
| CrmCallTranscript | crm | 12 | CrmCallRecording |
| CrmCallReview | crm | 10 | CrmCallRecording, User |
| CrmCallRecordingAuditLog | crm | 10 | CrmCallRecording, User |
| GoogleWorkspaceConnection | communication | 14 | User, Organisation |
| GoogleWorkspaceSetting | communication | 7 | — |
| JobWorkspaceProfile | core | 14 | Organisation, ChaJob |
| CommunicationAuditEvent | core | 8 | User, Organisation |
| ChaSettings | cha | 12 | Organisation |
| ChaTeamGroup | cha | 7 | Organisation |
| ChaJobType | cha | 12 | ChaDocumentDefinition, FilingWorkflowTemplate, ChaJob |
| ChaBranchNumberingRule | cha | 15 | Organisation, Branch |
| ChaShipmentType | cha | 8 | Organisation, ChaJob |
| ChaDocumentDefinition | cha | 8 | ChaJobType |
| ChaJob | cha | 41 | Organisation, CrmAccount, ChaJobType, ChaShipmentType, Branch, User, ChaJobAssignment, ChaJobDeletionRequest, ChaJobDocumentRequirement, ChaJobAdditionalData, ChaChecklist, ChaChecklistImport, ChaFiling, FilingWorkflowInstance, FilingSection49Flag, ChaCustomerAdvance, ChaExpenseRequest, ChaAuditLog, JobWorkspaceProfile |
| ChaJobAdditionalData | cha | 15 | ChaJob |
| ChaJobDeletionRequest | cha | 18 | Organisation, ChaJob, User |
| ChaJobAssignment | cha | 6 | ChaJob, User |
| ChaJobDocumentRequirement | cha | 11 | ChaJob, ChaDocumentRequirementItem, ChaDocumentVersion, ChaDocumentException |
| ChaDocumentRequirementCategory | cha | 10 | Organisation, ChaDocumentRequirementItem |
| ChaDocumentRequirementItem | cha | 11 | ChaDocumentRequirementCategory, ChaJobDocumentRequirement |
| ChaDocumentVersion | cha | 12 | ChaJobDocumentRequirement, User |
| ChaDocumentException | cha | 8 | ChaJobDocumentRequirement, User |
| ChaChecklistImport | cha | 14 | ChaJob, User, ChaChecklistSection, ChaChecklistApproval, ChaChecklistReworkNote |
| ChaChecklistSection | cha | 6 | ChaChecklistImport, ChaChecklistItem |
| ChaChecklistItem | cha | 9 | ChaChecklistSection |
| ChaChecklistApproval | cha | 8 | ChaChecklistImport, User |
| ChaChecklistReworkNote | cha | 7 | ChaChecklistImport, User |
| ChaChecklist | cha | 15 | ChaJob, ChaChecklistFileVersion, ChaChecklistDecision |
| ChaChecklistFileVersion | cha | 13 | ChaChecklist, ChaChecklistDecision |
| ChaChecklistDecision | cha | 13 | ChaChecklist, ChaChecklistFileVersion |
| ChaFiling | cha | 15 | ChaJob, ChaFilingDateHistory |
| ChaFilingDateHistory | cha | 7 | ChaFiling, User |
| ChaCustomerAdvance | cha | 9 | ChaJob, ChaCustomerAdvanceReceipt |
| ChaCustomerAdvanceReceipt | cha | 11 | ChaCustomerAdvance |
| ChaExpenseRequest | cha | 19 | ChaJob, Organisation, User, ChaExpenseLine, ChaExpensePayment, ChaExpenseQuery, ChaExpenseStatusHistory |
| ChaExpenseLine | cha | 9 | ChaExpenseRequest |
| ChaExpenseStatusHistory | cha | 7 | ChaExpenseRequest |
| ChaExpensePayment | cha | 12 | ChaExpenseRequest, User |
| ChaExpenseQuery | cha | 11 | ChaExpenseRequest, User |
| ChaAuditLog | cha | 14 | Organisation, ChaJob |
| RecruitSetting | recruit | 3 | — |
| RecruitJobOpening | recruit | 29 | — |
| RecruitJobVersion | recruit | 8 | RecruitJobOpening |
| RecruitCandidate | recruit | 46 | Organisation, RecruitCandidateConsent, RecruitCandidateResume, RecruitCandidateEducation, RecruitCandidateExperience, RecruitCandidateSkill, RecruitApplication, RecruitNote, RecruitTag |
| RecruitCandidateConsent | recruit | 8 | RecruitCandidate |
| RecruitCandidateResume | recruit | 21 | RecruitCandidate, RecruitScreeningResult |
| RecruitCandidateEducation | recruit | 10 | RecruitCandidate |
| RecruitCandidateExperience | recruit | 10 | RecruitCandidate |
| RecruitCandidateSkill | recruit | 6 | RecruitCandidate |
| RecruitApplication | recruit | 25 | Organisation, RecruitJobOpening, RecruitCandidate, RecruitApplicationStageHistory, RecruitScreeningAnswer, RecruitScreeningRun, RecruitInterview, RecruitAssessment, RecruitOffer, RecruitNote |
| RecruitApplicationStageHistory | recruit | 9 | RecruitApplication |
| RecruitScreeningQuestion | recruit | 7 | — |
| RecruitScreeningAnswer | recruit | 7 | RecruitApplication |
| RecruitScreeningRun | recruit | 18 | RecruitApplication, RecruitScreeningResult |
| RecruitScreeningResult | recruit | 26 | RecruitScreeningRun, RecruitCandidateResume |
| RecruitInterview | recruit | 21 | RecruitApplication, RecruitInterviewPanel, RecruitInterviewFeedback |
| RecruitInterviewPanel | recruit | 5 | RecruitInterview |
| RecruitInterviewFeedback | recruit | 10 | RecruitInterview |
| RecruitAssessment | recruit | 14 | RecruitApplication, RecruitAssessmentAttempt |
| RecruitAssessmentAttempt | recruit | 12 | RecruitAssessment |
| RecruitOffer | recruit | 6 | — |
| RecruitOfferApproval | recruit | 8 | RecruitOffer |
| RecruitNote | recruit | 11 | RecruitCandidate, RecruitApplication |
| RecruitTag | recruit | 8 | RecruitCandidate |
| RecruitAttachment | recruit | 11 | — |
| RecruitAutomationRun | recruit | 14 | Organisation, RecruitAutomationRunItem |
| RecruitAutomationRunItem | recruit | 9 | RecruitAutomationRun |
| RecruitHandoffPackage | recruit | 9 | — |
| RecruitAuditEvent | recruit | 13 | Organisation |
| RecruitJobSeekerProfile | recruit | 30 | User, RecruitJobSearchProfile, RecruitJobSeekerResume, RecruitSavedJob, RecruitJobSeekerApplication, RecruitCareerConversation, RecruitJobAlert |
| RecruitJobSearchProfile | recruit | 19 | RecruitJobSeekerProfile, RecruitJobMatch, RecruitJobAlert |
| RecruitJobListing | recruit | 25 | User, RecruitJobMatch, RecruitSavedJob |
| RecruitSavedJob | recruit | 7 | RecruitJobSeekerProfile, RecruitJobListing |
| RecruitJobMatch | recruit | 20 | User, RecruitJobSearchProfile, RecruitJobListing |
| RecruitJobSeekerResume | recruit | 18 | User, RecruitJobSeekerProfile, RecruitTailoredResume, RecruitCoverLetter |
| RecruitTailoredResume | recruit | 20 | User, RecruitJobSeekerResume |
| RecruitCoverLetter | recruit | 21 | User, RecruitJobSeekerResume |
| RecruitJobSeekerApplication | recruit | 25 | User, RecruitJobSeekerProfile |
| RecruitJobAlert | recruit | 22 | User, RecruitJobSeekerProfile, RecruitJobSearchProfile |
| RecruitCareerConversation | recruit | 10 | User, RecruitJobSeekerProfile, RecruitCareerMessage |
| RecruitCareerMessage | recruit | 7 | RecruitCareerConversation |
| RecruitInterviewPrep | recruit | 7 | — |
| RecruitPrivateShare | recruit | 12 | User |
| GoogleChatUserLink | google-chat | 15 | User |
| GoogleChatSpace | google-chat | 22 | Organisation, GoogleChatSubscription, GoogleChatDelivery |
| GoogleChatSubscription | google-chat | 14 | Organisation, GoogleChatSpace |
| GoogleChatDelivery | google-chat | 22 | Organisation, GoogleChatSpace |
| GoogleChatInteractionEvent | google-chat | 6 | — |
| GoogleChatLinkToken | google-chat | 12 | — |
| FilingWorkflowTemplate | core | 12 | Organisation, ChaJobType, FilingWorkflowVersion, FilingWorkflowInstance |
| FilingWorkflowVersion | core | 12 | FilingWorkflowTemplate, FilingWorkflowNode, FilingWorkflowEdge, FilingWorkflowInstance |
| FilingWorkflowNode | core | 30 | FilingWorkflowVersion, FilingChecklistItem, FilingPhotoRequirement, FilingNodeRun |
| FilingWorkflowEdge | core | 6 | FilingWorkflowVersion |
| FilingChecklistItem | core | 19 | FilingWorkflowNode, FilingChecklistResponse, FilingAttachment |
| FilingPhotoRequirement | core | 11 | FilingWorkflowNode, FilingAttachment |
| FilingWorkflowInstance | core | 14 | ChaJob, FilingWorkflowTemplate, FilingWorkflowVersion, FilingNodeRun, FilingChecklistResponse, FilingAttachment |
| FilingNodeRun | core | 15 | FilingWorkflowInstance, FilingWorkflowNode, User, FilingChecklistResponse, FilingAttachment |
| FilingChecklistResponse | core | 16 | FilingWorkflowInstance, FilingNodeRun, FilingChecklistItem |
| FilingAttachment | core | 16 | FilingWorkflowInstance, FilingNodeRun, FilingPhotoRequirement, FilingChecklistItem, User |
| FilingSection49Flag | core | 8 | ChaJob, User |
| MobileDevice | hrms | 14 | User |
| EmployeeFaceEnrollment | hrms | 14 | User |
| AttendanceSession | attendance | 7 | — |
| LocationTrackingSession | hrms | 17 | User, AttendanceSession, OnDutyRequest, LocationPoint, TrackingAlert |
| LocationPoint | hrms | 16 | LocationTrackingSession |
| TrackingAlert | hrms | 16 | User, LocationTrackingSession |
| FuelReimbursementPolicy | hrms | 10 | — |
| FuelReimbursementClaim | hrms | 18 | User, OnDutyRequest |
| UserAgreementVersion | core | 11 | UserAgreementAcceptance |
| UserAgreementAcceptance | core | 11 | User, UserAgreementVersion |

## Module Service Files

### accounting
- **actions.ts**: createAccountAction, updateAccountAction, createJournalEntryAction, submitJournalEntryAction, cancelJournalEntryAction, createSalesInvoiceAction, submitSalesInvoiceAction, cancelSalesInvoiceAction, createPurchaseInvoiceAction, submitPurchaseInvoiceAction, cancelPurchaseInvoiceAction, createPaymentEntryAction, submitPaymentEntryAction, cancelPaymentEntryAction, updateAccountingSettingsAction, initializeCOAAction, generateInvoiceFromDealAction, getPayrollBatchesAction, compilePayrollBatchAction, createPayrollBatchAction, finalizePayrollBatchAction, payPayrollBatchAction, listAssetsAction, getAssetAction, createAssetAction, runDepreciationAction, listQuotationsAction, getQuotationAction, createQuotationAction, convertQuotationToInvoiceAction, listCustomerNotesAction, getCustomerNoteAction, createCustomerNoteAction, submitCustomerNoteAction, getTransactionLockAction, updateTransactionLockAction, listJobCostingsAction, getJobCostingAction, createJobCostingAction, updateJobCostingAction, getARAgeingAction, getAPAgeingAction, getSalesRegisterAction, getPurchaseRegisterAction, getGSTR1SummaryAction, getGSTR2BSummaryAction, getConsolidatedGSTLedgerAction, getDayBookAction, getJournalRegisterAction, getJobProfitabilityAction, getCashAndBankLedgerAction, recordBankTransferAction, getProfitAndLossAction, getBalanceSheetAction, getTrialBalanceAction
- **reports.ts**: getGeneralLedger, getTrialBalance, getProfitAndLoss, getBalanceSheet, getARAgeing, getAPAgeing, getSalesRegister, getPurchaseRegister, getGSTR1Summary, getGSTR2BSummary, getConsolidatedGSTLedger, getDayBook, getJournalRegister, getJobProfitability, getCashAndBankLedger
- **service.ts**: seedChartOfAccounts, createAuditLog, listAccounts, getChartOfAccounts, createAccount, updateAccount, validateBalancedEntry, validateAccountPostingAllowed, postGLTransactions, reverseGLTransactions, listJournalEntries, getJournalEntry, createJournalEntry, submitJournalEntry, cancelJournalEntry, listSalesInvoices, getSalesInvoice, createSalesInvoice, submitSalesInvoice, cancelSalesInvoice, listPurchaseInvoices, getPurchaseInvoice, createPurchaseInvoice, submitPurchaseInvoice, cancelPurchaseInvoice, listPaymentEntries, getPaymentEntry, createPaymentEntry, submitPaymentEntry, cancelPaymentEntry, getAccountingSettings, updateAccountingSettings, compilePayrollBatch, getPayrollBatches, createPayrollBatch, finalizePayrollBatch, payPayrollBatch, listAssets, getAsset, createAsset, runDepreciationForAsset, getTransactionLock, updateTransactionLock, validatePostingDateNotLocked, listQuotations, getQuotation, createQuotation, convertQuotationToInvoice, listCustomerNotes, getCustomerNote, createCustomerNote, submitCustomerNote, listVendorNotes, getVendorNote, createVendorNote, submitVendorNote, processRecurringExpenses, processRecurringJournals, listPartnerAccounts, createPartnerAccount, updatePartnerAccount, recordPartnerTransaction, listJobCostings, getJobCosting, createJobCosting, updateJobCosting
- **types.ts**: no exports detected
- **validators.ts**: no exports detected
- **accounting.test.ts**: no exports detected

### ams
- **audit-log.ts**: createAppraisalAuditLogCompat
- **criteria-cache.ts**: loadSelfCriteria, loadReviewerCriteria, invalidateReviewerCriteria
- **criteria-config.ts**: buildDefaultSelfFormTemplate, normalizeScore, getGrade, getSalaryTier, getHikePercent, getAllowedRoles, canRateCriteria, getVisibleCriteriaForRole, getVisibleFormForUser, clampRating, buildQuestionKey, isSubmittedStatus
- **daily-job.ts**: runAppraisalDailyJob
- **due-dates.ts**: addBusinessDays, computeSchedule, dueInMonth, dueOnDate
- **form-template.ts**: mapCriterionRowToPoint, toCriterionRecord, filterCriteriaPointsByRole, sanitizeSelfRatings, sanitizeReviewerRatings, buildSeedCriteriaForPhase
- **self-form-template.ts**: normalizeSelfFormTemplate, resolveSelfFormTemplate
- **service.ts**: listCycles, createCycle, activateCycle, closeCycle, listCriteria, getSelfFormTemplate, saveSelfFormTemplate, getCriteriaTree, createCriterion, deleteCriterion, findOrCreateCycle, syncEmployeeAppraisalSchedule, syncOrgAppraisalSchedules, listAppraisalEligibleUsers, listDueAppraisals, createAppraisalForEmployee, listAppraisals, getAppraisal, getMyReviewView, assignReviewers, setReviewerAvailability, openPastDeadlineAssessments, advancePastDeadlineStages, claimManagementReview, submitSelfAssessment, submitReviewerRating, submitManagementReview, confirmMeeting, startMeeting, addMeetingMinute, closeMeeting, finaliseHike, computeAppraisalScore, listMyAppraisals, notifyStalePendingReviewers, resetAmsData, listMyReviewAppraisals
- **settings.ts**: getAppraisalSettings, upsertAppraisalSettings
- **types.ts**: no exports detected
- **workflow.ts**: canTransition, assertTransition

### attendance
- **service.ts**: punchIn, punchOut, getMonthAttendance, getLeaveTypes, createLeaveType, getLeaveBalances, initLeaveBalancesForUser, getLeaveRequests, createLeaveRequest, decideLeaveRequest, createOTEntry, decideOT, getOTEntries, getHolidays, createHoliday, getMonthlyReport

### cha
- **actions.ts**: ensureSettingsAndDefaultsAction, updateSettingsAction, createJobAction, submitJobDeletionAction, decideJobDeletionRequestAction, createJobTypeAction, updateJobTypeManifestConfigAction, createShipmentTypeAction, deleteShipmentTypeAction, deleteJobTypeAction, createTeamGroupAction, deleteTeamGroupAction, getJobDetailsAction, listJobsAction, uploadDocumentVersionAction, deleteDocumentVersionAction, declareDocumentExceptionAction, markDocumentNotAvailableAction, importChecklistExcelAction, uploadChecklistFileAction, upsertAdditionalDataAction, submitChecklistInternalDecisionAction, submitChecklistCustomerDecisionAction, proceedAdditionalDataAction, submitChecklistForApprovalAction, checklistManagerActionAction, selfApproveChecklistAction, adjustEstimatedFilingDateAction, markAsFiledAction, updateCustomerAdvanceExpectedAction, recordCustomerAdvanceReceiptAction, declareAdvanceNotRequiredAction, createExpenseRequestAction, triggerUrgentExpenseEscalationAction, setExpenseStatusAction, postExpensePaymentAction, acknowledgeExpenseReceiptAction, raisePaymentQueryAction, resolvePaymentQueryAction, listAllExpensesAction, listManagerChecklistApprovalsAction, upsertDocumentCategoryAction, deleteDocumentCategoryAction, upsertDocumentItemAction, deleteDocumentItemAction, removeDocumentExceptionAction, proceedDocumentStageAction, acknowledgeDoValidityWarningAction, updateJobDetailsAction, submitChecklistOwnerDecisionAction, saveFilingWorkflowDraftAction, publishFilingWorkflowAction, getFilingWorkflowDetailsAction, getFilingWorkflowInstanceAction, startFilingWorkflowAction, completeFilingNodeAction, toggleFilingSection49Action, getFilingSection49Action, uploadFilingAttachmentAction, upsertFilingShipmentDetailsAction, deleteFilingAttachmentAction
- **service.ts**: ensureDefaultDocumentRequirements, ensureSettingsAndDefaults, logChaAudit, getChecklistInternalApproverIds, createJob, createJobType, updateJobTypeManifestConfig, deleteJobType, upsertBranchNumberingRules, createShipmentType, deleteShipmentType, createTeamGroup, deleteTeamGroup, listJobTypesForSelection, listJobTypesForSettings, getJobDetails, listJobs, getFolderNameForCategory, uploadDocumentVersion, deleteDocumentVersion, declareDocumentException, markDocumentNotAvailable, verifyDocumentGate, upsertAdditionalData, proceedAdditionalDataStage, listDeliveryOrderValidityWarnings, acknowledgeDeliveryOrderValidityWarning, uploadChecklistFile, submitChecklistInternalDecision, submitChecklistCustomerDecision, importChecklistExcel, submitChecklistForApproval, checklistManagerAction, selfApproveChecklist, adjustEstimatedFilingDate, markAsFiled, updateCustomerAdvanceExpected, recordCustomerAdvanceReceipt, declareAdvanceNotRequired, createExpenseRequest, triggerUrgentExpenseEscalation, setExpenseStatus, postExpensePayment, acknowledgeExpenseReceipt, raisePaymentQuery, resolvePaymentQuery, listAllExpenses, listManagerChecklistApprovals, listManagerJobDeletionRequests, submitJobDeletion, decideJobDeletionRequest, upsertDocumentCategory, deleteDocumentCategory, upsertDocumentItem, deleteDocumentItem, removeDocumentException, proceedDocumentStage, getEligibleManagers, updateJobDetails, submitChecklistOwnerDecision, ensureDefaultFilingWorkflows, calculateSlaDueDate, listFilingWorkflows, getFilingWorkflowDetails, saveFilingWorkflowDraft, publishFilingWorkflow, getFilingWorkflowInstance, startFilingWorkflow, completeFilingNode, toggleFilingSection49, getFilingSection49, uploadFilingAttachment, upsertFilingShipmentDetails, deleteFilingAttachment
- **cha.test.ts**: no exports detected

### communication
- **chat-integration.test.ts**: no exports detected

### core
- **module-config.ts**: isSectionEnabled, getManagedModuleSectionIdForPath
- **module-settings.ts**: getEnabledModuleIds, getFreshEnabledModuleIds, setEnabledModuleIds, getEnabledModuleIdSet
- **service.ts**: syncChaRolePermissions, getOrg, createBranch, updateBranch, deleteBranch, createDepartment, updateDepartment, deleteDepartment, createDivision, updateDivision, deleteDivision, getRoles, createRole, updateRolePermissions, deleteRole, getAllPermissions
- **service.ts**: listUsers, listUsersForDashboard, listUsersSlim, getUser, createUser, updateUser, updateUserRoles, updateEmploymentRecord, resetPassword
- **special-account-bootstrap.ts**: ensureSpecialAccounts

### crm
- **actions.ts**: createLeadAction, updateLeadAction, convertLeadAction, deleteLeadAction, updateLeadStatusAction, saveEnquiryRatesAction, createAccountAction, createContactAction, createDealAction, updateDealStageAction, createActivityAction, createNoteAction, deleteNoteAction, globalCrmSearchAction, updateContactAction, deleteContactAction, updateAccountAction, deleteAccountAction, updateDealAction, deleteDealAction, createProductAction, updateProductAction, deleteProductAction, createVendorAction, updateVendorAction, deleteVendorAction, createInvoiceAction, updateInvoiceAction, deleteInvoiceAction, createProjectAction, updateProjectAction, deleteProjectAction, createAttachmentAction, deleteAttachmentAction, seedCrmDemoDataAction, saveJustdialConfigAction, runJustdialImportAction, forceResetJustdialLockAction, testJustdialSessionAction, getJustdialLogsAction, toggleJustdialActiveAction, saveQuoteAction, logWorkTimeAction, deleteWorkTimeAction, assignLeadOwnerAction, updatePerishableDetailsAction, simulateInboundEmailAction, getCallAttemptsAction
- **approval-actions.ts**: actionSubmitForApproval, actionApproveDocument, actionRequestRework, actionDeclineDocument, actionSendToCustomer, actionMarkCustomerViewed, actionAcceptQuote, actionMarkInvoiced, actionAdminRestoreToDraft, actionConvertToInvoice, actionRaiseDirectSalesOrder, fetchPendingApprovals, fetchApprovalLogs, fetchApprovalMetrics
- **approval-workflow.ts**: calcSoSlaDeadline, submitForApproval, approveDocument, requestRework, declineDocument, sendToCustomer, markCustomerViewed, acceptQuote, convertToInvoice, raiseDirectSalesOrder, markInvoiced, adminRestoreToDraft, getPendingApprovals, getApprovalLogs, getApprovalMetrics, checkAndTriggerSlaNotifications
- **crm-lead-conversion.service.ts**: normalizeMobileNumber, generateLeadKey, processJustdialLead
- **justdial-import.service.ts**: runJustdialImport, testJustdialSession
- **lead-source.service.ts**: getJustdialConfig, saveJustdialConfig, setImportingLock, getImportLogs, createImportLog, updateImportLog
- **service.ts**: addTimelineEvent, getTimelineEvents, addNote, getNotes, deleteNote, addAttachment, getAttachments, deleteAttachment, listLeads, listEnquiries, getLead, createLead, updateLead, deleteLead, listContacts, getContact, createContact, updateContact, listAccounts, getAccount, createAccount, updateAccount, listDeals, getDeal, createDeal, updateDealStage, updateDeal, listActivities, createActivity, updateActivity, deleteActivity, listProducts, createProduct, listVendors, createVendor, listInvoices, getInvoice, createInvoice, listProjects, createProject

### google-chat
- **cards.ts**: buildConnectCard, buildHelpCard, buildStatusCard, buildTasksCard, buildAiResponseCard, buildErrorCard, buildNotificationCard, buildSpaceLinkedCard, buildPrivacyCard, buildProcessingCard
- **commands.ts**: handleCommand
- **delivery.ts**: queueDelivery, processDelivery, sendNow, updateNow, retryFailedDeliveries, listDeliveries
- **gateway.ts**: processMessage, resetSession
- **identity.ts**: resolveIdentity, tryAutoLink, generateLinkToken, verifyLinkToken, completeLinking, revokeLink, getOrgLinks
- **router.ts**: routeNotification, broadcastToOrgAdmins
- **space.ts**: upsertSpace, linkSpaceToRecord, unlinkSpace, markBotRemoved, getSpaceByResource, getSpacesForRecord, listOrgSpaces, upsertSubscription, getSubscriptionsForUser
- **types.ts**: no exports detected

### hrms
- **face-enrollment.ts**: enrollFace, verifyFace, resetFaceEnrollment, getFaceEnrollmentStatus, listFaceEnrollments
- **letter-template-import.ts**: buildFieldSchema, saveEditorHtmlAsDocx, importDocxTemplateFile, getBundledDocxTemplateFiles
- **letter-template-types.ts**: no exports detected
- **letters-service.ts**: formatCurrency, formatDate, maskAadhaar, getHRLetterTemplates, getHRLetterTemplateById, createHRLetterTemplate, replaceHRLetterTemplatesFromImports, importBundledHRLetterTemplates, uploadHRLetterTemplateDocx, updateHRLetterTemplate, saveHRLetterTemplateEditorRevision, approveHRLetterTemplateLegal, getEmployeePrepopulatedDetails, getHRLetterRequests, getHRLetterRequestById, createHRLetterRequest, updateHRLetterRequest, transitionHRLetterRequest, acceptHRLetterRequest, getHRLetterSettings, updateHRLetterSettings, verifyHRDocument
- **mobile-attendance.ts**: checkIn, checkOut, getAttendanceStatus, getAttendanceHistory, createSessionFromBiometric, autoCloseExpiredSessions
- **on-duty.ts**: createOnDutyRequest, approveOnDutyRequest, rejectOnDutyRequest, startOnDutyTrip, completeOnDutyTrip, recordLocationHeartbeat, detectOfflineEmployees, getActiveReimbursementRate, createFuelReimbursementClaim, approveReimbursementClaim, rejectReimbursementClaim, markReimbursementPaid, listOnDutyRequests, listPendingApprovals, getActiveOnDutyEmployees, getOnDutyRouteHistory, getTrackingAlerts, resolveTrackingAlert, listReimbursementClaims, listUserReimbursements
- **salary-revisions-shared.ts**: formatINR, formatPercent, buildTenureLabel, normalizeRevision, buildSalaryRevisionSummary, computeSalaryRevisionStats
- **salary-revisions.ts**: listSalaryRevisionSummaries, getSalaryRevisionSummaryForUser
- **salary-structure.ts**: computeSalary, formatINR, cityLabel
- **service.ts**: getMe, getDashboardWidgets, updateDashboardWidgets, punchAction, getAttendanceCalendar, getLeaveTrackerSummary, applyLeave, getTimesheetProjects, getTimeLogs, createTimeLog, getHelpDeskCases, createHRCase, addCaseComment, getFiles, createFolder, uploadFileAsset, getSurveys, submitSurveyResponse, getServiceDefinitions, updateServiceSettings, getWorkReports, createWorkReport, submitWorkReportApproval, getTeamReportees, getOnboardingStatus, submitOnboardingDetails, getLmsCourses, enrollInCourse, updateCourseProgress, getPerformanceData, createPerformanceGoal, updateGoalProgress, submitPerformanceFeedback, getTravelRequests, createTravelRequest, createTravelExpense, getHrmsTasks, createHrmsTask, updateHrmsTaskStatus, getPendingApprovals, executeApprovalDecision
- **types.ts**: no exports detected
- **user-agreement.ts**: getLatestAgreement, createAgreementVersion, seedDefaultAgreement, checkUserAcceptance, recordAcceptance, getAcceptanceReport, listAgreementVersions
- **validators.ts**: no exports detected
- **letters.test.ts**: no exports detected

### mona
- **gemini-client.ts**: setPreferredModel, getPreferredModel, resetQuotaCooldown, callGemini, extractTextFromResponse, extractFunctionCalls, hasFunctionCalls, buildFunctionResponseContent
- **knowledge-base.ts**: no exports detected
- **local-engine.ts**: handleOfflineQuery
- **service.ts**: chatWithMona, clearConversation
- **system-prompt.ts**: buildSystemPrompt
- **tools.ts**: getAvailableTools, executeTool
- **types.ts**: no exports detected

### notifications
- **policy.ts**: getNotificationPolicy
- **service.ts**: recordNotificationActivity, createNotification, notify, notifyMany, triggerCrmLeadReminders, listActiveUserNotifications, markNotificationsPresented, triggerAllDueCrmLeadReminders, listUserNotifications, listAdminNotifications, markNotificationRead, markAllNotificationsRead, acknowledgeNotification, dismissNotification, dismissAllNotifications, openNotificationLink, resendNotification, getUsersWithPermission, flushEmailQueue, intimateAdminsOffline, resolveOfflineNotifications

### recruit
- **audit.ts**: auditRecruit, listRecruitAuditEvents
- **employer-service.ts**: listJobOpenings, getJobOpening, createJobOpening, updateJobStatus, listCandidates, getCandidate, generateCandidateNumber, checkDuplicates, createCandidate, listApplications, getApplication, generateApplicationNumber, createApplication, moveApplicationStage, getEmployerDashboardCounts, getScreeningResults, listOffers, listInterviews
- **jobseeker-service.ts**: getOrCreateJobSeekerProfile, updateJobSeekerProfile, listSearchProfiles, createSearchProfile, listJobListings, addManualJobListing, dismissJobListing, saveJob, listJobSeekerResumes, getJobSeekerResume, listJsApplications, createJsApplication, getInternalApplicationPublicStatus, listCareerConversations, getConversation, addCareerMessage, getJobSeekerDashboardCounts, listJobAlerts, createPrivateShare, resolvePrivateShare
- **types.ts**: no exports detected

### todo
- **service.ts**: listTodoTasks, listUpcomingTodoAlerts, createTodoTask, updateTodoTask, setTodoTaskStatus, toggleTodoSubtask, deleteTodoTask, triggerDueTodoReminders

## Feature Status

| Feature | Module | Status |
|---|---|---|
| User Authentication (NextAuth) | core | ✅ Implemented |
| Session Management | core | ✅ Implemented |
| Role-Based Access Control (RBAC) | core | ✅ Implemented |
| Notification System | core | ✅ Implemented |
| Dark/Light Theme | core | ✅ Implemented |
| File Upload & Document Drive | core | ✅ Implemented |
| Mobile Responsive Layout | core | ✅ Implemented |
| Audit Logging | core | ✅ Implemented |
| Employee Directory | hrms | ✅ Implemented |
| Org Structure (Branch/Dept/Division) | hrms | ✅ Implemented |
| Employee Onboarding | hrms | ✅ Implemented |
| HR Letter Templates | hrms | ✅ Implemented |
| HR Letter Generation & Approval | hrms | ✅ Implemented |
| Salary Structure & Revisions | hrms | ✅ Implemented |
| Employee File Drive | hrms | ✅ Implemented |
| HR Helpdesk / Cases | hrms | ✅ Implemented |
| Work Reports | hrms | ✅ Implemented |
| Travel Requests | hrms | ✅ Implemented |
| Reimbursement Claims | hrms | ✅ Implemented |
| Employee Tasks | hrms | ✅ Implemented |
| On-Duty Requests | hrms | ✅ Implemented |
| Live Location Tracking | hrms | ✅ Implemented |
| Face Enrollment & Recognition | hrms | ✅ Implemented |
| User Agreement Acceptance | hrms | ✅ Implemented |
| Mobile HRMS App (Android) | hrms | ✅ Implemented |
| Mobile Check-In/Check-Out | hrms | ✅ Implemented |
| Biometric Terminal Sync | attendance | ✅ Implemented |
| Punch Card Tracking | attendance | ✅ Implemented |
| Shift Management | attendance | ✅ Implemented |
| Overtime Calculations | attendance | ✅ Implemented |
| Leave Management | attendance | ✅ Implemented |
| Holiday Calendar | attendance | ✅ Implemented |
| Attendance Regularization | attendance | ✅ Implemented |
| Permission Requests | attendance | ✅ Implemented |
| Appraisal Cycle Scheduling | ams | ✅ Implemented |
| Self-Assessment Forms | ams | ✅ Implemented |
| Reviewer Assignment & Rating | ams | ✅ Implemented |
| Management Review & Meetings | ams | ✅ Implemented |
| Hike/Increment Decisions | ams | ✅ Implemented |
| Appraisal Audit Log | ams | ✅ Implemented |
| Lead Management (CRUD) | crm | ✅ Implemented |
| Lead Import (Justdial/External) | crm | ✅ Implemented |
| Contact Management | crm | ✅ Implemented |
| Account Management | crm | ✅ Implemented |
| Deals Pipeline | crm | ✅ Implemented |
| Quotation Builder | crm | ✅ Implemented |
| Invoice Management | crm | ✅ Implemented |
| Support Tickets | crm | ✅ Implemented |
| Mobile CRM App (Android) | crm | ✅ Implemented |
| Call Tracking & Recording | crm | ✅ Implemented |
| Products & Price Books | crm | ✅ Implemented |
| CHA Job Creation | cha | ✅ Implemented |
| Mandatory Manager Assignment | cha | ✅ Implemented |
| Job Owner Assignment | cha | ✅ Implemented |
| Checklist Upload & Approval | cha | ✅ Implemented |
| Job Deletion Approval | cha | ✅ Implemented |
| Filing Workflow | cha | ✅ Implemented |
| CHA Expenses | cha | ✅ Implemented |
| Document Version Control | cha | ✅ Implemented |
| CHA Audit Logging | cha | ✅ Implemented |
| Gmail/Google Workspace Integration | communication | ✅ Implemented |
| Google Chat Integration | communication | ✅ Implemented |
| Email Dispatch Queue | communication | ✅ Implemented |
| Sender Identity Sync | communication | ✅ Implemented |
| Employer Job Posting | recruit | ✅ Implemented |
| Candidate Management | recruit | ✅ Implemented |
| Application Pipeline | recruit | ✅ Implemented |
| Interview Scheduling | recruit | ✅ Implemented |
| Offer Generation | recruit | ✅ Implemented |
| Job Seeker Portal | recruit | ✅ Implemented |
| AI Career Assistant | recruit | ✅ Implemented |
| Chart of Accounts | accounting | ✅ Implemented |
| Journal Entries | accounting | ✅ Implemented |
| General Ledger | accounting | ✅ Implemented |
| Payroll Batches | accounting | 🟡 Partial |
| To-Do Task CRUD | todo | ✅ Implemented |
| Subtask Management | todo | ✅ Implemented |
| Reminder Scheduling | todo | ✅ Implemented |
| Mona AI Chat | mona | ✅ Implemented |
| Product Knowledge Base | mona | 🟡 Partial |
| Course Builder | lms | 🟡 Partial |
| Student Enrollment | lms | 🟡 Partial |

---
*This file is auto-generated by `npm run catalogue:update`. Do not edit manually.*