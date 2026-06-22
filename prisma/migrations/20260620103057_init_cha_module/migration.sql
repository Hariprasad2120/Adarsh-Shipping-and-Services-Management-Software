/*
  Warnings:

  - You are about to drop the column `reviewerRatingDeadlineDays` on the `OrgAppraisalSettings` table. All the data in the column will be lost.
  - You are about to drop the column `selfAssessmentDeadlineDays` on the `OrgAppraisalSettings` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "AppraisalCriterion_orgId_idx";

-- AlterTable
ALTER TABLE "Appraisal" ADD COLUMN     "reviewerRatingDeadline" TIMESTAMP(3),
ADD COLUMN     "selfAssessmentDeadline" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "AppraisalCriterion" ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'CATEGORY',
ADD COLUMN     "maxPoints" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "meta" JSONB,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "parentId" TEXT,
ADD COLUMN     "questions" JSONB,
ADD COLUMN     "reviewerOnly" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "group" SET DEFAULT '';

-- AlterTable
ALTER TABLE "AppraisalMeeting" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "AttendancePunch" ADD COLUMN     "biometricSynced" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "earlyLeavingMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lateMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "status" TEXT,
ADD COLUMN     "workingHours" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "EmploymentRecord" ADD COLUMN     "basic" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "conveyance" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "fixedAllowance" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "hra" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "stipend" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "transport" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "travelling" DOUBLE PRECISION DEFAULT 0;

-- AlterTable
ALTER TABLE "HikeDecision" ADD COLUMN     "slabId" TEXT;

-- AlterTable
ALTER TABLE "Holiday" ADD COLUMN     "holidayType" TEXT NOT NULL DEFAULT 'COMPANY';

-- AlterTable
ALTER TABLE "ManagementReview" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MeetingMinute" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "OrgAppraisalSettings" DROP COLUMN "reviewerRatingDeadlineDays",
DROP COLUMN "selfAssessmentDeadlineDays",
ADD COLUMN     "reviewerRoleWeights" JSONB NOT NULL DEFAULT '{"HR":1,"TL":1,"MANAGER":1}';

-- AlterTable
ALTER TABLE "ReviewerRating" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SelfAssessment" ADD COLUMN     "editCount" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "aadhaar" TEXT,
ADD COLUMN     "bankAccount" TEXT,
ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "dob" TIMESTAMP(3),
ADD COLUMN     "employeeNumber" INTEGER,
ADD COLUMN     "employmentType" TEXT,
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "ifsc" TEXT,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "pan" TEXT,
ADD COLUMN     "passkeySetupRequired" BOOLEAN DEFAULT false,
ADD COLUMN     "personalPhone" TEXT,
ADD COLUMN     "photo" TEXT,
ADD COLUMN     "uan" TEXT;

-- CreateTable
CREATE TABLE "SystemClock" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "frozenAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemClock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BiometricSyncLog" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "syncTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "triggeredById" TEXT,
    "recordsSynced" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,

    CONSTRAINT "BiometricSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkingCalendar" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "orgId" TEXT NOT NULL,
    "workStart" TEXT NOT NULL DEFAULT '09:00',
    "workEnd" TEXT NOT NULL DEFAULT '18:00',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "graceMinutes" INTEGER NOT NULL DEFAULT 15,
    "workingDays" TEXT NOT NULL DEFAULT '1,2,3,4,5,6',
    "breaks" JSONB,

    CONSTRAINT "WorkingCalendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtSettings" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "orgId" TEXT NOT NULL,
    "standardHours" DOUBLE PRECISION NOT NULL DEFAULT 8.0,
    "otRate" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
    "graceMinutes" INTEGER NOT NULL DEFAULT 15,
    "compOffSlabs" JSONB,

    CONSTRAINT "OtSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "dayType" TEXT NOT NULL DEFAULT 'WORKING_DAY',
    "hoursWorked" DOUBLE PRECISION NOT NULL,
    "otHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otRatePerHour" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "compOffDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "earlyLeavingMins" INTEGER NOT NULL DEFAULT 0,
    "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "rejectionRemarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OtRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRegularization" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "requestedIn" TIMESTAMP(3),
    "requestedOut" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceRegularization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeLop" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "payrollMonth" DATE NOT NULL,
    "lopDays" DOUBLE PRECISION NOT NULL,
    "remarks" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeLop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "IncrementSlab" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "grade" TEXT NOT NULL DEFAULT '',
    "minRating" DOUBLE PRECISION NOT NULL,
    "maxRating" DOUBLE PRECISION NOT NULL,
    "hikePercent" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "IncrementSlab_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppraisalExtensionRequest" (
    "id" TEXT NOT NULL,
    "appraisalId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "extendedUntil" TIMESTAMP(3),
    "decidedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppraisalExtensionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingReschedule" (
    "id" TEXT NOT NULL,
    "appraisalId" TEXT NOT NULL,
    "originalDate" TIMESTAMP(3) NOT NULL,
    "newDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rescheduledById" TEXT NOT NULL,
    "confirmedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeetingReschedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmTicket" (
    "id" TEXT NOT NULL,
    "raisedById" TEXT NOT NULL,
    "assigneeId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmTicketComment" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmTicketComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasskeyResetRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "decidedById" TEXT,
    "reason" TEXT,

    CONSTRAINT "PasskeyResetRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT,
    "event" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "sessionToken" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "loginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logoutAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "location" TEXT,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmLead" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "designation" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "mobile" TEXT,
    "fax" TEXT,
    "website" TEXT,
    "source" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "industry" TEXT,
    "annualRevenue" DOUBLE PRECISION,
    "employeeCount" INTEGER,
    "rating" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "pincode" TEXT,
    "description" TEXT,
    "tags" TEXT[],
    "isConverted" BOOLEAN NOT NULL DEFAULT false,
    "convertedAt" TIMESTAMP(3),
    "convertedAccountId" TEXT,
    "convertedContactId" TEXT,
    "convertedDealId" TEXT,
    "enquiryDetails" JSONB,
    "notInterestedReason" TEXT,
    "isPerishable" BOOLEAN NOT NULL DEFAULT false,
    "perishableDetails" JSONB,
    "enquiryRef" TEXT,
    "isFutureFollowUp" BOOLEAN NOT NULL DEFAULT false,
    "followUpReminderDate" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmLeadReminder" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "alertAt" TIMESTAMP(3) NOT NULL,
    "triggeredAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmLeadReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmContact" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "accountId" TEXT,
    "firstName" TEXT,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "mobile" TEXT,
    "designation" TEXT,
    "department" TEXT,
    "isDecisionMaker" BOOLEAN NOT NULL DEFAULT false,
    "address" TEXT,
    "description" TEXT,
    "tags" TEXT[],
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmAccount" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "industry" TEXT,
    "website" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "gstin" TEXT,
    "billingAddress" TEXT,
    "shippingAddress" TEXT,
    "creditLimit" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "paymentTerms" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "customerSubType" TEXT,
    "salutation" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "companyName" TEXT,
    "language" TEXT DEFAULT 'English',
    "communicationChannels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "gstTreatment" TEXT,
    "placeOfSupply" TEXT,
    "pan" TEXT,
    "taxPreference" TEXT,
    "currency" TEXT DEFAULT 'INR',
    "openingBalanceBranch" TEXT,
    "openingBalanceAmount" DOUBLE PRECISION DEFAULT 0.0,
    "isPortalEnabled" BOOLEAN NOT NULL DEFAULT false,
    "remarks" TEXT,
    "billingAddressDetails" JSONB,
    "shippingAddressDetails" JSONB,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmDeal" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "accountId" TEXT,
    "contactId" TEXT,
    "name" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'PROSPECTING',
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "probability" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    "expectedCloseDate" TIMESTAMP(3),
    "source" TEXT,
    "serviceType" TEXT,
    "logisticsCategory" TEXT,
    "nextFollowUpDate" TIMESTAMP(3),
    "competitor" TEXT,
    "lostReason" TEXT,
    "description" TEXT,
    "tags" TEXT[],
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmDeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmActivity" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "dueAt" TIMESTAMP(3),
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "location" TEXT,
    "callResult" TEXT,
    "durationMins" INTEGER,
    "relatedToType" TEXT,
    "relatedToId" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmProduct" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "category" TEXT,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "taxPercent" DOUBLE PRECISION NOT NULL DEFAULT 18.0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmVendor" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "gstin" TEXT,
    "services" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmVendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmInvoice" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "dueDate" DATE,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "approvalStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "approvalNote" TEXT,
    "reworkNote" TEXT,
    "slaDeadline" TIMESTAMP(3),
    "accountId" TEXT,
    "contactId" TEXT,
    "dealId" TEXT,
    "vendorId" TEXT,
    "crmLeadId" TEXT,
    "bankDetails" TEXT,
    "manualNotes" TEXT,
    "terms" TEXT,
    "referenceNumber" TEXT,
    "location" TEXT,
    "placeOfSupply" TEXT,
    "portOfLoading" TEXT,
    "portOfLoadingCountry" TEXT,
    "portOfDischarge" TEXT,
    "portOfDestinationCountry" TEXT,
    "incoterm" TEXT,
    "containerType" TEXT,
    "numberOfContainers" INTEGER,
    "commodity" TEXT,
    "weight" TEXT,
    "discountType" TEXT DEFAULT 'percentage',
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmApprovalLog" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmApprovalLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmInvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "taxPercent" DOUBLE PRECISION NOT NULL DEFAULT 18.0,
    "taxLabel" TEXT,
    "tds" TEXT,
    "unit" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "exchangeRate" DOUBLE PRECISION NOT NULL DEFAULT 1.0,

    CONSTRAINT "CrmInvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmProject" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNING',
    "startDate" DATE,
    "endDate" DATE,
    "description" TEXT,
    "accountId" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmNote" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "relatedToType" TEXT NOT NULL,
    "relatedToId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmAttachment" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "relatedToType" TEXT NOT NULL,
    "relatedToId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileType" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmTimelineEvent" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "relatedToType" TEXT NOT NULL,
    "relatedToId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "details" JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmTimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmLeadSourceJustdialConfig" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "dashboardUrl" TEXT NOT NULL,
    "importMode" TEXT NOT NULL DEFAULT 'MANUAL',
    "scheduleInterval" TEXT NOT NULL DEFAULT '1h',
    "maxLeads" INTEGER NOT NULL DEFAULT 50,
    "duplicateHandling" TEXT NOT NULL DEFAULT 'UPDATE_EXISTING',
    "defaultOwnerId" TEXT NOT NULL,
    "defaultStage" TEXT NOT NULL DEFAULT 'NEW',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3),
    "cookiesJson" TEXT,
    "isImporting" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmLeadSourceJustdialConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmExternalLeadSnapshot" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'JUSTDIAL',
    "externalLeadKey" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "mobileNumber" TEXT NOT NULL,
    "city" TEXT,
    "category" TEXT,
    "queryText" TEXT,
    "enquirySource" TEXT,
    "enquiryStatus" TEXT,
    "enquiryDateTime" TIMESTAMP(3),
    "jdLeadStatus" TEXT,
    "rawPayload" JSONB NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedToUserId" TEXT,
    "crmLeadId" TEXT,
    "duplicateStatus" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmExternalLeadSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmLeadImportLog" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'JUSTDIAL',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "totalScanned" INTEGER NOT NULL DEFAULT 0,
    "newLeads" INTEGER NOT NULL DEFAULT 0,
    "updatedLeads" INTEGER NOT NULL DEFAULT 0,
    "failedLeads" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmLeadImportLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeePreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "widgets" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeePreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeContact" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "personalEmail" TEXT,
    "emergencyName" TEXT,
    "emergencyPhone" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "zipCode" TEXT,

    CONSTRAINT "EmployeeContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceDefinition" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ServiceDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceForm" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "formKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ServiceForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomField" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB,

    CONSTRAINT "CustomField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "workingDays" TEXT NOT NULL,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,

    CONSTRAINT "ShiftAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceBreak" (
    "id" TEXT NOT NULL,
    "punchId" TEXT NOT NULL,
    "breakStart" TIMESTAMP(3) NOT NULL,
    "breakEnd" TIMESTAMP(3),
    "durationMinutes" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AttendanceBreak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendancePermissionRequest" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "fromTime" TEXT NOT NULL,
    "toTime" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendancePermissionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnDutyRequest" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromDate" DATE NOT NULL,
    "toDate" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnDutyRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BiometricDevice" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "deviceCode" TEXT NOT NULL,
    "ipAddress" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ONLINE',
    "lastActive" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BiometricDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BiometricPunchImport" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "punchTime" TIMESTAMP(3) NOT NULL,
    "punchType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BiometricPunchImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimesheetClient" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "TimesheetClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimesheetProject" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "TimesheetProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimesheetJob" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "TimesheetJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeLog" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,
    "isBillable" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,

    CONSTRAINT "TimeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimesheetSubmission" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimesheetSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "dueDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeSkill" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "proficiency" TEXT NOT NULL,

    CONSTRAINT "EmployeeSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceFeedback" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "feedbackType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PerformanceFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryRevisionLetter" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "letterDate" DATE NOT NULL,
    "fileKey" TEXT NOT NULL,
    "effectiveDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalaryRevisionLetter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "duration" TEXT,
    "category" TEXT,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseEnrollment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ENROLLED',
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "CourseEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Survey" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "anonymous" BOOLEAN NOT NULL DEFAULT false,
    "audience" JSONB,
    "startDate" DATE,
    "endDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Survey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyQuestion" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "options" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SurveyQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyResponse" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "userId" TEXT,
    "answers" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurveyResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileFolder" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "scope" TEXT NOT NULL DEFAULT 'personal',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileAsset" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "folderId" TEXT,
    "scope" TEXT NOT NULL DEFAULT 'personal',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HRCaseCategory" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "HRCaseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FAQ" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,

    CONSTRAINT "FAQ_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HRCase" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assigneeId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HRCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HRCaseComment" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HRCaseComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HRLetterTemplate" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "variables" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HRLetterTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HRLetterRequest" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "details" JSONB,
    "approvedById" TEXT,
    "fileKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HRLetterRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravelRequest" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "fromDate" DATE NOT NULL,
    "toDate" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TravelRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravelExpense" (
    "id" TEXT NOT NULL,
    "travelRequestId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "category" TEXT NOT NULL,
    "billFileKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TravelExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrmsTask" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "dueDate" DATE NOT NULL,
    "assigneeId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HrmsTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrmsAuditLog" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HrmsAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "audience" JSONB,
    "publishedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkReport" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "workedOn" TEXT NOT NULL,
    "jobNoName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "addedAddress" TEXT,
    "modifiedAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkReportApproval" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkReportApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "branchId" TEXT,
    "accountCode" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "parentAccountId" TEXT,
    "rootType" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "isGroup" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "openingDebit" DECIMAL(18,4) NOT NULL DEFAULT 0.0,
    "openingCredit" DECIMAL(18,4) NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FiscalYear" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FiscalYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "branchId" TEXT,
    "voucherNo" TEXT NOT NULL,
    "postingDate" DATE NOT NULL,
    "remarks" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "totalDebit" DECIMAL(18,4) NOT NULL DEFAULT 0.0,
    "totalCredit" DECIMAL(18,4) NOT NULL DEFAULT 0.0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntryLine" (
    "id" TEXT NOT NULL,
    "journalEntryId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "debit" DECIMAL(18,4) NOT NULL DEFAULT 0.0,
    "credit" DECIMAL(18,4) NOT NULL DEFAULT 0.0,
    "partyType" TEXT,
    "partyId" TEXT,
    "remarks" TEXT,

    CONSTRAINT "JournalEntryLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneralLedgerEntry" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "branchId" TEXT,
    "postingDate" DATE NOT NULL,
    "accountId" TEXT NOT NULL,
    "partyType" TEXT,
    "partyId" TEXT,
    "voucherType" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "debit" DECIMAL(18,4) NOT NULL DEFAULT 0.0,
    "credit" DECIMAL(18,4) NOT NULL DEFAULT 0.0,
    "remarks" TEXT,
    "isCancelled" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "jobId" TEXT,
    "journalEntryId" TEXT,

    CONSTRAINT "GeneralLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesInvoice" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "branchId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "crmDealId" TEXT,
    "postingDate" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "grandTotal" DECIMAL(18,4) NOT NULL DEFAULT 0.0,
    "paidAmount" DECIMAL(18,4) NOT NULL DEFAULT 0.0,
    "outstandingAmount" DECIMAL(18,4) NOT NULL DEFAULT 0.0,
    "discountAmount" DECIMAL(18,4) NOT NULL DEFAULT 0.0,
    "taxAmount" DECIMAL(18,4) NOT NULL DEFAULT 0.0,
    "remarks" TEXT,
    "bankDetails" TEXT,
    "manualNotes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "jobId" TEXT,

    CONSTRAINT "SalesInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesInvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "rate" DECIMAL(18,4) NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "exchangeRate" DOUBLE PRECISION NOT NULL DEFAULT 1.0,

    CONSTRAINT "SalesInvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseInvoice" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "branchId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "postingDate" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "grandTotal" DECIMAL(18,4) NOT NULL DEFAULT 0.0,
    "paidAmount" DECIMAL(18,4) NOT NULL DEFAULT 0.0,
    "outstandingAmount" DECIMAL(18,4) NOT NULL DEFAULT 0.0,
    "discountAmount" DECIMAL(18,4) NOT NULL DEFAULT 0.0,
    "taxAmount" DECIMAL(18,4) NOT NULL DEFAULT 0.0,
    "remarks" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "jobId" TEXT,

    CONSTRAINT "PurchaseInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseInvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "rate" DECIMAL(18,4) NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,

    CONSTRAINT "PurchaseInvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentEntry" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "branchId" TEXT,
    "paymentType" TEXT NOT NULL,
    "postingDate" DATE NOT NULL,
    "partyType" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "paidFromAccountId" TEXT NOT NULL,
    "paidToAccountId" TEXT NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "referenceNo" TEXT,
    "remarks" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAllocation" (
    "id" TEXT NOT NULL,
    "paymentEntryId" TEXT NOT NULL,
    "salesInvoiceId" TEXT,
    "purchaseInvoiceId" TEXT,
    "allocatedAmount" DECIMAL(18,4) NOT NULL,

    CONSTRAINT "PaymentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxLine" (
    "id" TEXT NOT NULL,
    "salesInvoiceId" TEXT,
    "purchaseInvoiceId" TEXT,
    "accountId" TEXT NOT NULL,
    "taxRate" DOUBLE PRECISION NOT NULL,
    "taxAmount" DECIMAL(18,4) NOT NULL,

    CONSTRAINT "TaxLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerLedgerEntry" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "branchId" TEXT,
    "customerId" TEXT NOT NULL,
    "postingDate" DATE NOT NULL,
    "voucherType" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "debit" DECIMAL(18,4) NOT NULL DEFAULT 0.0,
    "credit" DECIMAL(18,4) NOT NULL DEFAULT 0.0,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierLedgerEntry" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "branchId" TEXT,
    "supplierId" TEXT NOT NULL,
    "postingDate" DATE NOT NULL,
    "voucherType" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "debit" DECIMAL(18,4) NOT NULL DEFAULT 0.0,
    "credit" DECIMAL(18,4) NOT NULL DEFAULT 0.0,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingSettings" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "defaultReceivableAccountId" TEXT,
    "defaultPayableAccountId" TEXT,
    "defaultCashAccountId" TEXT,
    "defaultBankAccountId" TEXT,
    "defaultSalesAccountId" TEXT,
    "defaultPurchaseAccountId" TEXT,
    "defaultTaxAccountId" TEXT,
    "defaultRoundOffAccountId" TEXT,
    "defaultSalaryExpenseAccountId" TEXT,
    "defaultSalaryPayableAccountId" TEXT,
    "defaultDepreciationExpenseAccountId" TEXT,
    "defaultAccumulatedDepreciationAccountId" TEXT,

    CONSTRAINT "AccountingSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingAuditLog" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "beforeValues" JSONB,
    "afterValues" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountingAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollBatch" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "month" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "totalAmount" DECIMAL(18,4) NOT NULL DEFAULT 0.0,
    "journalEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "branchId" TEXT,
    "assetName" TEXT NOT NULL,
    "assetCode" TEXT NOT NULL,
    "purchaseDate" DATE NOT NULL,
    "purchaseValue" DECIMAL(18,4) NOT NULL,
    "depreciationMethod" TEXT NOT NULL DEFAULT 'STRAIGHT_LINE',
    "depreciationRate" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    "accumulatedDepreciation" DECIMAL(18,4) NOT NULL DEFAULT 0.0,
    "bookValue" DECIMAL(18,4) NOT NULL,
    "assetAccount" TEXT,
    "depreciationAccount" TEXT,
    "accumulatedDepreciationAccount" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetDepreciationEntry" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "depreciationDate" DATE NOT NULL,
    "depreciationAmount" DECIMAL(18,4) NOT NULL,
    "journalEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetDepreciationEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quotation" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "branchId" TEXT,
    "quotationNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "postingDate" DATE NOT NULL,
    "validUntil" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "subTotal" DECIMAL(18,4) NOT NULL DEFAULT 0.0,
    "discountAmount" DECIMAL(18,4) NOT NULL DEFAULT 0.0,
    "taxAmount" DECIMAL(18,4) NOT NULL DEFAULT 0.0,
    "grandTotal" DECIMAL(18,4) NOT NULL DEFAULT 0.0,
    "terms" TEXT,
    "remarks" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationItem" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "hsnSac" TEXT,
    "qty" DOUBLE PRECISION NOT NULL,
    "uom" TEXT,
    "rate" DECIMAL(18,4) NOT NULL,
    "discount" DECIMAL(18,4) NOT NULL DEFAULT 0.0,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 18.0,
    "taxAmount" DECIMAL(18,4) NOT NULL DEFAULT 0.0,
    "amount" DECIMAL(18,4) NOT NULL,

    CONSTRAINT "QuotationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerNote" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "branchId" TEXT,
    "noteNumber" TEXT NOT NULL,
    "noteType" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "originalInvoiceId" TEXT,
    "postingDate" DATE NOT NULL,
    "reason" TEXT,
    "taxableAmount" DECIMAL(18,4) NOT NULL DEFAULT 0.0,
    "taxAmount" DECIMAL(18,4) NOT NULL DEFAULT 0.0,
    "grandTotal" DECIMAL(18,4) NOT NULL DEFAULT 0.0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "remarks" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerNoteItem" (
    "id" TEXT NOT NULL,
    "customerNoteId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "rate" DECIMAL(18,4) NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 18.0,
    "taxAmount" DECIMAL(18,4) NOT NULL DEFAULT 0.0,

    CONSTRAINT "CustomerNoteItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorNote" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "branchId" TEXT,
    "noteNumber" TEXT NOT NULL,
    "noteType" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "originalInvoiceId" TEXT,
    "postingDate" DATE NOT NULL,
    "reason" TEXT,
    "taxableAmount" DECIMAL(18,4) NOT NULL DEFAULT 0.0,
    "taxAmount" DECIMAL(18,4) NOT NULL DEFAULT 0.0,
    "grandTotal" DECIMAL(18,4) NOT NULL DEFAULT 0.0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "remarks" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorNoteItem" (
    "id" TEXT NOT NULL,
    "vendorNoteId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "rate" DECIMAL(18,4) NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 18.0,
    "taxAmount" DECIMAL(18,4) NOT NULL DEFAULT 0.0,

    CONSTRAINT "VendorNoteItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringExpense" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "branchId" TEXT,
    "templateName" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "expenseAccountId" TEXT NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "frequency" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "nextDueDate" DATE NOT NULL,
    "narration" TEXT,
    "autoPost" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringJournal" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "branchId" TEXT,
    "templateName" TEXT NOT NULL,
    "debitAccountId" TEXT NOT NULL,
    "creditAccountId" TEXT NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "narration" TEXT,
    "frequency" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "nextDueDate" DATE NOT NULL,
    "autoPost" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringJournal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionLock" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "lockDate" DATE NOT NULL,
    "lockType" TEXT NOT NULL DEFAULT 'FULL',
    "password" TEXT,
    "lockedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransactionLock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerAccount" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "partnerName" TEXT NOT NULL,
    "partnerCode" TEXT NOT NULL,
    "capitalAccountId" TEXT NOT NULL,
    "currentAccountId" TEXT NOT NULL,
    "profitSharingRatio" DOUBLE PRECISION NOT NULL,
    "interestOnCapital" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "salary" DECIMAL(18,4) NOT NULL DEFAULT 0.0,
    "drawings" DECIMAL(18,4) NOT NULL DEFAULT 0.0,
    "interestOnDrawings" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobCosting" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "branchId" TEXT,
    "jobCode" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "expectedEndDate" DATE,
    "actualEndDate" DATE,
    "contractValue" DECIMAL(18,4) NOT NULL DEFAULT 0.0,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "costCentre" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobCosting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmWorkTimeLog" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leadId" TEXT,
    "accountId" TEXT,
    "invoiceId" TEXT,
    "activityType" TEXT NOT NULL,
    "durationHours" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmWorkTimeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaSettings" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "jobCreatorRoles" JSONB,
    "selfApprovalAllowed" BOOLEAN NOT NULL DEFAULT false,
    "managerApprovalPolicy" TEXT NOT NULL DEFAULT 'ALL',
    "expenseCategories" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChaSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaJobType" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ChaJobType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaDocumentDefinition" (
    "id" TEXT NOT NULL,
    "jobTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    "allowedTypes" JSONB,
    "maxSize" INTEGER NOT NULL DEFAULT 5242880,

    CONSTRAINT "ChaDocumentDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaJob" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "jobNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerRef" TEXT,
    "jobTypeId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "stage" TEXT NOT NULL DEFAULT 'DOCUMENT_COLLECTION',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "primaryOwnerId" TEXT NOT NULL,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChaJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaJobAssignment" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "responsibility" TEXT NOT NULL,

    CONSTRAINT "ChaJobAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaJobDocumentRequirement" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "ChaJobDocumentRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaDocumentVersion" (
    "id" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "checksum" TEXT,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ChaDocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaDocumentException" (
    "id" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attachmentKey" TEXT,

    CONSTRAINT "ChaDocumentException_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaChecklistImport" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "templateVersion" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remarks" TEXT,

    CONSTRAINT "ChaChecklistImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaChecklistSection" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "ChaChecklistSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaChecklistItem" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "identifier" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "responseType" TEXT NOT NULL,
    "value" TEXT,
    "remarks" TEXT,

    CONSTRAINT "ChaChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaChecklistApproval" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "decision" TEXT NOT NULL DEFAULT 'PENDING',
    "remarks" TEXT,
    "actionedAt" TIMESTAMP(3),

    CONSTRAINT "ChaChecklistApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaChecklistReworkNote" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChaChecklistReworkNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaFiling" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "estimatedFilingDate" TIMESTAMP(3),
    "actualFilingDate" TIMESTAMP(3),
    "filingRef" TEXT,
    "filedBillCopyKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "exceptionReason" TEXT,
    "delayReason" TEXT,
    "assignedUserId" TEXT,

    CONSTRAINT "ChaFiling_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaFilingDateHistory" (
    "id" TEXT NOT NULL,
    "filingId" TEXT NOT NULL,
    "estimatedFilingDate" TIMESTAMP(3) NOT NULL,
    "setById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChaFilingDateHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaCustomerAdvance" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "expectedAmount" DECIMAL(18,4) NOT NULL DEFAULT 0.0,
    "dueDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notRequiredReason" TEXT,
    "assignedUserId" TEXT,

    CONSTRAINT "ChaCustomerAdvance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaCustomerAdvanceReceipt" (
    "id" TEXT NOT NULL,
    "advanceId" TEXT NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "receivedDate" TIMESTAMP(3) NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "referenceNumber" TEXT,
    "receiptProofKey" TEXT,
    "remarks" TEXT,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChaCustomerAdvanceReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaExpenseRequest" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "requestedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isUrgent" BOOLEAN NOT NULL DEFAULT false,
    "urgencyReason" TEXT,
    "urgentTargetDate" TIMESTAMP(3),
    "urgentRequestedAt" TIMESTAMP(3),
    "urgentRequestedById" TEXT,

    CONSTRAINT "ChaExpenseRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaExpenseLine" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "requiredDate" TIMESTAMP(3) NOT NULL,
    "supportingDocumentKey" TEXT,
    "remarks" TEXT,

    CONSTRAINT "ChaExpenseLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaExpenseStatusHistory" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "actionedById" TEXT NOT NULL,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChaExpenseStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaExpensePayment" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "amountPaid" DECIMAL(18,4) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "transactionReference" TEXT NOT NULL,
    "paymentProofKey" TEXT,
    "remarks" TEXT,
    "paidById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChaExpensePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaExpenseQuery" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "queryText" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolutionText" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChaExpenseQuery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaAuditLog" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "jobId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prevState" TEXT,
    "newState" TEXT,
    "remarks" TEXT,
    "metadata" JSONB,

    CONSTRAINT "ChaAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BiometricSyncLog_orgId_idx" ON "BiometricSyncLog"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkingCalendar_orgId_key" ON "WorkingCalendar"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "OtSettings_orgId_key" ON "OtSettings"("orgId");

-- CreateIndex
CREATE INDEX "OtRecord_userId_date_idx" ON "OtRecord"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "OtRecord_userId_date_key" ON "OtRecord"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRegularization_userId_date_key" ON "AttendanceRegularization"("userId", "date");

-- CreateIndex
CREATE INDEX "EmployeeLop_payrollMonth_idx" ON "EmployeeLop"("payrollMonth");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeLop_userId_payrollMonth_key" ON "EmployeeLop"("userId", "payrollMonth");

-- CreateIndex
CREATE INDEX "IncrementSlab_minRating_maxRating_idx" ON "IncrementSlab"("minRating", "maxRating");

-- CreateIndex
CREATE INDEX "CrmTicket_raisedById_status_idx" ON "CrmTicket"("raisedById", "status");

-- CreateIndex
CREATE INDEX "CrmTicket_status_createdAt_idx" ON "CrmTicket"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CrmTicketComment_ticketId_createdAt_idx" ON "CrmTicketComment"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "PasskeyResetRequest_status_requestedAt_idx" ON "PasskeyResetRequest"("status", "requestedAt");

-- CreateIndex
CREATE INDEX "PasskeyResetRequest_userId_status_idx" ON "PasskeyResetRequest"("userId", "status");

-- CreateIndex
CREATE INDEX "SecurityEvent_event_outcome_createdAt_idx" ON "SecurityEvent"("event", "outcome", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityEvent_userId_createdAt_idx" ON "SecurityEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityEvent_email_createdAt_idx" ON "SecurityEvent"("email", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityEvent_sessionToken_createdAt_idx" ON "SecurityEvent"("sessionToken", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_token_key" ON "UserSession"("token");

-- CreateIndex
CREATE INDEX "UserSession_userId_status_idx" ON "UserSession"("userId", "status");

-- CreateIndex
CREATE INDEX "UserSession_status_lastSeenAt_idx" ON "UserSession"("status", "lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "CrmLead_enquiryRef_key" ON "CrmLead"("enquiryRef");

-- CreateIndex
CREATE INDEX "CrmLead_orgId_idx" ON "CrmLead"("orgId");

-- CreateIndex
CREATE INDEX "CrmLead_ownerId_idx" ON "CrmLead"("ownerId");

-- CreateIndex
CREATE INDEX "CrmLead_status_idx" ON "CrmLead"("status");

-- CreateIndex
CREATE INDEX "CrmLeadReminder_userId_status_alertAt_idx" ON "CrmLeadReminder"("userId", "status", "alertAt");

-- CreateIndex
CREATE INDEX "CrmContact_orgId_idx" ON "CrmContact"("orgId");

-- CreateIndex
CREATE INDEX "CrmContact_ownerId_idx" ON "CrmContact"("ownerId");

-- CreateIndex
CREATE INDEX "CrmContact_accountId_idx" ON "CrmContact"("accountId");

-- CreateIndex
CREATE INDEX "CrmAccount_orgId_idx" ON "CrmAccount"("orgId");

-- CreateIndex
CREATE INDEX "CrmAccount_ownerId_idx" ON "CrmAccount"("ownerId");

-- CreateIndex
CREATE INDEX "CrmDeal_orgId_idx" ON "CrmDeal"("orgId");

-- CreateIndex
CREATE INDEX "CrmDeal_ownerId_idx" ON "CrmDeal"("ownerId");

-- CreateIndex
CREATE INDEX "CrmDeal_accountId_idx" ON "CrmDeal"("accountId");

-- CreateIndex
CREATE INDEX "CrmActivity_orgId_idx" ON "CrmActivity"("orgId");

-- CreateIndex
CREATE INDEX "CrmActivity_ownerId_idx" ON "CrmActivity"("ownerId");

-- CreateIndex
CREATE INDEX "CrmActivity_relatedToType_relatedToId_idx" ON "CrmActivity"("relatedToType", "relatedToId");

-- CreateIndex
CREATE UNIQUE INDEX "CrmProduct_sku_key" ON "CrmProduct"("sku");

-- CreateIndex
CREATE INDEX "CrmProduct_orgId_idx" ON "CrmProduct"("orgId");

-- CreateIndex
CREATE INDEX "CrmVendor_orgId_idx" ON "CrmVendor"("orgId");

-- CreateIndex
CREATE INDEX "CrmVendor_ownerId_idx" ON "CrmVendor"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "CrmInvoice_invoiceNumber_key" ON "CrmInvoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "CrmInvoice_orgId_idx" ON "CrmInvoice"("orgId");

-- CreateIndex
CREATE INDEX "CrmInvoice_ownerId_idx" ON "CrmInvoice"("ownerId");

-- CreateIndex
CREATE INDEX "CrmInvoice_approvalStatus_idx" ON "CrmInvoice"("approvalStatus");

-- CreateIndex
CREATE INDEX "CrmInvoice_approvedById_idx" ON "CrmInvoice"("approvedById");

-- CreateIndex
CREATE INDEX "CrmInvoice_crmLeadId_idx" ON "CrmInvoice"("crmLeadId");

-- CreateIndex
CREATE INDEX "CrmApprovalLog_invoiceId_createdAt_idx" ON "CrmApprovalLog"("invoiceId", "createdAt");

-- CreateIndex
CREATE INDEX "CrmApprovalLog_orgId_toStatus_createdAt_idx" ON "CrmApprovalLog"("orgId", "toStatus", "createdAt");

-- CreateIndex
CREATE INDEX "CrmApprovalLog_actorId_idx" ON "CrmApprovalLog"("actorId");

-- CreateIndex
CREATE INDEX "CrmInvoiceItem_invoiceId_idx" ON "CrmInvoiceItem"("invoiceId");

-- CreateIndex
CREATE INDEX "CrmProject_orgId_idx" ON "CrmProject"("orgId");

-- CreateIndex
CREATE INDEX "CrmProject_ownerId_idx" ON "CrmProject"("ownerId");

-- CreateIndex
CREATE INDEX "CrmNote_orgId_idx" ON "CrmNote"("orgId");

-- CreateIndex
CREATE INDEX "CrmNote_relatedToType_relatedToId_idx" ON "CrmNote"("relatedToType", "relatedToId");

-- CreateIndex
CREATE INDEX "CrmAttachment_orgId_idx" ON "CrmAttachment"("orgId");

-- CreateIndex
CREATE INDEX "CrmAttachment_relatedToType_relatedToId_idx" ON "CrmAttachment"("relatedToType", "relatedToId");

-- CreateIndex
CREATE INDEX "CrmTimelineEvent_orgId_idx" ON "CrmTimelineEvent"("orgId");

-- CreateIndex
CREATE INDEX "CrmTimelineEvent_relatedToType_relatedToId_idx" ON "CrmTimelineEvent"("relatedToType", "relatedToId");

-- CreateIndex
CREATE UNIQUE INDEX "CrmLeadSourceJustdialConfig_orgId_key" ON "CrmLeadSourceJustdialConfig"("orgId");

-- CreateIndex
CREATE INDEX "CrmLeadSourceJustdialConfig_orgId_idx" ON "CrmLeadSourceJustdialConfig"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "CrmExternalLeadSnapshot_externalLeadKey_key" ON "CrmExternalLeadSnapshot"("externalLeadKey");

-- CreateIndex
CREATE UNIQUE INDEX "CrmExternalLeadSnapshot_crmLeadId_key" ON "CrmExternalLeadSnapshot"("crmLeadId");

-- CreateIndex
CREATE INDEX "CrmExternalLeadSnapshot_orgId_idx" ON "CrmExternalLeadSnapshot"("orgId");

-- CreateIndex
CREATE INDEX "CrmExternalLeadSnapshot_externalLeadKey_idx" ON "CrmExternalLeadSnapshot"("externalLeadKey");

-- CreateIndex
CREATE INDEX "CrmLeadImportLog_orgId_idx" ON "CrmLeadImportLog"("orgId");

-- CreateIndex
CREATE INDEX "CrmLeadImportLog_createdAt_idx" ON "CrmLeadImportLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeePreference_userId_key" ON "EmployeePreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeContact_userId_key" ON "EmployeeContact"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceDefinition_key_key" ON "ServiceDefinition"("key");

-- CreateIndex
CREATE UNIQUE INDEX "BiometricDevice_deviceCode_key" ON "BiometricDevice"("deviceCode");

-- CreateIndex
CREATE INDEX "Account_orgId_idx" ON "Account"("orgId");

-- CreateIndex
CREATE INDEX "Account_branchId_idx" ON "Account"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_orgId_accountCode_key" ON "Account"("orgId", "accountCode");

-- CreateIndex
CREATE INDEX "FiscalYear_orgId_idx" ON "FiscalYear"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "FiscalYear_orgId_name_key" ON "FiscalYear"("orgId", "name");

-- CreateIndex
CREATE INDEX "JournalEntry_orgId_idx" ON "JournalEntry"("orgId");

-- CreateIndex
CREATE INDEX "JournalEntry_branchId_idx" ON "JournalEntry"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "JournalEntry_orgId_voucherNo_key" ON "JournalEntry"("orgId", "voucherNo");

-- CreateIndex
CREATE INDEX "JournalEntryLine_journalEntryId_idx" ON "JournalEntryLine"("journalEntryId");

-- CreateIndex
CREATE INDEX "JournalEntryLine_accountId_idx" ON "JournalEntryLine"("accountId");

-- CreateIndex
CREATE INDEX "GeneralLedgerEntry_orgId_idx" ON "GeneralLedgerEntry"("orgId");

-- CreateIndex
CREATE INDEX "GeneralLedgerEntry_branchId_idx" ON "GeneralLedgerEntry"("branchId");

-- CreateIndex
CREATE INDEX "GeneralLedgerEntry_accountId_idx" ON "GeneralLedgerEntry"("accountId");

-- CreateIndex
CREATE INDEX "GeneralLedgerEntry_voucherId_idx" ON "GeneralLedgerEntry"("voucherId");

-- CreateIndex
CREATE INDEX "GeneralLedgerEntry_journalEntryId_idx" ON "GeneralLedgerEntry"("journalEntryId");

-- CreateIndex
CREATE INDEX "GeneralLedgerEntry_jobId_idx" ON "GeneralLedgerEntry"("jobId");

-- CreateIndex
CREATE INDEX "SalesInvoice_orgId_idx" ON "SalesInvoice"("orgId");

-- CreateIndex
CREATE INDEX "SalesInvoice_branchId_idx" ON "SalesInvoice"("branchId");

-- CreateIndex
CREATE INDEX "SalesInvoice_customerId_idx" ON "SalesInvoice"("customerId");

-- CreateIndex
CREATE INDEX "SalesInvoice_crmDealId_idx" ON "SalesInvoice"("crmDealId");

-- CreateIndex
CREATE INDEX "SalesInvoice_jobId_idx" ON "SalesInvoice"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesInvoice_orgId_invoiceNumber_key" ON "SalesInvoice"("orgId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "SalesInvoiceItem_invoiceId_idx" ON "SalesInvoiceItem"("invoiceId");

-- CreateIndex
CREATE INDEX "PurchaseInvoice_orgId_idx" ON "PurchaseInvoice"("orgId");

-- CreateIndex
CREATE INDEX "PurchaseInvoice_branchId_idx" ON "PurchaseInvoice"("branchId");

-- CreateIndex
CREATE INDEX "PurchaseInvoice_supplierId_idx" ON "PurchaseInvoice"("supplierId");

-- CreateIndex
CREATE INDEX "PurchaseInvoice_jobId_idx" ON "PurchaseInvoice"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseInvoice_orgId_invoiceNumber_key" ON "PurchaseInvoice"("orgId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "PurchaseInvoiceItem_invoiceId_idx" ON "PurchaseInvoiceItem"("invoiceId");

-- CreateIndex
CREATE INDEX "PaymentEntry_orgId_idx" ON "PaymentEntry"("orgId");

-- CreateIndex
CREATE INDEX "PaymentEntry_branchId_idx" ON "PaymentEntry"("branchId");

-- CreateIndex
CREATE INDEX "PaymentAllocation_paymentEntryId_idx" ON "PaymentAllocation"("paymentEntryId");

-- CreateIndex
CREATE INDEX "PaymentAllocation_salesInvoiceId_idx" ON "PaymentAllocation"("salesInvoiceId");

-- CreateIndex
CREATE INDEX "PaymentAllocation_purchaseInvoiceId_idx" ON "PaymentAllocation"("purchaseInvoiceId");

-- CreateIndex
CREATE INDEX "TaxLine_accountId_idx" ON "TaxLine"("accountId");

-- CreateIndex
CREATE INDEX "TaxLine_salesInvoiceId_idx" ON "TaxLine"("salesInvoiceId");

-- CreateIndex
CREATE INDEX "TaxLine_purchaseInvoiceId_idx" ON "TaxLine"("purchaseInvoiceId");

-- CreateIndex
CREATE INDEX "CustomerLedgerEntry_orgId_idx" ON "CustomerLedgerEntry"("orgId");

-- CreateIndex
CREATE INDEX "CustomerLedgerEntry_branchId_idx" ON "CustomerLedgerEntry"("branchId");

-- CreateIndex
CREATE INDEX "CustomerLedgerEntry_customerId_idx" ON "CustomerLedgerEntry"("customerId");

-- CreateIndex
CREATE INDEX "SupplierLedgerEntry_orgId_idx" ON "SupplierLedgerEntry"("orgId");

-- CreateIndex
CREATE INDEX "SupplierLedgerEntry_branchId_idx" ON "SupplierLedgerEntry"("branchId");

-- CreateIndex
CREATE INDEX "SupplierLedgerEntry_supplierId_idx" ON "SupplierLedgerEntry"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingSettings_orgId_key" ON "AccountingSettings"("orgId");

-- CreateIndex
CREATE INDEX "AccountingSettings_orgId_idx" ON "AccountingSettings"("orgId");

-- CreateIndex
CREATE INDEX "AccountingAuditLog_orgId_idx" ON "AccountingAuditLog"("orgId");

-- CreateIndex
CREATE INDEX "AccountingAuditLog_userId_idx" ON "AccountingAuditLog"("userId");

-- CreateIndex
CREATE INDEX "PayrollBatch_orgId_idx" ON "PayrollBatch"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollBatch_orgId_month_key" ON "PayrollBatch"("orgId", "month");

-- CreateIndex
CREATE INDEX "Asset_orgId_idx" ON "Asset"("orgId");

-- CreateIndex
CREATE INDEX "Asset_branchId_idx" ON "Asset"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_orgId_assetCode_key" ON "Asset"("orgId", "assetCode");

-- CreateIndex
CREATE INDEX "AssetDepreciationEntry_orgId_idx" ON "AssetDepreciationEntry"("orgId");

-- CreateIndex
CREATE INDEX "AssetDepreciationEntry_assetId_idx" ON "AssetDepreciationEntry"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "AssetDepreciationEntry_assetId_depreciationDate_key" ON "AssetDepreciationEntry"("assetId", "depreciationDate");

-- CreateIndex
CREATE INDEX "Quotation_orgId_idx" ON "Quotation"("orgId");

-- CreateIndex
CREATE INDEX "Quotation_branchId_idx" ON "Quotation"("branchId");

-- CreateIndex
CREATE INDEX "Quotation_customerId_idx" ON "Quotation"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Quotation_orgId_quotationNumber_key" ON "Quotation"("orgId", "quotationNumber");

-- CreateIndex
CREATE INDEX "QuotationItem_quotationId_idx" ON "QuotationItem"("quotationId");

-- CreateIndex
CREATE INDEX "CustomerNote_orgId_idx" ON "CustomerNote"("orgId");

-- CreateIndex
CREATE INDEX "CustomerNote_branchId_idx" ON "CustomerNote"("branchId");

-- CreateIndex
CREATE INDEX "CustomerNote_customerId_idx" ON "CustomerNote"("customerId");

-- CreateIndex
CREATE INDEX "CustomerNote_originalInvoiceId_idx" ON "CustomerNote"("originalInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerNote_orgId_noteNumber_key" ON "CustomerNote"("orgId", "noteNumber");

-- CreateIndex
CREATE INDEX "CustomerNoteItem_customerNoteId_idx" ON "CustomerNoteItem"("customerNoteId");

-- CreateIndex
CREATE INDEX "VendorNote_orgId_idx" ON "VendorNote"("orgId");

-- CreateIndex
CREATE INDEX "VendorNote_branchId_idx" ON "VendorNote"("branchId");

-- CreateIndex
CREATE INDEX "VendorNote_vendorId_idx" ON "VendorNote"("vendorId");

-- CreateIndex
CREATE INDEX "VendorNote_originalInvoiceId_idx" ON "VendorNote"("originalInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorNote_orgId_noteNumber_key" ON "VendorNote"("orgId", "noteNumber");

-- CreateIndex
CREATE INDEX "VendorNoteItem_vendorNoteId_idx" ON "VendorNoteItem"("vendorNoteId");

-- CreateIndex
CREATE INDEX "RecurringExpense_orgId_idx" ON "RecurringExpense"("orgId");

-- CreateIndex
CREATE INDEX "RecurringExpense_branchId_idx" ON "RecurringExpense"("branchId");

-- CreateIndex
CREATE INDEX "RecurringExpense_vendorId_idx" ON "RecurringExpense"("vendorId");

-- CreateIndex
CREATE INDEX "RecurringExpense_expenseAccountId_idx" ON "RecurringExpense"("expenseAccountId");

-- CreateIndex
CREATE INDEX "RecurringJournal_orgId_idx" ON "RecurringJournal"("orgId");

-- CreateIndex
CREATE INDEX "RecurringJournal_branchId_idx" ON "RecurringJournal"("branchId");

-- CreateIndex
CREATE INDEX "RecurringJournal_debitAccountId_idx" ON "RecurringJournal"("debitAccountId");

-- CreateIndex
CREATE INDEX "RecurringJournal_creditAccountId_idx" ON "RecurringJournal"("creditAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionLock_orgId_key" ON "TransactionLock"("orgId");

-- CreateIndex
CREATE INDEX "TransactionLock_orgId_idx" ON "TransactionLock"("orgId");

-- CreateIndex
CREATE INDEX "PartnerAccount_orgId_idx" ON "PartnerAccount"("orgId");

-- CreateIndex
CREATE INDEX "PartnerAccount_capitalAccountId_idx" ON "PartnerAccount"("capitalAccountId");

-- CreateIndex
CREATE INDEX "PartnerAccount_currentAccountId_idx" ON "PartnerAccount"("currentAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerAccount_orgId_partnerCode_key" ON "PartnerAccount"("orgId", "partnerCode");

-- CreateIndex
CREATE INDEX "JobCosting_orgId_idx" ON "JobCosting"("orgId");

-- CreateIndex
CREATE INDEX "JobCosting_branchId_idx" ON "JobCosting"("branchId");

-- CreateIndex
CREATE INDEX "JobCosting_customerId_idx" ON "JobCosting"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "JobCosting_orgId_jobCode_key" ON "JobCosting"("orgId", "jobCode");

-- CreateIndex
CREATE INDEX "CrmWorkTimeLog_orgId_idx" ON "CrmWorkTimeLog"("orgId");

-- CreateIndex
CREATE INDEX "CrmWorkTimeLog_leadId_idx" ON "CrmWorkTimeLog"("leadId");

-- CreateIndex
CREATE INDEX "CrmWorkTimeLog_accountId_idx" ON "CrmWorkTimeLog"("accountId");

-- CreateIndex
CREATE INDEX "CrmWorkTimeLog_invoiceId_idx" ON "CrmWorkTimeLog"("invoiceId");

-- CreateIndex
CREATE INDEX "CrmWorkTimeLog_userId_idx" ON "CrmWorkTimeLog"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ChaSettings_orgId_key" ON "ChaSettings"("orgId");

-- CreateIndex
CREATE INDEX "ChaJobType_orgId_idx" ON "ChaJobType"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "ChaJobType_orgId_name_key" ON "ChaJobType"("orgId", "name");

-- CreateIndex
CREATE INDEX "ChaDocumentDefinition_jobTypeId_idx" ON "ChaDocumentDefinition"("jobTypeId");

-- CreateIndex
CREATE INDEX "ChaJob_orgId_stage_status_idx" ON "ChaJob"("orgId", "stage", "status");

-- CreateIndex
CREATE INDEX "ChaJob_orgId_jobNumber_idx" ON "ChaJob"("orgId", "jobNumber");

-- CreateIndex
CREATE INDEX "ChaJob_primaryOwnerId_idx" ON "ChaJob"("primaryOwnerId");

-- CreateIndex
CREATE INDEX "ChaJob_createdAt_idx" ON "ChaJob"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChaJob_orgId_jobNumber_key" ON "ChaJob"("orgId", "jobNumber");

-- CreateIndex
CREATE INDEX "ChaJobAssignment_userId_idx" ON "ChaJobAssignment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ChaJobAssignment_jobId_userId_responsibility_key" ON "ChaJobAssignment"("jobId", "userId", "responsibility");

-- CreateIndex
CREATE INDEX "ChaJobDocumentRequirement_jobId_idx" ON "ChaJobDocumentRequirement"("jobId");

-- CreateIndex
CREATE INDEX "ChaDocumentVersion_requirementId_idx" ON "ChaDocumentVersion"("requirementId");

-- CreateIndex
CREATE INDEX "ChaDocumentVersion_uploadedById_idx" ON "ChaDocumentVersion"("uploadedById");

-- CreateIndex
CREATE UNIQUE INDEX "ChaDocumentException_requirementId_key" ON "ChaDocumentException"("requirementId");

-- CreateIndex
CREATE INDEX "ChaDocumentException_userId_idx" ON "ChaDocumentException"("userId");

-- CreateIndex
CREATE INDEX "ChaChecklistImport_jobId_idx" ON "ChaChecklistImport"("jobId");

-- CreateIndex
CREATE INDEX "ChaChecklistImport_uploadedById_idx" ON "ChaChecklistImport"("uploadedById");

-- CreateIndex
CREATE INDEX "ChaChecklistSection_importId_idx" ON "ChaChecklistSection"("importId");

-- CreateIndex
CREATE INDEX "ChaChecklistItem_sectionId_idx" ON "ChaChecklistItem"("sectionId");

-- CreateIndex
CREATE INDEX "ChaChecklistApproval_importId_idx" ON "ChaChecklistApproval"("importId");

-- CreateIndex
CREATE INDEX "ChaChecklistApproval_managerId_idx" ON "ChaChecklistApproval"("managerId");

-- CreateIndex
CREATE INDEX "ChaChecklistReworkNote_importId_idx" ON "ChaChecklistReworkNote"("importId");

-- CreateIndex
CREATE INDEX "ChaChecklistReworkNote_authorId_idx" ON "ChaChecklistReworkNote"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "ChaFiling_jobId_key" ON "ChaFiling"("jobId");

-- CreateIndex
CREATE INDEX "ChaFiling_estimatedFilingDate_status_idx" ON "ChaFiling"("estimatedFilingDate", "status");

-- CreateIndex
CREATE INDEX "ChaFilingDateHistory_filingId_idx" ON "ChaFilingDateHistory"("filingId");

-- CreateIndex
CREATE INDEX "ChaFilingDateHistory_setById_idx" ON "ChaFilingDateHistory"("setById");

-- CreateIndex
CREATE UNIQUE INDEX "ChaCustomerAdvance_jobId_key" ON "ChaCustomerAdvance"("jobId");

-- CreateIndex
CREATE INDEX "ChaCustomerAdvanceReceipt_advanceId_idx" ON "ChaCustomerAdvanceReceipt"("advanceId");

-- CreateIndex
CREATE INDEX "ChaExpenseRequest_jobId_idx" ON "ChaExpenseRequest"("jobId");

-- CreateIndex
CREATE INDEX "ChaExpenseRequest_orgId_status_idx" ON "ChaExpenseRequest"("orgId", "status");

-- CreateIndex
CREATE INDEX "ChaExpenseRequest_requestedById_idx" ON "ChaExpenseRequest"("requestedById");

-- CreateIndex
CREATE INDEX "ChaExpenseLine_requestId_idx" ON "ChaExpenseLine"("requestId");

-- CreateIndex
CREATE INDEX "ChaExpenseStatusHistory_requestId_idx" ON "ChaExpenseStatusHistory"("requestId");

-- CreateIndex
CREATE INDEX "ChaExpensePayment_requestId_idx" ON "ChaExpensePayment"("requestId");

-- CreateIndex
CREATE INDEX "ChaExpensePayment_paidById_idx" ON "ChaExpensePayment"("paidById");

-- CreateIndex
CREATE INDEX "ChaExpenseQuery_requestId_idx" ON "ChaExpenseQuery"("requestId");

-- CreateIndex
CREATE INDEX "ChaExpenseQuery_authorId_idx" ON "ChaExpenseQuery"("authorId");

-- CreateIndex
CREATE INDEX "ChaAuditLog_orgId_timestamp_idx" ON "ChaAuditLog"("orgId", "timestamp");

-- CreateIndex
CREATE INDEX "ChaAuditLog_jobId_timestamp_idx" ON "ChaAuditLog"("jobId", "timestamp");

-- CreateIndex
CREATE INDEX "AppraisalCriterion_orgId_phase_idx" ON "AppraisalCriterion"("orgId", "phase");

-- AddForeignKey
ALTER TABLE "AppraisalCriterion" ADD CONSTRAINT "AppraisalCriterion_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "AppraisalCriterion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HikeDecision" ADD CONSTRAINT "HikeDecision_slabId_fkey" FOREIGN KEY ("slabId") REFERENCES "IncrementSlab"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BiometricSyncLog" ADD CONSTRAINT "BiometricSyncLog_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BiometricSyncLog" ADD CONSTRAINT "BiometricSyncLog_triggeredById_fkey" FOREIGN KEY ("triggeredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkingCalendar" ADD CONSTRAINT "WorkingCalendar_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OtSettings" ADD CONSTRAINT "OtSettings_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OtRecord" ADD CONSTRAINT "OtRecord_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OtRecord" ADD CONSTRAINT "OtRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRegularization" ADD CONSTRAINT "AttendanceRegularization_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRegularization" ADD CONSTRAINT "AttendanceRegularization_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeLop" ADD CONSTRAINT "EmployeeLop_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppraisalExtensionRequest" ADD CONSTRAINT "AppraisalExtensionRequest_appraisalId_fkey" FOREIGN KEY ("appraisalId") REFERENCES "Appraisal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppraisalExtensionRequest" ADD CONSTRAINT "AppraisalExtensionRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppraisalExtensionRequest" ADD CONSTRAINT "AppraisalExtensionRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingReschedule" ADD CONSTRAINT "MeetingReschedule_appraisalId_fkey" FOREIGN KEY ("appraisalId") REFERENCES "Appraisal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingReschedule" ADD CONSTRAINT "MeetingReschedule_rescheduledById_fkey" FOREIGN KEY ("rescheduledById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingReschedule" ADD CONSTRAINT "MeetingReschedule_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmTicket" ADD CONSTRAINT "CrmTicket_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmTicket" ADD CONSTRAINT "CrmTicket_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmTicketComment" ADD CONSTRAINT "CrmTicketComment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "CrmTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmTicketComment" ADD CONSTRAINT "CrmTicketComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasskeyResetRequest" ADD CONSTRAINT "PasskeyResetRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasskeyResetRequest" ADD CONSTRAINT "PasskeyResetRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityEvent" ADD CONSTRAINT "SecurityEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmLead" ADD CONSTRAINT "CrmLead_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmLeadReminder" ADD CONSTRAINT "CrmLeadReminder_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "CrmLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmLeadReminder" ADD CONSTRAINT "CrmLeadReminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmContact" ADD CONSTRAINT "CrmContact_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmContact" ADD CONSTRAINT "CrmContact_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CrmAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmAccount" ADD CONSTRAINT "CrmAccount_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmDeal" ADD CONSTRAINT "CrmDeal_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmDeal" ADD CONSTRAINT "CrmDeal_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CrmAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmDeal" ADD CONSTRAINT "CrmDeal_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CrmContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmActivity" ADD CONSTRAINT "CrmActivity_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmVendor" ADD CONSTRAINT "CrmVendor_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmInvoice" ADD CONSTRAINT "CrmInvoice_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmInvoice" ADD CONSTRAINT "CrmInvoice_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmInvoice" ADD CONSTRAINT "CrmInvoice_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CrmAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmInvoice" ADD CONSTRAINT "CrmInvoice_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CrmContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmInvoice" ADD CONSTRAINT "CrmInvoice_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "CrmDeal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmInvoice" ADD CONSTRAINT "CrmInvoice_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "CrmVendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmInvoice" ADD CONSTRAINT "CrmInvoice_crmLeadId_fkey" FOREIGN KEY ("crmLeadId") REFERENCES "CrmLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmApprovalLog" ADD CONSTRAINT "CrmApprovalLog_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmApprovalLog" ADD CONSTRAINT "CrmApprovalLog_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "CrmInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmApprovalLog" ADD CONSTRAINT "CrmApprovalLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmInvoiceItem" ADD CONSTRAINT "CrmInvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "CrmInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmProject" ADD CONSTRAINT "CrmProject_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmProject" ADD CONSTRAINT "CrmProject_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CrmAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmNote" ADD CONSTRAINT "CrmNote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmAttachment" ADD CONSTRAINT "CrmAttachment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmTimelineEvent" ADD CONSTRAINT "CrmTimelineEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmLeadSourceJustdialConfig" ADD CONSTRAINT "CrmLeadSourceJustdialConfig_defaultOwnerId_fkey" FOREIGN KEY ("defaultOwnerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmExternalLeadSnapshot" ADD CONSTRAINT "CrmExternalLeadSnapshot_crmLeadId_fkey" FOREIGN KEY ("crmLeadId") REFERENCES "CrmLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmExternalLeadSnapshot" ADD CONSTRAINT "CrmExternalLeadSnapshot_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePreference" ADD CONSTRAINT "EmployeePreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeContact" ADD CONSTRAINT "EmployeeContact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceForm" ADD CONSTRAINT "ServiceForm_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomField" ADD CONSTRAINT "CustomField_formId_fkey" FOREIGN KEY ("formId") REFERENCES "ServiceForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftAssignment" ADD CONSTRAINT "ShiftAssignment_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftAssignment" ADD CONSTRAINT "ShiftAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendancePermissionRequest" ADD CONSTRAINT "AttendancePermissionRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnDutyRequest" ADD CONSTRAINT "OnDutyRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimesheetProject" ADD CONSTRAINT "TimesheetProject_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "TimesheetClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimesheetJob" ADD CONSTRAINT "TimesheetJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "TimesheetProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeLog" ADD CONSTRAINT "TimeLog_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "TimesheetJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimesheetSubmission" ADD CONSTRAINT "TimesheetSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeSkill" ADD CONSTRAINT "EmployeeSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeSkill" ADD CONSTRAINT "EmployeeSkill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceFeedback" ADD CONSTRAINT "PerformanceFeedback_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceFeedback" ADD CONSTRAINT "PerformanceFeedback_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryRevisionLetter" ADD CONSTRAINT "SalaryRevisionLetter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseEnrollment" ADD CONSTRAINT "CourseEnrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseEnrollment" ADD CONSTRAINT "CourseEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyQuestion" ADD CONSTRAINT "SurveyQuestion_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAsset" ADD CONSTRAINT "FileAsset_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "FileFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FAQ" ADD CONSTRAINT "FAQ_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "HRCaseCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HRCase" ADD CONSTRAINT "HRCase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HRCase" ADD CONSTRAINT "HRCase_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HRCaseComment" ADD CONSTRAINT "HRCaseComment_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "HRCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HRLetterRequest" ADD CONSTRAINT "HRLetterRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelRequest" ADD CONSTRAINT "TravelRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelExpense" ADD CONSTRAINT "TravelExpense_travelRequestId_fkey" FOREIGN KEY ("travelRequestId") REFERENCES "TravelRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrmsTask" ADD CONSTRAINT "HrmsTask_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrmsTask" ADD CONSTRAINT "HrmsTask_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrmsAuditLog" ADD CONSTRAINT "HrmsAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkReport" ADD CONSTRAINT "WorkReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkReportApproval" ADD CONSTRAINT "WorkReportApproval_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "WorkReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_parentAccountId_fkey" FOREIGN KEY ("parentAccountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FiscalYear" ADD CONSTRAINT "FiscalYear_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntryLine" ADD CONSTRAINT "JournalEntryLine_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntryLine" ADD CONSTRAINT "JournalEntryLine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneralLedgerEntry" ADD CONSTRAINT "GeneralLedgerEntry_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "JobCosting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneralLedgerEntry" ADD CONSTRAINT "GeneralLedgerEntry_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneralLedgerEntry" ADD CONSTRAINT "GeneralLedgerEntry_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneralLedgerEntry" ADD CONSTRAINT "GeneralLedgerEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneralLedgerEntry" ADD CONSTRAINT "GLEntry_JournalEntry_FK" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "JobCosting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CrmAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_crmDealId_fkey" FOREIGN KEY ("crmDealId") REFERENCES "CrmDeal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoiceItem" ADD CONSTRAINT "SalesInvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "SalesInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseInvoice" ADD CONSTRAINT "PurchaseInvoice_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "JobCosting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseInvoice" ADD CONSTRAINT "PurchaseInvoice_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseInvoice" ADD CONSTRAINT "PurchaseInvoice_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseInvoice" ADD CONSTRAINT "PurchaseInvoice_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "CrmVendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseInvoiceItem" ADD CONSTRAINT "PurchaseInvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "PurchaseInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentEntry" ADD CONSTRAINT "PaymentEntry_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentEntry" ADD CONSTRAINT "PaymentEntry_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentEntry" ADD CONSTRAINT "PaymentEntry_paidFromAccountId_fkey" FOREIGN KEY ("paidFromAccountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentEntry" ADD CONSTRAINT "PaymentEntry_paidToAccountId_fkey" FOREIGN KEY ("paidToAccountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_paymentEntryId_fkey" FOREIGN KEY ("paymentEntryId") REFERENCES "PaymentEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_salesInvoiceId_fkey" FOREIGN KEY ("salesInvoiceId") REFERENCES "SalesInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_purchaseInvoiceId_fkey" FOREIGN KEY ("purchaseInvoiceId") REFERENCES "PurchaseInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxLine" ADD CONSTRAINT "TaxLine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxLine" ADD CONSTRAINT "TaxLine_salesInvoiceId_fkey" FOREIGN KEY ("salesInvoiceId") REFERENCES "SalesInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxLine" ADD CONSTRAINT "TaxLine_purchaseInvoiceId_fkey" FOREIGN KEY ("purchaseInvoiceId") REFERENCES "PurchaseInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerLedgerEntry" ADD CONSTRAINT "CustomerLedgerEntry_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerLedgerEntry" ADD CONSTRAINT "CustomerLedgerEntry_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerLedgerEntry" ADD CONSTRAINT "CustomerLedgerEntry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CrmAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierLedgerEntry" ADD CONSTRAINT "SupplierLedgerEntry_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierLedgerEntry" ADD CONSTRAINT "SupplierLedgerEntry_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierLedgerEntry" ADD CONSTRAINT "SupplierLedgerEntry_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "CrmVendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingSettings" ADD CONSTRAINT "AccountingSettings_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingAuditLog" ADD CONSTRAINT "AccountingAuditLog_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingAuditLog" ADD CONSTRAINT "AccountingAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollBatch" ADD CONSTRAINT "PayrollBatch_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollBatch" ADD CONSTRAINT "PayrollBatch_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetDepreciationEntry" ADD CONSTRAINT "AssetDepreciationEntry_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetDepreciationEntry" ADD CONSTRAINT "AssetDepreciationEntry_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetDepreciationEntry" ADD CONSTRAINT "AssetDepreciationEntry_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CrmAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationItem" ADD CONSTRAINT "QuotationItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerNote" ADD CONSTRAINT "CustomerNote_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerNote" ADD CONSTRAINT "CustomerNote_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerNote" ADD CONSTRAINT "CustomerNote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CrmAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerNote" ADD CONSTRAINT "CustomerNote_originalInvoiceId_fkey" FOREIGN KEY ("originalInvoiceId") REFERENCES "SalesInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerNoteItem" ADD CONSTRAINT "CustomerNoteItem_customerNoteId_fkey" FOREIGN KEY ("customerNoteId") REFERENCES "CustomerNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorNote" ADD CONSTRAINT "VendorNote_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorNote" ADD CONSTRAINT "VendorNote_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorNote" ADD CONSTRAINT "VendorNote_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "CrmVendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorNote" ADD CONSTRAINT "VendorNote_originalInvoiceId_fkey" FOREIGN KEY ("originalInvoiceId") REFERENCES "PurchaseInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorNoteItem" ADD CONSTRAINT "VendorNoteItem_vendorNoteId_fkey" FOREIGN KEY ("vendorNoteId") REFERENCES "VendorNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringExpense" ADD CONSTRAINT "RecurringExpense_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringExpense" ADD CONSTRAINT "RecurringExpense_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringExpense" ADD CONSTRAINT "RecurringExpense_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "CrmVendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringExpense" ADD CONSTRAINT "RecurringExpense_expenseAccountId_fkey" FOREIGN KEY ("expenseAccountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringJournal" ADD CONSTRAINT "RecurringJournal_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringJournal" ADD CONSTRAINT "RecurringJournal_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringJournal" ADD CONSTRAINT "RecurringJournal_debitAccountId_fkey" FOREIGN KEY ("debitAccountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringJournal" ADD CONSTRAINT "RecurringJournal_creditAccountId_fkey" FOREIGN KEY ("creditAccountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionLock" ADD CONSTRAINT "TransactionLock_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerAccount" ADD CONSTRAINT "PartnerAccount_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerAccount" ADD CONSTRAINT "PartnerAccount_capitalAccountId_fkey" FOREIGN KEY ("capitalAccountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerAccount" ADD CONSTRAINT "PartnerAccount_currentAccountId_fkey" FOREIGN KEY ("currentAccountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCosting" ADD CONSTRAINT "JobCosting_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCosting" ADD CONSTRAINT "JobCosting_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCosting" ADD CONSTRAINT "JobCosting_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CrmAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmWorkTimeLog" ADD CONSTRAINT "CrmWorkTimeLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmWorkTimeLog" ADD CONSTRAINT "CrmWorkTimeLog_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "CrmLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmWorkTimeLog" ADD CONSTRAINT "CrmWorkTimeLog_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaSettings" ADD CONSTRAINT "ChaSettings_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaDocumentDefinition" ADD CONSTRAINT "ChaDocumentDefinition_jobTypeId_fkey" FOREIGN KEY ("jobTypeId") REFERENCES "ChaJobType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaJob" ADD CONSTRAINT "ChaJob_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaJob" ADD CONSTRAINT "ChaJob_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CrmAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaJob" ADD CONSTRAINT "ChaJob_jobTypeId_fkey" FOREIGN KEY ("jobTypeId") REFERENCES "ChaJobType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaJob" ADD CONSTRAINT "ChaJob_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaJob" ADD CONSTRAINT "ChaJob_primaryOwnerId_fkey" FOREIGN KEY ("primaryOwnerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaJobAssignment" ADD CONSTRAINT "ChaJobAssignment_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ChaJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaJobAssignment" ADD CONSTRAINT "ChaJobAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaJobDocumentRequirement" ADD CONSTRAINT "ChaJobDocumentRequirement_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ChaJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaDocumentVersion" ADD CONSTRAINT "ChaDocumentVersion_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "ChaJobDocumentRequirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaDocumentVersion" ADD CONSTRAINT "ChaDocumentVersion_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaDocumentException" ADD CONSTRAINT "ChaDocumentException_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "ChaJobDocumentRequirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaDocumentException" ADD CONSTRAINT "ChaDocumentException_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaChecklistImport" ADD CONSTRAINT "ChaChecklistImport_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ChaJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaChecklistImport" ADD CONSTRAINT "ChaChecklistImport_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaChecklistSection" ADD CONSTRAINT "ChaChecklistSection_importId_fkey" FOREIGN KEY ("importId") REFERENCES "ChaChecklistImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaChecklistItem" ADD CONSTRAINT "ChaChecklistItem_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "ChaChecklistSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaChecklistApproval" ADD CONSTRAINT "ChaChecklistApproval_importId_fkey" FOREIGN KEY ("importId") REFERENCES "ChaChecklistImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaChecklistApproval" ADD CONSTRAINT "ChaChecklistApproval_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaChecklistReworkNote" ADD CONSTRAINT "ChaChecklistReworkNote_importId_fkey" FOREIGN KEY ("importId") REFERENCES "ChaChecklistImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaChecklistReworkNote" ADD CONSTRAINT "ChaChecklistReworkNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaFiling" ADD CONSTRAINT "ChaFiling_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ChaJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaFilingDateHistory" ADD CONSTRAINT "ChaFilingDateHistory_filingId_fkey" FOREIGN KEY ("filingId") REFERENCES "ChaFiling"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaFilingDateHistory" ADD CONSTRAINT "ChaFilingDateHistory_setById_fkey" FOREIGN KEY ("setById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaCustomerAdvance" ADD CONSTRAINT "ChaCustomerAdvance_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ChaJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaCustomerAdvanceReceipt" ADD CONSTRAINT "ChaCustomerAdvanceReceipt_advanceId_fkey" FOREIGN KEY ("advanceId") REFERENCES "ChaCustomerAdvance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaExpenseRequest" ADD CONSTRAINT "ChaExpenseRequest_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ChaJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaExpenseRequest" ADD CONSTRAINT "ChaExpenseRequest_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaExpenseRequest" ADD CONSTRAINT "ChaExpenseRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaExpenseLine" ADD CONSTRAINT "ChaExpenseLine_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ChaExpenseRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaExpenseStatusHistory" ADD CONSTRAINT "ChaExpenseStatusHistory_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ChaExpenseRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaExpensePayment" ADD CONSTRAINT "ChaExpensePayment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ChaExpenseRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaExpensePayment" ADD CONSTRAINT "ChaExpensePayment_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaExpenseQuery" ADD CONSTRAINT "ChaExpenseQuery_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ChaExpenseRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaExpenseQuery" ADD CONSTRAINT "ChaExpenseQuery_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaAuditLog" ADD CONSTRAINT "ChaAuditLog_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaAuditLog" ADD CONSTRAINT "ChaAuditLog_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ChaJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;
