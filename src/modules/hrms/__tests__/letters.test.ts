import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { db } from "@/lib/db";
import {
  formatCurrency,
  formatDate,
  maskAadhaar,
  createHRLetterTemplate,
  getHRLetterTemplates,
  createHRLetterRequest,
  transitionHRLetterRequest
} from "../letters-service";

describe("HR Letters - Formatting Utils", () => {
  it("should format currency correctly in Indian format", () => {
    expect(formatCurrency(15000)).toBe("₹15,000");
    expect(formatCurrency(125000)).toBe("₹1,25,000");
    expect(formatCurrency(null)).toBe("₹0");
  });

  it("should format dates correctly in professional Indian corporate English", () => {
    const date = new Date("2026-04-15");
    expect(formatDate(date)).toBe("15 April 2026");
    expect(formatDate(null)).toBe("");
  });

  it("should mask Aadhaar numbers leaving only the last 4 digits visible", () => {
    expect(maskAadhaar("123456789012")).toBe("XXXX-XXXX-9012");
    expect(maskAadhaar("1234 5678 9012")).toBe("XXXX-XXXX-9012");
    expect(maskAadhaar("")).toBe("");
  });
});

describe("HR Letters - Service Workflows", () => {
  let orgId = "test-org-123";
  let userId = "test-user-456";
  let creatorId = "test-creator-789";
  let templateId: string;
  let requestId: string;

  beforeEach(async () => {
    // Seed temporary org, user, and creator for testing referential integrity
    await db.organisation.upsert({
      where: { id: orgId },
      update: {},
      create: { id: orgId, name: "Test Org", slug: "test-org" }
    });

    await db.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        orgId,
        email: "test.emp@adarshshipping.in",
        name: "Test Employee",
        passwordHash: "xxx",
      }
    });

    await db.user.upsert({
      where: { id: creatorId },
      update: {},
      create: {
        id: creatorId,
        orgId,
        email: "test.creator@adarshshipping.in",
        name: "Test Creator",
        passwordHash: "xxx",
      }
    });
  });

  afterEach(async () => {
    // Clean up test records
    await db.hRLetterRequest.deleteMany({ where: { orgId } });
    await db.hRLetterTemplate.deleteMany({ where: { orgId } });
    await db.user.deleteMany({ where: { id: { in: [userId, creatorId] } } });
    await db.organisation.delete({ where: { id: orgId } });
  });

  it("should create templates and transition requests through complete lifecycle states", async () => {
    // 1. Create template
    const template = await createHRLetterTemplate(orgId, {
      name: "Bonafide Template",
      type: "BONAFIDE",
      content: "This is to certify that {{employee_name}} is working here.",
      variables: ["employee_name"]
    });
    templateId = template.id;
    expect(template.name).toBe("Bonafide Template");
    expect(template.isLegalReviewed).toBe(false);

    // 2. Create Letter request draft
    const request = await createHRLetterRequest(orgId, templateId, userId, creatorId, {
      employee_name: "Test Employee"
    });
    requestId = request.id;
    expect(request.status).toBe("DRAFT");

    // 3. Submit request to HR Review
    const submitted = await transitionHRLetterRequest(requestId, orgId, "SUBMIT", creatorId);
    expect(submitted.status).toBe("HR_REVIEW");

    // 4. HR Approves, moves to Legal Review (since template is not legal-approved yet)
    const hrApproved = await transitionHRLetterRequest(requestId, orgId, "HR_APPROVE", creatorId);
    expect(hrApproved.status).toBe("LEGAL_REVIEW");

    // 5. Legal Approves, moves to Management Approval
    const legalApproved = await transitionHRLetterRequest(requestId, orgId, "LEGAL_APPROVE", creatorId);
    expect(legalApproved.status).toBe("MGMT_APPROVAL");

    // 6. Management Approves, moves to Ready to Issue
    const mgmtApproved = await transitionHRLetterRequest(requestId, orgId, "MGMT_APPROVE", creatorId);
    expect(mgmtApproved.status).toBe("READY_TO_ISSUE");
  });
});
