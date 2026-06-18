import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { buildSeedCriteriaForPhase } from "../src/modules/ams/form-template";
import { buildDefaultSelfFormTemplate } from "../src/modules/ams/criteria-config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

// ─── Permission catalogue ─────────────────────────────────────────────────────

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

  // HRMS — sub-features
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

  // Attendance — timesheets
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
] as const;

// ─── System roles & their default permissions ─────────────────────────────────

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
  ],
  HR: [
    "hrms.employee.read", "hrms.employee.create", "hrms.employee.edit",
    "hrms.hierarchy.manage", "hrms.documents.read", "hrms.documents.upload",
    "hrms.peopleplus.read", "hrms.peopleplus.admin",
    "hrms.helpdesk.read", "hrms.helpdesk.manage",
    "hrms.workreport.submit", "hrms.workreport.approve", "hrms.workreport.view_all",
    "hrms.tasks.manage", "hrms.approvals.manage",
    "hrms.travel.request", "hrms.travel.approve",
    "hrms.letters.manage",
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
  ],
};

async function main() {
  console.log("Seeding permissions...");

  for (const p of PERMISSIONS) {
    await db.permission.upsert({
      where: { key: p.key },
      update: { label: p.label, group: p.group },
      create: { key: p.key, label: p.label, group: p.group },
    });
  }

  console.log(`Seeded ${PERMISSIONS.length} permissions.`);

  // Seed system roles only if an org exists (dev convenience)
  const org = await db.organisation.findFirst();
  if (!org) {
    console.log("No organisation found. Skipping role seeding. Create org via /setup first.");
    return;
  }

  console.log(`Seeding system roles for org: ${org.name}...`);

  for (const [roleName, permKeys] of Object.entries(SYSTEM_ROLES)) {
    const role = await db.role.upsert({
      where: { orgId_name: { orgId: org.id, name: roleName } },
      update: {},
      create: { orgId: org.id, name: roleName, isSystem: true },
    });

    // Sync permissions
    await db.rolePermission.deleteMany({ where: { roleId: role.id } });
    const permissions = await db.permission.findMany({ where: { key: { in: permKeys } } });
    await db.rolePermission.createMany({
      data: permissions.map((p) => ({ roleId: role.id, permissionId: p.id })),
    });

    console.log(`  ${roleName}: ${permissions.length} permissions`);
  }

  // Seed default appraisal settings
  await db.orgAppraisalSettings.upsert({
    where: { orgId: org.id },
    update: {},
    create: { orgId: org.id, availabilityDeadlineDays: 2 },
  });
  console.log("  Seeded OrgAppraisalSettings (deadline: 2 business days)");

  await db.appraisalSelfTemplate.upsert({
    where: { orgId: org.id },
    update: {},
    create: {
      orgId: org.id,
      content: buildDefaultSelfFormTemplate(),
    },
  });
  console.log("  Seeded AppraisalSelfTemplate");

  for (const phase of ["SELF", "REVIEWER", "MANAGEMENT"] as const) {
    const criteria = buildSeedCriteriaForPhase(phase);
    for (const criterion of criteria) {
      const parent = await db.appraisalCriterion.upsert({
        where: { orgId_phase_code: { orgId: org.id, phase, code: criterion.code } },
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
          orgId: org.id,
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

      await db.appraisalCriterion.deleteMany({ where: { parentId: parent.id } });
      if (criterion.children.length > 0) {
        await db.appraisalCriterion.createMany({
          data: criterion.children.map((child) => ({
            orgId: org.id,
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
    console.log(`  Seeded ${criteria.length} ${phase.toLowerCase()} criteria`);
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
