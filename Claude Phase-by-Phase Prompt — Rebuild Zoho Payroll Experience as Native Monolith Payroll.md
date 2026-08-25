# CLAUDE MASTER INSTRUCTION

You are implementing a new production module named **Payroll** inside the existing **Monolith Engine / Adarsh Shipping & Services Management Software**.

A previous implementation attempt was not sufficiently accurate.

This time you MUST NOT implement Payroll from assumptions, generic payroll knowledge, or a short feature list.

You have two authoritative sources:

1. The existing Monolith Engine repository.
2. The complete scraped Zoho Payroll reference corpus located at:

`C:\Users\SilverCloud\Downloads\scrapling-env`

The scraped folder contains captured Zoho Payroll:

- pages;
- screenshots;
- DOM;
- visible text;
- interactive elements;
- forms;
- action states;
- API response samples;
- network traces;
- menu structures;
- tabs;
- dialogs;
- tables;
- workflows;
- settings;
- employee portal screens.

Use those artifacts to reconstruct the complete **feature set, information architecture, page hierarchy, interaction model, field structure, workflow and visual composition** inside Monolith.

The resulting application must have functional parity with the captured Zoho Payroll experience where the captured functionality is relevant to Monolith.

However:

- use Monolith's own branding;
- use Monolith's existing design tokens/components;
- do not copy Zoho logos;
- do not ship Zoho source code;
- do not embed captured proprietary JS/CSS;
- do not call Zoho's private APIs;
- do not copy external assets.

Recreate the behavior and UI structure natively.

---

# ABSOLUTE IMPLEMENTATION RULE

## NEVER IMPLEMENT A PAGE BEFORE ANALYSING ITS REFERENCE

For every Payroll page:

1. inspect its reference folder;
2. inspect `screenshot.png`;
3. inspect `visible_text.txt`;
4. inspect `rendered.html`;
5. inspect `interactive_elements.json`;
6. inspect `forms.json`;
7. inspect `action_map.json`;
8. inspect action subfolders;
9. inspect captured API response shapes where useful;
10. map the page to existing Monolith services;
11. only then implement it.

No guessed pages.

No generic replacements.

No "approximately similar" page when a screenshot/reference exists.

---

# CRITICAL MULTI-AGENT RULE

Another agent may be working on Monolith.

You MUST:

- remain on the current active branch;
- never create another branch;
- never switch branches;
- never reset;
- never discard unrelated modifications;
- never use `git checkout -- .`;
- never use `git reset --hard`;
- never use `git clean -fd`;
- re-read files immediately before editing;
- inspect `git status` before each major phase;
- preserve concurrent work.

Integrate around existing changes.

---

# PRIMARY OBJECTIVE

Build a dedicated:

# Payroll Module

that provides the same functional depth represented in the Zoho Payroll reference capture while connecting natively to existing Monolith:

- HRMS;
- Employee Master;
- Attendance;
- Leave;
- Holidays;
- Shifts;
- Overtime;
- Departments;
- Designations;
- Work Locations;
- Reporting Manager;
- Documents;
- Reimbursements;
- Approvals;
- Accounting;
- Chart of Accounts;
- General Ledger;
- Journal Entries;
- Banking;
- Payments;
- Notifications;
- Email;
- Audit Log;
- RBAC;
- tenant/company/location scope.

Do NOT maintain duplicate versions of data that already exists in Monolith.

---

# IMPLEMENTATION METHOD

This implementation MUST be performed phase by phase.

Do not attempt the entire module in a single pass.

At the end of each phase:

1. finish the functionality;
2. test it;
3. inspect the UI;
4. compare it with the corresponding captured Zoho screenshots;
5. fix gaps;
6. report files changed;
7. only then proceed to the next phase.

Do NOT stop and ask the user for permission between phases.

Continue automatically unless a genuine technical blocker prevents safe progress.

---

# ============================================================
# PHASE 0 — COMPLETE REFERENCE CORPUS RECONSTRUCTION
# ============================================================

Before changing Monolith code, recursively analyse:

`C:\Users\SilverCloud\Downloads\scrapling-env\scrapling_app_map`

There are approximately **201 captured application states**.

Do NOT manually inspect only a handful.

Create:

`docs/payroll/ZOHO_PAYROLL_REFERENCE_MANIFEST.md`

and, preferably, a machine-readable:

`docs/payroll/zoho-payroll-reference-manifest.json`

For EVERY captured page record:

```text
page id
source route
reference directory
screen/page name
module
sub-module
tabs
header actions
secondary actions
filters
cards
tables
table columns
forms
form fields
dropdown values
buttons
menus
dialogs
drawers
empty states
status values
badges
pagination
search
bulk actions
keyboard/interaction behavior
captured action states
API shapes observed
corresponding screenshot
Monolith implementation target
implementation status
```

---

## Pages already visible from the reference corpus include

### Dashboard

- Payroll Dashboard
- Recent Updates

### Approvals

- Proof of Investment
- Reimbursements
- Salary Revision

### Employees

- Employee list
- Employee details
- Personal details
- Edit personal details
- Statutory details
- Edit statutory details
- Salary details
- Edit salary details
- Investments and proofs
- Loans
- Payslips and forms
- employee import

### Loans

- Loan listing
- employee loan details

### Pay Runs

- Pay Runs overview
- regular payroll
- payroll detail/summary
- Payroll History
- regular pending payroll
- off-cycle payroll
- termination payroll
- bulk termination payroll
- termination edit
- full-and-final style workflows

### Reports

- Reports home
- Payroll Overview
- Payroll Journal
- Employee Reports
- Deduction Reports
- Loan Reports
- Statutory Reports
- Taxes and Forms
- Activity Reports
- EPF Summary
- ESI Summary
- TDS Summary

### Taxes & Forms

- Form 16
- Form 16 fiscal year view
- Form 24Q
- Form 24Q period/detail
- Tax Liabilities Pending
- Tax Liabilities Completed
- Tax Payments Unassociated
- Tax Payments Associated

### Settings

Captured references include at least:

- Settings overview
- Organization Profile
- Employee & Contractor
- Departments
- Designations
- Work Locations
- Pay Schedules
- Salary Components
- Salary Templates
- Statutory Details
- Taxes
- Flexible Benefit Plan
- Regular Payslip Template
- Employer Bank Accounts
- Direct Deposit
- Pay Run Record Locking
- Portal Preferences
- Users
- Roles
- Branding
- Email Preference
- Email Templates
- Reporting Tags
- Loan Custom Fields
- Data Backup
- Subscription Details
- Zoho integrations
- Expense integration configuration
- Analytics integration
- WhatsApp integration
- Automation Workflows
- Automation Actions / Alerts
- Automation Schedules
- Automation Logs

### Employee Portal

Captured references include:

- portal Dashboard
- Documents
- Investment Declaration
- My Profile
- Salary Details
- Benefit Report
- Payslip Detail

Treat this list as a starting index only.

The actual archive is the authority.

---

# SCREEN RECONSTRUCTION RULE

For each `screenshot.png`, document:

```text
viewport
sidebar behavior
page title
breadcrumb
top toolbar
card structure
table dimensions
spacing
tabs
alignment
font hierarchy
button placement
form arrangement
modal width
drawer width
sticky regions
summary regions
footer actions
empty-state layout
```

Then map each visual primitive to an existing Monolith Design System component.

If Monolith lacks the necessary primitive:

1. add it to the Design System;
2. document it there;
3. implement it generically;
4. consume it in Payroll.

Do NOT add untracked page-specific design patterns.

---

# INTERACTION RECONSTRUCTION

The reference contains interaction artifacts such as:

```text
action_map.json
actions/action_xxxx/
after.html
after_interactive_elements.json
network_delta.json
result.json
```

Use these to understand:

- what happens after clicking buttons;
- menu contents;
- dropdown values;
- dialog states;
- tab transitions;
- page transitions;
- save/cancel flows;
- confirmation steps;
- filters;
- bulk actions.

Do not implement a button based solely on its label.

Trace the captured post-action state.

---

# API REFERENCE RULE

The scraped reference may contain captured Zoho API responses.

Use these only to understand:

- entity shape;
- state transitions;
- screen data requirements;
- relationships.

DO NOT:

- reproduce Zoho private endpoints;
- call Zoho private APIs;
- copy authentication mechanisms;
- hardcode captured IDs.

Build equivalent functionality using Monolith-native backend services.

---

# PHASE 0 ACCEPTANCE CRITERIA

Do not continue until:

- every reference page has been indexed;
- every screenshot has a corresponding page record;
- all major tabs are mapped;
- all important workflows are mapped;
- reference pages are grouped into Monolith implementation phases;
- existing Monolith equivalents have been identified.

---

# ============================================================
# PHASE 1 — MONOLITH ARCHITECTURE & INTEGRATION AUDIT
# ============================================================

Now inspect the Monolith repository.

Locate actual implementations for:

## HRMS

- employees;
- personal details;
- employment information;
- bank information;
- department;
- designation;
- branch/location;
- reporting manager;
- attendance;
- leave;
- overtime;
- shifts;
- holidays;
- joining;
- resignation;
- termination;
- employee documents;
- reimbursements;
- approvals.

## Accounting

- Chart of Accounts;
- General Ledger;
- journals;
- journal lines;
- banking;
- bank transactions;
- expenses;
- payments;
- liabilities;
- cost centres;
- dimensions;
- period locks;
- reversals.

## Platform

- authentication;
- RBAC;
- tenant scope;
- organization scope;
- location scope;
- audit logs;
- notifications;
- email;
- file storage;
- PDF generation;
- background jobs;
- schedulers;
- reporting;
- exports;
- webhooks;
- integrations;
- design system.

Create:

`docs/payroll/MONOLITH_PAYROLL_INTEGRATION_MAP.md`

Map each Zoho feature to:

```text
Existing Monolith service
Reuse directly
Extend existing service
New Payroll-specific service required
```

---

# DATA OWNERSHIP RULE

Use the following ownership:

```text
HRMS
  owns employees
  owns attendance
  owns leave
  owns employment status
  owns organization structure
        ↓
Payroll
  owns compensation and payroll calculations
        ↓
Accounting
  owns journals
  owns ledger
  owns liabilities
  owns financial posting
        ↓
Banking
  owns bank movement/reconciliation
```

Payroll MUST NOT duplicate canonical HRMS or Accounting records.

---

# PHASE 1 ACCEPTANCE

Before continuing:

- Payroll route architecture determined;
- database ownership mapped;
- existing services found;
- RBAC integration identified;
- Accounting integration identified;
- Banking integration identified;
- Design System mapping completed.

---

# ============================================================
# PHASE 2 — PAYROLL SHELL & NAVIGATION
# ============================================================

Create the Payroll module shell.

Implement the navigation represented by the reference.

Top-level areas should include equivalents of:

```text
Dashboard
Employees
Pay Runs
Approvals
Loans
Taxes & Forms
Reports
Settings
```

Do not arbitrarily add numerous top-level menus if Zoho organizes them beneath sections.

Use the captured sidebar/navigation hierarchy as the primary reference.

Add Payroll to Monolith navigation in the same way other Monolith modules are registered.

Use Monolith permissions.

Implement:

- route shell;
- breadcrumb;
- page header;
- sidebar states;
- active nav states;
- responsive behavior;
- loading states;
- permission denied state;
- module-level error boundary.

Do not fill pages with placeholders.

Pages not implemented yet can remain inaccessible until their phase.

---

# ============================================================
# PHASE 3 — PAYROLL DASHBOARD
# ============================================================

Use captured page:

`00001 ... home_dashboard`

and its screenshot/interaction artifacts.

Recreate the same:

- information hierarchy;
- card arrangement;
- pending payroll section;
- employee information;
- payroll cost information;
- todos;
- alerts;
- quick actions;
- recent activity where represented.

Do not create an unrelated analytics dashboard.

Data must come from Monolith.

Integrate with:

- employees;
- payroll runs;
- attendance exceptions;
- compliance reminders;
- approvals.

Implement corresponding dashboard interactions from action captures.

---

# ============================================================
# PHASE 4 — EMPLOYEE PAYROLL LIST
# ============================================================

Use captured employee listing:

`00006 ... employees`

Recreate:

- toolbar;
- filters;
- employee table;
- status;
- pagination;
- search;
- import action;
- employee navigation;
- bulk functionality visible in the reference.

Canonical employee data comes from HRMS.

Payroll listing is a payroll projection of HRMS employees.

Do not create duplicate Employee records.

---

# ============================================================
# PHASE 5 — EMPLOYEE PAYROLL PROFILE
# ============================================================

Use the many captured employee detail routes.

Build the same tab structure represented in Zoho.

Captured employee-level screens include:

```text
Personal Details
Statutory Details
Salary Details
Investments & Proofs
Loans
Payslips & Forms
```

Employee profile must also integrate Monolith HR information.

---

## Personal Details

Display/edit fields found in captured form.

Where those fields already belong to HRMS:

update HRMS.

Do not save a Payroll duplicate.

---

## Statutory Details

Implement employee payroll statutory profile.

Potential captured areas may include:

- PAN;
- UAN/PF;
- ESI;
- PT;
- tax regime;
- statutory eligibility.

Use effective-dated configuration.

---

## Salary Details

Recreate captured salary detail layout.

Implement:

- salary structure;
- earnings;
- deductions;
- employer contributions;
- CTC;
- monthly/annual display;
- revision history;
- salary revision action;
- effective date.

---

## Investments & Proofs

Implement employee-specific declaration/proof summary.

Connect to Approval workflow.

---

## Loans

Show employee loan details and repayment.

---

## Payslips & Forms

Show:

- payslips;
- forms;
- applicable tax documents.

---

# ============================================================
# PHASE 6 — EMPLOYEE IMPORT
# ============================================================

Reference:

`00115 ... employees_import`

Recreate the captured import wizard.

Support canonical Monolith employee import or Payroll enrichment depending on field ownership.

Required:

1. choose import type;
2. upload;
3. preview;
4. map fields;
5. validate;
6. resolve duplicates;
7. confirm;
8. import result.

Never duplicate existing HR employees.

---

# ============================================================
# PHASE 7 — SALARY COMPONENT SETTINGS
# ============================================================

Reference:

`00106 ... settings_salary-components_earnings`

Recreate the complete salary components screen.

Analyse all captured tabs and actions, not only Earnings.

Implement component categories corresponding to Zoho behavior:

```text
Earnings
Reimbursements
Deductions
Benefits / Employer Contributions where represented
```

Each component must capture its reference-specific configuration.

Likely examples:

```text
name
component code
component type
calculation type
fixed
percentage
formula
taxability
PF applicability
ESI applicability
LOP applicability
CTC inclusion
FBP eligibility
payslip visibility
rounding
effective dates
```

Do not assume fields—read the captured forms.

---

# ============================================================
# PHASE 8 — SALARY TEMPLATE SETTINGS
# ============================================================

Reference:

`00107 ... settings_salary-templates`

Recreate:

- list;
- create;
- edit;
- component composition;
- earnings;
- deductions;
- CTC calculation;
- annual/monthly view;
- assignment behavior.

Templates must be versionable/effective dated.

---

# ============================================================
# PHASE 9 — PAY SCHEDULES
# ============================================================

Reference:

`00102 ... settings_pay-schedules`

Recreate the full pay schedule experience.

Implement fields/workflows visible in capture, including applicable:

- frequency;
- payroll month;
- working days;
- pay date;
- processing schedule;
- holidays/weekends treatment;
- first payroll configuration.

Allow more than one schedule only if the reference/current Zoho capability and Monolith requirements justify it.

---

# ============================================================
# PHASE 10 — WORK LOCATIONS / DEPARTMENT / DESIGNATION
# ============================================================

References:

```text
settings_work-locations
settings_departments
settings_designations
```

Do NOT create duplicate organization masters.

These settings screens should integrate directly with existing Monolith HRMS masters.

Recreate Zoho's Payroll-facing screens while reading/writing canonical Monolith entities.

---

# ============================================================
# PHASE 11 — ORGANIZATION & PAYROLL SETTINGS
# ============================================================

Use:

```text
settings_orgprofile
settings_preferences
settings_employee_contractor
settings_statutory-details
settings_taxes
```

Recreate the same grouped settings.

Integrate organization data from Monolith.

Only payroll-specific configuration belongs in Payroll.

---

# ============================================================
# PHASE 12 — FLEXIBLE BENEFIT PLAN
# ============================================================

Reference:

`settings_preferences_fbp`

Implement FBP configuration represented by captured screens.

Support employee allocation where applicable.

Connect eligible salary components.

Ensure:

```text
organizational limits
employee allocation
tax treatment
payroll treatment
proof/claim process
```

remain consistent.

---

# ============================================================
# PHASE 13 — SALARY REVISION
# ============================================================

Use:

- employee salary edit captures;
- Approvals > Salary Revision;
- Zoho reference workflow.

Implement:

```text
current salary
proposed salary
change
effective date
reason
arrear impact
approval status
```

A revision must not overwrite historical payroll.

Create effective-dated compensation revision.

Automatically calculate arrears where applicable.

---

# ============================================================
# PHASE 14 — SALARY REVISION APPROVAL
# ============================================================

Reference:

`00005 ... approvals_salary-revision`

Recreate:

- pending approvals;
- employee;
- requested revision;
- old/new salary;
- effective date;
- requester;
- approve;
- reject;
- comments;
- detail view;
- filters.

Use Monolith's existing Approval engine.

---

# ============================================================
# PHASE 15 — ATTENDANCE / LEAVE → PAYROLL INTEGRATION
# ============================================================

Zoho Payroll publicly integrates attendance/LOP from HR systems.

Monolith already owns HRMS attendance.

Payroll must derive from HRMS:

```text
working days
payable days
present
paid leave
unpaid leave
absence
holidays
weekly off
half day
overtime
LOP
```

Do not recreate an attendance subsystem.

Store a Payroll-period snapshot at calculation time for historical integrity.

---

# ============================================================
# PHASE 16 — REGULAR PAY RUN LIST
# ============================================================

Reference:

`00009 ... payruns`

and:

`00071 ... PayrollType.Regular`

Recreate pay-run listing behavior.

Implement filters represented in capture:

```text
Regular
Off-Cycle
Termination
Bulk Termination
```

plus statuses represented by the real capture.

Match:

- cards;
- toolbar;
- filters;
- table/list structure;
- action menus;
- pay-run status badges.

---

# ============================================================
# PHASE 17 — REGULAR PAY RUN PROCESSING
# ============================================================

Reference pay-run summary screens:

```text
00010
00065
```

Study every `actions/action_xxxx` capture.

Recreate the workflow precisely.

A pay run must calculate:

```text
earnings
one-time earnings
deductions
LOP
overtime
arrears
reimbursements
loan deductions
tax
statutory deductions
employer contributions
gross
net
```

Create employee-level drilldown matching reference.

Allow authorized editing only where reference permits.

---

# PAYROLL CALCULATION ENGINE

Build a deterministic backend service.

Do NOT calculate payroll in React.

Use decimal/fixed precision.

Input:

```text
employee
salary revision
salary template
pay schedule
attendance snapshot
variable inputs
reimbursements
loans
tax configuration
statutory configuration
```

Output:

```text
component calculation
gross
deductions
net
employer contribution
statutory liabilities
accounting allocation
```

Persist detailed calculation lineage.

---

# ============================================================
# PHASE 18 — PAY RUN VALIDATION
# ============================================================

Add validation before approval.

Examples:

```text
missing salary
missing bank account
missing PAN
missing statutory details
invalid component
attendance incomplete
negative net salary
duplicate payroll
unapproved reimbursement
unapproved revision
account mapping missing
```

Use:

```text
ERROR
WARNING
INFO
```

Errors block processing.

---

# ============================================================
# PHASE 19 — PAYROLL HISTORY
# ============================================================

Reference:

`00066 ... payroll-history`

Recreate:

- historical pay run list;
- period;
- type;
- status;
- totals;
- employee count;
- actions;
- filters;
- drilldown.

Historical payroll must be immutable after lock except through controlled reopen/reversal mechanisms.

---

# ============================================================
# PHASE 20 — OFF-CYCLE PAYROLL
# ============================================================

Reference:

`00070 ... PayrollType.OffCycle`

Implement the exact off-cycle behavior represented.

Support applicable:

```text
salary correction
bonus
incentive
arrear
reimbursement
special payment
contractor payment
```

Do not force off-cycle transactions into regular pay runs.

---

# ============================================================
# PHASE 21 — TERMINATION / FULL & FINAL
# ============================================================

References:

```text
00067 termination summary
00068 termination edit
00072 termination pending
00069 bulk termination
```

This phase is mandatory.

Integrate with HRMS employee exit/termination.

Implement applicable items such as:

```text
salary until last working day
LOP
leave encashment
notice pay
notice recovery
bonus
scheduled earnings
reimbursements
loan settlement
advance recovery
tax adjustment
gratuity
other earnings
other deductions
```

Use actual captured forms/workflow as source.

Include:

- individual termination payroll;
- termination edit;
- termination summary;
- bulk termination;
- approval;
- accounting;
- payment.

Do not delete employee history.

---

# ============================================================
# PHASE 22 — LOANS
# ============================================================

Reference:

`00008 ... loans`

plus employee loan tabs.

Recreate complete Loan module.

Analyse forms/actions for:

```text
loan name/type
loan amount
interest/perquisite where captured
disbursement
repayment
EMI
payroll deduction
manual repayment
remaining balance
status
```

Integrate loan deductions into Pay Runs automatically.

---

# ============================================================
# PHASE 23 — REIMBURSEMENTS
# ============================================================

Reference:

`00004 ... approvals_reimbursements`

Integrate with Monolith's expense/reimbursement functions.

Recreate the captured approval experience:

- claim;
- evidence;
- employee;
- date;
- claimed amount;
- approved amount;
- comments;
- approve/reject;
- filters;
- document preview.

Approved Payroll-mode reimbursement enters the applicable pay run.

Prevent double payment.

---

# ============================================================
# PHASE 24 — PROOF OF INVESTMENT APPROVALS
# ============================================================

Reference:

`00003 ... approvals_proof-of-investment`

Recreate complete screen/workflow.

Employee submits tax proofs.

Payroll/HR reviewer can:

```text
review
open attachment
approve line
reject line
partially approve
comment
```

Approved amounts affect tax computation.

---

# ============================================================
# PHASE 25 — TAX DECLARATIONS / EMPLOYEE INVESTMENTS
# ============================================================

Use employee:

`investments-and-proofs`

and portal:

`investment-declaration`

captures.

Implement the same data flow between:

```text
Employee Portal
        ↓
Investment Declaration
        ↓
Proof Submission
        ↓
Approval
        ↓
Tax Computation
```

Do not treat declaration amount and approved proof amount as the same.

---

# ============================================================
# PHASE 26 — STATUTORY ENGINE
# ============================================================

Reference:

`settings_statutory-details_list`

and current public Zoho Payroll India functionality.

Build effective-dated configurable support for:

```text
EPF
EPS
ESI
Professional Tax
Labour Welfare Fund
TDS
Statutory Bonus
Gratuity
NPS/VPF where applicable
```

Never hardcode values inside UI.

Rates/thresholds must be configuration/rule records with:

```text
effectiveFrom
effectiveTo
jurisdiction
employee eligibility
```

---

# ============================================================
# PHASE 27 — TAX SETTINGS
# ============================================================

Reference:

`settings_taxes`

Recreate all captured tax settings.

Implement annual tax projection.

Separate:

```text
annual taxable income
annual tax
tax already deducted
remaining tax
current month TDS
```

Support applicable tax regimes through effective-dated policy.

---

# ============================================================
# PHASE 28 — FORM 16
# ============================================================

References:

```text
00018
00118
```

Recreate:

- fiscal year selection;
- employee records;
- Form 16 status;
- generation actions;
- bulk operations;
- download;
- detail states.

Use Monolith PDF/document infrastructure.

Do not claim statutory e-filing readiness unless validated.

---

# ============================================================
# PHASE 29 — FORM 24Q
# ============================================================

References:

```text
00019
00120
00121
00122
```

Reconstruct captured workflow:

- fiscal year;
- quarter;
- return status;
- detail;
- validation;
- export/generation actions represented.

Implement data model needed for 24Q preparation.

---

# ============================================================
# PHASE 30 — TAX LIABILITIES
# ============================================================

References:

```text
tax-liabilities_pending
tax-liabilities_completed
```

Recreate both states.

Track:

```text
liability type
period
amount
due date
payment state
associated accounting liability
```

Integrate with Accounting.

---

# ============================================================
# PHASE 31 — TAX PAYMENTS
# ============================================================

References:

```text
tax-payments_unassociated
tax-payments_associated
```

Implement tax payment association.

Connect Payroll statutory liability to actual Accounting/Bank payment.

Never mark tax liability settled merely by user text entry when a canonical payment exists.

---

# ============================================================
# PHASE 32 — PAYROLL ACCOUNTING
# ============================================================

Reference:

`reports_selectedGroup_payroll_journal`

and public Zoho Payroll accounting integration.

Payroll must post through existing Monolith Accounting.

Configure salary-component → ledger mappings.

Typical mappings include:

```text
Salary Expense
Bonus Expense
Reimbursement Expense
Employer PF Expense
Employer ESI Expense

Salary Payable
Employee PF Payable
Employer PF Payable
ESI Payable
PT Payable
LWF Payable
TDS Payable
Loan / Advance Receivable
```

Use actual Chart of Accounts IDs.

No hardcoded ledger IDs.

---

# PAYROLL JOURNAL

Approved payroll should produce a balanced accounting transaction.

Conceptually:

```text
Dr salary/benefit expenses
Dr employer contribution expenses

Cr statutory liabilities
Cr deductions/recoveries
Cr payroll payable
```

Actual posting must use Monolith accounting services.

No isolated Payroll ledger.

---

# ============================================================
# PHASE 33 — BANKING & DIRECT DEPOSIT
# ============================================================

References:

```text
settings_direct-deposit
settings_employer-bank-accounts
```

Recreate screens and setup structure.

Where a real direct-deposit provider is unavailable:

implement:

```text
payment batch
payment instruction
bank export
payment status
```

through Monolith Banking.

Do not fake successful external bank transfers.

Flow:

```text
Approved Payroll
      ↓
Payroll Payable
      ↓
Salary Payment Batch
      ↓
Bank Account
      ↓
Bank Transaction
      ↓
Reconciliation
```

---

# ============================================================
# PHASE 34 — PAYSLIP TEMPLATE
# ============================================================

Reference:

`settings_templates_regular-payslip`

Recreate the same type of configuration:

- layout;
- logo/branding using Monolith assets;
- employee fields;
- component visibility;
- notes/footer;
- signatory where represented.

Render with existing PDF engine.

---

# ============================================================
# PHASE 35 — PAYSLIPS
# ============================================================

Use employee and portal payslip references.

Payslip must use immutable Payroll snapshot.

Include fields represented in reference, such as applicable:

```text
employee
pay period
paid days
LOP
earnings
deductions
gross
net
YTD
bank/payment
statutory information
```

Support:

- preview;
- PDF;
- bulk generation;
- controlled release.

---

# ============================================================
# PHASE 36 — EMPLOYEE PORTAL
# ============================================================

Captured portal pages include:

```text
Dashboard
Documents
Investment Declaration
My Profile
Salary Details
Benefit Report
Payslip Detail
```

Integrate these screens into Monolith's Employee Self Service.

Do not create separate authentication.

Use existing employee identity.

Match the reference information architecture and functionality.

---

# ============================================================
# PHASE 37 — REPORTS HOME
# ============================================================

Reference:

`00011 ... reports`

Recreate report-group layout and navigation.

Captured categories include:

```text
Payroll Overview
Payroll Journal
Employee Reports
Deduction Reports
Loan Reports
Statutory Reports
Taxes & Forms
Activity
```

Do not collapse everything into one generic report page.

---

# ============================================================
# PHASE 38 — PAYROLL OVERVIEW REPORTS
# ============================================================

Reference:

`reports_selectedGroup_payroll_overview`

Implement the reports shown in captured page.

Use live Payroll data.

Support captured:

- filters;
- period selection;
- export;
- table columns;
- drilldown.

---

# ============================================================
# PHASE 39 — EMPLOYEE REPORTS
# ============================================================

Reference:

`reports_selectedGroup_employee_reports`

Recreate all employee-related payroll reports visible in reference.

---

# ============================================================
# PHASE 40 — DEDUCTION REPORTS
# ============================================================

Reference:

`reports_selectedGroup_deduction_reports`

Recreate report types represented.

---

# ============================================================
# PHASE 41 — LOAN REPORTS
# ============================================================

Reference:

`reports_selectedGroup_loan_reports`

Implement:

- balances;
- schedules;
- repayments;
- outstanding amounts;

according to captured reports.

---

# ============================================================
# PHASE 42 — STATUTORY REPORTS
# ============================================================

References:

```text
statutory_reports
epf-summary
esi-summary
tds-summary
```

Recreate:

- report filters;
- summary cards;
- detail tables;
- exports;
- period selection.

All calculations must use actual statutory engine data.

---

# ============================================================
# PHASE 43 — TAXES & FORMS REPORTS
# ============================================================

Reference:

`reports_selectedGroup_taxes_and_forms`

Recreate all captured report options.

---

# ============================================================
# PHASE 44 — ACTIVITY REPORTS
# ============================================================

Reference:

`reports_selectedGroup_activity`

Integrate with Monolith audit/activity system.

Do not create another audit database unless necessary.

---

# ============================================================
# PHASE 45 — REPORTING TAGS
# ============================================================

Reference:

`settings_advanced-reportingtags`

Recreate reporting-tag functionality.

Where Monolith already has:

```text
department
branch
location
cost centre
project
class
```

reuse those dimensions.

Add generic Payroll reporting tags only if reference functionality requires additional labels.

---

# ============================================================
# PHASE 46 — USERS & ROLES
# ============================================================

References:

```text
settings_users-roles_users
settings_users-roles_roles
```

Do not create Payroll-specific login users.

Map these screens to Monolith RBAC.

Create Payroll permission groups equivalent to reference capabilities.

Examples:

```text
payroll.view
payroll.employee.view
payroll.employee.manage
payroll.compensation.view
payroll.compensation.manage
payroll.payrun.create
payroll.payrun.edit
payroll.payrun.approve
payroll.payrun.reopen
payroll.loan.manage
payroll.reimbursement.approve
payroll.poi.approve
payroll.tax.manage
payroll.accounting.post
payroll.payment.manage
payroll.reports.view
payroll.settings.manage
```

Adapt names to repository convention.

---

# ============================================================
# PHASE 47 — PAY RUN RECORD LOCKING
# ============================================================

Reference:

`settings_payrun_record-locking`

Implement the actual record-lock policy represented.

Payroll states must prevent edits after applicable milestones.

Possible controlled actions:

```text
reopen
reverse
adjustment pay run
off-cycle correction
```

Respect Accounting period locks too.

---

# ============================================================
# PHASE 48 — BRANDING
# ============================================================

Reference:

`settings_branding`

Recreate configuration capabilities that make sense in Monolith.

Use Monolith company branding.

Do not reproduce Zoho branding.

Apply configured branding to:

- payroll portal;
- documents;
- payslips;
- email.

---

# ============================================================
# PHASE 49 — EMAIL PREFERENCES & TEMPLATES
# ============================================================

References:

```text
settings_email-preference
settings_email-templates
```

Reuse Monolith Communication/Email infrastructure.

Implement Payroll template categories represented by the capture.

Potential:

```text
employee invitation
payslip availability
salary revision
proof reminder
reimbursement
final settlement
```

Use actual captured templates/actions to determine scope.

---

# ============================================================
# PHASE 50 — NOTIFICATIONS
# ============================================================

Payroll events should use Monolith notifications.

Examples:

```text
approval required
salary revised
payroll ready
payroll approved
payslip available
proof submission deadline
reimbursement status
tax reminder
payment failed
```

Avoid building duplicate notification infrastructure.

---

# ============================================================
# PHASE 51 — AUTOMATION WORKFLOWS
# ============================================================

Reference:

`settings_automation_workflows`

Recreate Payroll automation using Monolith's automation primitives if available.

Possible triggers:

```text
Employee Added
Salary Revised
Pay Run Created
Pay Run Approved
Reimbursement Approved
Loan Created
Payroll Paid
```

Use reference fields/actions.

---

# ============================================================
# PHASE 52 — AUTOMATION ALERTS
# ============================================================

Reference:

`settings_automation_actions_alerts`

Implement alert action configuration.

Reuse email/notification engine.

---

# ============================================================
# PHASE 53 — AUTOMATION SCHEDULES
# ============================================================

Reference:

`settings_automation_schedules`

Use existing scheduler.

No second cron framework.

---

# ============================================================
# PHASE 54 — AUTOMATION LOGS
# ============================================================

Reference:

`settings_automation_logs_alerts`

Show automation run history:

```text
trigger
action
status
timestamp
record
error
```

Use existing logging where possible.

---

# ============================================================
# PHASE 55 — PORTAL PREFERENCES
# ============================================================

Reference:

`settings_portal_preferences`

Recreate portal settings.

Apply them to Monolith ESS Payroll area.

---

# ============================================================
# PHASE 56 — CUSTOM LOAN FIELDS
# ============================================================

Reference:

`settings_loan_custom-field_list`

If Monolith already has a custom-field engine:

use it.

Otherwise implement a safe reusable custom metadata mechanism.

Do not make Loan-specific one-off dynamic-schema hacks.

---

# ============================================================
# PHASE 57 — DATA BACKUP / EXPORT
# ============================================================

Reference:

`settings_data-backup`

Use existing Monolith export/backup infrastructure.

Never expose cross-tenant payroll data.

---

# ============================================================
# PHASE 58 — INTEGRATIONS
# ============================================================

Captured references include:

```text
Zoho Expense configuration
Analytics
WhatsApp
Zoho integration section
```

Do NOT reproduce Zoho-to-Zoho integrations literally.

Map each capability into Monolith equivalents.

Examples:

Zoho Expense
→ Monolith Expense/Reimbursement integration.

Zoho Books
→ Monolith Accounting.

Zoho People
→ Monolith HRMS.

Zoho Analytics
→ Monolith reports/analytics.

WhatsApp
→ existing Monolith messaging integration if configured.

Direct Deposit
→ Monolith Banking/payment integrations.

---

# ============================================================
# PHASE 59 — ADVANCED CURRENT-MARKET GAP ANALYSIS
# ============================================================

After captured Zoho parity is complete, research CURRENT public functionality from:

- Zoho Payroll;
- greytHR;
- Keka;
- Razorpay Payroll;
- Darwinbox;
- SAP SuccessFactors;
- Workday;
- Oracle Payroll;
- ADP;
- Rippling.

Do NOT rebuild the UI from these other products.

Use them only to identify advanced functionality that Zoho/reference corpus may lack.

Create:

`docs/payroll/PAYROLL_MARKET_GAP_ANALYSIS.md`

Classify each candidate feature:

```text
Already in captured Zoho
Already in Monolith
Useful enhancement
Not relevant
Future enhancement
```

Only implement an enhancement if:

- it strengthens the existing architecture;
- does not conflict with captured Zoho workflow;
- provides tangible value.

---

# ============================================================
# PHASE 60 — ACCOUNTING RECONCILIATION
# ============================================================

Validate end-to-end consistency:

```text
Total approved Net Pay
=
Payroll Payable

Payroll Payable
-
Salary Payments
=
Outstanding Payroll
```

Also reconcile:

```text
PF liability
ESI liability
PT liability
LWF liability
TDS liability
```

against Accounting.

---

# ============================================================
# PHASE 61 — PAYROLL VARIANCE & ANOMALY REVIEW
# ============================================================

Add advanced payroll review if not already represented.

Compare current vs previous payroll:

```text
Gross
Net
LOP
OT
Tax
Bonus
Arrears
Deductions
```

Flag:

```text
large salary variance
negative pay
unexpected zero pay
high LOP
high OT
duplicate reimbursement
unexpected deduction
terminated employee paid
```

This enhances payroll validation without replacing reference functionality.

---

# ============================================================
# PHASE 62 — ACCESSIBILITY & RESPONSIVENESS
# ============================================================

Compare every implemented screen with captured screenshots.

Optimize at:

```text
1366x768
1440x900
1920x1080
2560x1440
```

and normal supported browser zoom ranges.

Prevent:

- text overflow;
- card overlap;
- clipped tables;
- broken drawers;
- off-screen modal buttons;
- horizontal viewport overflow except deliberate tables.

Test keyboard interaction.

---

# ============================================================
# PHASE 63 — SECURITY AUDIT
# ============================================================

Payroll contains extremely sensitive data.

Audit:

- tenant isolation;
- branch/location scope;
- RBAC;
- salary access;
- PAN masking;
- bank masking;
- documents;
- exports;
- payslips;
- logs;
- API responses.

Never expose full sensitive values unnecessarily.

---

# ============================================================
# PHASE 64 — IDEMPOTENCY / CONCURRENCY
# ============================================================

Ensure these cannot duplicate:

```text
payroll calculation
payroll approval
journal posting
payment batch
tax liability
payslip generation
```

Use repository idempotency and transaction patterns.

Prevent two simultaneous approvers from posting Payroll twice.

---

# ============================================================
# PHASE 65 — DATABASE MIGRATION AUDIT
# ============================================================

Review every Payroll schema addition.

Migrations must be:

- additive;
- safe;
- tenant aware;
- indexed;
- reversible where repository convention requires;
- non-destructive.

Do not create duplicate employee/accounting fields.

---

# ============================================================
# PHASE 66 — TEST SUITE
# ============================================================

Implement comprehensive tests.

## Calculation

- fixed earnings;
- percentage earnings;
- formula earnings;
- deductions;
- LOP;
- overtime;
- arrears;
- one-time earnings;
- salary revision;
- joining proration;
- termination;
- reimbursement;
- loan EMI;
- gross;
- net.

## Statutory

- PF;
- ESI;
- PT;
- LWF;
- TDS;
- effective-date changes.

## Pay Runs

- draft;
- calculate;
- edit;
- approve;
- lock;
- reopen;
- off-cycle;
- termination;
- bulk termination.

## Integration

- HR employee → Payroll;
- attendance → Payroll;
- leave → LOP;
- reimbursement → Payroll;
- Payroll → Accounting;
- Payroll payable → Banking;
- payment → reconciliation.

## Permissions

Test every important Payroll mutation server-side.

---

# ============================================================
# PHASE 67 — REFERENCE VISUAL REGRESSION AUDIT
# ============================================================

For EACH major captured page:

1. open reference `screenshot.png`;
2. open Monolith implementation;
3. compare side-by-side;
4. compare:
   - composition;
   - density;
   - table structure;
   - navigation;
   - tabs;
   - dialogs;
   - drawers;
   - interaction sequence;
5. fix deviations.

Create:

`docs/payroll/ZOHO_VISUAL_PARITY_AUDIT.md`

Status each screen:

```text
PARITY ACHIEVED
FUNCTIONALLY COMPLETE / VISUAL GAP
NOT IMPLEMENTED
BLOCKED
```

No screen may be marked parity achieved without visual comparison.

---

# ============================================================
# PHASE 68 — FUNCTIONAL INTERACTION AUDIT
# ============================================================

Test EVERY visible action.

No dead UI.

For each captured action:

```text
Reference Page
Reference Action
Expected State
Monolith Action
Result
```

Create:

`docs/payroll/PAYROLL_INTERACTION_PARITY_MATRIX.md`

---

# ============================================================
# PHASE 69 — BUILD QUALITY
# ============================================================

Run actual repository commands for:

```text
lint
typecheck
unit tests
integration tests
E2E tests
production build
```

Do not guess command names.

Read `package.json` and repository documentation.

Fix failures caused by your work.

---

# ============================================================
# PHASE 70 — FINAL PARITY REPORT
# ============================================================

Produce:

`docs/payroll/PAYROLL_IMPLEMENTATION_REPORT.md`

The report must include:

# 1. Reference Corpus

Total captured Zoho pages analysed.

Expected reference set is approximately 201 captured states.

Explain any excluded technical/WMS pages.

# 2. Page Parity Matrix

For every captured business page:

```text
Zoho Reference
Monolith Route
UI Status
Feature Status
Integration Status
```

# 3. Feature Parity

List every feature implemented.

# 4. HRMS Integration

Explain:

```text
Employee
Attendance
Leave
Overtime
Department
Designation
Location
Exit
```

# 5. Accounting Integration

Explain:

```text
Payroll Journal
Payroll Payable
Statutory Liability
Payments
Banking
Reconciliation
```

# 6. Files Changed

Exact paths.

# 7. Database Changes

Exact schema/migrations.

# 8. Tests

Exact tests.

# 9. Verification Results

Actual command results.

# 10. Remaining Gaps

For each gap:

```text
reference page
missing behavior
reason
next implementation action
```

Do NOT write vague "future improvement" statements.

---

# FINAL DEFINITION OF DONE

You may NOT declare Payroll complete until all of the following are true:

- the entire scraped Zoho Payroll reference corpus has been indexed;
- every business-relevant captured page has been reviewed;
- every captured screenshot has been used as UI reference;
- captured tabs and menus have been reproduced;
- captured important forms have been reproduced;
- captured workflows have been reproduced;
- captured action states have been reviewed;
- Dashboard works;
- Employees work;
- employee Payroll profile works;
- Salary Components work;
- Salary Templates work;
- Salary Revisions work;
- salary revision approvals work;
- Pay Schedules work;
- regular payroll works;
- off-cycle payroll works;
- payroll history works;
- termination payroll works;
- bulk termination works where reference demonstrates it;
- loans work;
- reimbursements work;
- POI approval works;
- employee investments/proofs work;
- statutory calculations work;
- Form 16 workflow works;
- Form 24Q workflow works;
- tax liabilities work;
- tax payment association works;
- Payroll reports work;
- EPF/ESI/TDS reports work;
- Payroll Journal works;
- Accounting integration works;
- Payroll Payable works;
- Banking integration works;
- direct-deposit/payment architecture works;
- Payslip generation works;
- Payslip template works;
- Employee Portal works;
- Users/Roles map to Monolith RBAC;
- reporting tags work;
- email templates/preferences work;
- automation workflows/actions/schedules/logs work;
- record locking works;
- organization/work location/department/designation integrations work;
- UI is responsive;
- no dead buttons remain;
- no fake data remains;
- no duplicate employee master exists;
- no duplicate accounting ledger exists;
- audit trail exists;
- sensitive payroll data is protected;
- tests pass;
- build passes.

The target is not "a payroll module inspired by Zoho."

The target is:

**a Monolith-native Payroll module that reproduces the complete functional experience and page/workflow structure demonstrated by the supplied Zoho Payroll capture, while using Monolith's own code, branding, database, HRMS, Accounting, Banking and Design System.**

Begin with Phase 0.

Do not write production code until the reference manifest and Monolith integration map are complete.

Then implement every phase sequentially and verify each phase before moving to the next.