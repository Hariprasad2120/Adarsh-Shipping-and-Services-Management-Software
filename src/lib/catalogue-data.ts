export interface LifecycleStep {
  stepNumber: string;
  title: string;
  description: string;
}

export interface FunctionDeepDive {
  name: string;
  signature: string;
  behavior: string;
  usage: string;
  mutations: string[];
}

export interface LifecycleGuide {
  summary: string;
  fullProcessExplanation: string;
  steps: LifecycleStep[];
  functions: FunctionDeepDive[];
}

export interface CatalogueModule {
  id: string;
  name: string;
  iconName: string;
  shortDescription: string;
  detailedDescription: string;
  keyFeatures: string[];
  howItWorks: string[];
  users: string[];
  businessBenefits: string[];
  exampleWorkflow: string;
  integrations: string[];
  ctaLabel: string;
  lifecycleGuide: LifecycleGuide;
  status: "Implemented" | "Partial" | "Planned";
}

export interface ProblemItem {
  id: string;
  title: string;
  description: string;
  metric: string;
}

export interface SolutionItem {
  id: string;
  title: string;
  description: string;
}

export interface WorkflowStep {
  id: number;
  title: string;
  subtitle: string;
  iconName: string;
  description: string;
  features: string[];
  codedStatus: string;
}

export interface ModuleInteraction {
  fromModule: string;
  toModule: string;
  description: string;
}

export interface ClientBenefit {
  title: string;
  description: string;
  highlight: string;
}

export interface UseCase {
  id: string;
  title: string;
  actor: string;
  workflowSteps: string[];
  businessValue: string;
}

export interface SecurityFeature {
  title: string;
  description: string;
}

export interface BackendFunction {
  name: string;
  signature: string;
  description: string;
  mutations: string[];
}

export interface UserAction {
  role: string;
  permission: string;
  description: string;
}

export interface DetailedWorkflowStage {
  moduleId: string;
  stageId: string;
  stageName: string;
  durationLabel: string;
  barWidth: string; // Tailwind class representing horizontal capsule progress width (simulating video timeline)
  iconName: string;
  summary: string;
  description: string;
  backendFunctions: BackendFunction[];
  userActions: UserAction[];
  integrations: string[];
}

export const productOverview = {
  name: "MONOLITH ENGINE",
  tagline: "One Unified Core. Total Operational Command.",
  description: "An enterprise-grade business operating ecosystem built directly for high-growth operations. Consolidating HRMS directory databases, biometric punch card logs, overtime engines, fixed asset directories, appraisals, and CRM sales pipelines into one secure, relational network.",
  keyBusinessValue: "Erase structural waste, accelerate daily operations, and consolidate disconnected spreadsheet tools into one single point of truth.",
  highlightCards: [
    { title: "Centralized Management", description: "All operational and employee data live in a unified database schema." },
    { title: "Real-Time Calculations", description: "Biometric attendance updates and overtime calculations refresh on demand." },
    { title: "Granular RBAC Policies", description: "Secure, role-based access control protecting business records." },
    { title: "Audit Trail Records", description: "Historical tracking of salary revisions, workflow approvals, and asset lifecycles." }
  ]
};

export const problems: ProblemItem[] = [
  {
    id: "silos",
    title: "Data Scattered Across Silos",
    description: "Employee details are kept in Excel, follow-ups on WhatsApp, quotations in email, and biometric data on standalone hardware. Management has zero real-time consolidated visibility.",
    metric: "88% Operational Friction"
  },
  {
    id: "leaks",
    title: "Margin & Overtime Leakage",
    description: "Manual calculations of overtime, shift grace periods, and CTC-based hourly rates are prone to errors, leading to direct financial leakage.",
    metric: "72% Processing Errors"
  },
  {
    id: "followups",
    title: "Delayed Customer Follow-Ups",
    description: "Leads and client details get buried in email threads. Sales staff miss follow-up callback times, leading to dropped pipelines and lost revenue.",
    metric: "61% Revenue Slippage"
  },
  {
    id: "assets",
    title: "Missing Hardware & Assets",
    description: "Laptops, phones, and corporate vehicles are assigned to employees without condition reports, service histories, or automated straight-line depreciation sheets.",
    metric: "45% Asset Attrition"
  }
];

export const solutions: SolutionItem[] = [
  {
    id: "centralized",
    title: "Single Unified Database",
    description: "No APIs or synchronization code needed to bind modules. HR, CRM, Attendance, Assets, and Ledger share unified tables, eliminating data double-entry."
  },
  {
    id: "automation",
    title: "Automated Operational Loops",
    description: "A biometric sync engine calculates overtime and payroll inputs in real time. Workflows auto-notify managers, releasing approvals directly."
  },
  {
    id: "accountability",
    title: "Absolute Audit Trails",
    description: "Detailed system notes record every status shift, invoice approval, and asset allocation, building total operational accountability."
  }
];

export const modules: CatalogueModule[] = [
  {
    id: "ams",
    name: "APPRAISAL SYSTEM (AMS)",
    iconName: "Award",
    shortDescription: "End-to-end performance appraisal governance, cycles scheduler, peer reviews routing, OKR maps, and increment slabs.",
    detailedDescription: "The Appraisal Management System (AMS) runs structured evaluation cycles. It calculates employee schedules dynamically, tracks reviewer selections, logs self-assessments, conducts manager calibrations, schedules review meetings, and finalizes CTC adjustments.",
    keyFeatures: [
      "Dynamic appraisal schedule slots planner",
      "Confirms reviewer availability (HR, TL, Manager)",
      "Criteria question banks segmented by roles",
      "Automatic hike increment slabs calculator"
    ],
    howItWorks: [
      "Admins create cycles and criteria points mapped to role-based weights.",
      "The system triggers employee notifications when their appraisal schedules are due.",
      "Reviewers confirmation and self-assessments initiate peer/manager reviews.",
      "Management review findings route to live meetings before closing."
    ],
    users: ["HR Managers", "Department Leads", "Employees", "Directors"],
    businessBenefits: [
      "Standardizes evaluation parameters across designations.",
      "Reduces manual feedback loops and cycles latency.",
      "Directly links performance outcomes to CTC adjustments in HRMS."
    ],
    exampleWorkflow: "Employee slot is scheduled -> reviewers confirmed -> self-assessment submitted -> manager scores submitted -> appraisal meeting logged -> CTC updated.",
    integrations: ["HRMS Salary Sheets", "Timeline Reminders", "System Notifications"],
    ctaLabel: "Launch Appraisals Center",
    status: "Implemented",
    lifecycleGuide: {
      summary: "End-to-end performance appraisal governance and cycle management.",
      fullProcessExplanation: "The Appraisal Management System (AMS) manages the performance lifecycle of employees. It links join dates to evaluation schedules, coordinates multi-rater feedback (Self, Peers, TL, and Manager), aggregates scores, guides managers through calibration and proposed increment meetings, and directly updates the HRMS employment CTC record upon final approval.",
      steps: [
        { stepNumber: "Step 1", title: "Appraisal Scheduling", description: "The system runs a cron checking employee join dates and historical prior experience, creating future slots up to 10 years out." },
        { stepNumber: "Step 2", title: "Reviewers Mapping", description: "HR assigns evaluators (TL, peers, manager) to review the employee. System verifies their availability within a 2-day business deadline." },
        { stepNumber: "Step 3", title: "Employee Self-Assessment", description: "The evaluation window opens. The employee rates themselves on company values and functional competencies." },
        { stepNumber: "Step 4", title: "Multi-Rater Scoring", description: "Assigned reviewers grade the employee. System monitors standard deviation in scoring to warn HR of rating anomalies." },
        { stepNumber: "Step 5", title: "Manager Calibration", description: "The claimed manager consolidates all feedback, submits calibrated ratings, and proposes review meeting dates." },
        { stepNumber: "Step 6", title: "Meeting Booking", description: "HR confirms the final meeting time, generating calendar invites and email notifications for the employee and manager." },
        { stepNumber: "Step 7", title: "Live Evaluation Session", description: "The review is conducted. Managers input feedback notes and sign-off on the meeting minutes document." },
        { stepNumber: "Step 8", title: "Increment Slab Finalization", description: "Admin enters the hike percentage based on target salary brackets, and updates the core Employment Record." },
        { stepNumber: "Step 9", title: "Cycle Close & Payroll Sync", description: "The appraisal file is locked. Salary adjustments sync with payroll sheets, and biometric overtime rates are updated." }
      ],
      functions: [
        {
          name: "syncEmployeeAppraisalSchedule",
          signature: "syncEmployeeAppraisalSchedule(orgId: string, employeeId: string, joinDate: Date, priorExp: number)",
          behavior: "Runs dynamically or via scheduled cron to construct future appraisal slots based on employment start date and experience offsets.",
          usage: "Generates slot rows in the database for the next 10 years to give HR absolute visibility into upcoming cycle counts.",
          mutations: ["db.appraisalSchedule.upsert", "db.appraisalSchedule.deleteMany"]
        },
        {
          name: "assignReviewers",
          signature: "assignReviewers(appraisalId: string, reviewers: {userId: string, kind: ReviewerKind}[], actorId: string)",
          behavior: "Associates Peer, TL, and Manager reviewers with the candidate's active appraisal cycle and schedules confirmation reminders.",
          usage: "Triggered by HR. It creates pending review records and computes response deadlines based on the office holiday calendar.",
          mutations: ["db.appraisalReviewer.createMany", "db.appraisalReviewer.deleteMany"]
        },
        {
          name: "submitSelfAssessment",
          signature: "submitSelfAssessment(appraisalId: string, employeeId: string, answers: SelfAssessmentAnswers)",
          behavior: "Sanitizes and records ratings and descriptive feedback details from the employee's self-evaluation form.",
          usage: "Triggered by the employee. It locks the form and initiates notification webhooks to reviewers that evaluation sheets are ready.",
          mutations: ["db.selfAssessment.upsert", "db.appraisal.update"]
        },
        {
          name: "submitReviewerRating",
          signature: "submitReviewerRating(appraisalId: string, reviewerUserId: string, ratings: ReviewerRatingAnswers)",
          behavior: "Logs the reviewer's performance scores, checks for rating changes, and advances the cycle if all reviewers are complete.",
          usage: "Triggered by peers, TLs, and managers. Evaluates scores against standard thresholds.",
          mutations: ["db.reviewerRating.upsert", "db.appraisal.update"]
        },
        {
          name: "finaliseHike",
          signature: "finaliseHike(appraisalId: string, decidedById: string, percent: number, amount: number, effectiveFrom: Date)",
          behavior: "Locks the performance rating score, creates a salary revision history log, and calculates and writes the new CTC.",
          usage: "Triggered by Admin/HR. It updates the employee's active salary in the directory, affecting attendance overtime payouts.",
          mutations: ["db.hikeDecision.upsert", "db.employmentRecord.update", "db.appraisal.update"]
        }
      ]
    }
  },
  {
    id: "hrms",
    name: "HRMS MODULE",
    iconName: "Users",
    shortDescription: "Complete personnel management, document control, organizational mapping, and payroll-ready salary structures.",
    detailedDescription: "The HRMS module acts as the core identity server for your business. It manages employee files, legal branch mappings, department trees, salary revision logs, document drives, and HR letters.",
    keyFeatures: [
      "Dynamic Branch & Designation Tree Builder",
      "Full Onboarding Document Checklist Drive",
      "Employee CTC Components & Revision History Registers",
      "Unified HR Letters Manager (Offer Letters, Appraisals)"
    ],
    howItWorks: [
      "HR creates an employee record and assigns them to a specific branch, department, and manager.",
      "HR uploads necessary verification documents directly to the employee's document drive.",
      "The system builds the CTC structure and maintains historical revision logs for future salary audits."
    ],
    users: ["HR Managers", "Department Heads", "Operations Directors"],
    businessBenefits: [
      "Removes manual HR record compilation and directory sync errors.",
      "Ensures legal and procedural compliance during employee onboarding.",
      "Stores salary components and histories securely for instant audit retrieval."
    ],
    exampleWorkflow: "HR onboards a new logistics executive -> system generates designation permissions -> new employee receives onboarding checklist directly.",
    integrations: ["Attendance Engine", "AMS (Asset Handover)", "Ledger Module"],
    ctaLabel: "Configure Directory",
    status: "Implemented",
    lifecycleGuide: {
      summary: "Enterprise identity registry and organizational structure manager.",
      fullProcessExplanation: "The HRMS Module establishes the organization's physical and permissions hierarchy. It structures legal branches and department trees, manages user credentials and permission groups, maintains digital document vaults for compliance checks, and tracks employee remuneration historical revisions (CTC structures) that directly feed into operational calculations like overtime payouts.",
      steps: [
        { stepNumber: "Step 1", title: "Organizational Tree Mapping", description: "HR configures branches, departments, and designations, assigning role permission limits." },
        { stepNumber: "Step 2", title: "Employee Profile Creation", description: "Admin creates the user record, linking them to an ID number, reporting managers, and branch laws." },
        { stepNumber: "Step 3", title: "Remuneration CTC Structuring", description: "HR enters salary allowances (Base, HRA, allowance pools). Remuneration revisions log automatically." },
        { stepNumber: "Step 4", title: "Legal Document Vault", description: "Upload onboarding files (PAN, Aadhaar, contract logs). Checklist triggers system alerts on missing items." }
      ],
      functions: [
        {
          name: "createBranch",
          signature: "createBranch(orgId: string, name: string, location?: string)",
          behavior: "Adds geographic operational branch properties to the database schema, mapping localized holiday calendars.",
          usage: "Triggered by Admin. Defines the working regulations and leave schedules for employees mapped to this branch.",
          mutations: ["db.branch.create"]
        },
        {
          name: "createEmployee",
          signature: "createEmployee(orgId: string, createdById: string, data: any)",
          behavior: "Generates a secure user profile, hashes access tokens, and registers designation relationships.",
          usage: "Triggered by HR. Configures login permissions, email schedules, and onboarding document grids.",
          mutations: ["db.user.create"]
        },
        {
          name: "setupSalaryStructure",
          signature: "setupSalaryStructure(employeeId: string, ctc: number, components: any)",
          behavior: "Saves basic salary allocations, calculates daily/hourly CTC minute rates, and logs adjustments.",
          usage: "Triggered by Finance/HR. Establishes payroll values and overtime coefficients for attendance punches.",
          mutations: ["db.employmentRecord.update", "db.salaryRevision.create"]
        }
      ]
    }
  },
  {
    id: "crm",
    name: "CRM MODULE",
    iconName: "Sparkles",
    shortDescription: "Leads routing, interactive sales pipeline Kanban boards, quotations management, and customer directories.",
    detailedDescription: "The CRM Module manages the customer lifecycle from incoming lead capture to qualified customer records. Handles call records, follow-up calendars, custom price books, quote approvals, and invoices.",
    keyFeatures: [
      "Pipeline Kanban Board with Drag-and-Drop Stages",
      "Auto-Routing of Hot/Warm/Cold Leads to Sales Staff",
      "Lead Callback Reminders (with 2-Hour Cooldown Logic)",
      "Standard Quotation Generator with Multi-Level Approvals"
    ],
    howItWorks: [
      "Sales leads are created manually or imported from digital platforms.",
      "The sales executive maps lead requirements and updates statuses (e.g., Interested, Not Interested, Unreachable).",
      "When a lead is marked Interested, the system generates a customer profile and enables quotation templates."
    ],
    users: ["Sales Directors", "Account Executives", "Pre-Sales Teams"],
    businessBenefits: [
      "Eliminates lost leads and protects potential client revenue.",
      "Enforces a structured follow-up process via automated reminders.",
      "Builds a reliable customer contact index linked directly to historical quotes."
    ],
    exampleWorkflow: "Pre-sales captures a freight inquiry -> sales exec schedules callback reminder -> quotation is prepared and sent for approvals.",
    integrations: ["HRMS Staff Matrix", "Quotation Approval Queue", "Billing & Ledger Engine"],
    ctaLabel: "Launch CRM Dashboard",
    status: "Implemented",
    lifecycleGuide: {
      summary: "Inbound sales lead converter, quote engine, and customer pipeline tracker.",
      fullProcessExplanation: "The CRM Module manages customer acquisitions. Raw leads are imported and routed to pre-sales. Unreachable contacts trigger a 2-hour cooldown period before retrying. Interested leads convert to Customer Profiles and Enquiry files. Reps compile ocean/air freight quotes using Price Books. Managers approve or reject quotations, and accepted invoices automatically update general ledger records.",
      steps: [
        { stepNumber: "Step 1", title: "Inbound Lead Ingestion", description: "Leads flow from Justdial API feeds or are entered manually. Assigned to agents based on round-robin logic." },
        { stepNumber: "Step 2", title: "Callback Retry Engine", description: "Reps log contact attempts (No Answer, Busy). Unreachable leads receive a 2-hour lock before visible again." },
        { stepNumber: "Step 3", title: "Enquiry & Account Conversion", description: "Interested leads are promoted. System generates Customer Account and Contact profiles dynamically." },
        { stepNumber: "Step 4", title: "Quotation Compilation", description: "Drafts transport quotes (FCL/LCL rates, customs clearance fees) linked to active price lists." },
        { stepNumber: "Step 5", title: "Approvals Routing", description: "Quotes go to the manager's queue. Approved items email to client; rejected quotes route back for changes." }
      ],
      functions: [
        {
          name: "createLead",
          signature: "createLead(orgId: string, createdById: string, data: any)",
          behavior: "Initializes a crmLead record in the DB, mapping contacts and generating follow-up logs.",
          usage: "Triggered by API synchronizers or pre-sales. Captures the source, contact parameters, and assignment.",
          mutations: ["db.crmLead.create"]
        },
        {
          name: "updateLeadStatusAction",
          signature: "updateLeadStatusAction(leadId: string, status: string, additionalData?: any)",
          behavior: "Mutates lead status flags (Unreachable, Not Picked), registers reminders, and locks agent access for 2 hours.",
          usage: "Triggered by Sales Agent. Enforces cooling-off periods to regulate dialer frequencies.",
          mutations: ["db.crmLeadReminder.create", "db.crmActivity.create", "db.crmLead.update"]
        },
        {
          name: "updateLeadStatusAction (Interested)",
          signature: "updateLeadStatusAction(leadId, 'INTERESTED', { enquiry: any })",
          behavior: "Promotes leads to INTERESTED, generates customer account sheets, and builds client cards.",
          usage: "Triggered by Agent. Unlocks price catalog templates and invoice drafts.",
          mutations: ["db.crmLead.update", "db.crmContact.create"]
        },
        {
          name: "approveQuoteAction",
          signature: "approveQuoteAction(quoteId: string, actorId: string)",
          behavior: "Switches quote state to APPROVED, logs the event to the audit trail, and generates invoice links.",
          usage: "Triggered by Sales Manager. Approves quotes for client delivery and updates ledger pipelines.",
          mutations: ["db.crmInvoice.update", "db.crmTimelineEvent.create"]
        }
      ]
    }
  },
  {
    id: "communication",
    name: "COMMUNICATION PORTAL",
    iconName: "Mail",
    shortDescription: "Company broadcasts, internal chat threads routing, email announcements, and notification workflows.",
    detailedDescription: "The Communication Portal manages internal and external communication pipelines. It schedules email broadcasts, routes department alerts, handles real-time chats, and manages global announcements.",
    keyFeatures: [
      "Company Email Broadcast Scheduler",
      "Internal Chats Routing",
      "Announcement Feeds",
      "Dynamic Notification Center"
    ],
    howItWorks: [
      "HR drafts a broadcast email mapping targets.",
      "System queues emails, distributing templates.",
      "Employee chats route to the operational team inbox."
    ],
    users: ["HR Admin", "Operations Supervisors", "All Employees"],
    businessBenefits: [
      "Improves operational update latency.",
      "Eliminates external email fees.",
      "Stores official notifications in the database."
    ],
    exampleWorkflow: "HR schedules appraisal notice -> system broadcasts email templates -> employees get dashboard notifications.",
    integrations: ["HRMS Directory", "AMS Appraisals", "Notifications Feed"],
    ctaLabel: "Open Communication Portal",
    status: "Implemented",
    lifecycleGuide: {
      summary: "Centralized corporate messaging, email broadcasts, and alert feeds.",
      fullProcessExplanation: "The Communication Module organizes internal messages and announcements. It maps employee contacts, manages email dispatch loops, tracks unread alerts, and routes support messages.",
      steps: [
        { stepNumber: "Step 1", title: "Target Mappings", description: "HR filters recipients by designations or branch structures." },
        { stepNumber: "Step 2", title: "Broadcast Drafting", description: "Write templates, attach files, and set broadcast times." },
        { stepNumber: "Step 3", title: "Template Rendering", description: "The engine renders custom HTML templates with personal identifiers." },
        { stepNumber: "Step 4", title: "Queue Dispatch", description: "Scheduled emails are dispatched in chunks, logging response codes." },
        { stepNumber: "Step 5", title: "Dashboard Feeds", description: "Updates are synced with employee dashboards as unread alerts." }
      ],
      functions: [
        {
          name: "sendBroadcastAction",
          signature: "sendBroadcastAction(orgId: string, templateId: string, targets: string[], scheduledAt: Date)",
          behavior: "Saves broadcast logs, schedules template renders, and inserts mail queues.",
          usage: "Triggered by HR. Configures the email dispatch queue.",
          mutations: ["db.crmTimelineEvent.create", "db.emailQueue.create"]
        },
        {
          name: "syncNotificationFeed",
          signature: "syncNotificationFeed(employeeId: string, alertType: string, content: string)",
          behavior: "Inserts notification rows and broadcasts live alerts using Next.js socket loops.",
          usage: "Triggered by system events. Feeds alerts to the sidebar.",
          mutations: ["db.notification.create"]
        }
      ]
    }
  },
  {
    id: "expense",
    name: "EXPENSE SYSTEM (UNDER DEVELOPMENT)",
    iconName: "ShieldAlert",
    shortDescription: "Employee reimbursements tracking, multi-level approvals, receipt OCR processing, and bookkeeping ledger entries.",
    detailedDescription: "The Expense Management System is currently under active development. It will automate reimbursements, audit receipts, track department limits, and post journal entries.",
    keyFeatures: [
      "OCR Receipt Reading",
      "Multi-Level Approval Rules",
      "Budget Limit Checks",
      "Accounting Ledger Integration"
    ],
    howItWorks: [
      "Employee uploads receipt photo -> system extracts invoice properties -> manager approves claim -> bookkeeping records payouts."
    ],
    users: ["Employees", "Finance Managers", "Auditors"],
    businessBenefits: [
      "Eliminates manual entry errors.",
      "Stops budget spending leaks.",
      "Speeds up reimbursement times."
    ],
    exampleWorkflow: "Employee submits travel receipt -> system reads parameters -> manager approves -> balance is posted.",
    integrations: ["HRMS Travel Sheets", "General Ledger Accounts", "Document Drives"],
    ctaLabel: "Review Development Progress",
    status: "Planned",
    lifecycleGuide: {
      summary: "Automated claim auditing, approval loops, and ledger bookkeeping.",
      fullProcessExplanation: "The Expense Module handles employee financial requests. It scans invoices, checks limits, routes claims for approval, and posts approved amounts to general ledger accounts.",
      steps: [
        { stepNumber: "Step 1", title: "Claim Submission", description: "Employee creates expense record, mapping receipts and department codes." },
        { stepNumber: "Step 2", title: "OCR Property Extract", description: "OCR scans invoice image to read dates, merchant, and total values." },
        { stepNumber: "Step 3", title: "Budget Verification", description: "Compares claim amount against designation caps and office budgets." },
        { stepNumber: "Step 4", title: "Approvals Routing", description: "Routes claims to TL, Manager, and Finance Directors for sign-offs." },
        { stepNumber: "Step 5", title: "Reconciliation & Post", description: "Finance pays claim. System generates balanced debit/credit ledger journals." }
      ],
      functions: [
        {
          name: "extractReceiptData",
          signature: "extractReceiptData(receiptImage: Blob): Promise<{amount: number, merchant: string}>",
          behavior: "Scans receipt attachment, runs OCR text parsers, and checks values.",
          usage: "Triggered on file upload. Auto-fills claim forms.",
          mutations: ["db.crmAttachment.create"]
        },
        {
          name: "routeExpenseClaim",
          signature: "routeExpenseClaim(expenseId: string, employeeId: string, currentApproverId: string)",
          behavior: "Verifies approvals hierarchy, updates claim states, and emails the active approver.",
          usage: "Triggered on submission. Advances approvals loops.",
          mutations: ["db.expenseClaim.update"]
        }
      ]
    }
  },
  {
    id: "attendance",
    name: "ATTENDANCE ENGINE",
    iconName: "Clock",
    shortDescription: "Biometric eSSL device synchronizers, live punch trackers, shift regulations, and dynamic overtime calculations.",
    detailedDescription: "The Attendance Engine connects directly to biometric punch devices. It recalculates daily timesheets, late-entry thresholds, overtime minutes, and leaves based on the employee's CTC.",
    keyFeatures: [
      "Biometric eSSL Terminal API Integration",
      "Live Check-In / Check-Out Tracker with Geofence Flags",
      "Automated 8-Hour Compulsory Shift Verification Logic",
      "Dynamic CTC Minute-Rate Overtime Calculator"
    ],
    howItWorks: [
      "Terminal punch logs stream in real time or are uploaded via files.",
      "The engine processes punches, automatically resolving missing check-outs using fallback rules.",
      "Overtime minutes are validated and multiplied by the employee's hourly CTC rate."
    ],
    users: ["Operations Supervisors", "HR Clerks", "Payroll Teams"],
    businessBenefits: [
      "Ends attendance sheet manipulations and buddy punching.",
      "Saves hours of manual spreadsheet compilation at month-end.",
      "Ensures exact, non-arbitrary overtime compensation payouts."
    ],
    exampleWorkflow: "Employee logs punch at biometric terminal -> check-in recorded -> overtime calculated after 8-hour shift threshold.",
    integrations: ["Biometric Terminals", "HRMS Salary Sheets", "Payroll Exporter"],
    ctaLabel: "Check Live Punch Registry",
    status: "Implemented",
    lifecycleGuide: {
      summary: "Biometric synchronization, timesheet calculator, and overtime rate processor.",
      fullProcessExplanation: "The Attendance Engine matches physical biometric logs with digital timesheets. It downloads logs from terminals, matches punches against shift profiles, resolves missing check-outs, and calculates overtime using minute-rate CTC coefficients.",
      steps: [
        { stepNumber: "Step 1", title: "Biometric Terminal Sync", description: "Biometric devices push terminal punch records (ID, timestamp) via TCP sync scripts or file uploads." },
        { stepNumber: "Step 2", title: "Check-in Validation", description: "Calculates late arrivals and early departures by comparing punch times against shift schedules." },
        { stepNumber: "Step 3", title: "Fallback Resolution", description: "The system closes open timesheet rows using shift templates when employee checkout punches are missing." },
        { stepNumber: "Step 4", title: "Overtime Rate Processing", description: "Work times over 8 hours are calculated, checked against approval rules, and paid using hourly CTC rates." }
      ],
      functions: [
        {
          name: "syncBiometricLogs",
          signature: "syncBiometricLogs(orgId: string, terminalId: string, logs: rawLog[])",
          behavior: "Parses raw inputs from biometric devices and creates punch logs in the database.",
          usage: "Triggered by local punch sync tasks. Keeps the check-in database up to date.",
          mutations: ["db.attendancePunch.createMany"]
        },
        {
          name: "validatePunch",
          signature: "validatePunch(employeeId: string, date: Date, punchTime: Date)",
          behavior: "Checks punch logs against shift codes, processing grace periods and late arrivals.",
          usage: "Triggered by punch entries. Records timesheet details.",
          mutations: ["db.attendanceRecord.create"]
        },
        {
          name: "resolveMissingCheckouts",
          signature: "resolveMissingCheckouts(orgId: string, date: Date)",
          behavior: "Finds and closes incomplete timesheets using fallback rules.",
          usage: "Runs as a night cron. Ensures timesheet reports are complete for payroll.",
          mutations: ["db.attendanceRecord.updateMany"]
        },
        {
          name: "computeOvertimeRates",
          signature: "computeOvertimeRates(employeeId: string, date: Date, minutes: number)",
          behavior: "Calculates approved overtime payouts by multiplying minutes by hourly CTC rates.",
          usage: "Triggered by payroll schedules. Links attendance logs with payroll expenses.",
          mutations: ["db.overtimeRecord.create"]
        }
      ]
    }
  },
  {
    id: "ams-assets",
    name: "AMS (ASSET MANAGEMENT)",
    iconName: "HardDrive",
    shortDescription: "Fixed asset registers, employee handovers, condition inspections, maintenance, and straight-line depreciation.",
    detailedDescription: "The Asset Management System (AMS) tracks corporate assets (laptops, vehicles, inventory). It catalogs check-in/check-out condition logs, schedules service tickets, and automates straight-line depreciation records.",
    keyFeatures: [
      "Physical Asset Register with Custom Serial/Tag IDs",
      "Condition Checklists with Inspector Sign-offs",
      "Schedules Preventive Maintenance & Repair Logsheets",
      "Automated Monthly Straight-Line Depreciation Engine"
    ],
    howItWorks: [
      "Admin registers hardware assets with status details.",
      "Assets are assigned to employees with condition checks during onboarding.",
      "The system calculates monthly depreciation and tracks maintenance tickets until asset disposal."
    ],
    users: ["IT Admins", "Procurement Managers", "Inventory Supervisors"],
    businessBenefits: [
      "Prevents corporate asset leakage and unassigned hardware losses.",
      "Builds historical maintenance logs, extending the asset lifecycle.",
      "Generates accurate book value records for company balance sheets."
    ],
    exampleWorkflow: "New developer starts onboarding -> Admin assigns tagged laptop -> handover condition receipt is stored on employee profile.",
    integrations: ["HRMS Employee Files", "Finance General Ledger", "Procurement Registry"],
    ctaLabel: "Manage Asset Register",
    status: "Implemented",
    lifecycleGuide: {
      summary: "Inventory allocation tracker, service manager, and asset depreciation engine.",
      fullProcessExplanation: "The Asset Module tracks fixed assets. It monitors inventory, handles employee allocations, logs maintenance histories, and calculates monthly straight-line depreciation to update balance sheets.",
      steps: [
        { stepNumber: "Step 1", title: "Inventory Registration", description: "Registers hardware with serials, cost values, lifespan metrics, and classification codes." },
        { stepNumber: "Step 2", title: "Handover Inspection", description: "Assigns assets to employees. Tracks handover checklists and condition reports on employee profiles." },
        { stepNumber: "Step 3", title: "Maintenance Tracking", description: "Logs maintenance tickets, costs, and down-times, maintaining asset history logs." },
        { stepNumber: "Step 4", title: "Depreciation Posting", description: "Calculates straight-line depreciation monthly, posting the calculations to the ledger." }
      ],
      functions: [
        {
          name: "allocateAsset",
          signature: "allocateAsset(assetId: string, employeeId: string, condition: string)",
          behavior: "Links the asset to the employee and records the handover checklist and initial condition.",
          usage: "Triggered by IT. Assigns asset responsibility to the employee.",
          mutations: ["db.assetAssignment.create", "db.asset.update"]
        },
        {
          name: "logMaintenance",
          signature: "logMaintenance(assetId: string, details: string, cost: number)",
          behavior: "Saves maintenance records, parts replaced, and costs.",
          usage: "Triggered by IT. Tracks repair expenses and monitors asset health.",
          mutations: ["db.assetMaintenance.create"]
        },
        {
          name: "computeDepreciation",
          signature: "computeDepreciation(assetId: string, method: 'STRAIGHT_LINE')",
          behavior: "Calculates depreciation based on initial cost, salvage value, and lifespan.",
          usage: "Triggered by Finance. Updates book values on the general ledger.",
          mutations: ["db.asset.update", "db.depreciationLog.create"]
        }
      ]
    }
  },
  {
    id: "accounting",
    name: "ACCOUNTING MODULE",
    iconName: "Shield",
    shortDescription: "Chart of Accounts, journal entry logs, general ledger, and real-time trial balance reporting.",
    detailedDescription: "The Accounting module integrates operations directly with finance. It records financial events—like invoices generated, salary payments, and asset depreciations—into a standard Chart of Accounts.",
    keyFeatures: [
      "Customizable Double-Entry Chart of Accounts",
      "Sales Invoice & Payment Entry Matching Engine",
      "Auto-Generated Cash Flow, Trial Balance, & Profit/Loss Sheets",
      "Automated General Ledger Journal Postings"
    ],
    howItWorks: [
      "Operational events (e.g., invoices created or assets depreciated) trigger double-entry journal logs.",
      "Finance team reviews, posts, and reconciles entries with bank statement records.",
      "Financial reports are compiled dynamically, showing real-time balance positions."
    ],
    users: ["Chief Accountants", "Finance Controllers", "Auditors"],
    businessBenefits: [
      "Eliminates manual ledger compilation errors.",
      "Connects operations with finance teams instantly.",
      "Improves receivable/payable collections and tracks margins."
    ],
    exampleWorkflow: "Approved invoice generated -> system posts receivable and revenue journal records -> payment entry closes invoice balance.",
    integrations: ["CRM Invoices", "Asset Depreciation Logs", "Payroll Batches"],
    ctaLabel: "Open Chart of Accounts",
    status: "Partial",
    lifecycleGuide: {
      summary: "General ledger tracker, transaction analyzer, and financial reporter.",
      fullProcessExplanation: "The Accounting Module records operational activities. Transactions are posted to the general ledger, balances are reconciled, and real-time financial statements (trial balance, cash flow, P&L) are generated.",
      steps: [
        { stepNumber: "Step 1", title: "Chart of Accounts", description: "Establishes ledger accounts (asset, liability, equity, income, expense) for the organization." },
        { stepNumber: "Step 2", title: "Automated Journal Posting", description: "Operational events (such as invoice approvals or asset depreciations) post double-entry items automatically." },
        { stepNumber: "Step 3", title: "Payment Reconciliation", description: "Matches payments with invoices, updating the general ledger and resolving balances." },
        { stepNumber: "Step 4", title: "Financial Reporting", description: "Compiles trial balance and profit/loss statements, showing the company's financial position." }
      ],
      functions: [
        {
          name: "createChartOfAccounts",
          signature: "createChartOfAccounts(orgId: string, template: any)",
          behavior: "Generates the Chart of Accounts from pre-defined templates.",
          usage: "Triggered during company setup. Creates the structure for financial transactions.",
          mutations: ["db.accountingAccount.createMany"]
        },
        {
          name: "postJournalEntry",
          signature: "postJournalEntry(orgId: string, entries: any[])",
          behavior: "Validates and records balanced debit and credit items in the general ledger.",
          usage: "Triggered by system events. Posts transaction details to the ledger.",
          mutations: ["db.journalEntry.create", "db.accountBalance.update"]
        },
        {
          name: "matchInvoicesAndPayments",
          signature: "matchInvoicesAndPayments(invoiceId: string, paymentId: string)",
          behavior: "Matches invoice records with payment entries, updating ledger accounts.",
          usage: "Triggered by Accountants. Closes invoice balances and matches bank transactions.",
          mutations: ["db.crmInvoice.update", "db.paymentMatching.create"]
        }
      ]
    }
  },
  {
    id: "lms",
    name: "LMS (LEARNING MANAGEMENT)",
    iconName: "BookOpen",
    shortDescription: "Interactive employee training courses, assignment logs, performance metrics, and skill audits.",
    detailedDescription: "The LMS module governs employee training, courses, learning paths, evaluations, and skill matrices, helping employees transition into new roles.",
    keyFeatures: [
      "Course Catalog Builder with Multi-Media Video Drives",
      "Interactive Assignment Checklists and Submissions",
      "Performance Progress Badging & Completion Status Bars",
      "Skill Competency Audits Linked to Appraisal Eligibility"
    ],
    howItWorks: [
      "HR creates training courses and assigns them to departments or roles.",
      "Employees follow learning paths and submit assignment reports.",
      "Managers review and grade submissions, updating the employee's skill competency badges."
    ],
    users: ["Training Instructors", "HR Coordinators", "Learning Employees"],
    businessBenefits: [
      "Accelerates employee onboarding and training times.",
      "Builds a structured skill matrix, reducing critical skill gaps.",
      "Supports performance appraisals with objective training histories."
    ],
    exampleWorkflow: "Sales rep hired -> system auto-assigns 'CRM Fundamentals' course -> manager approves completion certificate.",
    integrations: ["HRMS Profiles", "Performance Appraisals Cycle"],
    ctaLabel: "Launch Course Catalog",
    status: "Partial",
    lifecycleGuide: {
      summary: "Training path manager, assignment portal, and skills directory.",
      fullProcessExplanation: "The Learning Management System (LMS) manages training and onboarding. Courses are assigned to designations, progress is monitored, assignments are graded, and verified skill badges are logged in employee profiles.",
      steps: [
        { stepNumber: "Step 1", title: "Course Configuration", description: "HR builds courses, uploads materials, and defines the evaluation criteria." },
        { stepNumber: "Step 2", title: "Target Enrollment", description: "Assigns courses based on employee designation, setting completion deadlines." },
        { stepNumber: "Step 3", title: "Learning & Submissions", description: "Employees follow course paths and submit completed assignments for review." },
        { stepNumber: "Step 4", title: "Evaluation & Badging", description: "Managers grade submissions, update skills matrices, and issue course certificates." }
      ],
      functions: [
        {
          name: "createCourse",
          signature: "createCourse(orgId: string, title: string, content: any)",
          behavior: "Creates course records and registers training materials.",
          usage: "Triggered by Coordinators. Builds training libraries for departments.",
          mutations: ["db.lmsCourse.create"]
        },
        {
          name: "enrollStudent",
          signature: "enrollStudent(courseId: string, employeeId: string)",
          behavior: "Enrolls the employee in the course and maps completion schedules.",
          usage: "Triggered by HR. Schedules onboarding training assignments.",
          mutations: ["db.lmsEnrollment.create"]
        },
        {
          name: "submitAssignment",
          signature: "submitAssignment(enrollmentId: string, content: string)",
          behavior: "Saves assignment submissions and triggers manager grading notifications.",
          usage: "Triggered by Employees. Records completed course tasks.",
          mutations: ["db.lmsAssignment.create", "db.lmsEnrollment.update"]
        }
      ]
    }
  }
];

export const detailedWorkflowStages: DetailedWorkflowStage[] = [
  // ─── APPRAISALS WORKFLOW (AMS) ───
  {
    moduleId: "ams",
    stageId: "due_notified",
    stageName: "DUE_NOTIFIED",
    durationLabel: "Stage 01",
    barWidth: "w-[12%]",
    iconName: "Bell",
    summary: "Appraisal cycle scheduled dynamically based on employment joinDate.",
    description: "The system automatically checks the employee's join date and prior experience offset years to schedule appraisal slots up to 10 years in advance. When the slot's month is active, the system triggers notifications.",
    backendFunctions: [
      {
        name: "syncEmployeeAppraisalSchedule",
        signature: "syncEmployeeAppraisalSchedule(orgId: string, employeeId: string, joinDate: Date, priorExp: number)",
        description: "Computes employee slots using joinDate and priorExperience, writing entries to the AppraisalSchedule model.",
        mutations: ["db.appraisalSchedule.upsert", "db.appraisalSchedule.deleteMany"]
      },
      {
        name: "createAppraisalForEmployee",
        signature: "createAppraisalForEmployee(orgId: string, employeeId: string, dueDate: Date, kind: AppraisalKind)",
        description: "Locks the schedule slot status to 'GENERATED' and creates a new Appraisal record initialized in the DUE_NOTIFIED stage.",
        mutations: ["db.appraisal.upsert", "db.appraisalSchedule.updateMany"]
      }
    ],
    userActions: [
      {
        role: "System (Automated Cron)",
        permission: "System level execution",
        description: "Scans and flags eligible employee schedules at the beginning of each fiscal month."
      }
    ],
    integrations: ["HRMS Directory", "Cycle Scheduler"]
  },
  {
    moduleId: "ams",
    stageId: "reviewers_assigned",
    stageName: "REVIEWERS_ASSIGNED",
    durationLabel: "Stage 02",
    barWidth: "w-[24%]",
    iconName: "Users",
    summary: "HR maps peer and manager evaluators and calculates deadlines.",
    description: "HR assigns Peer, Team Lead, and Manager reviewers to evaluate the candidate. The system calculates confirm availability deadlines dynamically, factoring in corporate holiday registers to compute business days.",
    backendFunctions: [
      {
        name: "assignReviewers",
        signature: "assignReviewers(appraisalId: string, reviewers: {userId: string, kind: ReviewerKind}[], actorId: string)",
        description: "Creates AppraisalReviewer records set to PENDING status, calculates the availability confirmation deadline, and sends notifications.",
        mutations: ["db.appraisalReviewer.deleteMany", "db.appraisalReviewer.createMany", "db.appraisal.update"]
      },
      {
        name: "setReviewerAvailability",
        signature: "setReviewerAvailability(appraisalId: string, userId: string, available: boolean, force?: boolean)",
        description: "Updates a reviewer's confirmation status to AVAILABLE, UNAVAILABLE, or FORCED. Automatically invokes assessment checks.",
        mutations: ["db.appraisalReviewer.update", "db.appraisalAuditLog.create"]
      }
    ],
    userActions: [
      {
        role: "HR Administrator",
        permission: "ams.appraisal.assign_reviewers",
        description: "Submits selected evaluators via the Assign Reviewers configuration modal."
      }
    ],
    integrations: ["Role-Based Access Control", "Holiday Calendar Registry"]
  },
  {
    moduleId: "ams",
    stageId: "self_assessment_open",
    stageName: "SELF_ASSESSMENT_OPEN",
    durationLabel: "Stage 03",
    barWidth: "w-[36%]",
    iconName: "BookOpen",
    summary: "Employee completes comprehensive self-evaluation ratings and forms.",
    description: "Once all assigned reviewers confirm availability, the employee self-assessment window opens. The employee rates themselves on values and core competencies, providing descriptive feedback justifications.",
    backendFunctions: [
      {
        name: "maybeOpenSelfAssessment",
        signature: "maybeOpenSelfAssessment(appraisalId: string)",
        description: "Checks if all PENDING reviewers have confirmed availability. If complete, updates appraisal stage and computes assessment deadlines.",
        mutations: ["db.appraisal.update", "db.appraisalAuditLog.create"]
      },
      {
        name: "submitSelfAssessment",
        signature: "submitSelfAssessment(appraisalId: string, employeeId: string, answers: SelfAssessmentAnswers, action: SubmissionStatus)",
        description: "Validates inputs, sanitizes ratings against criteria questions, logs the submission, and increments the edit counter.",
        mutations: ["db.selfAssessment.upsert", "db.appraisal.update"]
      }
    ],
    userActions: [
      {
        role: "Employee (Self)",
        permission: "Self appraisal execution",
        description: "Fills the self-evaluation question sheets and scores criteria on their My Appraisal page."
      }
    ],
    integrations: ["Criteria Config Engine", "Timeline Reminders"]
  },
  {
    moduleId: "ams",
    stageId: "reviewer_rating",
    stageName: "REVIEWER_RATING",
    durationLabel: "Stage 04",
    barWidth: "w-[48%]",
    iconName: "Award",
    summary: "Assigned peer and manager evaluators submit scores and remarks.",
    description: "Evaluators (peers, TLs, managers) access the employee's assessment profile. They score the criteria points, logging justifications if their scores deviate from previous cycles.",
    backendFunctions: [
      {
        name: "submitReviewerRating",
        signature: "submitReviewerRating(appraisalId: string, reviewerUserId: string, ratings: ReviewerRatingAnswers, action: SubmissionStatus)",
        description: "Sanitizes ratings, detects rating changes using buildRatingChangeMetadata, creates ReviewerRating logs, and checks if all evaluators are done.",
        mutations: ["db.reviewerRating.upsert", "db.appraisal.update"]
      }
    ],
    userActions: [
      {
        role: "Peer / TL / Manager Evaluators",
        permission: "ams.appraisal.review",
        description: "Accesses 'My Reviews', completes evaluations, and submits scoring records."
      }
    ],
    integrations: ["Criteria Rating Sheets", "Activity Tasks Generator"]
  },
  {
    moduleId: "ams",
    stageId: "management_review",
    stageName: "MANAGEMENT_REVIEW",
    durationLabel: "Stage 05",
    barWidth: "w-[60%]",
    iconName: "Shield",
    summary: "HR / CRM managers claim the review and configure calibrations.",
    description: "Authorized managers claim the appraisal record. They evaluate peer ratings, reconcile scores, configure final recommendations, and propose dates for review meetings.",
    backendFunctions: [
      {
        name: "claimManagementReview",
        signature: "claimManagementReview(appraisalId: string, userId: string)",
        description: "Verifies the appraisal stage, asserts that it has not been claimed, and assigns the user as the Management Reviewer.",
        mutations: ["db.appraisalReviewer.create", "db.appraisalAuditLog.create"]
      },
      {
        name: "submitManagementReview",
        signature: "submitManagementReview(appraisalId: string, reviewerUserId: string, ratings: ManagementReviewAnswers, proposedDates: Date[], action: SubmissionStatus)",
        description: "Saves final calibrated ratings, logs meeting date proposals, and advances the stage to MEETING_PENDING.",
        mutations: ["db.managementReview.upsert", "db.appraisal.update"]
      }
    ],
    userActions: [
      {
        role: "HR / CRM Manager",
        permission: "ams.appraisal.management_review",
        description: "Claims the appraisal, calibrates scoring lists, and submits proposed meeting dates."
      }
    ],
    integrations: ["Notification Dispatcher", "Appraisal Scoring Compiler"]
  },
  {
    moduleId: "ams",
    stageId: "meeting_pending",
    stageName: "MEETING_PENDING",
    durationLabel: "Stage 06",
    barWidth: "w-[72%]",
    iconName: "Clock",
    summary: "HR selects the meeting date, notifying all participants.",
    description: "HR schedules a review meeting based on the proposed dates. The system confirms the date and notifies the employee and reviewers.",
    backendFunctions: [
      {
        name: "confirmMeeting",
        signature: "confirmMeeting(appraisalId: string, hrUserId: string, scheduledAt: Date)",
        description: "Upserts the AppraisalMeeting record and updates the status to SCHEDULED.",
        mutations: ["db.appraisalMeeting.upsert", "db.appraisal.update"]
      }
    ],
    userActions: [
      {
        role: "HR Administrator",
        permission: "ams.appraisal.assign_reviewers",
        description: "Selects the final meeting date and triggers invitations."
      }
    ],
    integrations: ["Email Integrations", "Unified Calendar Engine"]
  },
  {
    moduleId: "ams",
    stageId: "meeting_live",
    stageName: "MEETING_LIVE",
    durationLabel: "Stage 07",
    barWidth: "w-[84%]",
    iconName: "HardDrive",
    summary: "Meeting is conducted, logging feedback minutes.",
    description: "The meeting is activated in the system. HR and managers log feedback notes and meeting minutes, which are saved in the appraisal record.",
    backendFunctions: [
      {
        name: "startMeeting",
        signature: "startMeeting(appraisalId: string)",
        description: "Updates the meeting status to LIVE and the appraisal stage to MEETING_LIVE.",
        mutations: ["db.appraisalMeeting.update", "db.appraisal.update"]
      },
      {
        name: "addMeetingMinute",
        signature: "addMeetingMinute(appraisalId: string, authorId: string, role: string, content: string)",
        description: "Appends meeting minutes and records the author's details.",
        mutations: ["db.meetingMinute.create"]
      }
    ],
    userActions: [
      {
        role: "HR / Manager Evaluators",
        permission: "ams.appraisal.review",
        description: "Logs live feedback and meeting minutes during the review session."
      }
    ],
    integrations: ["System Notes", "Appraisal Feed logs"]
  },
  {
    moduleId: "ams",
    stageId: "hike_finalisation",
    stageName: "HIKE_FINALISATION",
    durationLabel: "Stage 08",
    barWidth: "w-[94%]",
    iconName: "TrendingUp",
    summary: "Admin finalizes hike percentages and updates CTC salary structures.",
    description: "The review is closed, and the employee's performance grade is computed. Based on increment slabs, the administrator finalizes the hike percentage, which updates the employee's CTC records.",
    backendFunctions: [
      {
        name: "closeMeeting",
        signature: "closeMeeting(appraisalId: string)",
        description: "Updates meeting status to DONE and the appraisal stage to HIKE_FINALISATION.",
        mutations: ["db.appraisalMeeting.update", "db.appraisal.update"]
      },
      {
        name: "finaliseHike",
        signature: "finaliseHike(appraisalId: string, decidedById: string, percent: number, amount: number, effectiveFrom: Date, notes?: string)",
        description: "Calculates the new salary, updates the EmploymentRecord model, sets the appraisal stage to CLOSED, and alerts the employee.",
        mutations: ["db.hikeDecision.upsert", "db.employmentRecord.update", "db.appraisal.update"]
      }
    ],
    userActions: [
      {
        role: "Administrator",
        permission: "admin.org.manage",
        description: "Enters the finalized increment percentage and amount, locking in the new CTC structure."
      }
    ],
    integrations: ["HRMS Salary Sheets", "Depreciation Ledger Sync"]
  },
  {
    moduleId: "ams",
    stageId: "closed",
    stageName: "CLOSED",
    durationLabel: "Stage 09",
    barWidth: "w-full",
    iconName: "CheckCircle2",
    summary: "Cycle completed; hike decisions locked and frozen.",
    description: "The appraisal is complete and frozen. Appraisal letters are generated and signed, and logs are locked to prevent edits.",
    backendFunctions: [
      {
        name: "computeAppraisalScore",
        signature: "computeAppraisalScore(appraisalId: string)",
        description: "Generates the final appraisal score. Combines self-assessments (20%), peer reviews (70%), and management reviews (10%) to output grade labels and hike eligibility.",
        mutations: ["Computed on execution"]
      }
    ],
    userActions: [
      {
        role: "System (Lock)",
        permission: "Automated lock",
        description: "Freezes all assessment logs and makes the hike details visible to the employee."
      }
    ],
    integrations: ["HR Letters Generator", "Salary Revision Logs"]
  },

  // ─── HRMS WORKFLOW ───
  {
    moduleId: "hrms",
    stageId: "branch_setup",
    stageName: "BRANCH_SETUP",
    durationLabel: "Step 01",
    barWidth: "w-[25%]",
    iconName: "Users",
    summary: "Define branches, designations, and department structures.",
    description: "Admins configure designation permission groups and set up company departments, creating the organizational framework.",
    backendFunctions: [
      {
        name: "createBranch",
        signature: "createBranch(orgId: string, name: string, location?: string)",
        description: "Registers branch details in the database.",
        mutations: ["db.branch.create"]
      }
    ],
    userActions: [
      {
        role: "Administrator",
        permission: "admin.org.manage",
        description: "Configures department records and sets branch structures."
      }
    ],
    integrations: ["Access Rules Framework"]
  },
  {
    moduleId: "hrms",
    stageId: "employee_onboarding",
    stageName: "ONBOARDING",
    durationLabel: "Step 02",
    barWidth: "w-[50%]",
    iconName: "Database",
    summary: "HR onboards employees and uploads legal documents.",
    description: "HR maps employee profiles, configures compensation rates, and uploads verification documents to the document drive.",
    backendFunctions: [
      {
        name: "createEmployee",
        signature: "createEmployee(orgId: string, createdById: string, data: any)",
        description: "Creates a new user record linked to their department and manager.",
        mutations: ["db.user.create"]
      }
    ],
    userActions: [
      {
        role: "HR Admin",
        permission: "hrms.employee.create",
        description: "Enters onboarding details and reviews verification documents."
      }
    ],
    integrations: ["Document Drives"]
  },
  {
    moduleId: "hrms",
    stageId: "ctc_config",
    stageName: "CTC_CONFIGURATION",
    durationLabel: "Step 03",
    barWidth: "w-[75%]",
    iconName: "TrendingUp",
    summary: "Setup CTC structures and track salary revisions.",
    description: "Finance configures CTC components (Base salary, HRA, and allowances) and maintains historical logs of all salary revisions.",
    backendFunctions: [
      {
        name: "setupSalaryStructure",
        signature: "setupSalaryStructure(employeeId: string, ctc: number, components: any)",
        description: "Updates CTC components and revisions logs.",
        mutations: ["db.employmentRecord.update", "db.salaryRevision.create"]
      }
    ],
    userActions: [
      {
        role: "HR Controller",
        permission: "hrms.salary.read",
        description: "Configures payroll allowances and CTC structures."
      }
    ],
    integrations: ["Payroll Engines"]
  },
  {
    moduleId: "hrms",
    stageId: "document_drive",
    stageName: "DOCUMENT_DRIVE",
    durationLabel: "Step 04",
    barWidth: "w-full",
    iconName: "HardDrive",
    summary: "Document storage and audit trail logs.",
    description: "HR uploads certificates, training records, and passports, storing onboarding files on the employee's profile.",
    backendFunctions: [
      {
        name: "addAttachment",
        signature: "addAttachment(orgId: string, data: any)",
        description: "Uploads files and logs the activity on the employee's timeline.",
        mutations: ["db.crmAttachment.create", "db.crmTimelineEvent.create"]
      }
    ],
    userActions: [
      {
        role: "HR Admin",
        permission: "hrms.documents.read",
        description: "Reviews identification records and updates onboarding checkers."
      }
    ],
    integrations: ["CRM Timelines"]
  },

  // ─── CRM WORKFLOW ───
  {
    moduleId: "crm",
    stageId: "lead_inbound",
    stageName: "LEAD_INBOUND",
    durationLabel: "Step 01",
    barWidth: "w-[20%]",
    iconName: "Sparkles",
    summary: "Leads are created manually or imported from digital platforms.",
    description: "Leads are captured and qualified. The system assigns an owner and initializes follow-up trackers.",
    backendFunctions: [
      {
        name: "createLead",
        signature: "createLead(orgId: string, createdById: string, data: any)",
        description: "Registers lead details and configures access permissions.",
        mutations: ["db.crmLead.create"]
      }
    ],
    userActions: [
      {
        role: "Pre-Sales Rep",
        permission: "crm.lead.create",
        description: "Enters lead details manually or imports records from digital leads registries."
      }
    ],
    integrations: ["Leads Importer"]
  },
  {
    moduleId: "crm",
    stageId: "callback_timer",
    stageName: "CALLBACK_COOLDOWN",
    durationLabel: "Step 02",
    barWidth: "w-[40%]",
    iconName: "Clock",
    summary: "Sales reps update callback attempts, triggering retry timers.",
    description: "If a lead is unreachable, the rep logs a 'Not Picked' or 'Not Reachable' status. The system applies a 2-hour cooldown timer before displaying the lead in active lists again.",
    backendFunctions: [
      {
        name: "updateLeadStatusAction",
        signature: "updateLeadStatusAction(leadId: string, status: string, additionalData?: any)",
        description: "Sets the callback status, schedules a follow-up reminder, and generates a task.",
        mutations: ["db.crmLeadReminder.create", "db.crmActivity.create", "db.crmLead.update"]
      }
    ],
    userActions: [
      {
        role: "Sales Rep",
        permission: "crm.lead.create",
        description: "Logs the callback status (Not Picked/Unreachable) and schedules a retry time."
      }
    ],
    integrations: ["Activities Checklists", "Timer Reminders"]
  },
  {
    moduleId: "crm",
    stageId: "lead_interested",
    stageName: "INTERESTED_CONVERSION",
    durationLabel: "Step 03",
    barWidth: "w-[60%]",
    iconName: "GitMerge",
    summary: "Leads marked Interested move to Enquiries.",
    description: "When a lead is marked Interested, they are moved to the Enquiries page. The system generates customer profiles and enables quotation templates.",
    backendFunctions: [
      {
        name: "updateLeadStatusAction (Interested)",
        signature: "updateLeadStatusAction(leadId, 'INTERESTED', { enquiry: any })",
        description: "Updates the status to INTERESTED, generates enquiry reference IDs, and maps contact profiles.",
        mutations: ["db.crmLead.update", "db.crmContact.create"]
      }
    ],
    userActions: [
      {
        role: "Sales Executive",
        permission: "crm.lead.create",
        description: "Submits client inquiries and updates lead status to Interested."
      }
    ],
    integrations: ["Enquiries Registry", "Customer Accounts Profiles"]
  },
  {
    moduleId: "crm",
    stageId: "quotation_drafting",
    stageName: "QUOTATION_DRAFT",
    durationLabel: "Step 04",
    barWidth: "w-[80%]",
    iconName: "HardDrive",
    summary: "Draft quotations based on shipping details.",
    description: "Sales drafts quotations (sea freight, FCL/LCL, air freight) based on shipping details and custom price books.",
    backendFunctions: [
      {
        name: "saveEnquiryRatesAction",
        signature: "saveEnquiryRatesAction(leadId: string, rates: any)",
        description: "Saves customized freight and transit rates to the enquiry record.",
        mutations: ["db.crmLead.update"]
      }
    ],
    userActions: [
      {
        role: "Sales Rep",
        permission: "crm.invoice.manage",
        description: "Drafts quotations and submits them for approval."
      }
    ],
    integrations: ["Price Books Directory", "Enquiry Sheets"]
  },
  {
    moduleId: "crm",
    stageId: "approval_queue",
    stageName: "APPROVAL_QUEUE",
    durationLabel: "Step 05",
    barWidth: "w-full",
    iconName: "CheckCircle2",
    summary: "Managers review, approve, or request reworks.",
    description: "Draft quotes are routed to managers. Approved quotes can be emailed to clients; rejected quotes are returned for rework.",
    backendFunctions: [
      {
        name: "approveQuoteAction",
        signature: "approveQuoteAction(quoteId: string, actorId: string)",
        description: "Updates quote status and logs the approval on the timeline.",
        mutations: ["db.crmInvoice.update", "db.crmTimelineEvent.create"]
      }
    ],
    userActions: [
      {
        role: "CRM / Sales Manager",
        permission: "crm.quote.approve",
        description: "Reviews draft quotes and updates their status to Approved or Rejected."
      }
    ],
    integrations: ["Ledger Invoices", "Audit Handovers Logs"]
  },
  
  // ─── COMMUNICATION WORKFLOW ───
  {
    moduleId: "communication",
    stageId: "communication_setup",
    stageName: "SETUP",
    durationLabel: "Step 01",
    barWidth: "w-[33%]",
    iconName: "Settings",
    summary: "Define messaging channels and templates.",
    description: "HR configures communication channels, email templates, and maps broadcast recipient groups.",
    backendFunctions: [
      {
        name: "configureChannels",
        signature: "configureChannels(orgId: string, channels: any)",
        description: "Registers active email server credentials and chat channels.",
        mutations: ["db.orgCommunicationConfig.upsert"]
      }
    ],
    userActions: [
      {
        role: "System Administrator",
        permission: "admin.org.manage",
        description: "Configures SMTP servers and integrates chat webhooks."
      }
    ],
    integrations: ["Email SMTP Servers", "Internal Webhooks"]
  },
  {
    moduleId: "communication",
    stageId: "broadcast_dispatch",
    stageName: "BROADCAST_DISPATCH",
    durationLabel: "Step 02",
    barWidth: "w-[66%]",
    iconName: "Send",
    summary: "Execute and queue template broadcasts.",
    description: "HR drafts announcement newsletters or urgent notices, queueing dispatch pipelines.",
    backendFunctions: [
      {
        name: "sendBroadcastAction",
        signature: "sendBroadcastAction(orgId: string, templateId: string, targets: string[], scheduledAt: Date)",
        description: "Queues email alerts in the dispatch engine and registers timeline markers.",
        mutations: ["db.crmTimelineEvent.create", "db.emailQueue.create"]
      }
    ],
    userActions: [
      {
        role: "HR Manager",
        permission: "hrms.employee.read",
        description: "Drafts broadcast templates and schedules target mail runs."
      }
    ],
    integrations: ["Email Queues", "System Timeline"]
  },
  {
    moduleId: "communication",
    stageId: "notification_ack",
    stageName: "NOTIFICATION_FEED",
    durationLabel: "Step 03",
    barWidth: "w-full",
    iconName: "Bell",
    summary: "Deliver feeds to employee sidebar terminals.",
    description: "System updates read counters and pushes alerts directly to employee sidebars.",
    backendFunctions: [
      {
        name: "syncNotificationFeed",
        signature: "syncNotificationFeed(employeeId: string, alertType: string, content: string)",
        description: "Logs read flags and pushes alerts to the frontend connection.",
        mutations: ["db.notification.create"]
      }
    ],
    userActions: [
      {
        role: "Employee",
        permission: "attendance.punch.self",
        description: "Reads alerts and clears notifications on their dashboard."
      }
    ],
    integrations: ["Sidebar Notification Hub"]
  },

  // ─── EXPENSE WORKFLOW (UNDER DEVELOPMENT) ───
  {
    moduleId: "expense",
    stageId: "expense_submission",
    stageName: "CLAIM_SUBMISSION",
    durationLabel: "Step 01",
    barWidth: "w-[33%]",
    iconName: "Receipt",
    summary: "Log reimbursement claims and upload receipts.",
    description: "Employees submit reimbursement details (travel, client meals), attaching receipt photos.",
    backendFunctions: [
      {
        name: "extractReceiptData",
        signature: "extractReceiptData(receiptImage: Blob)",
        description: "Processes receipt photos, running OCR to extract costs, merchant, and tax details.",
        mutations: ["db.crmAttachment.create"]
      }
    ],
    userActions: [
      {
        role: "Employee",
        permission: "attendance.punch.self",
        description: "Fills reimbursement forms and uploads receipt attachments."
      }
    ],
    integrations: ["OCR Reader", "Document Drive"]
  },
  {
    moduleId: "expense",
    stageId: "expense_approval",
    stageName: "APPROVAL_QUEUE",
    durationLabel: "Step 02",
    barWidth: "w-[66%]",
    iconName: "Shield",
    summary: "Claims are routed through approval managers.",
    description: "System checks limit parameters and routes claims to the employee's managers.",
    backendFunctions: [
      {
        name: "routeExpenseClaim",
        signature: "routeExpenseClaim(expenseId: string, employeeId: string, currentApproverId: string)",
        description: "Updates approvals flags, checks budgets, and emails the active approver.",
        mutations: ["db.expenseClaim.update"]
      }
    ],
    userActions: [
      {
        role: "TL / Manager / Director",
        permission: "hrms.travel.approve",
        description: "Reviews expense details, approving or rejecting claims."
      }
    ],
    integrations: ["Approvals Engine", "Email Alerts"]
  },
  {
    moduleId: "expense",
    stageId: "expense_posting",
    stageName: "LEDGER_POSTING",
    durationLabel: "Step 03",
    barWidth: "w-full",
    iconName: "TrendingUp",
    summary: "Reimburse claims and post ledger entries.",
    description: "Approved claims are paid, auto-posting debit/credit entries to the General Ledger.",
    backendFunctions: [
      {
        name: "postExpenseToLedger",
        signature: "postExpenseToLedger(expenseId: string, accountId: string)",
        description: "Generates double-entry items in the Chart of Accounts.",
        mutations: ["db.journalEntry.create", "db.accountBalance.update"]
      }
    ],
    userActions: [
      {
        role: "Chief Accountant",
        permission: "accounting.journal.create",
        description: "Reconciles payouts and posts journal entries to accounts."
      }
    ],
    integrations: ["Accounting Ledger"]
  },

  // ─── ATTENDANCE WORKFLOW ───
  {
    moduleId: "attendance",
    stageId: "biometric_sync",
    stageName: "BIOMETRIC_SYNC",
    durationLabel: "Step 01",
    barWidth: "w-[25%]",
    iconName: "Clock",
    summary: "Stream biometric terminal inputs into raw logs.",
    description: "Attendance terminal punch logs stream in real time or are uploaded via files to the punch registry.",
    backendFunctions: [
      {
        name: "syncBiometricLogs",
        signature: "syncBiometricLogs(orgId: string, terminalId: string, logs: rawLog[])",
        description: "Parses punches and writes logs to the database.",
        mutations: ["db.attendancePunch.createMany"]
      }
    ],
    userActions: [
      {
        role: "Operations Supervisor",
        permission: "attendance.punch.manage",
        description: "Coordinates terminal connections and reviews raw punch logs."
      }
    ],
    integrations: ["eSSL Terminals Engine"]
  },
  {
    moduleId: "attendance",
    stageId: "check_in_validation",
    stageName: "CHECK_IN_VALIDATION",
    durationLabel: "Step 02",
    barWidth: "w-[50%]",
    iconName: "Users",
    summary: "Process check-in validation against shifts.",
    description: "The system processes punches, validating check-ins against shift schedules and late thresholds.",
    backendFunctions: [
      {
        name: "validatePunch",
        signature: "validatePunch(employeeId: string, date: Date, punchTime: Date)",
        description: "Validates check-ins against shift codes.",
        mutations: ["db.attendanceRecord.create"]
      }
    ],
    userActions: [
      {
        role: "HR Admin",
        permission: "attendance.punch.manage",
        description: "Reviews check-in logs and resolves shift disputes."
      }
    ],
    integrations: ["HRMS Profiles"]
  },
  {
    moduleId: "attendance",
    stageId: "fallback_punch_resolver",
    stageName: "FALLBACK_RESOLVER",
    durationLabel: "Step 03",
    barWidth: "w-[75%]",
    iconName: "HardDrive",
    summary: "Resolve open check-ins using fallback shift rules.",
    description: "The system resolves missing check-outs, applying fallback rules to close timesheets.",
    backendFunctions: [
      {
        name: "resolveMissingCheckouts",
        signature: "resolveMissingCheckouts(orgId: string, date: Date)",
        description: "Finds and closes open check-ins using shift fallback rules.",
        mutations: ["db.attendanceRecord.updateMany"]
      }
    ],
    userActions: [
      {
        role: "System (Automated Cron)",
        permission: "System level execution",
        description: "Closes open timesheets after shift completion."
      }
    ],
    integrations: ["Timesheet Compiler"]
  },
  {
    moduleId: "attendance",
    stageId: "overtime_recalc",
    stageName: "OVERTIME_RECALCULATION",
    durationLabel: "Step 04",
    barWidth: "w-full",
    iconName: "TrendingUp",
    summary: "Compute overtime rates based on hourly CTC.",
    description: "Overtime minutes are validated against shift rules and multiplied by the employee's hourly CTC.",
    backendFunctions: [
      {
        name: "computeOvertimeRates",
        signature: "computeOvertimeRates(employeeId: string, date: Date, minutes: number)",
        description: "Calculates overtime rates and generates payout records.",
        mutations: ["db.overtimeRecord.create"]
      }
    ],
    userActions: [
      {
        role: "HR Controller",
        permission: "attendance.punch.manage",
        description: "Reviews overtime records and approves payouts."
      }
    ],
    integrations: ["HRMS Salary Sheets", "Payroll Sync"]
  },

  // ─── AMS ASSETS WORKFLOW ───
  {
    moduleId: "ams-assets",
    stageId: "asset_handover",
    stageName: "ASSET_HANDOVER",
    durationLabel: "Step 01",
    barWidth: "w-[33%]",
    iconName: "HardDrive",
    summary: "Register and assign hardware assets during onboarding.",
    description: "IT registers assets (e.g. laptops, phones) and assigns them to employees, storing handover checklists on their profiles.",
    backendFunctions: [
      {
        name: "allocateAsset",
        signature: "allocateAsset(assetId: string, employeeId: string, condition: string)",
        description: "Assigns the asset and logs the handover details.",
        mutations: ["db.assetAssignment.create", "db.asset.update"]
      }
    ],
    userActions: [
      {
        role: "IT Admin",
        permission: "ams.cycle.manage",
        description: "Registers serial tags and completes handover checklists."
      }
    ],
    integrations: ["HRMS Profiles"]
  },
  {
    moduleId: "ams-assets",
    stageId: "asset_maintenance",
    stageName: "PREVENTIVE_MAINTENANCE",
    durationLabel: "Step 02",
    barWidth: "w-[66%]",
    iconName: "Settings",
    summary: "Schedule asset maintenance and repair cycles.",
    description: "The system schedules inspections and records maintenance logs, helping extend the asset lifecycle.",
    backendFunctions: [
      {
        name: "logMaintenance",
        signature: "logMaintenance(assetId: string, details: string, cost: number)",
        description: "Saves maintenance records and logs repair costs.",
        mutations: ["db.assetMaintenance.create"]
      }
    ],
    userActions: [
      {
        role: "IT Admin",
        permission: "ams.cycle.manage",
        description: "Creates repair tickets and logs maintenance details."
      }
    ],
    integrations: ["Inventory Registry"]
  },
  {
    moduleId: "ams-assets",
    stageId: "asset_depreciation",
    stageName: "DEPRECIATION",
    durationLabel: "Step 03",
    barWidth: "w-full",
    iconName: "TrendingUp",
    summary: "Calculate monthly straight-line depreciation.",
    description: "The system calculates monthly depreciation and updates asset book values on the balance sheet.",
    backendFunctions: [
      {
        name: "computeDepreciation",
        signature: "computeDepreciation(assetId: string, method: 'STRAIGHT_LINE')",
        description: "Calculates depreciation and updates asset book values.",
        mutations: ["db.asset.update", "db.depreciationLog.create"]
      }
    ],
    userActions: [
      {
        role: "Accountant",
        permission: "accounting.reports.view",
        description: "Reviews depreciation schedules and posts calculations to the ledger."
      }
    ],
    integrations: ["Accounting Ledger"]
  },

  // ─── LMS WORKFLOW ───
  {
    moduleId: "lms",
    stageId: "course_setup",
    stageName: "COURSE_SETUP",
    durationLabel: "Step 01",
    barWidth: "w-[33%]",
    iconName: "BookOpen",
    summary: "Configure training courses and learning paths.",
    description: "HR creates courses and designs learning paths, mapping competencies to department designations.",
    backendFunctions: [
      {
        name: "createCourse",
        signature: "createCourse(orgId: string, title: string, content: any)",
        description: "Creates the course record and uploads training materials.",
        mutations: ["db.lmsCourse.create"]
      }
    ],
    userActions: [
      {
        role: "Training Coordinator",
        permission: "admin.org.manage",
        description: "Configures learning paths and uploads media files."
      }
    ],
    integrations: ["Video Drives"]
  },
  {
    moduleId: "lms",
    stageId: "student_onboard",
    stageName: "STUDENT_ONBOARDING",
    durationLabel: "Step 02",
    barWidth: "w-[66%]",
    iconName: "Users",
    summary: "Assign onboarding courses based on designations.",
    description: "The system assigns onboarding courses based on designation, tracking completion on the employee's profile.",
    backendFunctions: [
      {
        name: "enrollStudent",
        signature: "enrollStudent(courseId: string, employeeId: string)",
        description: "Enrolls the employee and schedules course deadlines.",
        mutations: ["db.lmsEnrollment.create"]
      }
    ],
    userActions: [
      {
        role: "HR Coordinator",
        permission: "hrms.employee.create",
        description: "Enrolls employees in training paths."
      }
    ],
    integrations: ["HRMS Profiles"]
  },
  {
    moduleId: "lms",
    stageId: "assignment_sub",
    stageName: "ASSIGNMENT_SUBMISSION",
    durationLabel: "Step 03",
    barWidth: "w-full",
    iconName: "CheckCircle2",
    summary: "Graders mark assignments, updating skill matrices.",
    description: "Employees submit assignments, and managers grade work, updating the employee's skill competencies.",
    backendFunctions: [
      {
        name: "submitAssignment",
        signature: "submitAssignment(enrollmentId: string, content: string)",
        description: "Saves submissions and flags completed tasks.",
        mutations: ["db.lmsAssignment.create", "db.lmsEnrollment.update"]
      }
    ],
    userActions: [
      {
        role: "Employee / Manager Grader",
        permission: "ams.appraisal.review",
        description: "Submits assignments and registers grades."
      }
    ],
    integrations: ["Performance Appraisals"]
  },

  // ─── ACCOUNTING WORKFLOW ───
  {
    moduleId: "accounting",
    stageId: "ledger_mapping",
    stageName: "LEDGER_MAPPING",
    durationLabel: "Step 01",
    barWidth: "w-[33%]",
    iconName: "Shield",
    summary: "Configure double-entry Chart of Accounts.",
    description: "Accounts configures the Chart of Accounts, mapping accounts to support general ledger records.",
    backendFunctions: [
      {
        name: "createChartOfAccounts",
        signature: "createChartOfAccounts(orgId: string, template: any)",
        description: "Initializes accounts and configurations.",
        mutations: ["db.accountingAccount.createMany"]
      }
    ],
    userActions: [
      {
        role: "Chief Accountant",
        permission: "accounting.account.read",
        description: "Sets up company accounts and ledger rules."
      }
    ],
    integrations: ["Asset Registers"]
  },
  {
    moduleId: "accounting",
    stageId: "journal_posting",
    stageName: "JOURNAL_POSTING",
    durationLabel: "Step 02",
    barWidth: "w-[66%]",
    iconName: "GitMerge",
    summary: "Post operational journals automatically.",
    description: "Operational events (sales, payroll runs) post double-entry items, keeping ledger accounts up to date.",
    backendFunctions: [
      {
        name: "postJournalEntry",
        signature: "postJournalEntry(orgId: string, entries: any[])",
        description: "Logs balanced debit and credit entries to the general ledger.",
        mutations: ["db.journalEntry.create", "db.accountBalance.update"]
      }
    ],
    userActions: [
      {
        role: "Accountant / Manager",
        permission: "accounting.journal.read",
        description: "Reviews journal entries and posts items to the ledger."
      }
    ],
    integrations: ["CRM Invoices", "Payroll Batches"]
  },
  {
    moduleId: "accounting",
    stageId: "payment_matching",
    stageName: "PAYMENT_MATCHING",
    durationLabel: "Step 03",
    barWidth: "w-full",
    iconName: "CheckCircle2",
    summary: "Reconcile payment logs and general ledger items.",
    description: "Reconciles payments with invoice items, closing outstanding balances and updating financial statements.",
    backendFunctions: [
      {
        name: "matchInvoicesAndPayments",
        signature: "matchInvoicesAndPayments(invoiceId: string, paymentId: string)",
        description: "Matches payments with invoices, updating accounting entries.",
        mutations: ["db.crmInvoice.update", "db.paymentMatching.create"]
      }
    ],
    userActions: [
      {
        role: "Accountant",
        permission: "accounting.payment.read",
        description: "Matches payment records to invoice balances."
      }
    ],
    integrations: ["Billing Engine"]
  }
];

export const moduleInteractions: ModuleInteraction[] = [
  { fromModule: "CRM Module", toModule: "Accounting Module", description: "Approved sales invoices automatically post receivables and revenues to the general ledger." },
  { fromModule: "HRMS Module", toModule: "Attendance Module", description: "CTC rates feed directly into biometric overtime calculators." },
  { fromModule: "Attendance Module", toModule: "Accounting Module", description: "Approved monthly worktimes compile payroll journals directly for ledger posting." },
  { fromModule: "AMS Asset Module", toModule: "HRMS Module", description: "Hardware asset registers link directly to employee folders for asset tracking." },
  { fromModule: "AMS Asset Module", toModule: "Accounting Module", description: "Monthly depreciation calculations post straight-line depreciation expenses to ledger entries." }
];

export const benefits: ClientBenefit[] = [
  {
    title: "Total Margin Control",
    description: "Stops financial leaks from inaccurate manual overtime rates, unreturned client assets, and lost sales callbacks.",
    highlight: "Saves up to 12% in administrative costs."
  },
  {
    title: "Instant Decision Making",
    description: "Consolidates company data into clean dashboards, giving directors immediate visibility into operations.",
    highlight: "100% Real-time dashboard visibility."
  },
  {
    title: "Accelerated Operations",
    description: "Replaces slow manual review loops with automatic email and system notifications, speeding up approvals.",
    highlight: "Approvals approved up to 4x faster."
  },
  {
    title: "Ecosystem Integration",
    description: "Replaces multiple siloed apps (like Salesforce, HR sheets, and Trello) with a single unified operating platform.",
    highlight: "Eliminates duplicate software fees."
  }
];

export const useCases: UseCase[] = [
  {
    id: "sales",
    title: "Sales Executives",
    actor: "Sales & Client Management",
    workflowSteps: [
      "Inbound lead is imported into CRM -> assigned to executive.",
      "Executive qualifies lead -> schedules follow-up call calendar.",
      "Drafts freight quote -> submits quote for manager approval.",
      "Approved quote is emailed to client -> converted to Customer on acceptance."
    ],
    businessValue: "Prevents lost client leads and gets quotation approvals out to prospects faster."
  },
  {
    id: "hr",
    title: "HR Administrators",
    actor: "HR & Employee Relations",
    workflowSteps: [
      "Registers new hire profile in HRMS -> assigns branch structure.",
      "Assigns asset hardware to hire -> stores handover checklists.",
      "Employee punches attendance -> system processes shift and OT rates.",
      "Enables self-assessment review -> launches appraisal cycle evaluation."
    ],
    businessValue: "Centralizes HR files, automates timesheets, and coordinates performance reviews."
  },
  {
    id: "accounts",
    title: "Accounting Teams",
    actor: "Finance & Auditing",
    workflowSteps: [
      "Approved invoices and payments post entries to accounts.",
      "IT laptop depreciation is computed and posted automatically.",
      "Compiles general ledger postings -> exports dynamic trial balance.",
      "Generates profit/loss and cash-flow reports for review."
    ],
    businessValue: "Reduces manual entry errors and keeps operational data connected to finance."
  },
  {
    id: "director",
    title: "Managing Directors",
    actor: "Executive Leadership",
    workflowSteps: [
      "Monitors sales pipelines, won deals, and revenue forecasts.",
      "Reviews total employee attendance rates and overtime costs.",
      "Approves high-value purchase orders and capital expenditures.",
      "Monitors real-time cash flow and profitability statements."
    ],
    businessValue: "Gives leadership full visibility and operational control to grow the business."
  }
];

export const securityFeatures: SecurityFeature[] = [
  { title: "Granular RBAC Framework", description: "Role-Based Access Control filters views and restrict mutations based on user roles (Admin, HR Manager, Sales Agent)." },
  { title: "Data Isolation Standards", description: "Database isolation ensures branches and departments only view authorized corporate entries." },
  { title: "Approvals Hierarchy", description: "Quotes, invoices, and expense claims require multi-step approvals, preventing unauthorized operations." },
  { title: "Historical Revision Logs", description: "Audit records track salary edits, asset handovers, and status changes for compliance." }
];

export const ctaContent = {
  title: "Ready to Consolidate Your Business Operations?",
  text: "Bring your employees, CRM pipeline, attendance records, approvals, assets, and financial ledgers into one connected database platform.",
  primaryCta: "Request Technical Demo",
  secondaryCta: "Contact Solutions Architect"
};
