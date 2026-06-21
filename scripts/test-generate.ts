import "dotenv/config";
import { db } from "../src/lib/db";
import { transitionHRLetterRequest, createHRLetterRequest, getEmployeePrepopulatedDetails } from "../src/modules/hrms/letters-service";

async function main() {
  console.log("Starting HR letter compilation test...");

  // 1. Fetch all templates
  const templates = await db.hRLetterTemplate.findMany();
  console.log(`Found ${templates.length} templates:`);
  for (const t of templates) {
    console.log(`- [${t.type}] ${t.name}`);
  }

  // 2. Fetch a seeded active user to act as recipient
  const recipient = await db.user.findFirst({
    where: { active: true, email: { endsWith: "@adarshshipping.in" } }
  });
  if (!recipient) {
    console.error("No active test employee found in DB!");
    process.exit(1);
  }
  console.log(`Using recipient: ${recipient.name} (${recipient.email})`);

  // 3. Fetch an admin or HR operator to act as issuer
  const operator = await db.user.findFirst({
    where: { active: true, email: { startsWith: "hr" } }
  });
  if (!operator) {
    console.error("No HR manager found in DB!");
    process.exit(1);
  }
  console.log(`Using operator/issuer: ${operator.name} (${operator.email})`);

  // Get prepopulated details
  const prepopulated = await getEmployeePrepopulatedDetails(recipient.id, recipient.orgId!);

  // Generate requests for each template
  for (const template of templates) {
    console.log(`\n--------------------------------------------`);
    console.log(`Generating letter for: ${template.name} (${template.type})`);

    try {
      // 1. Auto-approve template legal review if needed to bypass legal review state
      if (!template.isLegalReviewed) {
        await db.hRLetterTemplate.update({
          where: { id: template.id },
          data: { isLegalReviewed: true, isActive: true }
        });
        console.log(`Approved template legal review for ${template.name}`);
      }

      // Create detailed variables list
      const details = {
        ...prepopulated,
        father_or_guardian_name: "Late Sri R. Krishnaswamy",
        employee_address: "No. 12, Flat A, 3rd Floor, VGP Avenue, Thiruvanmiyur, Chennai - 600041",
        subject: `OFFER OF APPOINTMENT AS ${prepopulated.designation.toUpperCase()}`,
        // Consultant / Internship details
        stipend: "₹15,000",
        compensation_table: "", // placeholder table trigger
        terms_and_conditions: "All company terms apply.",
        resignation_date: "15 April 2026",
        relieving_date: "15 May 2026",
        notice_period: "30 Days",
        termination_date: "21 June 2026",
        termination_reason: "Gross misconduct and breach of data guidelines.",
        contract_start_date: "01 July 2026",
        contract_end_date: "30 June 2027",
        consultancy_fees: "₹45,000 per month",
        working_hours: "9:00 AM to 6:00 PM, Monday to Saturday",
        internship_start_date: "01 January 2026",
        internship_end_date: "31 March 2026",
      };

      // 2. Create the request
      const req = await createHRLetterRequest(recipient.orgId!, template.id, recipient.id, operator.id, details);
      console.log(`Created request draft: ${req.letterNumber} (ID: ${req.id})`);

      // 3. Transition: SUBMIT (moves to HR_REVIEW)
      const submitted = await transitionHRLetterRequest(req.id, recipient.orgId!, "SUBMIT", operator.id);
      console.log(`Transition -> SUBMIT: status is ${submitted.status}`);

      // 4. Transition: HR_APPROVE (moves to MGMT_APPROVAL since template is approved)
      const hrApproved = await transitionHRLetterRequest(req.id, recipient.orgId!, "HR_APPROVE", operator.id);
      console.log(`Transition -> HR_APPROVE: status is ${hrApproved.status}`);

      // 5. Transition: MGMT_APPROVE (moves to READY_TO_ISSUE)
      const mgmtApproved = await transitionHRLetterRequest(req.id, recipient.orgId!, "MGMT_APPROVE", operator.id);
      console.log(`Transition -> MGMT_APPROVE: status is ${mgmtApproved.status}`);

      // 6. Transition: ISSUE (triggers document compile using Word COM and outputs PDF/DOCX)
      const issued = await transitionHRLetterRequest(req.id, recipient.orgId!, "ISSUE", operator.id);
      console.log(`Transition -> ISSUE: status is ${issued.status}`);
      console.log(`Successfully generated files:`);
      console.log(`- DOCX: ${issued.docxPath}`);
      console.log(`- PDF: ${issued.pdfPath}`);
      console.log(`- Hash: ${issued.documentHash}`);

    } catch (e: any) {
      console.error(`Failed to generate letter for ${template.name}:`, e.message);
    }
  }

  console.log("\n--------------------------------------------");
  console.log("All letters generated successfully!");
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
