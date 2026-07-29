import { describe, expect, it } from "vitest";
import {
  employeeHrmsProfileDataSchema,
  employeeProfileFieldInputSchema,
  employeeSelfProfileUpdateSchema,
  employeeProfileUpdateSchema,
} from "../employee-profile";

describe("HRMS employee profile validation", () => {
  it("accepts every supported fixed and repeatable profile section", () => {
    const profile = employeeHrmsProfileDataSchema.parse({
      nickname: "Sam",
      fatherName: "Charles",
      businessUnit: "Chennai",
      location: "Chennai",
      streams: "Documentation",
      externalRole: "Team member",
      sourceOfHire: "Direct",
      aboutMe: "Employee biography",
      bloodGroup: "O+",
      weddingDay: "",
      maritalStatus: "Single",
      expertise: "Customs clearance",
      workPhone: "7305705909",
      extension: "101",
      seatingLocation: "Floor 2",
      tags: "operations",
      personalEmail: "employee@example.com",
      presentAddress: "Present address",
      presentStateCode: "TN",
      permanentAddress: "Permanent address",
      bankHolderName: "Employee Name",
      paymentMode: "Direct Deposit",
      oldAccountNumber: "001",
      accountType: "Savings",
      onboardingStatus: "In progress",
      education: [
        {
          id: "education-1",
          instituteName: "Loyola College",
          degree: "BBA",
          specialization: "Business",
          completionDate: "2024",
        },
      ],
      workExperience: [
        {
          id: "experience-1",
          companyName: "Example Logistics",
          jobTitle: "Executive",
          fromDate: "2024-01-01",
          toDate: "2025-01-01",
          jobDescription: "Operations",
          relevant: true,
        },
      ],
      dependents: [
        {
          id: "dependent-1",
          name: "Family Member",
          relationship: "Parent",
          dateOfBirth: "1970-01-01",
        },
      ],
    });

    expect(profile.education).toHaveLength(1);
    expect(profile.workExperience[0]?.relevant).toBe(true);
    expect(profile.dependents[0]?.relationship).toBe("Parent");
  });

  it("validates complete editable employee payloads and custom values", () => {
    const result = employeeProfileUpdateSchema.safeParse({
      employeeNumber: 193,
      firstName: "Sham",
      lastName: "Christo",
      email: "sham@example.com",
      designation: "Trainee",
      branchId: null,
      departmentId: null,
      divisionId: null,
      managerId: null,
      tlId: null,
      active: true,
      dob: "2003-12-18",
      gender: "Male",
      employmentType: "Permanent",
      personalPhone: "9999999999",
      aadhaar: "123412341234",
      pan: "ABCDE1234F",
      uan: "123456789012",
      bankName: "Bank",
      bankAccount: "12345",
      ifsc: "BANK00001",
      joinDate: "2026-06-16",
      exitDate: "",
      grade: "Trainee",
      ctc: 300000,
      basic: 120000,
      hra: 60000,
      conveyance: 12000,
      transport: 12000,
      travelling: 12000,
      fixedAllowance: 84000,
      stipend: 0,
      priorExperienceYears: 0,
      profile: {},
      customValues: {
        tshirt_size: "Medium",
        transport_required: true,
      },
    });

    expect(result.success).toBe(true);
  });

  it("requires select fields to use a supported field type", () => {
    expect(
      employeeProfileFieldInputSchema.safeParse({
        label: "T-shirt size",
        type: "SELECT",
        section: "Additional Information",
        required: false,
        options: ["Small", "Medium", "Large"],
        active: true,
        position: 10,
      }).success,
    ).toBe(true);

    expect(
      employeeProfileFieldInputSchema.safeParse({
        label: "Unsupported",
        type: "FILE",
      }).success,
    ).toBe(false);
  });

  it("keeps employee self-service limited to basic and KYC fields", () => {
    const result = employeeSelfProfileUpdateSchema.parse({
      firstName: "Sham",
      lastName: "Christo",
      dob: "2003-12-18",
      gender: "Male",
      personalPhone: "9999999999",
      aadhaar: "123412341234",
      pan: "ABCDE1234F",
      uan: "123456789012",
      departmentId: "forged-department",
      joinDate: "2026-06-16",
      bankAccount: "forged-bank-account",
      ctc: 9_999_999,
      active: false,
      profile: {
        nickname: "Sam",
        fatherName: "Charles",
        aboutMe: "Employee biography",
        bloodGroup: "O+",
        weddingDay: "",
        maritalStatus: "Single",
        expertise: "Customs clearance",
        personalEmail: "employee@example.com",
        presentAddress: "Present address",
        presentStateCode: "TN",
        permanentAddress: "Permanent address",
        education: [],
        workExperience: [],
        dependents: [],
        bankHolderName: "Forged holder",
        onboardingStatus: "Complete",
      },
    });

    expect(result).not.toHaveProperty("departmentId");
    expect(result).not.toHaveProperty("joinDate");
    expect(result).not.toHaveProperty("bankAccount");
    expect(result).not.toHaveProperty("ctc");
    expect(result).not.toHaveProperty("active");
    expect(result.profile).not.toHaveProperty("bankHolderName");
    expect(result.profile).not.toHaveProperty("onboardingStatus");
    expect(result.profile.personalEmail).toBe("employee@example.com");
  });
});
