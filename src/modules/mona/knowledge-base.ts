// ─── Mona Static Knowledge Base ───────────────────────────────────────────────
//
// Structured knowledge about Monolith Engine, its modules, features, 
// and FAQs to enable offline support and navigation guidance.
//

export interface ModuleInfo {
  name: string;
  description: string;
  path: string;
  features: string[];
}

export interface HowToGuide {
  title: string;
  steps: string[];
  path?: string;
  keywords: string[];
}

export interface StaticFaq {
  question: string;
  answer: string;
  keywords: string[];
}

export const MONOLITH_MODULES: ModuleInfo[] = [
  {
    name: "Dashboard",
    description: "The central hub of Monolith Engine showing real-time statistics, pending task checklists, recent system notifications, your daily attendance check-in status, and shortcut tiles to other modules.",
    path: "**/dashboard**",
    features: [
      "Daily punch status (In/Out & breaks)",
      "Pending checklists and To-Do shortcuts",
      "Overview statistics and metrics",
      "System notifications feed",
    ],
  },
  {
    name: "HRMS (Human Resource Management System)",
    description: "Manages the complete employee lifecycle, onboarding checklists, work reports, travel expense approvals, and HR letters.",
    path: "**/hrms**",
    features: [
      "Employee Directory (profiles, hierarchy, and docs) at **/hrms/employees**",
      "Onboarding Checklists at **/hrms/onboarding**",
      "Daily/Weekly Work Reports at **/hrms/work-reports**",
      "Team Tasks & Checklists at **/hrms/tasks**",
      "Travel requests and Expense claims at **/hrms/travel**",
      "HR Letters generation (Offer/Appointment/Experience/Revision) at **/hrms/letters**",
      "Salary Structure & revision rules at **/hrms/salary-structure**",
      "Monthly Payroll Batch processing at **/hrms/payroll**",
      "Internal Help Desk (HR Support ticket cases) at **/hrms/helpdesk**",
      "Document Drive for company documents at **/hrms/files**",
    ],
  },
  {
    name: "Recruit (HRMS Recruitment & Careers)",
    description: "An isolated recruitment section providing Employer applicant tracking (ATS) and Job Seeker career assistance.",
    path: "**/hrms/recruit**",
    features: [
      "Employer Dashboard (requisitions, candidate pipelines) at **/hrms/recruit/employer**",
      "Manage job openings and candidates at **/hrms/recruit/employer/jobs** & **/hrms/recruit/employer/candidates**",
      "Applicant pipelines and screening scores at **/hrms/recruit/employer/applications**",
      "Job Seeker career assistant and profile at **/hrms/recruit/career** & **/hrms/recruit/career/profile**",
      "Job search & recommended listings at **/hrms/recruit/career/jobs**",
      "Tailor resumes and prepare cover letters at **/hrms/recruit/career/resumes** & **/hrms/recruit/career/assistant**",
      "Recruitment settings and audit logs at **/hrms/recruit/settings** & **/hrms/recruit/audit**",
    ],
  },
  {
    name: "Attendance & Timesheets",
    description: "Full attendance tracking, leave applications, overtime calculations, client/project timesheets, and eSSL biometric device synchronization.",
    path: "**/attendance**",
    features: [
      "Daily punch In/Out, break tracking at **/attendance/punch**",
      "Leave application & balance tracking at **/attendance/leaves**",
      "Overtime (OT) management and logs at **/attendance/ot**",
      "Timesheet logging for client projects at **/attendance/timesheets**",
      "Biometric device synchronization at **/attendance/biometric-sync**",
      "Attendance logs and analytics reporting at **/attendance/reports**",
    ],
  },
  {
    name: "AMS (Appraisal Management System)",
    description: "Evaluates and manages employee performance review cycles, department KPIs, goals (OKRs), reviewer assignments, increment slabs, and company fixed asset assignments.",
    path: "**/ams**",
    features: [
      "Performance Appraisal Cycles at **/ams/appraisals**",
      "Reviewer dashboard for team ratings at **/ams/my-reviews**",
      "Employee self-assessment forms at **/ams/my-appraisal**",
      "Performance OKR goals tracking at **/ams/pms**",
      "Department Key Performance Indicators (KPIs) at **/ams/kpi**",
      "Evaluation criteria questions configuration at **/ams/criteria**",
      "Appraisal increment slabs lookup at **/ams/slabs**",
      "Fixed Assets inventory tracking and employee assignments at **/ams/assets**",
    ],
  },
  {
    name: "CRM (Customer Relationship Management)",
    description: "Sales pipeline tracking from initial prospect to converted client. Integrates Justdial leads and tracks client support tickets, quotations, and bills.",
    path: "**/crm/dashboard**",
    features: [
      "Leads capture and conversion tracking at **/crm/leads**",
      "Contacts and Accounts directory at **/crm/contacts** & **/crm/customers**",
      "Deals Pipeline with stage and value tracking at **/crm/deals**",
      "Quotes & Invoice billing creation at **/crm/quotes**",
      "Activity logging for Tasks, Events, and Phone Calls at **/crm/tasks**",
      "Support Cases for handling customer tickets at **/crm/tickets**",
      "Product Catalog setup at **/crm/products**",
      "Justdial lead source configuration at **/crm/lead-sources**",
      "Client project tracking at **/crm/projects**",
    ],
  },
  {
    name: "CHA (Customs House Agent)",
    description: "Handles customs clearance job logging, checklists validation, and shipping operational expenditures.",
    path: "**/cha**",
    features: [
      "Customs clearance Jobs tracking at **/cha/jobs**",
      "Document checklist approvals at **/cha/approvals**",
      "Clearance operational expenses logging at **/cha/expenses**",
    ],
  },
  {
    name: "Accounting & Bookkeeping",
    description: "Full double-entry financial system containing General Ledger, Journal Entries, Trial Balance, Profit & Loss Statements, and Balance Sheet.",
    path: "**/accounting**",
    features: [
      "Chart of Accounts setup at **/accounting/accounts**",
      "Journal Entries posting at **/accounting/journal-entries**",
      "Sales & Purchase Invoice entry at **/accounting/invoices**",
      "Financial reports (Balance Sheet, Profit & Loss, Trial Balance, Ledger) at **/accounting/reports**",
    ],
  },
  {
    name: "To-Do List",
    description: "A lightweight, personal task management checklist for tracking your daily action items.",
    path: "**/todo**",
    features: [
      "Create, complete, and delete personal tasks",
      "Set task due dates and descriptions",
    ],
  },
  {
    name: "Admin Control Panel",
    description: "System administration area for managing roles, permissions, branches, departments, and user accounts.",
    path: "**/admin**",
    features: [
      "Manage organization hierarchy, departments, and branches at **/admin/org-structure**",
      "Configure roles and permission keys at **/admin/roles**",
      "Manage active user accounts and system configuration settings",
    ],
  },
];

export const HOW_TO_GUIDES: HowToGuide[] = [
  {
    title: "How to Mark Attendance (Punch In / Out)",
    steps: [
      "Navigate to the **My Attendance** page at **/attendance/punch**.",
      "Click the green **Punch In** button when you start your workday. This logs your start time.",
      "If you take a break, click the **Break** button to pause your active hours.",
      "Click the **Resume** button once you are back from break.",
      "Click the red **Punch Out** button at the end of your shift to submit your total working hours for the day.",
    ],
    path: "**/attendance/punch**",
    keywords: ["punch", "attendance", "check in", "check out", "in time", "out time", "break", "resume", "work hours", "working hours"],
  },
  {
    title: "How to Request Leave",
    steps: [
      "Navigate to the **Leaves** page at **/attendance/leaves**.",
      "Review your leave balance cards (Casual, Sick, Earned) to make sure you have enough days.",
      "Click the **Request Leave** button to open the application modal.",
      "Select the **Leave Type** from the dropdown list.",
      "Choose your **From Date** and **To Date**. Tick **Half Day** if you are applying for a half day.",
      "Enter a clear **Reason/Note** for your manager.",
      "Click **Submit Request**. Your manager will receive a notification to approve or reject the request.",
    ],
    path: "**/attendance/leaves**",
    keywords: ["apply leave", "request leave", "leave balance", "sick leave", "casual leave", "earned leave", "holiday application"],
  },
  {
    title: "How to Submit a Daily Work Report",
    steps: [
      "Navigate to the **Work Reports** page at **/hrms/work-reports**.",
      "Click the **New Work Report** button.",
      "Select the **Date** for the report (usually today's date).",
      "Fill in the description box detailing your tasks completed, achievements, or any blocks encountered.",
      "Select your manager or reviewer to submit to.",
      "Click **Submit Report** to finalize.",
    ],
    path: "**/hrms/work-reports**",
    keywords: ["work report", "daily report", "submit report", "weekly report", "report submission", "status report"],
  },
  {
    title: "How to Create a Sales Lead in CRM",
    steps: [
      "Navigate to the **Leads** page at **/crm/leads**.",
      "Click the **New Lead** button on the top right.",
      "Enter the Prospect's **First Name**, **Last Name**, and their **Company/Organization**.",
      "Enter contact info like **Email** and **Phone Number**.",
      "Specify the **Lead Source** (e.g. Website, Cold Call, Referral) and initial status.",
      "Click **Save Lead**. It will now appear in your active CRM Lead pipeline.",
    ],
    path: "**/crm/leads**",
    keywords: ["create lead", "new lead", "add lead", "crm lead", "prospect", "sales lead"],
  },
  {
    title: "How to Create and Track a CRM Deal",
    steps: [
      "Navigate to the **Deals Pipeline** page at **/crm/deals**.",
      "Click the **New Deal** button.",
      "Give the Deal a descriptive **Name** and associate it with a **Customer Account**.",
      "Specify the **Deal Amount (₹)** and select the current **Pipeline Stage** (e.g. Prospecting, Negotiation, Won, Lost).",
      "Select the **Expected Close Date**.",
      "Click **Save**. You can drag and drop deals across stages in the kanban board view to track progress.",
    ],
    path: "**/crm/deals**",
    keywords: ["create deal", "new deal", "add deal", "sales deal", "deals pipeline", "deal amount", "deal stage"],
  },
  {
    title: "How to Generate an HR Document Letter",
    steps: [
      "Navigate to the **HR Letters** page at **/hrms/letters** (requires `hrms.letters.manage` permission).",
      "Click on **Generate Letter**.",
      "Select the **Letter Template** (e.g. Offer Letter, Appointment Letter, Revision Letter, Experience Certificate).",
      "Choose the **Employee** the letter is being issued to.",
      "Fill in any template placeholders (joining date, salary elements, revision amounts).",
      "Review the preview layout on the screen.",
      "Click **Generate PDF** to save the document. It will be emailed to the employee and saved in their profile folder.",
    ],
    path: "**/hrms/letters**",
    keywords: ["generate letter", "offer letter", "appointment letter", "experience letter", "experience certificate", "hr letter", "revision letter"],
  },
  {
    title: "How to Process Monthly Payroll",
    steps: [
      "Go to **Payroll Batches** at **/hrms/payroll** (requires `hrms.payroll.manage` permission).",
      "Click **Create Payroll Batch**.",
      "Select the **Month** and **Year**.",
      "Select the target **Branch** or **Department** (or leave empty to process all active employees).",
      "Click **Process Batch** to run calculations. The system compiles worked days, overtime, unpaid leaves, deductions, and tax elements.",
      "Review the batch calculations grid. If everything is correct, click **Approve & Lock Batch** to generate pay slips.",
    ],
    path: "**/hrms/payroll**",
    keywords: ["process payroll", "run payroll", "payslip", "salary slip", "payroll batch", "salary calculation", "payout"],
  },
  {
    title: "How to Create a Job Opening in Recruit",
    steps: [
      "Go to the **Employer Recruit Workspace** at **/hrms/recruit/employer**.",
      "Navigate to **Job Openings** and click **New Job Opening** (or go to **/hrms/recruit/employer/jobs/new**).",
      "Enter the Job Title, Department, Designation, and Branch.",
      "Specify openings, compensation range, experience range, and required/preferred skills.",
      "Add screening questions and define the interview panel plan.",
      "Click **Save Draft** or **Publish** to make it active.",
    ],
    path: "**/hrms/recruit/employer/jobs/new**",
    keywords: ["create job", "new job", "publish job", "recruit job", "vacancy"],
  },
  {
    title: "How to Optimize a Resume (Job Seeker Workspace)",
    steps: [
      "Navigate to the **My Resumes** page under Career at **/hrms/recruit/career/resumes**.",
      "Upload your Base Resume in PDF or DOCX format.",
      "Under **Resume Optimizer**, select your base resume and select a target Job Opening from the list.",
      "Click **Analyze & Tailor**. The system will scan keywords, highlight matching areas, and draft suggestions.",
      "Review the suggested bullet rewrites and diff layout.",
      "Click **Generate Tailored Resume** to export your polished ATS-friendly resume.",
    ],
    path: "**/hrms/recruit/career/resumes**",
    keywords: ["optimize resume", "tailor resume", "ats resume", "resume optimizer"],
  },
  {
    title: "How to Apply for an Internal Job Opening",
    steps: [
      "Navigate to **Job Search** under Career at **/hrms/recruit/career/jobs**.",
      "Use search keywords or department filters to find matching jobs.",
      "Click on the job title to view details and match score.",
      "Click **Apply Now** to open the submission wizard.",
      "Select the resume and cover letter version you wish to submit.",
      "Review the privacy snapshot and give your explicit consent.",
      "Click **Submit Application**. It will generate an application record in the Employer Workspace.",
    ],
    path: "**/hrms/recruit/career/jobs**",
    keywords: ["apply job", "job application", "apply internal job", "submit resume", "apply recruit"],
  },
];

export const STATIC_FAQS: StaticFaq[] = [
  {
    question: "Who is Mona?",
    answer: "I am **Mona**, your dedicated Monolith Companion! I am an AI assistant designed to help employees of **Adarsh Shipping & Services** navigate the Monolith Engine platform, check tasks, inspect attendance, track CRM pipelines, and answer general operational questions.",
    keywords: ["who are you", "who is mona", "your name", "what is mona", "introduce yourself", "about mona"],
  },
  {
    question: "What is Offline Support Mode?",
    answer: "Offline Support Mode is active when connection to the primary Google Gemini AI is restricted or API quota is exhausted. In this mode, I run locally on the server. I cannot answer queries outside the platform (like general programming or general knowledge) but I can **retrieve your live workspace data** (your tasks, attendance, leaves, profile) and **answer platform-specific guide questions**.",
    keywords: ["offline", "quota exhausted", "429", "fallback", "offline mode", "local mode", "not working", "api key"],
  },
  {
    question: "What are the available keyboard shortcuts in Monolith?",
    answer: "You can toggle the Mona chat panel open or closed at any time by pressing **Ctrl + M** on your keyboard. For writing text inside the chat input, press **Enter** to send your message, and **Shift + Enter** if you want to insert a new line.",
    keywords: ["keyboard", "shortcuts", "shortcut", "ctrl+m", "hotkey", "toggle chat", "quick open"],
  },
];
