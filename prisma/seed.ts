import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import * as path from "path";
import * as XLSX from "xlsx";
import { buildSeedCriteriaForPhase } from "../src/modules/ams/form-template";
import { buildDefaultSelfFormTemplate } from "../src/modules/ams/criteria-config";
import { seedChartOfAccounts } from "../src/modules/accounting/service";
import { getBundledDocxTemplateFiles, importDocxTemplateFile } from "../src/modules/hrms/letter-template-import";
import { ensureSpecialAccounts } from "../src/modules/core/user/special-account-bootstrap";
import { ensureDefaultDocumentRequirements } from "../src/modules/cha/service";


// ─── Database client ────────────────────────────────────────────────────────────

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

// ─── Constants ──────────────────────────────────────────────────────────────────

const DEFAULT_PASSWORD = "password@123";

const ORG = {
  name: "Adarsh Shipping & Services",
  slug: "adarsh-shipping",
} as const;

// ─── Permission catalogue ───────────────────────────────────────────────────────

const PERMISSIONS = [
  // Core / Admin
  { key: "admin.org.manage", label: "Manage organisation settings", group: "Admin" },
  { key: "admin.users.manage", label: "Manage all users", group: "Admin" },
  { key: "admin.roles.manage", label: "Manage roles & permissions", group: "Admin" },
  { key: "admin.modules.manage", label: "Enable/disable modules", group: "Admin" },

  // HRMS
  { key: "hrms.employee.read", label: "View employee list & profiles", group: "HRMS" },
  { key: "hrms.employee.create", label: "Onboard new employees", group: "HRMS" },
  { key: "hrms.employee.edit", label: "Edit employee details", group: "HRMS" },
  { key: "hrms.employee.deactivate", label: "Deactivate employees", group: "HRMS" },
  { key: "hrms.hierarchy.manage", label: "Assign managers & TLs", group: "HRMS" },
  { key: "hrms.documents.read", label: "View employee documents", group: "HRMS" },
  { key: "hrms.documents.upload", label: "Upload employee documents", group: "HRMS" },
  { key: "hrms.org_structure.manage", label: "Manage branches, departments, divisions", group: "HRMS" },
  { key: "hrms.peopleplus.read", label: "Access PeoplePlus portal", group: "HRMS" },
  { key: "hrms.peopleplus.admin", label: "Administer PeoplePlus features", group: "HRMS" },
  { key: "hrms.helpdesk.read", label: "View HR helpdesk cases", group: "HRMS" },
  { key: "hrms.helpdesk.manage", label: "Manage all HR helpdesk cases", group: "HRMS" },
  { key: "hrms.workreport.submit", label: "Submit own work reports", group: "HRMS" },
  { key: "hrms.workreport.approve", label: "Approve/reject team work reports", group: "HRMS" },
  { key: "hrms.workreport.view_all", label: "View all work reports in org", group: "HRMS" },
  { key: "hrms.tasks.manage", label: "Create & manage HRMS task checklists", group: "HRMS" },
  { key: "hrms.approvals.manage", label: "Approve requests in Approvals Central", group: "HRMS" },
  { key: "hrms.travel.request", label: "Submit own travel & expense requests", group: "HRMS" },
  { key: "hrms.travel.approve", label: "Approve team travel & expense requests", group: "HRMS" },
  { key: "hrms.letters.manage", label: "Request & manage HR letters", group: "HRMS" },
  { key: "hrms.onboarding.manage", label: "Manage onboarding checklists", group: "HRMS" },
  { key: "hrms.salary.read", label: "View employee salary structures", group: "HRMS" },
  { key: "hrms.salary.manage", label: "Edit employee salary structures", group: "HRMS" },
  { key: "hrms.timetracker.self", label: "Log own time entries", group: "HRMS" },

  // Attendance
  { key: "attendance.punch.self", label: "Record own attendance", group: "Attendance" },
  { key: "attendance.punch.manage", label: "Edit/add attendance for others", group: "Attendance" },
  { key: "attendance.leave.request", label: "Submit own leave requests", group: "Attendance" },
  { key: "attendance.leave.approve", label: "Approve/reject leave requests", group: "Attendance" },
  { key: "attendance.leave.manage", label: "Manage leave types & balances", group: "Attendance" },
  { key: "attendance.ot.request", label: "Submit own OT entries", group: "Attendance" },
  { key: "attendance.ot.approve", label: "Approve/reject OT entries", group: "Attendance" },
  { key: "attendance.holidays.manage", label: "Manage holiday calendar", group: "Attendance" },
  { key: "attendance.reports.view", label: "View attendance reports", group: "Attendance" },
  { key: "attendance.timesheet.view", label: "View timesheets", group: "Attendance" },
  { key: "attendance.timesheet.manage", label: "Manage & approve timesheets", group: "Attendance" },

  // LMS
  { key: "lms.access", label: "Access LMS module", group: "LMS" },
  { key: "lms.learning.self", label: "Enrol in & track own courses", group: "LMS" },
  { key: "lms.course.manage", label: "Create & manage LMS courses", group: "LMS" },
  { key: "lms.assignment.manage", label: "Manage course assignments", group: "LMS" },
  { key: "lms.reports.view", label: "View LMS reports", group: "LMS" },

  // AMS
  { key: "ams.cycle.manage", label: "Create & manage appraisal cycles", group: "AMS" },
  { key: "ams.criteria.manage", label: "Manage appraisal criteria", group: "AMS" },
  { key: "ams.appraisal.assign_reviewers", label: "Assign reviewers for appraisals", group: "AMS" },
  { key: "ams.appraisal.force_reviewer", label: "Force unavailable reviewer to attend", group: "AMS" },
  { key: "ams.appraisal.self_assess", label: "Submit own self-assessment", group: "AMS" },
  { key: "ams.appraisal.review", label: "Submit reviewer rating (HR/TL/Manager)", group: "AMS" },
  { key: "ams.appraisal.management_review", label: "Submit management review", group: "AMS" },
  { key: "ams.meeting.confirm", label: "Confirm appraisal meeting date (HR)", group: "AMS" },
  { key: "ams.meeting.minutes", label: "Record meeting minutes", group: "AMS" },
  { key: "ams.hike.finalise", label: "Finalise hike decision", group: "AMS" },
  { key: "ams.appraisal.view_all", label: "View all appraisals in org", group: "AMS" },

  // CRM
  { key: "crm.access", label: "Access CRM module", group: "CRM" },
  { key: "crm.dashboard.read", label: "View CRM dashboard", group: "CRM" },
  { key: "crm.lead.read", label: "View CRM leads", group: "CRM" },
  { key: "crm.lead.create", label: "Create CRM leads", group: "CRM" },
  { key: "crm.lead.convert", label: "Convert CRM leads", group: "CRM" },
  { key: "crm.lead.delete", label: "Delete CRM leads", group: "CRM" },
  { key: "crm.contact.manage", label: "Manage CRM contacts", group: "CRM" },
  { key: "crm.account.manage", label: "Manage CRM accounts", group: "CRM" },
  { key: "crm.deal.manage", label: "Manage CRM deals & kanban", group: "CRM" },
  { key: "crm.invoice.manage", label: "Manage quotes & invoices", group: "CRM" },
  { key: "crm.vendor.manage", label: "Manage procurement vendors", group: "CRM" },
  { key: "crm.project.manage", label: "Manage operational projects", group: "CRM" },
  { key: "crm.activity.manage", label: "Manage CRM activities", group: "CRM" },
  { key: "crm.settings.manage", label: "Manage CRM settings", group: "CRM" },
  { key: "crm.leadSource.read", label: "View lead sources & settings", group: "CRM" },
  { key: "crm.leadSource.manage", label: "Manage lead sources config", group: "CRM" },
  { key: "crm.lead.import", label: "Run manual lead imports", group: "CRM" },

  // Accounting
  { key: "accounting.dashboard.view", label: "View accounting dashboard", group: "Accounting" },
  { key: "accounting.account.read", label: "View Chart of Accounts", group: "Accounting" },
  { key: "accounting.account.create", label: "Create ledger accounts", group: "Accounting" },
  { key: "accounting.account.update", label: "Update ledger accounts", group: "Accounting" },
  { key: "accounting.journal.read", label: "View Journal Entries", group: "Accounting" },
  { key: "accounting.journal.create", label: "Create Journal Entries", group: "Accounting" },
  { key: "accounting.journal.submit", label: "Submit Journal Entries", group: "Accounting" },
  { key: "accounting.journal.cancel", label: "Cancel Journal Entries", group: "Accounting" },
  { key: "accounting.invoice.read", label: "View Sales & Purchase Invoices", group: "Accounting" },
  { key: "accounting.invoice.create", label: "Create Invoices", group: "Accounting" },
  { key: "accounting.invoice.update", label: "Update Invoices", group: "Accounting" },
  { key: "accounting.invoice.submit", label: "Submit/Post Invoices", group: "Accounting" },
  { key: "accounting.invoice.cancel", label: "Cancel/Reverse Invoices", group: "Accounting" },
  { key: "accounting.payment.read", label: "View Payments", group: "Accounting" },
  { key: "accounting.payment.create", label: "Create Payments", group: "Accounting" },
  { key: "accounting.payment.submit", label: "Submit Payments", group: "Accounting" },
  { key: "accounting.reports.view", label: "View Financial Reports", group: "Accounting" },
  { key: "accounting.settings.manage", label: "Manage Accounting Settings", group: "Accounting" },

  // CHA Module
  { key: "cha.access", label: "Access CHA Module", group: "CHA" },
  { key: "cha.dashboard.view", label: "View CHA Dashboard", group: "CHA" },
  { key: "cha.job.read", label: "Read CHA Jobs", group: "CHA" },
  { key: "cha.job.create", label: "Create CHA Jobs", group: "CHA" },
  { key: "cha.job.update", label: "Update CHA Jobs", group: "CHA" },
  { key: "cha.job.assign", label: "Assign CHA Jobs", group: "CHA" },
  { key: "cha.job.delete", label: "Request/Delete CHA Jobs", group: "CHA" },
  { key: "cha.job.delete.approve", label: "Approve/Delete Assigned CHA Jobs", group: "CHA" },
  { key: "cha.job.view_all", label: "View All Organisation Jobs", group: "CHA" },
  { key: "cha.document.read", label: "Read Job Documents", group: "CHA" },
  { key: "cha.document.upload", label: "Upload Job Documents", group: "CHA" },
  { key: "cha.document.exception", label: "Declare Document Exception", group: "CHA" },
  { key: "cha.additional_data.view", label: "View CHA Additional Data", group: "CHA" },
  { key: "cha.additional_data.edit", label: "Edit CHA Additional Data", group: "CHA" },
  { key: "cha.additional_data.proceed", label: "Proceed CHA Additional Data", group: "CHA" },
  { key: "cha.do_validity.view_indicator", label: "View DO Validity Expiry Indicator", group: "CHA" },
  { key: "cha.checklist.prepare", label: "Prepare Checklist", group: "CHA" },
  { key: "cha.checklist.submit", label: "Submit Checklist", group: "CHA" },
  { key: "cha.checklist.self_approve", label: "Self-Approve Checklist", group: "CHA" },
  { key: "cha.checklist.manager_approve", label: "Approve/Rework Checklists", group: "CHA" },
  { key: "cha.filing.manage", label: "Manage Filing Stage", group: "CHA" },
  { key: "cha.advance.manage", label: "Manage Customer Advances", group: "CHA" },
  { key: "cha.expense.request", label: "Request Job Expenses", group: "CHA" },
  { key: "cha.expense.manage", label: "Manage/Review Job Expenses", group: "CHA" },
  { key: "cha.expense.pay", label: "Post Expense Payments", group: "CHA" },
  { key: "cha.audit.view", label: "View Job Audit Trail", group: "CHA" },
  { key: "cha.customer.read", label: "View CHA Customers", group: "CHA" },
  { key: "cha.customer.manage", label: "Create and edit CHA Customers", group: "CHA" },
  { key: "cha.settings.manage", label: "Manage CHA Settings", group: "CHA" },
  // HR Letters & Contracts
  { key: "hrms.letters.view_all", label: "View all organisation letters", group: "HRMS" },
  { key: "hrms.letters.legal_review", label: "Review letters from legal perspective", group: "HRMS" },
  { key: "hrms.letters.mgmt_approve", label: "Approve letters for issuance", group: "HRMS" },
  { key: "hrms.letters.audit", label: "Audit all letters and changes", group: "HRMS" },
  { key: "hrms.letters.settings", label: "Configure letter templates and rules", group: "HRMS" },

  // Recruit Module
  { key: "recruit.view", label: "Access Recruit module", group: "Recruit" },
  { key: "recruit.dashboard.view", label: "View Recruit employer dashboard", group: "Recruit" },
  { key: "recruit.job.create", label: "Create job requisitions", group: "Recruit" },
  { key: "recruit.job.edit", label: "Edit job openings", group: "Recruit" },
  { key: "recruit.job.publish", label: "Publish/unpause job openings", group: "Recruit" },
  { key: "recruit.job.close", label: "Close/archive job openings", group: "Recruit" },
  { key: "recruit.candidate.view", label: "View candidates", group: "Recruit" },
  { key: "recruit.candidate.create", label: "Create candidates", group: "Recruit" },
  { key: "recruit.candidate.edit", label: "Edit candidate records", group: "Recruit" },
  { key: "recruit.candidate.delete", label: "Delete/anonymize candidates", group: "Recruit" },
  { key: "recruit.resume.view", label: "View candidate resumes", group: "Recruit" },
  { key: "recruit.resume.download", label: "Download candidate resumes", group: "Recruit" },
  { key: "recruit.application.manage", label: "Manage applications and stage transitions", group: "Recruit" },
  { key: "recruit.screening.run", label: "Run AI screening on applications", group: "Recruit" },
  { key: "recruit.interview.manage", label: "Schedule and manage interviews", group: "Recruit" },
  { key: "recruit.assessment.manage", label: "Create and manage assessments", group: "Recruit" },
  { key: "recruit.feedback.submit", label: "Submit interview feedback", group: "Recruit" },
  { key: "recruit.offer.create", label: "Create draft offers", group: "Recruit" },
  { key: "recruit.offer.approve", label: "Approve offers", group: "Recruit" },
  { key: "recruit.offer.send", label: "Send offers to candidates", group: "Recruit" },
  { key: "recruit.report.view", label: "View Recruit reports", group: "Recruit" },
  { key: "recruit.settings.manage", label: "Manage Recruit settings", group: "Recruit" },
  { key: "recruit.audit.view", label: "View Recruit audit log", group: "Recruit" },
  { key: "recruit.jobseeker.use", label: "Access Job Seeker Workspace", group: "Recruit" },
  { key: "recruit.jobseeker.profile.manage", label: "Manage own career profile", group: "Recruit" },
  { key: "recruit.jobseeker.jobs.search", label: "Search and browse jobs", group: "Recruit" },
  { key: "recruit.jobseeker.resume.manage", label: "Manage own resumes and tailored versions", group: "Recruit" },
  { key: "recruit.jobseeker.application.manage", label: "Track own job applications", group: "Recruit" },
  { key: "recruit.jobseeker.automation.manage", label: "Run own job search automations", group: "Recruit" },
  { key: "recruit.jobseeker.artifact.share", label: "Share own career artifacts via link", group: "Recruit" },
] as const;

// ─── System roles & their default permissions ──────────────────────────────────

const SYSTEM_ROLES: Record<string, string[]> = {
  Admin: PERMISSIONS.map((p) => p.key), // full access
  Management: [
    "hrms.employee.read", "hrms.documents.read",
    "hrms.peopleplus.read",
    "hrms.helpdesk.read", "hrms.workreport.view_all", "hrms.salary.read", "hrms.approvals.manage",
    "attendance.reports.view", "attendance.timesheet.view",
    "ams.appraisal.management_review", "ams.meeting.minutes",
    "ams.hike.finalise", "ams.appraisal.view_all",
    "crm.access", "crm.dashboard.read", "crm.lead.read",
    "crm.contact.manage", "crm.account.manage", "crm.deal.manage", "crm.invoice.manage",
    "crm.leadSource.read", "crm.lead.import",
    "lms.access", "lms.reports.view",
    "accounting.dashboard.view", "accounting.account.read", "accounting.journal.read",
    "accounting.invoice.read", "accounting.payment.read", "accounting.reports.view",
    "communication.mail.access", "communication.mail.send",
    "communication.chat.access", "communication.calendar.access",
    "communication.files.access", "communication.docs.access",
    "communication.forms.access", "communication.forms.create",
    "communication.admin.manage",
    "cha.access", "cha.dashboard.view", "cha.job.read", "cha.job.delete", "cha.job.delete.approve", "cha.job.view_all", "cha.document.read",
    "cha.additional_data.view", "cha.additional_data.edit", "cha.additional_data.proceed", "cha.do_validity.view_indicator",
    "cha.checklist.manager_approve", "cha.filing.manage", "cha.advance.manage", "cha.expense.manage",
    "cha.expense.pay", "cha.audit.view", "cha.customer.read", "cha.customer.manage",
    // HR Letters
    "hrms.letters.view_all", "hrms.letters.mgmt_approve",
  ],
  HR: [
    "hrms.employee.read", "hrms.employee.create", "hrms.employee.edit",
    "hrms.hierarchy.manage", "hrms.documents.read", "hrms.documents.upload",
    "hrms.settings.manage",
    "hrms.peopleplus.read", "hrms.peopleplus.admin",
    "hrms.helpdesk.read", "hrms.helpdesk.manage",
    "hrms.workreport.submit", "hrms.workreport.approve", "hrms.workreport.view_all",
    "hrms.tasks.manage", "hrms.approvals.manage",
    "hrms.travel.request", "hrms.travel.approve",
    "hrms.letters.manage", "hrms.letters.view_all", "hrms.letters.settings",
    "hrms.onboarding.manage",
    "hrms.salary.read", "hrms.salary.manage",
    "hrms.timetracker.self",
    "attendance.punch.manage", "attendance.leave.approve", "attendance.leave.manage",
    "attendance.ot.approve", "attendance.holidays.manage", "attendance.reports.view",
    "attendance.timesheet.manage",
    "ams.appraisal.assign_reviewers", "ams.appraisal.force_reviewer",
    "ams.appraisal.review", "ams.meeting.confirm", "ams.meeting.minutes",
    "ams.appraisal.view_all",
    "crm.access", "crm.dashboard.read", "crm.lead.read", "crm.lead.create",
    "crm.lead.convert", "crm.contact.manage", "crm.account.manage",
    "crm.deal.manage", "crm.activity.manage", "crm.project.manage",
    "crm.leadSource.read", "crm.leadSource.manage", "crm.lead.import",
    "lms.access", "lms.course.manage", "lms.assignment.manage", "lms.reports.view",
    "communication.mail.access", "communication.mail.send",
    "communication.chat.access", "communication.chat.moderator",
    "communication.calendar.access", "communication.calendar.manage_resources",
    "communication.files.access", "communication.docs.access",
    "communication.forms.access", "communication.forms.create",
    // Recruit employer access
    "recruit.view", "recruit.dashboard.view",
    "recruit.job.create", "recruit.job.edit", "recruit.job.publish", "recruit.job.close",
    "recruit.candidate.view", "recruit.candidate.create", "recruit.candidate.edit", "recruit.candidate.delete",
    "recruit.resume.view", "recruit.resume.download",
    "recruit.application.manage", "recruit.screening.run",
    "recruit.interview.manage", "recruit.assessment.manage", "recruit.feedback.submit",
    "recruit.offer.create", "recruit.offer.approve", "recruit.offer.send",
    "recruit.report.view", "recruit.settings.manage", "recruit.audit.view",
    // Job seeker access (HR staff can also use as employees)
    "recruit.jobseeker.use", "recruit.jobseeker.profile.manage", "recruit.jobseeker.jobs.search",
    "recruit.jobseeker.resume.manage", "recruit.jobseeker.application.manage",
    "recruit.jobseeker.automation.manage", "recruit.jobseeker.artifact.share",
    "cha.customer.read", "cha.customer.manage",
  ],
  Manager: [
    "hrms.employee.read", "hrms.documents.read",
    "hrms.peopleplus.read",
    "hrms.helpdesk.read", "hrms.workreport.approve", "hrms.travel.approve",
    "attendance.leave.approve", "attendance.ot.approve", "attendance.reports.view",
    "attendance.timesheet.view",
    "ams.appraisal.review", "ams.meeting.minutes",
    "crm.access", "crm.dashboard.read", "crm.lead.read", "crm.lead.create",
    "crm.contact.manage", "crm.account.manage", "crm.deal.manage", "crm.activity.manage",
    "lms.access", "lms.learning.self",
    "communication.mail.access", "communication.mail.send",
    "communication.chat.access", "communication.calendar.access",
    "communication.files.access", "communication.docs.access",
    "communication.forms.access", "communication.forms.create",
    "cha.access", "cha.dashboard.view", "cha.job.read", "cha.job.delete", "cha.job.delete.approve", "cha.document.read",
    "cha.additional_data.view", "cha.additional_data.proceed", "cha.do_validity.view_indicator", "cha.checklist.manager_approve",
    "cha.expense.manage", "cha.audit.view", "cha.customer.read", "cha.customer.manage",
    // Recruit: hiring manager role + job seeker
    "recruit.view", "recruit.candidate.view", "recruit.resume.view",
    "recruit.application.manage", "recruit.interview.manage", "recruit.feedback.submit",
    "recruit.offer.approve", "recruit.report.view",
    "recruit.jobseeker.use", "recruit.jobseeker.profile.manage", "recruit.jobseeker.jobs.search",
    "recruit.jobseeker.resume.manage", "recruit.jobseeker.application.manage",
    "recruit.jobseeker.automation.manage", "recruit.jobseeker.artifact.share",
  ],
  TL: [
    "hrms.employee.read",
    "hrms.peopleplus.read",
    "hrms.helpdesk.read", "hrms.workreport.approve", "hrms.travel.approve",
    "attendance.leave.approve", "attendance.ot.approve", "attendance.timesheet.view",
    "ams.appraisal.review", "ams.meeting.minutes",
    "crm.access", "crm.dashboard.read", "crm.lead.read",
    "crm.contact.manage", "crm.account.manage", "crm.activity.manage",
    "lms.access", "lms.learning.self",
    // Recruit: job seeker only
    "recruit.jobseeker.use", "recruit.jobseeker.profile.manage", "recruit.jobseeker.jobs.search",
    "recruit.jobseeker.resume.manage", "recruit.jobseeker.application.manage",
    "recruit.jobseeker.automation.manage", "recruit.jobseeker.artifact.share",
  ],
  Director: [
    "hrms.employee.read", "hrms.documents.read",
    "hrms.peopleplus.read",
    "hrms.helpdesk.read", "hrms.workreport.view_all", "hrms.salary.read", "hrms.approvals.manage",
    "attendance.reports.view", "attendance.timesheet.view",
    "ams.appraisal.management_review", "ams.meeting.minutes",
    "ams.hike.finalise", "ams.appraisal.view_all",
    "crm.access", "crm.dashboard.read", "crm.lead.read",
    "crm.contact.manage", "crm.account.manage", "crm.deal.manage", "crm.invoice.manage",
    "crm.leadSource.read", "crm.leadSource.manage", "crm.lead.import",
    "lms.access", "lms.reports.view",
    "communication.mail.access", "communication.mail.send",
    "communication.chat.access", "communication.calendar.access",
    "communication.files.access", "communication.docs.access",
    "communication.forms.access", "communication.admin.manage",
    "cha.access", "cha.dashboard.view", "cha.job.read", "cha.job.delete", "cha.job.delete.approve", "cha.job.view_all", "cha.document.read",
    "cha.additional_data.view", "cha.additional_data.edit", "cha.additional_data.proceed", "cha.do_validity.view_indicator",
    "cha.checklist.manager_approve", "cha.filing.manage", "cha.advance.manage", "cha.expense.manage",
    "cha.expense.pay", "cha.audit.view", "cha.customer.read", "cha.customer.manage",
    // HR Letters
    "hrms.letters.view_all", "hrms.letters.mgmt_approve",
  ],
  Employee: [
    "hrms.employee.read",
    "hrms.peopleplus.read",
    "hrms.helpdesk.read", "hrms.workreport.submit", "hrms.travel.request",
    "hrms.letters.manage", "hrms.timetracker.self",
    "attendance.punch.self", "attendance.leave.request", "attendance.ot.request",
    "attendance.timesheet.view",
    "ams.appraisal.self_assess", "ams.meeting.minutes",
    "crm.access", "crm.activity.manage",
    "lms.access", "lms.learning.self",
    "communication.mail.access", "communication.mail.send",
    "communication.chat.access", "communication.calendar.access",
    "communication.files.access", "communication.docs.access",
    "communication.forms.access",
    "cha.access", "cha.dashboard.view", "cha.job.read", "cha.job.create", "cha.job.update", "cha.job.delete",
    "cha.document.read", "cha.document.upload", "cha.document.exception",
    "cha.additional_data.view", "cha.additional_data.edit", "cha.additional_data.proceed", "cha.do_validity.view_indicator", "cha.checklist.prepare",
    "cha.checklist.submit", "cha.checklist.self_approve", "cha.filing.manage", "cha.expense.request",
    "cha.audit.view", "cha.customer.read", "cha.customer.manage",
    // Recruit: job seeker workspace only
    "recruit.jobseeker.use", "recruit.jobseeker.profile.manage", "recruit.jobseeker.jobs.search",
    "recruit.jobseeker.resume.manage", "recruit.jobseeker.application.manage",
    "recruit.jobseeker.automation.manage", "recruit.jobseeker.artifact.share",
  ],
  Legal: [
    "hrms.letters.view_all",
    "hrms.letters.legal_review",
  ],
  Auditor: [
    "hrms.letters.view_all",
    "hrms.letters.audit",
  ],
};

// ─── Excel Parsing Helpers ──────────────────────────────────────────────────────

type Row = Record<string, unknown>;

function asString(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function asNullableString(value: unknown): string | null {
  const normalized = asString(value);
  return normalized ? normalized : null;
}

function asNumber(value: unknown): number | null {
  if (value == null) return null;
  const raw = asString(value).replace(/,/g, "");
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function asBoolean(value: unknown): boolean | null {
  const normalized = asString(value).toLowerCase();
  if (!normalized) return null;
  if (["yes", "enabled", "active", "true"].includes(normalized)) return true;
  if (["no", "disabled", "exited", "terminated", "false"].includes(normalized)) return false;
  return null;
}

function parseDate(value: unknown): Date | null {
  const raw = asString(value);
  if (!raw) return null;

  const ddmmyyyy = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (ddmmyyyy) {
    const [, dd, mm, yyyy] = ddmmyyyy;
    return new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
  }

  const yyyyMm = raw.match(/^(\d{4})-(\d{2})$/);
  if (yyyyMm) {
    const [, yyyy, mm] = yyyyMm;
    return new Date(Date.UTC(Number(yyyy), Number(mm) - 1, 1));
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildFullName(row: Row): string {
  const parts = [
    asString(row["First Name"]),
    asString(row["Middle Name"]),
    asString(row["Last Name"]),
  ].filter(Boolean);
  return titleCase(parts.join(" "));
}

function normalizeOrganisationAssignment(rawDepartmentName: string) {
  const departmentName = rawDepartmentName.trim();

  const exactMappings = new Map<string, { departmentName: string; divisionName: string | null }>([
    ["Accounts Payable", { departmentName: "Accounts", divisionName: "Payable" }],
    ["Accounts Receivable", { departmentName: "Accounts", divisionName: "Receivable" }],
    ["Custom Broker Documentation", { departmentName: "Custom broker", divisionName: "Documentation" }],
    ["Custom Broker Operations", { departmentName: "Custom broker", divisionName: "Operations" }],
    ["Customs Broker Delivery Order", { departmentName: "Custom broker", divisionName: "Delivery Order" }],
    ["Customer Support", { departmentName: "Freight Forwarding", divisionName: "Customer Support" }],
    ["Delivery Order Documentation", { departmentName: "Delivery Order", divisionName: "Documentation" }],
    ["Delivery Order Operations", { departmentName: "Delivery Order", divisionName: "Operations" }],
    ["Freight Forwarding Business Development", { departmentName: "Freight Forwarding", divisionName: "Business Development" }],
    ["Freight Forwarding Customer Support", { departmentName: "Freight Forwarding", divisionName: "Customer Support" }],
    ["Freight Forwarding Sales", { departmentName: "Freight Forwarding", divisionName: "Sales" }],
    ["Human Resource Operation", { departmentName: "Human Resource", divisionName: "Operation" }],
    ["Head of Accounts", { departmentName: "Accounts", divisionName: null }],
    ["Head of Custom Broker's", { departmentName: "Custom broker", divisionName: null }],
    ["Head of Freight Forwarding", { departmentName: "Freight Forwarding", divisionName: null }],
    ["Head of HR", { departmentName: "Human Resource", divisionName: null }],
  ]);

  return exactMappings.get(departmentName) ?? { departmentName, divisionName: null };
}

function makeCode(input: string, fallbackPrefix: string, usedCodes: Set<string>): string {
  const base = input
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 20) || fallbackPrefix;

  let code = base;
  let index = 2;
  while (usedCodes.has(code)) {
    code = `${base.slice(0, Math.max(1, 20 - String(index).length))}${index}`;
    index += 1;
  }
  usedCodes.add(code);
  return code;
}

function readSheet(workbook: XLSX.WorkBook, sheetName: string): Row[] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<Row>(sheet, { defval: null, raw: false });
}

const MANUAL_MATCHES: Record<string, string> = {
  "admin@adarshshipping.in": "133",
  "amirthavarshini@adarshshipping.in": "130",
  "arun.kumar@adarshshipping.in": "128",
  "bala.m@adarshshipping.in": "162",
  "goswami.kolkata@adarshshipping.in": "106",
  "hariharan@adarshshipping.in": "174",
  "ravi.mumbai@adarshshipping.in": "125",
  "sathya.m@adarshshipping.in": "108",
  "shalini.k@adarshshipping.in": "160",
  "sriram@adarshshipping.in": "186",
  "sujatha.kolkata@adarshshipping.in": "105",
};

const normalizeName = (s: string) => String(s || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");

function matchLoginEmail(
  dashRow: Row,
  mailRows: Row[]
): string | null {
  const empId = String(dashRow['Employee ID']);
  
  // 1. Manual override
  for (const [mailEmail, manualId] of Object.entries(MANUAL_MATCHES)) {
    if (manualId === empId) {
      return mailEmail.toLowerCase();
    }
  }

  // 2. Email exact match
  const dashEmail = String(dashRow['Email address'] || "").trim().toLowerCase();
  const dashPersonal = String(dashRow['Personal Email Address'] || "").trim().toLowerCase();
  
  const emailMatch = mailRows.find(mr => {
    const mrEmail = String(mr['Email Address [Required]'] || "").trim().toLowerCase();
    return mrEmail === dashEmail || mrEmail === dashPersonal;
  });
  if (emailMatch) {
    return String(emailMatch['Email Address [Required]']).toLowerCase();
  }

  // 3. Name match
  const dashFull = normalizeName(String(dashRow['First Name'] || "") + " " + String(dashRow['Last Name'] || ""));
  const nameMatch = mailRows.find(mr => {
    const mrFirst = normalizeName(String(mr['First Name [Required]'] || ""));
    const mrLast = normalizeName(String(mr['Last Name [Required]'] || ""));
    const mrFull = normalizeName(String(mr['First Name [Required]'] || "") + " " + String(mr['Last Name [Required]'] || ""));
    
    return mrFull === dashFull ||
           (mrFirst === normalizeName(String(dashRow['First Name'] || "")) && mrLast === normalizeName(String(dashRow['Last Name'] || ""))) ||
           (mrFirst === normalizeName(String(dashRow['First Name'] || "")) && mrLast.startsWith(normalizeName(String(dashRow['Last Name'] || "")))) ||
           (normalizeName(String(dashRow['First Name'] || "")) === mrFirst && normalizeName(String(dashRow['Last Name'] || "")).startsWith(mrLast));
  });
  
  if (nameMatch) {
    return String(nameMatch['Email Address [Required]']).toLowerCase();
  }

  return null;
}

const ROLE_OVERRIDES_BY_EMPLOYEE_NUMBER: Record<string, string> = {
  "101": "Director",
  "122": "Director",
  "107": "TL",
  "187": "Manager",
  "189": "Management",
  "146": "Management",
  "183": "Employee",
};

const SEEDED_PRIMARY_ROLE_NAMES = [
  "Admin",
  "Management",
  "HR",
  "Manager",
  "TL",
  "Director",
  "Employee",
] as const;

function getRoleForUser(
  employeeNumber: string,
  email: string,
  departmentName: string,
  designation: string,
): string {
  const override = ROLE_OVERRIDES_BY_EMPLOYEE_NUMBER[employeeNumber];
  if (override) return override;

  const emailLower = email.toLowerCase();
  const deptLower = departmentName.toLowerCase();
  const desgLower = designation.toLowerCase();

  if (emailLower === "hr@adarshshipping.in") {
    return "Admin";
  }
  if (deptLower.includes("human resource") || desgLower.includes("hr")) {
    return "HR";
  }
  if (desgLower.includes("manager") || desgLower.includes("assistant manager")) {
    return "Manager";
  }
  if (desgLower.includes("team leader")) {
    return "TL";
  }
  if (
    desgLower.includes("management") ||
    deptLower.includes("management") ||
    deptLower.includes("directors") ||
    desgLower.includes("consultant")
  ) {
    return "Director";
  }
  return "Employee";
}


// ─── Leave types ────────────────────────────────────────────────────────────────

const LEAVE_TYPES = [
  { name: "Casual Leave", paid: true, defaultBalance: 12 },
  { name: "Sick Leave", paid: true, defaultBalance: 12 },
  { name: "Earned Leave", paid: true, defaultBalance: 15 },
  { name: "Maternity Leave", paid: true, defaultBalance: 0 },
  { name: "Paternity Leave", paid: true, defaultBalance: 0 },
  { name: "Loss of Pay", paid: false, defaultBalance: 0 },
] as const;

// ─── CRM customers ─────────────────────────────────────────────────────────────

const CRM_CUSTOMERS = [
  {
    name: "Adarsh Cargo Ltd",
    companyName: "Adarsh Cargo Ltd",
    email: "logistics@adarshcargo.com",
    phone: "+91 44 4211 3344",
    website: "https://www.adarshcargo.com",
    industry: "Logistics & Maritime Freight",
  },
  {
    name: "Madras Steel Works",
    companyName: "Madras Steel Works",
    email: "procurement@madrassteel.in",
    phone: "+91 44 2622 5566",
    website: "https://www.madrassteel.in",
    industry: "Manufacturing & Metallurgy",
  },
  {
    name: "Apex Auto Spares",
    companyName: "Apex Auto Spares",
    email: "import@apexautospares.com",
    phone: "+91 22 2844 7788",
    website: "https://www.apexautospares.com",
    industry: "Automotive Components",
  },
  {
    name: "Triton Chemical Group",
    companyName: "Triton Chemical Group",
    email: "imports@tritonchems.com",
    phone: "+91 33 2455 9900",
    website: "https://www.tritonchems.com",
    industry: "Chemicals & Plastics",
  },
] as const;

// ─────────────────────────────────────────────────────────────────────────────────
// SEED FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function clearApplicationData() {
  console.log("Clearing application data...");

  // Order matters: FK dependencies, children before parents.
  // Use $executeRawUnsafe for TRUNCATE CASCADE to safely handle all FK chains.
  const tablesToTruncate = [
    // CHA
    "ChaExpenseQuery", "ChaExpensePayment", "ChaExpenseRequest",
    "ChaFilingDateHistory", "ChaChecklistReworkNote", "ChaChecklistApproval",
    "ChaChecklistImport", "ChaDocumentException", "ChaDocumentVersion",
    "ChaJobAssignment", "ChaJob", "ChaTeamGroup", "ChaSettings", "ChaAuditLog",
    "ChaDocumentRequirementItem", "ChaDocumentRequirementCategory",
    // CRM
    "CrmLeadReminder", "CrmExternalLeadSnapshot", "CrmLeadSourceJustdialConfig",
    "CrmTimelineEvent", "CrmAttachment", "CrmNote", "CrmApprovalLog",
    "CrmWorkTimeLog", "CrmProject", "CrmInvoice", "CrmVendor",
    "CrmActivity", "CrmDeal", "CrmAccount", "CrmContact", "CrmLead",
    "CrmTicketComment", "CrmTicket",
    // Accounting
    "PaymentAllocation", "CustomerLedgerEntry", "SupplierLedgerEntry",
    "GeneralLedgerEntry", "SalesInvoiceTaxLine", "SalesInvoiceItem", "SalesInvoice",
    "PurchaseInvoiceItem", "PurchaseInvoice",
    "JournalEntryLine", "JournalEntry", "PaymentEntry",
    "AssetDepreciationEntry", "Asset", "JobCosting",
    "QuotationItem", "Quotation", "CustomerNote", "VendorNote",
    "RecurringExpense", "RecurringJournal", "TransactionLock",
    "AccountingAuditLog", "AccountingSettings", "PartnerAccount",
    "Account", "FiscalYear",
    // AMS
    "MeetingReschedule", "AppraisalExtensionRequest",
    "HikeDecision", "MeetingMinute", "AppraisalMeeting",
    "ManagementReview", "ReviewerRating", "SelfAssessment",
    "AppraisalAuditLog", "AppraisalReviewer", "AppraisalSchedule", "Appraisal",
    "AppraisalCycle", "AppraisalCriterion", "AppraisalSelfTemplate",
    "OrgAppraisalSettings", "IncrementSlab",
    // Attendance
    "AttendanceRegularization", "OtRecord", "EmployeeLop",
    "OTEntry", "LeaveRequest", "LeaveBalance", "AttendancePunch",
    "Holiday", "LeaveType",
    "BiometricSyncLog", "WorkingCalendar", "OtSettings",
    // HRMS
    "WorkReport", "HrmsAuditLog", "HrmsTask",
    "TravelRequest", "HRLetterRequest", "HRCase",
    "SurveyResponse", "CourseEnrollment", "SalaryRevisionLetter",
    "PerformanceFeedback", "EmployeeSkill", "Goal",
    "TimesheetSubmission", "OnDutyRequest", "AttendancePermissionRequest",
    "ShiftAssignment", "EmployeeContact", "EmployeePreference",
    "Document", "EmploymentRecord",
    // Security
    "PasskeyResetRequest", "SecurityEvent", "UserSession",
    // Notifications & Tasks
    "NotificationActivity", "Notification", "EmailQueue",
    "TodoSubtask", "TodoTask", "Announcement",
    // Core — users/roles
    "UserRole", "RolePermission", "User", "Role", "Permission",
    // Org structure
    "Division", "Department", "Branch",
    // Payroll
    "PayrollBatch",
    // Organisation
    "Organisation",
    // System
    "SystemClock",
  ];

  for (const table of tablesToTruncate) {
    try {
      await db.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
    } catch {
      // Table may not exist in this migration state — skip silently.
    }
  }

  console.log(`  Truncated ${tablesToTruncate.length} tables.`);
}

async function seedOrganisation() {
  console.log("Seeding organisation...");
  const org = await db.organisation.create({
    data: { name: ORG.name, slug: ORG.slug },
  });
  console.log(`  Created: ${org.name} (${org.id})`);
  return org;
}

async function seedPermissions() {
  console.log("Seeding permissions...");
  for (const p of PERMISSIONS) {
    await db.permission.upsert({
      where: { key: p.key },
      update: { label: p.label, group: p.group },
      create: { key: p.key, label: p.label, group: p.group },
    });
  }
  console.log(`  Seeded ${PERMISSIONS.length} permissions.`);
}

async function seedRoles(orgId: string) {
  console.log("Seeding roles...");
  for (const [roleName, permKeys] of Object.entries(SYSTEM_ROLES)) {
    const role = await db.role.upsert({
      where: { orgId_name: { orgId, name: roleName } },
      update: {},
      create: { orgId, name: roleName, isSystem: true },
    });

    // Sync permissions for this role
    await db.rolePermission.deleteMany({ where: { roleId: role.id } });
    const permissions = await db.permission.findMany({ where: { key: { in: permKeys } } });
    await db.rolePermission.createMany({
      data: permissions.map((p) => ({ roleId: role.id, permissionId: p.id })),
    });

    console.log(`  ${roleName}: ${permissions.length} permissions`);
  }
}

async function seedDepartments(orgId: string, workbook: XLSX.WorkBook) {
  console.log("Seeding departments...");
  const dashboardRows = readSheet(workbook, 'Employee Dasboard Info');
  const departmentMap = new Map<string, string>();
  const usedDepartmentCodes = new Set<string>();

  // Add default HR department for the admin user
  const hrDept = await db.department.upsert({
    where: { orgId_code: { orgId, code: "HR" } },
    update: { name: "Human Resource" },
    create: { orgId, name: "Human Resource", code: "HR" },
  });
  departmentMap.set("human resource", hrDept.id);
  usedDepartmentCodes.add("HR");

  for (const row of dashboardRows) {
    const status = String(row['Employee Status'] || "").trim().toLowerCase();
    if (status !== "active") continue;

    const normalizedOrg = normalizeOrganisationAssignment(asString(row["Department"]));
    const deptName = normalizedOrg.departmentName;
    if (!deptName) continue;

    const key = deptName.toLowerCase();
    if (!departmentMap.has(key)) {
      const created = await db.department.create({
        data: {
          orgId,
          name: deptName,
          code: makeCode(deptName, "DEPT", usedDepartmentCodes),
        },
      });
      departmentMap.set(key, created.id);
      console.log(`  Department: ${deptName} (${created.code})`);
    }
  }

  return departmentMap;
}

async function seedBranches(orgId: string, workbook: XLSX.WorkBook) {
  console.log("Seeding branches...");
  const dashboardRows = readSheet(workbook, 'Employee Dasboard Info');
  const branchMap = new Map<string, string>();
  const usedBranchCodes = new Set<string>();

  for (const row of dashboardRows) {
    const status = String(row['Employee Status'] || "").trim().toLowerCase();
    if (status !== "active") continue;

    const branchName = asString(row["Location Name"] || row["Worklocation Name"]);
    if (!branchName) continue;

    const key = branchName.toLowerCase();
    if (!branchMap.has(key)) {
      const created = await db.branch.create({
        data: {
          orgId,
          name: branchName,
          code: makeCode(branchName, "BRANCH", usedBranchCodes),
        },
      });
      branchMap.set(key, created.id);
      console.log(`  Branch: ${branchName} (${created.code})`);
    }
  }

  return branchMap;
}

type EmployeeAggregate = {
  employeeNumber: string;
  employee: Row | null;
  salaryDetails: Row | null;
  salaryRevisions: Row[];
};

function latestRevision(revisions: Row[]) {
  return [...revisions].sort((a, b) => {
    const left = parseDate(a["Effective From"])?.getTime() ?? 0;
    const right = parseDate(b["Effective From"])?.getTime() ?? 0;
    return right - left;
  })[0] ?? null;
}

async function seedUsers(
  orgId: string,
  departmentMap: Map<string, string>,
  branchMap: Map<string, string>,
  workbook: XLSX.WorkBook
) {
  console.log("Seeding users...");
  const pw = await hash(DEFAULT_PASSWORD, 12);
  const userMap = new Map<string, string>(); // email/empNum -> userId

  const dashboardRows = readSheet(workbook, 'Employee Dasboard Info');
  const mailRows = readSheet(workbook, 'Official Mail ID for Logins');
  const salaryRows = readSheet(workbook, 'Employee salary details');
  const revisionRows = readSheet(workbook, 'Salary Revision Details');

  const byEmployeeNumber = new Map<string, EmployeeAggregate>();

  function touch(employeeNumber: string) {
    const existing = byEmployeeNumber.get(employeeNumber);
    if (existing) return existing;
    const created: EmployeeAggregate = {
      employeeNumber,
      employee: null,
      salaryDetails: null,
      salaryRevisions: [],
    };
    byEmployeeNumber.set(employeeNumber, created);
    return created;
  }

  for (const row of dashboardRows) {
    const employeeNumber = asString(row["Employee ID"]);
    if (!employeeNumber) continue;
    touch(employeeNumber).employee = row;
  }

  for (const row of salaryRows) {
    const employeeNumber = asString(row["Employee Number"]);
    if (!employeeNumber) continue;
    touch(employeeNumber).salaryDetails = row;
  }

  for (const row of revisionRows) {
    const employeeNumber = asString(row["Employee Number"]);
    if (!employeeNumber) continue;
    touch(employeeNumber).salaryRevisions.push(row);
  }

  // 1. Seed HR Administrator
  const hrDeptId = departmentMap.get("human resource");
  const hrUser = await db.user.upsert({
    where: { email: "hr@adarshshipping.in" },
    update: {
      orgId,
      name: "HR Administrator",
      designation: "HR Manager",
      isPlatformAdmin: true,
      departmentId: hrDeptId ?? null,
      active: true,
    },
    create: {
      orgId,
      email: "hr@adarshshipping.in",
      name: "HR Administrator",
      passwordHash: pw,
      designation: "HR Manager",
      isPlatformAdmin: true,
      departmentId: hrDeptId ?? null,
      active: true,
    },
  });
  userMap.set("hr@adarshshipping.in", hrUser.id);

  const adminRole = await db.role.findFirstOrThrow({ where: { orgId, name: "Admin" } });
  await db.userRole.upsert({
    where: { userId_roleId: { userId: hrUser.id, roleId: adminRole.id } },
    update: {},
    create: { userId: hrUser.id, roleId: adminRole.id },
  });

  // Collect active employees
  const existingDivisions = await db.division.findMany({ where: { orgId } });
  const divisionByDepartmentAndName = new Map<string, any>(
    existingDivisions.map((division) => [`${division.departmentId}:${division.name.toLowerCase()}`, division])
  );

  const employeeRowsToProcess: { aggregate: EmployeeAggregate; email: string }[] = [];

  for (const aggregate of byEmployeeNumber.values()) {
    if (!aggregate.employee) continue;

    const employeeRow = aggregate.employee;
    const status = asString(employeeRow["Employee Status"]).toLowerCase();
    if (status !== "active") continue; // only active employees

    const emailMatch = matchLoginEmail(employeeRow, mailRows);
    const email = (emailMatch || asString(employeeRow["Email address"]) || asString(employeeRow["Personal Email Address"])).toLowerCase().trim();
    if (!email) {
      console.log(`  Skipping active employee ID ${aggregate.employeeNumber} due to empty email`);
      continue;
    }

    employeeRowsToProcess.push({ aggregate, email });
  }

  // Create Users & EmploymentRecords
  for (const { aggregate, email } of employeeRowsToProcess) {
    const employeeRow = aggregate.employee!;
    const name = buildFullName(employeeRow) || asString(aggregate.salaryDetails?.["Employee Name"]) || email;
    const designation = asNullableString(employeeRow["Designation"]);

    const normalizedOrg = normalizeOrganisationAssignment(asString(employeeRow["Department"]));
    const departmentName = normalizedOrg.departmentName;
    const departmentId = departmentName ? departmentMap.get(departmentName.toLowerCase()) ?? null : null;

    let divisionId: string | null = null;
    if (departmentId && normalizedOrg.divisionName) {
      const divKey = `${departmentId}:${normalizedOrg.divisionName.toLowerCase()}`;
      let division = divisionByDepartmentAndName.get(divKey);
      if (!division) {
        division = await db.division.create({
          data: {
            orgId,
            departmentId,
            name: normalizedOrg.divisionName,
          },
        });
        divisionByDepartmentAndName.set(divKey, division);
      }
      divisionId = division.id;
    }

    const branchName = asString(employeeRow["Location Name"] || employeeRow["Worklocation Name"]);
    const branchId = branchName ? branchMap.get(branchName.toLowerCase()) ?? null : null;

    const user = await db.user.upsert({
      where: { email },
      update: {
        orgId,
        name,
        employeeNumber: parseInt(aggregate.employeeNumber, 10),
        designation,
        branchId,
        departmentId,
        divisionId,
        active: true,
      },
      create: {
        orgId,
        email,
        name,
        employeeNumber: parseInt(aggregate.employeeNumber, 10),
        passwordHash: pw,
        designation,
        branchId,
        departmentId,
        divisionId,
        active: true,
      },
    });

    userMap.set(email, user.id);
    userMap.set(aggregate.employeeNumber, user.id);

    const mappedRoleName = getRoleForUser(
      aggregate.employeeNumber,
      email,
      departmentName || "",
      designation || "",
    );
    await db.userRole.deleteMany({
      where: {
        userId: user.id,
        role: {
          orgId,
          name: { in: [...SEEDED_PRIMARY_ROLE_NAMES] },
        },
      },
    });
    const userRoleObj = await db.role.findFirstOrThrow({ where: { orgId, name: mappedRoleName } });
    await db.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: userRoleObj.id } },
      update: {},
      create: { userId: user.id, roleId: userRoleObj.id },
    });

    const revision = latestRevision(aggregate.salaryRevisions);
    const ctc = asNumber(revision?.["Revised CTC (per annum)"]) ?? asNumber(aggregate.salaryDetails?.["CTC Per Annum"]);
    const joinDate = parseDate(employeeRow["Date of Joining"]) ?? new Date();
    const exitDate = parseDate(employeeRow["Date of Exit"]);

    const basic = asNumber(revision?.["Basic"]) ?? asNumber(aggregate.salaryDetails?.["Basic"]) ?? 0;
    const hra = asNumber(revision?.["House Rent Allowance"]) ?? asNumber(aggregate.salaryDetails?.["House Rent Allowance"]) ?? 0;
    const conveyance = asNumber(revision?.["Conveyance Allowance"]) ?? asNumber(aggregate.salaryDetails?.["Conveyance Allowance"]) ?? 0;
    const transport = asNumber(revision?.["Transport Allowance"]) ?? asNumber(aggregate.salaryDetails?.["Transport Allowance"]) ?? 0;
    const travelling = asNumber(revision?.["Travelling Allowance"]) ?? asNumber(aggregate.salaryDetails?.["Travelling Allowance"]) ?? 0;
    const fixedAllowance = asNumber(revision?.["Fixed Allowance"]) ?? asNumber(aggregate.salaryDetails?.["Fixed Allowance"]) ?? 0;
    const stipend = asNumber(revision?.["Stipend"]) ?? asNumber(aggregate.salaryDetails?.["Stipend"]) ?? 0;

    const monthlyGross =
      asNumber(revision?.["Revised Gross Amount (per annum)"]) != null
        ? Math.round((asNumber(revision?.["Revised Gross Amount (per annum)"]) ?? 0) / 12)
        : asNumber(aggregate.salaryDetails?.["Gross Amount (per annum)_1"]) != null
          ? Math.round((asNumber(aggregate.salaryDetails?.["Gross Amount (per annum)_1"]) ?? 0) / 12)
          : null;

    const payrollMeta = {
      employeeNumber: aggregate.employeeNumber,
      source: "excel-import-seed",
      monthlyGross,
      importedAt: new Date().toISOString(),
      bankDetails: {
        holderName: asNullableString(employeeRow["Account Holder Name as per passbook"] || employeeRow["Bank Holder Name"]),
        bankName: asNullableString(employeeRow["Bank Name"]),
        accountNumber: asNullableString(employeeRow["Account Number"]),
        ifscCode: asNullableString(employeeRow["IFSC Code"]),
        accountType: asNullableString(employeeRow["Account Type"]),
        paymentMode: asNullableString(employeeRow["Payment Mode"]),
        stateCode: asNullableString(employeeRow["State Code"] || employeeRow["Worklocation StateCode"]),
      },
      personalDetails: {
        gender: asNullableString(employeeRow["Gender"]),
        personalEmail: asNullableString(employeeRow["Personal Email Address"] || employeeRow["Personal Email"]),
        fatherName: asNullableString(employeeRow["Father Name"]),
        mobileNumber: asNullableString(employeeRow["Personal Mobile Number"] || employeeRow["Mobile Number"]),
        dateOfBirth: parseDate(employeeRow["Date of Birth"])?.toISOString() ?? null,
        panNumber: asNullableString(employeeRow["PAN"] || employeeRow["PAN Number"]),
        aadhaarNumber: asNullableString(employeeRow["Aadhaar"]),
      },
    };

    await db.employmentRecord.upsert({
      where: { userId: user.id },
      update: {
        joinDate,
        exitDate,
        ctc,
        basic,
        hra,
        conveyance,
        transport,
        travelling,
        fixedAllowance,
        stipend,
        payrollMeta: payrollMeta as any,
      },
      create: {
        userId: user.id,
        joinDate,
        exitDate,
        ctc,
        priorExperienceYears: 0,
        basic,
        hra,
        conveyance,
        transport,
        travelling,
        fixedAllowance,
        stipend,
        payrollMeta: payrollMeta as any,
      },
    });

    console.log(`  User: ${name} <${email}> → ${mappedRoleName}`);
  }

  // Set Manager relationships (Third pass)
  for (const { aggregate } of employeeRowsToProcess) {
    const employeeRow = aggregate.employee!;
    const mgrStr = asString(employeeRow["Reporting Manager"]);
    if (mgrStr) {
      const match = mgrStr.match(/\b(\d+)$/);
      const managerEmpNum = match ? match[1] : null;
      if (managerEmpNum) {
        const userId = userMap.get(aggregate.employeeNumber);
        const managerId = userMap.get(managerEmpNum);
        if (userId && managerId) {
          await db.user.update({
            where: { id: userId },
            data: { managerId },
          });
          console.log(`  Hierarchy: Emp ID ${aggregate.employeeNumber} → manager Emp ID ${managerEmpNum}`);
        }
      }
    }
  }

  return userMap;
}

async function seedLeaveTypes(orgId: string) {
  console.log("Seeding leave types...");
  for (const lt of LEAVE_TYPES) {
    await db.leaveType.upsert({
      where: { orgId_name: { orgId, name: lt.name } },
      update: { paid: lt.paid, defaultBalance: lt.defaultBalance },
      create: { orgId, name: lt.name, paid: lt.paid, defaultBalance: lt.defaultBalance },
    });
    console.log(`  ${lt.name} (${lt.paid ? "paid" : "unpaid"}, balance: ${lt.defaultBalance})`);
  }
}

async function seedCrmCustomers(orgId: string, ownerUserId: string) {
  console.log("Seeding CRM customers...");
  for (const customer of CRM_CUSTOMERS) {
    await db.crmAccount.upsert({
      where: { id: `seed-crm-${customer.name.toLowerCase().replace(/\s+/g, "-")}` },
      update: {},
      create: {
        orgId,
        ownerId: ownerUserId,
        name: customer.name,
        companyName: customer.companyName,
        type: "Customer",
        customerSubType: "Business",
        email: customer.email,
        phone: customer.phone,
        website: customer.website,
        industry: customer.industry,
        status: "ACTIVE",
        createdById: ownerUserId,
        updatedById: ownerUserId,
      },
    });
    console.log(`  ${customer.name}`);
  }
}

async function seedAppraisalConfig(orgId: string) {
  console.log("Seeding appraisal config...");

  // Appraisal settings
  await db.orgAppraisalSettings.upsert({
    where: { orgId },
    update: {},
    create: { orgId, availabilityDeadlineDays: 2 },
  });
  console.log("  OrgAppraisalSettings (deadline: 2 business days)");

  // Self-assessment form template
  await db.appraisalSelfTemplate.upsert({
    where: { orgId },
    update: {},
    create: {
      orgId,
      content: buildDefaultSelfFormTemplate(),
    },
  });
  console.log("  AppraisalSelfTemplate");

  // Criteria for SELF, REVIEWER, MANAGEMENT phases
  for (const phase of ["SELF", "REVIEWER", "MANAGEMENT"] as const) {
    const criteria = buildSeedCriteriaForPhase(phase);
    for (const criterion of criteria) {
      const parent = await db.appraisalCriterion.upsert({
        where: { orgId_phase_code: { orgId, phase, code: criterion.code } },
        update: {
          label: criterion.label,
          description: criterion.description,
          weight: criterion.weight,
          group: criterion.group,
          order: criterion.order,
          maxPoints: criterion.maxPoints,
          kind: criterion.kind,
          reviewerOnly: criterion.reviewerOnly,
          meta: criterion.meta,
        },
        create: {
          orgId,
          phase,
          code: criterion.code,
          label: criterion.label,
          description: criterion.description,
          weight: criterion.weight,
          group: criterion.group,
          order: criterion.order,
          maxPoints: criterion.maxPoints,
          kind: criterion.kind,
          reviewerOnly: criterion.reviewerOnly,
          meta: criterion.meta,
        },
      });

      // Sync children (sub-criteria)
      await db.appraisalCriterion.deleteMany({ where: { parentId: parent.id } });
      if (criterion.children.length > 0) {
        await db.appraisalCriterion.createMany({
          data: criterion.children.map((child) => ({
            orgId,
            phase,
            parentId: parent.id,
            code: child.code,
            label: child.label,
            weight: child.weight,
            group: child.group,
            order: child.order,
            maxPoints: child.maxPoints,
            kind: child.kind,
            reviewerOnly: true,
          })),
        });
      }
    }
    console.log(`  ${criteria.length} ${phase.toLowerCase()} criteria`);
  }
}

async function seedAccountingChart(orgId: string) {
  console.log("Seeding chart of accounts...");
  await seedChartOfAccounts(orgId);
  const accountCount = await db.account.count({ where: { orgId } });
  console.log(`  ${accountCount} accounts seeded.`);
}

async function seedSystemClock() {
  console.log("Seeding system clock...");
  await db.systemClock.upsert({
    where: { id: "global" },
    update: {},
    create: { id: "global", frozenAt: null },
  });
  console.log("  SystemClock created.");
}

// ─── Verification ───────────────────────────────────────────────────────────────

async function verify(orgId: string) {
  console.log("\n─── Verification ───────────────────────────────────────────────");

  const checks = [
    { label: "Organisation", count: await db.organisation.count() },
    { label: "Permissions", count: await db.permission.count() },
    { label: "Roles", count: await db.role.count({ where: { orgId } }) },
    { label: "Departments", count: await db.department.count({ where: { orgId } }) },
    { label: "Branches", count: await db.branch.count({ where: { orgId } }) },
    { label: "Users", count: await db.user.count({ where: { orgId } }) },
    { label: "UserRoles", count: await db.userRole.count() },
    { label: "Leave Types", count: await db.leaveType.count({ where: { orgId } }) },
    { label: "CRM Accounts", count: await db.crmAccount.count({ where: { orgId } }) },
    { label: "Appraisal Criteria", count: await db.appraisalCriterion.count({ where: { orgId } }) },
    { label: "Appraisal Settings", count: await db.orgAppraisalSettings.count({ where: { orgId } }) },
    { label: "Appraisal Template", count: await db.appraisalSelfTemplate.count({ where: { orgId } }) },
    { label: "Accounting Accounts", count: await db.account.count({ where: { orgId } }) },
    { label: "Fiscal Years", count: await db.fiscalYear.count({ where: { orgId } }) },
    { label: "SystemClock", count: await db.systemClock.count() },
    { label: "HR Letter Templates", count: await db.hRLetterTemplate.count({ where: { orgId } }) },
    { label: "HR Letter Settings", count: await db.hRLetterSetting.count({ where: { orgId } }) },
  ];

  let allPassed = true;
  for (const check of checks) {
    const icon = check.count > 0 ? "✓" : "✗";
    if (check.count === 0 && check.label !== "HR Letter Templates") allPassed = false;
    console.log(`  ${icon} ${check.label}: ${check.count}`);
  }

  // Referential integrity: every user should have at least one role
  const usersWithoutRoles = await db.user.findMany({
    where: { orgId, roles: { none: {} } },
    select: { email: true, name: true },
  });
  if (usersWithoutRoles.length > 0) {
    allPassed = false;
    console.log(`  ✗ Users without roles: ${usersWithoutRoles.map((u) => u.email).join(", ")}`);
  } else {
    console.log("  ✓ All users have at least one role");
  }

  // Check manager FK integrity
  const usersWithInvalidManagers = await db.user.findMany({
    where: { orgId, managerId: { not: null } },
    select: { email: true, managerId: true },
  });
  for (const u of usersWithInvalidManagers) {
    const manager = await db.user.findUnique({ where: { id: u.managerId! } });
    if (!manager) {
      allPassed = false;
      console.log(`  ✗ Broken manager FK: ${u.email} → ${u.managerId}`);
    }
  }

  console.log(`\n${allPassed ? "✓ All checks passed." : "✗ Some checks failed."}`);
  return allPassed;
}

async function seedLetterTemplatesAndSettings(orgId: string) {
  console.log("Seeding HR Letter templates & settings...");

  // 1. Settings
  await db.hRLetterSetting.upsert({
    where: { orgId },
    update: {},
    create: {
      orgId,
      numberingPattern: "ME/HR/{year}/{seq}",
      probationDaysDefault: 90,
      noticePeriodDaysDefault: 30,
      letterValidityDaysDefault: 7,
      legalJurisdiction: "Chennai, Tamil Nadu",
      complianceVersion: "2026.1",
      signatoryName: "HR Manager",
      signatoryDesignation: "Manager - HR",
      companySealUrl: "C:\\Users\\SilverCloud\\Downloads\\image.png",
      emailTemplate: "Dear {employee_name},\n\nPlease find attached your {document_type} from Adarsh Shipping and Services. Kindly review and accept it in the employee portal.\n\nBest Regards,\nHR Department"
    }
  });

  // 2. Templates from bundled DOCX sources
  try {
    const importedTemplates = [];
    for (const file of getBundledDocxTemplateFiles()) {
      importedTemplates.push(await importDocxTemplateFile(file));
    }

    for (const template of importedTemplates) {
      await db.hRLetterTemplate.create({
        data: {
          orgId,
          name: template.name,
          type: template.type,
          content: template.content,
          variables: template.variables,
          sourceDocxPath: template.sourceDocxPath,
          previewHtml: template.previewHtml,
          fieldSchema: template.fieldSchema,
          editorDocument: template.editorDocument,
          sourceFileName: template.sourceFileName,
          isActive: true,
          isLegalReviewed: true,
          legalReviewedAt: new Date(),
          version: 1
        }
      });
    }
    console.log(`  Seeded ${importedTemplates.length} DOCX templates.`);
  } catch (error) {
    console.warn("  [Warning] Failed to seed DOCX templates:", (error as any).message || error);
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Adarsh Shipping & Services — Database Seed");
  console.log("═══════════════════════════════════════════════════════════════\n");

  // 1. Clean wipe
  await clearApplicationData();

  // 2. Organisation
  const org = await seedOrganisation();

  // 3. Permissions (no FK dependency)
  await seedPermissions();

  // 4. Roles (depends on org + permissions)
  await seedRoles(org.id);
  await ensureSpecialAccounts(org.id, DEFAULT_PASSWORD);

  // Load Excel workbook
  const filePath = path.join(process.cwd(), "docs/Employee_View_Sentence_Case.xlsx");
  const workbook = XLSX.readFile(filePath);

  // 5. Departments (depends on org)
  const departmentMap = await seedDepartments(org.id, workbook);

  // 6. Branches (depends on org)
  const branchMap = await seedBranches(org.id, workbook);

  // 7. Users (depends on org, departments, roles)
  const userMap = await seedUsers(org.id, departmentMap, branchMap, workbook);

  // 8. Leave types (depends on org)
  await seedLeaveTypes(org.id);

  // 9. CRM customers (depends on org, user as owner)
  const hrUserId = userMap.get("hr@adarshshipping.in")!;
  await seedCrmCustomers(org.id, hrUserId);

  // 10. Appraisal config (depends on org)
  await seedAppraisalConfig(org.id);

  // 11. Accounting chart (depends on org)
  await seedAccountingChart(org.id);

  // 12. System clock
  await seedSystemClock();

  // 13. HR Letter templates & settings
  await seedLetterTemplatesAndSettings(org.id);

  // 13.5. Seed default document requirements configuration
  console.log("Seeding default document requirements...");
  await ensureDefaultDocumentRequirements(org.id, db);
  console.log("  Document requirements seeded.");

  // 14. Verify
  const passed = await verify(org.id);

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log(`  Seed complete. Default password: ${DEFAULT_PASSWORD}`);
  console.log("═══════════════════════════════════════════════════════════════\n");

  if (!passed) process.exit(1);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
