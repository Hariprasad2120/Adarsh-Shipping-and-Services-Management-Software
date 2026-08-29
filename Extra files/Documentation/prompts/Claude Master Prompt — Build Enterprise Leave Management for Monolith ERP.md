# Mission

You are working inside my existing **Monolith ERP / Monolith Engine** codebase.

Your task is to **research, architect, implement, integrate, test, and finish a production-grade Leave Management module** comparable in functional depth to the Leave/Time-Off module available in mature HRMS/ERP products such as Zoho People.

This is NOT a prototype and NOT merely a UI exercise.

The finished module must include:

- backend domain logic
- database schema and migrations
- APIs/controllers
- services
- frontend employee experience
- manager experience
- HR/admin operations
- comprehensive Leave Management settings
- configurable leave policies
- entitlement/accrual engine
- approval workflows
- balance ledger
- work calendars
- holidays
- compensatory off
- leave restrictions
- payroll/LOP integration
- attendance integration
- notifications
- reporting
- permissions
- audit logs
- scheduled processing
- regulatory/compliance framework
- automated tests
- migration/seed strategy
- integration with the existing Monolith architecture

Do **not** stop after producing an analysis or implementation plan. Inspect the repository, establish how Monolith works, document your assumptions, and then proceed with actual implementation.

---

# 1. FIRST: RESEARCH ZOHO PEOPLE'S PUBLIC LEAVE MANAGEMENT CAPABILITIES

Before changing code, research the current publicly available Zoho People Leave / Time-Off documentation.

Prioritize:

1. Official Zoho People Help / Administrator Guide
2. Official Zoho People Employee Handbook
3. Official Zoho People API documentation
4. Official Zoho People product pages
5. Official Zoho videos/documentation where useful
6. Publicly available secondary sources only when official documentation does not explain a behavior
7. Government/regulatory sources for statutory leave requirements

Research areas including:

- Leave Service overview
- Leave Policies
- Leave Type Gallery
- Fixed entitlement
- Experience-based entitlement
- Grant-based entitlement
- Attendance-based entitlement
- Paid leave
- Unpaid leave / Loss of Pay
- On-duty leave
- Restricted/optional holidays
- Partially paid leave
- Policy validity
- Effective-after rules
- Accrual
- Proration
- Reset
- Carry forward
- Encashment
- Expiry
- Maximum balance
- Opening balance
- Future/advance leave
- Negative leave
- Workday inclusions
- Minimum worked-day requirements
- Deductible holidays
- First-month and last-month rules
- Leave restrictions
- Sandwich rules
- Clubbing restrictions
- Consecutive leave restrictions
- Supporting-document rules
- Compensatory off
- Comp-off schedulers
- Work calendars
- Holidays
- Shifts
- Pay periods
- Approval workflows
- Approval settings
- Backup approvers/delegation
- Leave cancellation
- Partial cancellation
- Leave extension
- Notifications/workflows
- Employee-specific policy customization
- Leave balance adjustments
- Reports
- Bradford Score if relevant
- Calendar integration
- Payroll integration concepts
- Permissions and service administrators

Create:

`docs/leave-management/ZOHO_FEATURE_RESEARCH.md`

For every capability record:

- capability name
- what it accomplishes
- user role involved
- configuration options
- input data
- business rules
- edge cases
- resulting balance/payroll/attendance effects
- source name
- source date/access date
- whether Monolith already has something equivalent
- implementation status

### Research/legal restrictions

Research only publicly accessible sources.

Do NOT:

- bypass authentication
- use stolen/shared credentials
- circumvent CAPTCHA or access controls
- defeat robots/rate-limit mechanisms
- scrape private Zoho customer data
- extract proprietary frontend source code
- copy Zoho's HTML/CSS/JavaScript
- copy copyrighted documentation verbatim
- copy screenshots/assets/icons
- reproduce Zoho branding
- make Monolith's UI a pixel-for-pixel Zoho clone

We want **feature parity and sound HR-domain behavior**, not copied source code or visual design.

Build a Monolith-native implementation.

---

# 2. AUDIT THE EXISTING MONOLITH APPLICATION

Before designing the module, inspect the repository deeply.

Identify:

- language
- framework
- database
- ORM
- frontend framework
- routing architecture
- auth
- RBAC/permissions
- employee model
- organization/company model
- organization hierarchy
- business units
- departments
- designations
- employment types
- locations
- reporting-manager relationships
- employee date-of-joining
- employee termination/relieving dates
- attendance
- shifts
- schedules
- payroll
- salary processing
- holidays
- notifications
- email system
- document/file storage
- audit logging
- background workers/schedulers
- existing workflow/approval framework
- APIs
- event system
- frontend design system
- tables/components/forms/modals
- validation patterns
- timezone conventions
- localization
- multi-company/multi-tenant handling

Reuse existing platform services wherever possible.

Do NOT create parallel implementations of:

- users
- employees
- auth
- organization hierarchy
- permissions
- notifications
- files
- workflows
- schedules
- holidays

unless the existing implementation genuinely cannot support Leave Management.

Create:

`docs/leave-management/MONOLITH_INTEGRATION_AUDIT.md`

Explain exactly which existing components will be reused.

---

# 3. ARCHITECTURE PRINCIPLE

This application is a monolith.

Keep Leave Management as a well-defined domain/module **inside the existing monolith**, rather than introducing unnecessary microservices.

Follow existing repository conventions.

Separate concerns internally using appropriate modules such as:

- LeavePolicy
- LeaveEntitlement
- LeaveEligibility
- LeaveAccrual
- LeaveBalance
- LeaveLedger
- LeaveRequest
- LeaveCalculation
- LeaveApproval
- LeaveRestriction
- LeaveCalendar
- CompensatoryOff
- LeavePayroll
- LeaveReporting
- LeaveCompliance
- LeaveAutomation

Do not put the entire leave engine inside controllers or frontend components.

Business rules must be implemented server-side and be independently testable.

---

# 4. LEAVE LEDGER — CRITICAL ACCOUNTING DESIGN

Treat leave balance like a financial ledger.

Do NOT rely only on a mutable `balance` column.

Implement an immutable or append-oriented **Leave Ledger**.

Every balance-changing action should create a ledger transaction such as:

- OPENING_BALANCE
- ACCRUAL
- MANUAL_CREDIT
- MANUAL_DEBIT
- LEAVE_RESERVED
- LEAVE_CONSUMED
- LEAVE_RELEASED
- CARRY_FORWARD
- CARRY_FORWARD_EXPIRY
- ENCASHMENT
- RESET
- COMP_OFF_CREDIT
- COMP_OFF_EXPIRY
- ADJUSTMENT
- CANCELLATION_REVERSAL
- POLICY_MIGRATION
- IMPORT
- LOP_CONVERSION

Each transaction should contain, where applicable:

- organization
- employee
- leave policy
- policy version
- quantity
- unit
- effective date
- balance before
- balance after
- request reference
- source
- actor
- reason
- metadata
- created timestamp
- idempotency key

Current balances may be cached/materialized, but the ledger must remain the source from which transactions can be audited.

Protect against:

- duplicate accrual jobs
- concurrent leave requests spending the same balance
- duplicate approval callbacks
- duplicate scheduler runs
- balance corruption

Use transactions, locking/version checks, and idempotency consistent with the existing stack.

---

# 5. LEAVE POLICY ENGINE

Create fully configurable Leave Types / Leave Policies.

At minimum support these entitlement models:

## A. Fixed entitlement

Examples:

- 12 annual leaves/year
- 1 casual leave/month
- fixed hourly allowance

## B. Experience-based entitlement

Support tiers such as:

- 0–1 year = X
- 1–3 years = Y
- 3–5 years = Z
- 5+ years = N

Allow any number of effective-dated tiers.

## C. Grant-based entitlement

Designed for special leaves that require a grant/eligibility event.

Examples:

- parental leave
- maternity-related policy
- bereavement
- sabbatical
- special HR grant

Allow HR/authorized managers to grant an entitlement with:

- amount
- effective date
- expiry date
- reason
- attachment
- approval if configured

## D. Attendance-based entitlement

Allow crediting leave based upon:

- payable days
- worked days
- percentage of worked days
- worked-day ranges
- payable hours
- overtime hours
- approved late-night hours where supported
- configured attendance metrics

Accrual periods:

- instant/daily
- weekly
- monthly
- quarterly if useful
- yearly
- configurable interval where architecture permits

---

# 6. LEAVE CLASSIFICATION

Each leave policy should support classification such as:

- Paid
- Unpaid / Loss of Pay
- On Duty
- Restricted Holiday / Optional Holiday
- Partially Paid

Do not restrict the architecture to this enumeration if Monolith uses extensible configuration.

For partially-paid leave, support pay slabs such as:

- first N days = 100%
- next N days = 50%
- remaining N days = 0%

The calculation result must be made available to payroll.

---

# 7. LEAVE UNITS AND ROUNDING

Support:

### Day-based

- Full day
- Half day
- Quarter day where enabled

### Hour-based

- Hour
- 30-minute increments
- 15-minute increments where enabled

Configurable rounding:

- no rounding
- nearest
- round up / maximum
- round down / minimum

Never silently introduce floating-point balance errors.

Use safe decimal/integer-unit representations.

---

# 8. POLICY DETAILS

Each policy should support:

- Name
- Unique code
- Description
- Icon/color using Monolith's own design system
- Status
- Leave classification
- Entitlement model
- Unit
- Policy valid from
- Policy valid until
- Employee eligibility/effective-after date
- Leave year definition
- Accrual settings
- Reset rules
- Carry-forward rules
- Encashment
- Restrictions
- Applicability
- Approval flow
- Attachment requirements
- Payroll behavior
- Attendance behavior
- Display/privacy settings

Policies must be **effective-dated/versioned**.

Changing a policy should not silently rewrite the historical interpretation of leave already processed under an earlier policy version.

---

# 9. ACCRUAL ENGINE

Support:

- yearly accrual
- monthly accrual
- weekly accrual
- instant/daily accrual where appropriate
- beginning-of-period credit
- end-of-period credit where appropriate
- employee-specific effective date
- date-of-joining based eligibility
- service-period eligibility

Support proration strategies such as:

- beginning/start of policy
- beginning and end where needed
- no proration
- actual/effective-day calculation
- first-month rules
- last-month rules

Support:

- opening balances
- maximum accumulated balance
- minimum worked-day requirements
- leave credit in subsequent accrual periods
- workday inclusion rules
- configurable holiday treatment

Schedulers must be:

- idempotent
- restart-safe
- timezone-aware
- observable
- auditable

Admin must be able to inspect accrual runs and failures.

---

# 10. RESET, CARRY FORWARD, EXPIRY AND ENCASHMENT

Create flexible rules for:

## Reset

- calendar year
- financial year
- anniversary year
- configurable leave year
- monthly where appropriate
- no reset

## Carry Forward

Allow:

- none
- all
- fixed maximum
- percentage
- expiry after N days/months
- different rules per policy

## Encashment

Allow:

- disabled
- employee initiated
- automatic at reset
- HR initiated
- termination/final settlement
- maximum encashable amount
- minimum balance retained
- configurable conversion formula

Do not calculate actual currency inside Leave Management if payroll already owns salary-rate calculations. Pass structured encashment data into payroll.

---

# 11. ADVANCE / NEGATIVE LEAVE

Support configurable behavior when requested leave exceeds current balance:

- reject
- allow negative balance
- allow within annual entitlement
- consume upcoming accruals
- convert excess portion to LOP
- require special approval

Display the consequence before the employee submits the request.

Example:

> Paid Leave: 2 days  
> LOP: 1 day

when only two paid days are available for a three-day request.

---

# 12. APPLICABILITY ENGINE

Leave policies must be assignable using configurable criteria.

Support existing Monolith organizational dimensions where available:

- company/legal entity
- business unit
- division
- department
- team
- location
- country
- state/province
- designation
- grade
- employee type
- employment status
- role
- employee attributes
- joining date/service duration
- individual employee

Support:

- include criteria
- exclude criteria
- explicit employee inclusion
- explicit employee exclusion
- AND/OR condition groups

Eligibility must be deterministic and testable.

Provide a **Preview Applicability** action showing which employees would receive the policy before saving/publishing it.

---

# 13. EMPLOYEE-SPECIFIC OVERRIDES

Authorized HR administrators must be able to override an employee's policy without altering the master policy.

Examples:

- extra entitlement
- lower/higher maximum
- different restriction
- temporary exemption
- corrected opening balance

Every override requires:

- reason
- actor
- effective date
- optional expiry
- audit history

---

# 14. POLICY RESTRICTIONS

Implement a generic restriction/rules engine.

Support conditions including:

- minimum leave per request
- maximum leave per request
- maximum consecutive leave
- maximum occurrences per month/quarter/year
- minimum notice period
- maximum advance booking period
- whether past-dated leave is allowed
- whether same-day requests are allowed
- whether leave during probation is allowed
- waiting period after joining
- minimum balance required
- attachment/document requirement
- attachment threshold
- reason mandatory
- restriction based on dates
- blackout periods
- configurable excluded dates

Avoid spreading these rules through random conditional statements.

---

# 15. SANDWICH LEAVE POLICY

Implement configurable sandwich behavior.

Administrators should independently control:

- weekends
- public holidays

Allow rules such as:

- include
- exclude
- activate only when leave duration exceeds a threshold
- evaluate using calendar days
- evaluate using business days

The calculation engine must return a transparent breakdown.

Example:

Requested:
- Friday leave
- Monday leave

Calendar:
- Saturday/Sunday weekend

Calculated:
- Requested leave = 2
- Sandwiched days = 2
- Total deduction = 4

Do not hide this from the employee.

Show a calculation preview before submission.

---

# 16. CLUBBING POLICY

Allow administrators to specify leave types that:

- may be combined
- may not be combined
- may not appear on consecutive dates
- may require approval when combined

Example rule:

`Casual Leave cannot be directly adjacent to Sick Leave`

The validation engine must account for existing approved and pending requests.

---

# 17. DOCUMENT REQUIREMENTS

A policy can require supporting files:

- always
- when duration exceeds N units
- based on request reason/category
- only after manager/HR requests documentation

Use Monolith's existing file storage and permission system.

Do not build separate storage if unnecessary.

Enforce secure authorization when viewing sensitive leave attachments.

---

# 18. LEAVE REQUEST EXPERIENCE

Build a polished employee workflow.

Employee should see:

## Leave Dashboard

- available balance
- accrued
- consumed
- pending
- scheduled/upcoming
- carried forward
- expiring soon
- comp-off available
- recent leave activity

## Apply Leave

Fields should include:

- leave type
- start date/time
- end date/time
- session/half-day option
- duration
- reason
- attachment
- contact/hand-over information if configured
- approver preview where appropriate

Before submission display a **Leave Calculation Summary**:

- requested duration
- weekends excluded/included
- holidays excluded/included
- sandwich days
- paid portion
- unpaid/LOP portion
- balance before
- expected balance after
- approval path
- warnings

Employee should never need to manually calculate leave duration.

---

# 19. LEAVE REQUEST LIFECYCLE

Use a clearly defined state machine.

Possible states:

- DRAFT
- SUBMITTED
- PENDING_APPROVAL
- APPROVED
- PARTIALLY_APPROVED if the architecture needs it
- REJECTED
- CANCEL_PENDING
- CANCELLED
- EXTENSION_PENDING
- WITHDRAWN
- EXPIRED

Do not allow arbitrary invalid transitions.

Record every state change.

---

# 20. APPROVAL ENGINE

First inspect whether Monolith already has a workflow/approval engine.

Reuse it if suitable.

Otherwise build an extensible approval workflow mechanism.

Support:

- no approval / auto approve
- auto reject based on criteria
- reporting manager
- manager's manager
- department head
- business-unit head
- role-based approver
- named employee
- HR
- project manager where available
- requester-selected approver where specifically enabled
- conditional approver based on fields

Support at least **10 sequential approval levels**.

Support criteria such as:

- leave type
- leave duration
- available balance
- resulting balance
- department
- location
- designation
- employment type
- employee
- LOP involvement
- special leave category

Example:

If leave <= 2 days:
Manager

If leave > 2 and <= 5:
Manager -> Department Head

If leave > 5:
Manager -> Department Head -> HR

If request creates LOP:
Manager -> HR

Support:

- mandatory approval comments
- mandatory rejection comments
- SLA/turnaround time
- approval reminders
- repeated reminders
- escalation
- backup approver
- delegated approver
- approver unavailable handling
- approval history

---

# 21. CANCELLATION AND PARTIAL CANCELLATION

Allow configurable cancellation rights for:

- employee
- reporting manager
- approver
- HR/admin

Support:

- future approved leave cancellation
- pending-request withdrawal
- past leave cancellation when policy permits
- partial cancellation
- mandatory cancellation reason
- payroll-period restrictions
- attendance-lock restrictions

Reversal must correctly restore/recalculate:

- leave balance
- attendance
- payroll/LOP
- approvals
- notifications

Every reversal must create corresponding ledger entries.

---

# 22. LEAVE EXTENSION

Allow an existing submitted/approved leave to be extended where configured.

Do not require the employee to cancel and recreate the whole request.

Extension must:

1. calculate only the additional period
2. re-evaluate eligibility
3. re-evaluate restrictions
4. re-evaluate sandwich rules
5. re-evaluate balances
6. re-evaluate LOP
7. follow appropriate approval flow
8. maintain extension history

---

# 23. COMPENSATORY OFF

Build a complete Comp-Off module.

Support earning comp-off from:

- weekend work
- public-holiday work
- eligible overtime
- manually approved exceptional work

Configurable:

- eligible employee groups
- minimum work duration
- work-hour to comp-off conversion
- day/hour units
- approval requirement
- expiry
- maximum balance
- request window
- whether weekday overtime qualifies

Where attendance data exists, provide automatic scheduled creation.

Example:

Employee works approved Sunday shift for 8 hours.

Attendance -> eligibility calculation -> pending/automatic comp-off credit -> approval if required -> comp-off ledger credit -> employee balance.

Preserve the attendance record that generated the entitlement.

---

# 24. WORK CALENDAR / HOLIDAYS / SHIFTS

Integrate with existing:

- holiday calendars
- employee workweek
- location-specific holidays
- shift schedules
- weekly offs
- exceptional working days

Calculation precedence must be explicit.

For each employee/date determine:

1. assigned shift/work schedule
2. exceptional working day
3. holiday calendar
4. weekly off
5. requested leave
6. applicable policy rules

Never assume Saturday/Sunday are weekends globally.

---

# 25. SETTINGS EXPERIENCE

Create a dedicated:

# Settings -> Leave Management

Suggested navigation:

### Overview
Configuration health and warnings.

### Leave Types & Policies
Create/edit/clone/version/archive policies.

### Entitlements
Accrual, reset, carry forward, encashment and balance rules.

### Applicability
Employee eligibility rules and exceptions.

### Restrictions
Sandwich, clubbing, request limits and documentation.

### Approval Workflows
Approval rules, routing, escalations and delegation.

### Compensatory Off
Comp-off eligibility, conversion and expiry.

### Work Calendars
Integration with workweeks, holidays and shifts.

### Leave Requests
Cancellation, extension, past/future request settings.

### Payroll & Attendance
LOP, partial-pay and attendance behaviors.

### Automation
Accrual schedules, comp-off jobs, reminders and notifications.

### Compliance Templates
Jurisdiction-aware policy templates.

### Reports
Report settings/export controls.

### Permissions
HR/admin/manager/employee access controls.

### Audit Log
Policy and balance change history.

Use Monolith's existing navigation/design conventions.

Do not visually clone Zoho.

---

# 26. ADMIN POLICY CREATION WIZARD

A good policy wizard should use approximately:

1. Basic Details
2. Entitlement
3. Accrual
4. Reset / Carry Forward / Encashment
5. Applicability
6. Restrictions
7. Approval
8. Payroll / Attendance
9. Review & Publish

Provide live examples/calculation previews.

Do not make administrators configure policies through raw JSON.

Advanced JSON/debugging can exist for developers, but normal HR configuration must have proper forms.

---

# 27. REGULATORY / COMPLIANCE FRAMEWORK

This is extremely important.

Leave law varies across:

- countries
- states/provinces
- establishment types
- employee categories
- dates/effective periods

Do NOT create a single hardcoded "legal leave policy."

Build **versioned Compliance Packs**.

Example model:

`CompliancePolicyTemplate`

Fields:

- jurisdiction_country
- jurisdiction_state
- jurisdiction_locality
- establishment_type
- leave_category
- statutory_name
- effective_from
- effective_until
- statutory_minimum
- accrual requirement
- carry-forward requirement
- encashment requirement
- eligibility
- waiting period
- pay requirement
- maximum/minimum
- notes
- legal source
- source URL/reference
- verified date
- version
- status

Research regulatory rules using authoritative government/legal sources.

Do not rely on random HR blogs when official sources exist.

For every seeded statutory template:

- retain source reference
- retain effective date
- distinguish statutory minimum from company enhancement
- allow organization policies to be more generous where lawful
- flag configurations that appear below a statutory minimum

Do not silently claim legal compliance.

Display wording such as:

> Regulatory template based on the referenced rule set. HR/legal review is recommended before publication.

### Multi-jurisdiction

A single organization may employ people in several jurisdictions.

Therefore applicability must support:

Employee -> Legal Entity -> Work Location -> Jurisdiction -> Compliance Pack -> Company Policy

Do not make the entire tenant use one country's rules.

---

# 28. REGIONAL LEAVE-TYPE GALLERY

Create a Monolith-native **Leave Policy Template Gallery** inspired by the concept of regional templates.

Examples:

- Annual Leave
- Casual Leave
- Sick Leave
- Earned/Privilege Leave
- Unpaid Leave
- Compensatory Off
- Maternity-related Leave
- Paternity/Partner Leave
- Parental Leave
- Bereavement
- Marriage Leave
- Study Leave
- Sabbatical
- Restricted/Optional Holiday
- On Duty
- Work From Client Site if the existing system models it as attendance/leave

Only ship jurisdiction-specific entitlement numbers when verified.

Templates are starting points.

Admins must be allowed to customize them subject to regulatory validation.

---

# 29. MANAGER EXPERIENCE

Create:

# Team Leave

Manager views:

- pending approvals
- team calendar
- upcoming absences
- overlapping leave warnings
- staffing availability where available
- team balance where permission permits
- employee leave history where permission permits

Approval screen should clearly show:

- employee
- leave type
- requested dates
- duration
- holidays/weekends
- remaining balance
- pending balance
- previous related leave
- reason
- attachments
- team overlap
- approval history
- approve/reject actions

Do not expose confidential leave details to unauthorized managers.

---

# 30. HR / ADMIN OPERATIONS

Create an operations console allowing authorized HR users to:

- view employee leave balances
- view ledger
- adjust balance
- add opening balance
- grant leave
- create request on behalf of employee
- approve/reject where authorized
- cancel leave
- extend leave
- customize employee policy
- inspect comp-off
- correct erroneous transactions
- recalculate balance
- inspect policy assignment
- import historical balances
- export records

Manual adjustments must require:

- reason
- actor
- timestamp

and must never silently mutate history.

---

# 31. PAYROLL INTEGRATION

Integrate with Monolith payroll instead of duplicating payroll logic.

Expose structured leave/payroll data:

- paid leave units
- partially-paid units
- LOP units
- unpaid hours
- encashment units
- payroll period
- employee
- leave policy
- request reference

Respect payroll locks.

Changes to leave inside locked/finalized payroll periods must follow existing correction/reversal procedures.

Do not silently rewrite finalized payroll data.

---

# 32. ATTENDANCE INTEGRATION

Approved leave should affect attendance according to policy.

Possible attendance states:

- Paid Leave
- Unpaid Leave
- On Duty
- Restricted Holiday
- Half-Day Leave
- Hourly Leave

Prevent conflicting records such as:

- full-day approved leave plus normal full-day attendance
- multiple overlapping leave requests

Provide controlled handling for:

- attendance regularization after leave
- leave generated from absence
- leave cancellation after attendance processing
- comp-off generated from attendance

Follow existing Monolith attendance rules.

---

# 33. NOTIFICATIONS

Reuse Monolith's notification infrastructure.

Trigger notifications for:

- request submitted
- approval required
- approved
- rejected
- cancellation requested
- cancelled
- extension requested
- extension approved/rejected
- balance adjusted
- leave credited
- carry-forward expiry approaching
- comp-off credited
- comp-off expiring
- document required
- approval reminder
- escalation

Use configurable templates where the system supports them.

Avoid notification spam.

---

# 34. CALENDAR INTEGRATION

If Monolith already supports external calendars, integrate leave events.

At minimum support internal calendar display.

Expose enough abstraction for:

- Google Calendar
- Microsoft 365

Leave policy should be able to define availability status such as:

- Busy
- Free
- Out of Office

Do not tightly couple the core leave domain to a particular calendar provider.

---

# 35. REPORTING

Create reports such as:

- Employee Leave Balance
- Leave Transaction Ledger
- Leave Requests
- Leave Utilization
- Leave Type Utilization
- Department Leave Summary
- Monthly Leave Summary
- Upcoming Leave
- LOP Details
- Leave Data for Payroll
- Carry Forward
- Expiring Leave
- Encashment
- Comp-Off
- Accrual History
- Balance Adjustments
- Approval Turnaround
- Absence Patterns
- Compliance Exceptions

Allow filtering by existing organizational dimensions.

Where appropriate support export using Monolith's existing export framework.

Permissions must be enforced in exports.

---

# 36. AUDIT LOGGING

Audit everything important:

- policy created
- policy modified
- policy published
- policy archived
- applicability changed
- entitlement changed
- employee override
- opening balance
- manual adjustment
- request submitted
- approvals/rejections
- cancellation
- extension
- comp-off credit
- accrual scheduler
- reset
- carry-forward
- expiry
- encashment
- administrative correction

Record old/new values for settings where appropriate.

---

# 37. DATABASE MODEL

Design the schema according to the project's ORM conventions.

Likely domain entities include concepts equivalent to:

- leave_policies
- leave_policy_versions
- leave_entitlement_rules
- leave_accrual_rules
- leave_reset_rules
- leave_carry_forward_rules
- leave_encashment_rules
- leave_applicability_rules
- leave_restriction_rules
- leave_policy_assignments
- employee_leave_overrides
- leave_requests
- leave_request_segments
- leave_request_days
- leave_approval_instances
- leave_approval_steps
- leave_approval_actions
- leave_ledger_entries
- leave_balance_snapshots
- comp_off_credits
- comp_off_requests
- leave_grants
- leave_adjustments
- leave_attachments
- leave_compliance_templates
- leave_scheduler_runs

These names are illustrative.

Adapt them to the existing schema rather than blindly creating this exact table list.

Avoid storing unstructured JSON for everything simply because leave policy logic is complex.

Use normalized/configurable structures where querying, integrity and reporting matter.

---

# 38. LEAVE CALCULATION SERVICE

Implement one authoritative calculation service.

For a proposed leave request, it should produce something similar to:

```text
requested_units
eligible_units
calendar_working_units
weekend_units
holiday_units
sandwich_units
paid_units
partial_paid_units
lop_units
balance_before
balance_reserved
balance_after
warnings
violations
approval_flow
calculation_explanation
```

Use exactly the project's conventions/types, but preserve this conceptual capability.

The frontend should call this service for previews.

Submission must recalculate server-side.

Never trust a duration calculated only in the browser.

---

# 39. RULE EXPLANATIONS

Complex ERP rules become support nightmares if users cannot understand them.

Every rejection/validation should explain itself.

Bad:

> Invalid leave.

Good:

> Casual Leave cannot be combined with Sick Leave on consecutive working days under the current policy.

Bad:

> Insufficient balance.

Good:

> You have 1.5 days of Annual Leave available. This request requires 3 days. Under this policy, the remaining 1.5 days will become Loss of Pay.

Where possible return:

- rule code
- human-readable message
- relevant policy
- suggested resolution

---

# 40. API DESIGN

Follow existing Monolith conventions.

Likely operations include:

Employee:

- list applicable policies
- get balances
- calculate request
- create request
- update draft
- submit
- cancel
- extend
- request comp-off
- view history

Manager:

- list approvals
- approval detail
- approve
- reject
- team calendar

Admin:

- CRUD/version policies
- preview policy applicability
- manage balances
- ledger
- grants
- employee overrides
- comp-off
- accrual jobs
- reports

Do not expose unrestricted admin APIs merely because the UI hides them.

Authorize every operation server-side.

---

# 41. SECURITY AND PRIVACY

Leave can contain sensitive information.

Implement:

- RBAC
- tenant/company isolation
- field-level restrictions where existing system supports them
- secure attachment access
- audit history
- server-side validation
- protection from IDOR
- CSRF/auth practices matching existing framework
- safe export permissions
- no information leakage through team calendars

For example, coworkers may need to see:

> Priya — Out of Office

but not:

> Priya — Medical leave due to diagnosis X.

Use privacy-safe calendar display.

---

# 42. IMPORT / MIGRATION

Support migration from existing HR systems.

At minimum create an import strategy for:

- employees' opening leave balances
- existing leave requests
- used leave
- carry-forward balances
- comp-off balances

Imports must be:

- validated
- previewable
- idempotent where possible
- auditable

Do not silently corrupt employee balances when importing historical data.

---

# 43. EXISTING DATA MIGRATION

If Monolith already has a basic leave feature, preserve its data.

Analyze:

- existing tables
- request states
- balances
- API usage
- frontend routes

Write safe migrations.

Maintain backwards compatibility where practical.

Do not delete production-facing existing data structures until their replacement and migration are verified.

---

# 44. PERFORMANCE

Design for organizations with large employee counts.

Avoid:

- recalculating every employee's full historical ledger on each request
- N+1 queries
- per-employee accrual queries in huge loops without batching
- long synchronous year-end reset operations

Use:

- indexed queries
- batching
- balance snapshots/materialized values where safe
- background/scheduled processing
- idempotency
- pagination

But correctness is more important than premature optimization.

---

# 45. TIMEZONE AND DATE CORRECTNESS

ERP leave is highly date-sensitive.

Use organization/employee timezone rules consistent with Monolith.

Test:

- leap years
- DST jurisdictions
- midnight boundaries
- financial-year resets
- joining on month-end
- joining on leap day
- cross-year requests
- holidays adjacent to weekends
- overnight shifts
- hourly leave
- termination during accrual period

Avoid comparing naive timestamps to local work dates.

---

# 46. TEST SUITE

Build serious tests.

## Unit tests

Cover:

- entitlement
- accrual
- proration
- carry forward
- reset
- expiry
- encashment
- sandwich
- clubbing
- negative balance
- LOP
- partial pay
- hours
- half/quarter day
- comp-off
- eligibility
- work calendars

## Integration tests

Cover:

- leave request -> approval -> ledger
- rejection
- cancellation
- partial cancellation
- extension
- payroll handoff
- attendance update
- comp-off from attendance
- year-end reset
- employee policy override

## Concurrency tests

Especially:

- two simultaneous requests using remaining balance
- duplicate approval submission
- duplicate accrual scheduler execution
- duplicate comp-off generation

## Authorization tests

Employee must not be able to:

- edit another employee's leave
- approve their own request unless explicitly allowed
- modify policies
- inspect confidential attachments
- modify ledger

## Regulatory template tests

Ensure versioned regulatory defaults remain deterministic.

---

# 47. UI/UX QUALITY

Follow existing Monolith visual language.

The module must feel like a native part of Monolith.

Requirements:

- responsive
- accessible
- consistent components
- clear states
- empty states
- loading states
- errors
- confirmations
- validation
- searchable policy lists
- filters
- pagination
- tooltips for complicated rules
- calculation previews

Avoid giant forms.

Use logical tabs/wizards/cards.

---

# 48. FEATURE FLAGS / RELEASE SAFETY

If Monolith uses feature flags, place the new module behind one.

Allow staged rollout:

1. administrators
2. test employees
3. selected department/company
4. organization-wide

Provide migration and rollback guidance.

---

# 49. DOCUMENTATION

Create:

```text
docs/leave-management/
  README.md
  ZOHO_FEATURE_RESEARCH.md
  MONOLITH_INTEGRATION_AUDIT.md
  ARCHITECTURE.md
  DATA_MODEL.md
  POLICY_ENGINE.md
  APPROVAL_ENGINE.md
  CALCULATION_ENGINE.md
  COMPLIANCE.md
  PAYROLL_INTEGRATION.md
  ATTENDANCE_INTEGRATION.md
  MIGRATION.md
  TESTING.md
```

Documentation must explain implementation decisions rather than merely listing files.

---

# 50. IMPLEMENTATION WORKFLOW

Work in this order.

## Phase 1 — Repository audit

Understand Monolith completely enough to avoid duplicate systems.

## Phase 2 — External research

Build the Zoho/public HRMS feature matrix and statutory research strategy.

## Phase 3 — Gap analysis

Create:

```text
Feature
Zoho/Public Reference
Existing Monolith Capability
Missing?
Implementation Component
Status
```

## Phase 4 — Architecture

Design schema, domain boundaries, integration points and UI information architecture.

## Phase 5 — Core backend

Implement:

- policies
- versions
- ledger
- balances
- eligibility
- calculation
- accrual

## Phase 6 — Request lifecycle

Implement:

- application
- approvals
- cancellation
- extensions

## Phase 7 — Advanced rules

Implement:

- sandwich
- clubbing
- restrictions
- attendance entitlement
- grants
- employee overrides
- comp-off

## Phase 8 — System integration

Integrate:

- attendance
- payroll
- holidays
- shifts
- notifications
- permissions
- files
- calendar

## Phase 9 — Frontend

Employee, manager, HR/admin and settings experiences.

## Phase 10 — Compliance templates

Build the jurisdiction-aware framework and verified initial templates.

## Phase 11 — Reports

Implement operational and payroll reporting.

## Phase 12 — Tests

Unit, integration, authorization, concurrency and regression tests.

## Phase 13 — Final QA

Run:

- lint
- format
- type checks
- compilation/build
- migrations against a test database
- backend tests
- frontend tests
- integration tests

Fix failures rather than merely documenting them.

---

# 51. DO NOT STOP AT TODO COMMENTS

I do not want:

```text
TODO: Implement accrual later
TODO: connect payroll
TODO: approval logic here
```

for essential functionality.

Core functionality must actually work.

If some integration cannot be completed because a required service genuinely does not exist, implement the correct abstraction/interface and clearly identify that specific external dependency.

---

# 52. DO NOT HALLUCINATE REPOSITORY COMPONENTS

Do not assume Monolith uses:

- React
- Laravel
- Rails
- Django
- Spring
- Node
- PostgreSQL
- Redis
- queues
- particular folder names

Inspect first.

Then follow what actually exists.

---

# 53. DO NOT BLINDLY COPY ZOHO

Zoho People is a **functional benchmark**, not the application architecture.

If you discover a better implementation pattern that fits Monolith, use it.

Our objectives are:

- comparable feature depth
- better integration
- transparent calculations
- strong auditability
- regulatory extensibility
- maintainability
- Monolith-native UX

Do not use Zoho trademarks in production labels.

---

# 54. IMPORTANT DESIGN PRIORITIES

When there is a tradeoff, prioritize in this order:

1. Correct leave balance
2. Historical auditability
3. Regulatory configurability
4. Payroll correctness
5. Attendance correctness
6. Authorization/security
7. Understandable business rules
8. Maintainability
9. UX
10. Performance optimization

A beautiful leave screen with unreliable balances is unacceptable.

---

# 55. DEFINITION OF DONE

This task is not complete until I can perform the following scenario entirely inside Monolith:

### Administrator

1. Open Settings -> Leave Management.
2. Create Annual Leave.
3. Set it to Paid.
4. Configure monthly accrual.
5. Configure proration for new joiners.
6. Set max balance.
7. Set year-end carry forward.
8. Configure expiry.
9. Configure optional encashment.
10. Apply it only to selected locations/employment types.
11. Configure sandwich rules.
12. Configure incompatible leave types.
13. Set attachment requirements.
14. Configure manager + HR approval based on duration.
15. Save/publish the policy.

### Employee

16. Log in.
17. See the leave type and balance.
18. Apply for leave.
19. See weekends/holidays/sandwich deduction before submitting.
20. See resulting balance and LOP, if any.
21. Submit.
22. Receive confirmation.

### Manager

23. See the request.
24. See balance and team-calendar implications.
25. Approve it.

### HR

26. Receive second-level approval when required.
27. Approve/reject.

### System

28. Update ledger.
29. Update available balance.
30. Update attendance.
31. Generate payroll/LOP implications.
32. Send notifications.
33. Add calendar event where integration exists.
34. Show complete audit trail.

### Changes

35. Employee can cancel where allowed.
36. Partial cancellation restores correct units.
37. Employee can request an extension.
38. Extension follows configured approval rules.

### Comp Off

39. Eligible weekend/overtime work can produce comp-off.
40. Employee can consume comp-off.
41. Expiry works.

### Scheduled Processes

42. Monthly accrual runs once.
43. Re-running the same scheduler does not double-credit.
44. Year-end carry-forward/reset works.
45. Expiring balances are processed correctly.

### Administration

46. HR can manually adjust a balance with reason.
47. Ledger shows the adjustment.
48. Reports reconcile back to ledger.
49. Policy history shows which version produced historical transactions.
50. Unauthorized users cannot access protected settings or records.

If these scenarios do not work end-to-end, the Leave Management implementation is not finished.

---

# 56. FINAL REPORT

When implementation is complete, give me a final report containing:

## Research
What Zoho/public HRMS behaviors were studied.

## Existing System Audit
What Monolith already had.

## Architecture
How Leave Management is structured.

## Database
Migrations/entities added or modified.

## Backend
Services/APIs/jobs implemented.

## Frontend
Pages/components/settings implemented.

## Integrations
Attendance/payroll/holiday/shift/auth/notification/calendar integration.

## Compliance
Jurisdiction framework and templates added.

## Testing
Tests created and their results.

## Security
Authorization/privacy protections.

## Files Changed
List significant files.

## Remaining Limitations
Only genuine external limitations, not unfinished core work.

## Verification Steps
Exact steps I can execute locally to test the completed module.

---

# EXECUTION INSTRUCTION

Start now by inspecting the repository.

Do not ask me to manually describe architecture that can be determined from the code.

Do not stop after research or planning.

Research the publicly available references, create the feature-gap analysis, inspect Monolith's existing HR/attendance/payroll architecture, then implement the module incrementally and run the tests/build after each major stage.

When a Zoho behavior is unclear, verify it using official public documentation rather than guessing.

When a legal/regulatory requirement is unclear, verify it through authoritative government/legal sources, store its jurisdiction and effective date, and avoid presenting unverified assumptions as statutory requirements.

The final result should be a **production-grade, fully integrated Leave Management subsystem for Monolith ERP**, not a demo and not a superficial clone.