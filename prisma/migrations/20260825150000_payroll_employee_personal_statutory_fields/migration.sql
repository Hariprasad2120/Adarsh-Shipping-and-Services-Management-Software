-- Payroll Employees "Edit Personal Details" / "Edit Statutory Details"
-- parity (Zoho Payroll reference pages 00138/00139).
--
-- Father's Name, Differently Abled Type, Personal Email, and Residential
-- Address are NOT added here: they already exist as JSON keys on
-- EmployeeHrmsProfile.data (employeeHrmsProfileDataSchema in
-- src/modules/hrms/employee-profile.ts — fatherName, personalEmail,
-- presentAddress, presentStateCode already editable from the HRMS employee
-- profile screen). The new payroll edit-personal-details flow reads/writes
-- those same JSON keys plus a new "differentlyAbledType" key added to that
-- same schema, so no schema.prisma/migration changes are needed for them.
--
-- The four columns below are genuinely new payroll-owned statutory
-- identifiers with no existing home anywhere in the schema. They are added
-- next to the existing pan/uan/aadhaar columns on User.
ALTER TABLE "User" ADD COLUMN "pfAccountNumber" TEXT;
ALTER TABLE "User" ADD COLUMN "esiInsuranceNumber" TEXT;
ALTER TABLE "User" ADD COLUMN "contributeToEps" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "professionalTaxOptIn" BOOLEAN NOT NULL DEFAULT true;
