-- CreateTable
CREATE TABLE "CustomerPortalUser" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "designation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'INVITED',
    "passwordHash" TEXT,
    "emailVerifiedAt" TIMESTAMP(3),
    "invitedAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "lastPasswordChangedAt" TIMESTAMP(3),
    "passwordResetRequestedAt" TIMESTAMP(3),
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "suspendedReason" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerPortalUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerPortalInvitation" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "portalUserId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'ACTIVATION',
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "sentById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerPortalInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerPortalSession" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "portalUserId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "ipAddress" TEXT,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "device" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokeReason" TEXT,

    CONSTRAINT "CustomerPortalSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerPortalAuditLog" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "portalUserId" TEXT,
    "actorUserId" TEXT,
    "jobId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "remarks" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerPortalAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerPortalNotification" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "portalUserId" TEXT NOT NULL,
    "jobId" TEXT,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "link" TEXT,
    "payload" JSONB,
    "readAt" TIMESTAMP(3),
    "emailedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerPortalNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerPortalNotificationPreference" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "portalUserId" TEXT NOT NULL,
    "shipmentUpdatesEmail" BOOLEAN NOT NULL DEFAULT true,
    "documentUpdatesEmail" BOOLEAN NOT NULL DEFAULT true,
    "checklistEmail" BOOLEAN NOT NULL DEFAULT true,
    "queryEmail" BOOLEAN NOT NULL DEFAULT true,
    "ratingEmail" BOOLEAN NOT NULL DEFAULT true,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerPortalNotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerVisibleStageMapping" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "internalStageKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "showContact" BOOLEAN NOT NULL DEFAULT true,
    "notifyCustomer" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerVisibleStageMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerDocumentSubmission" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "portalUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPLOADED',
    "customerComment" TEXT,
    "reviewerComment" TEXT,
    "internalRemark" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "currentVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerDocumentSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerDocumentVersion" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "checksum" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerDocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerChecklistResponse" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "portalUserId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "remarks" TEXT,
    "attachmentPayload" JSONB,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerChecklistResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerQueryThread" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "department" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "requiresCustomerAction" BOOLEAN NOT NULL DEFAULT false,
    "requiredResponseBy" TIMESTAMP(3),
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerQueryThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerQueryMessage" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "authorUserId" TEXT,
    "authorPortalUserId" TEXT,
    "body" TEXT NOT NULL,
    "attachmentPayload" JSONB,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerQueryMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentRatingCategory" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "customerId" TEXT,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShipmentRatingCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentServiceRating" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "portalUserId" TEXT NOT NULL,
    "categoryId" TEXT,
    "overallRating" INTEGER NOT NULL,
    "categoryRatings" JSONB NOT NULL,
    "remarks" TEXT,
    "applicableServices" JSONB,
    "followUpStatus" TEXT NOT NULL DEFAULT 'OPEN',
    "followUpOwnerId" TEXT,
    "reopenedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShipmentServiceRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerPortalUser_contactId_key" ON "CustomerPortalUser"("contactId");

-- CreateIndex
CREATE INDEX "CustomerPortalUser_orgId_customerId_status_idx" ON "CustomerPortalUser"("orgId", "customerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerPortalUser_orgId_contactId_key" ON "CustomerPortalUser"("orgId", "contactId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerPortalUser_orgId_email_key" ON "CustomerPortalUser"("orgId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerPortalInvitation_tokenHash_key" ON "CustomerPortalInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "CustomerPortalInvitation_portalUserId_type_consumedAt_idx" ON "CustomerPortalInvitation"("portalUserId", "type", "consumedAt");

-- CreateIndex
CREATE INDEX "CustomerPortalInvitation_orgId_customerId_type_idx" ON "CustomerPortalInvitation"("orgId", "customerId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerPortalSession_token_key" ON "CustomerPortalSession"("token");

-- CreateIndex
CREATE INDEX "CustomerPortalSession_portalUserId_status_idx" ON "CustomerPortalSession"("portalUserId", "status");

-- CreateIndex
CREATE INDEX "CustomerPortalSession_orgId_customerId_status_idx" ON "CustomerPortalSession"("orgId", "customerId", "status");

-- CreateIndex
CREATE INDEX "CustomerPortalAuditLog_orgId_customerId_createdAt_idx" ON "CustomerPortalAuditLog"("orgId", "customerId", "createdAt");

-- CreateIndex
CREATE INDEX "CustomerPortalAuditLog_portalUserId_createdAt_idx" ON "CustomerPortalAuditLog"("portalUserId", "createdAt");

-- CreateIndex
CREATE INDEX "CustomerPortalAuditLog_jobId_createdAt_idx" ON "CustomerPortalAuditLog"("jobId", "createdAt");

-- CreateIndex
CREATE INDEX "CustomerPortalNotification_portalUserId_readAt_createdAt_idx" ON "CustomerPortalNotification"("portalUserId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "CustomerPortalNotification_orgId_customerId_createdAt_idx" ON "CustomerPortalNotification"("orgId", "customerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerPortalNotificationPreference_portalUserId_key" ON "CustomerPortalNotificationPreference"("portalUserId");

-- CreateIndex
CREATE INDEX "CustomerPortalNotificationPreference_orgId_customerId_idx" ON "CustomerPortalNotificationPreference"("orgId", "customerId");

-- CreateIndex
CREATE INDEX "CustomerVisibleStageMapping_orgId_sortOrder_idx" ON "CustomerVisibleStageMapping"("orgId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerVisibleStageMapping_orgId_internalStageKey_key" ON "CustomerVisibleStageMapping"("orgId", "internalStageKey");

-- CreateIndex
CREATE INDEX "CustomerDocumentSubmission_orgId_customerId_status_idx" ON "CustomerDocumentSubmission"("orgId", "customerId", "status");

-- CreateIndex
CREATE INDEX "CustomerDocumentSubmission_jobId_requirementId_status_idx" ON "CustomerDocumentSubmission"("jobId", "requirementId", "status");

-- CreateIndex
CREATE INDEX "CustomerDocumentVersion_submissionId_uploadedAt_idx" ON "CustomerDocumentVersion"("submissionId", "uploadedAt");

-- CreateIndex
CREATE INDEX "CustomerChecklistResponse_orgId_customerId_submittedAt_idx" ON "CustomerChecklistResponse"("orgId", "customerId", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerChecklistResponse_jobId_checklistId_portalUserId_key" ON "CustomerChecklistResponse"("jobId", "checklistId", "portalUserId");

-- CreateIndex
CREATE INDEX "CustomerQueryThread_orgId_customerId_status_idx" ON "CustomerQueryThread"("orgId", "customerId", "status");

-- CreateIndex
CREATE INDEX "CustomerQueryThread_jobId_status_idx" ON "CustomerQueryThread"("jobId", "status");

-- CreateIndex
CREATE INDEX "CustomerQueryMessage_threadId_createdAt_idx" ON "CustomerQueryMessage"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "CustomerQueryMessage_orgId_customerId_createdAt_idx" ON "CustomerQueryMessage"("orgId", "customerId", "createdAt");

-- CreateIndex
CREATE INDEX "ShipmentRatingCategory_orgId_isActive_sortOrder_idx" ON "ShipmentRatingCategory"("orgId", "isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ShipmentRatingCategory_orgId_key_key" ON "ShipmentRatingCategory"("orgId", "key");

-- CreateIndex
CREATE INDEX "ShipmentServiceRating_orgId_customerId_submittedAt_idx" ON "ShipmentServiceRating"("orgId", "customerId", "submittedAt");

-- CreateIndex
CREATE INDEX "ShipmentServiceRating_jobId_submittedAt_idx" ON "ShipmentServiceRating"("jobId", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ShipmentServiceRating_jobId_portalUserId_key" ON "ShipmentServiceRating"("jobId", "portalUserId");

-- AddForeignKey
ALTER TABLE "CustomerPortalUser" ADD CONSTRAINT "CustomerPortalUser_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPortalUser" ADD CONSTRAINT "CustomerPortalUser_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CrmAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPortalUser" ADD CONSTRAINT "CustomerPortalUser_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CrmContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPortalInvitation" ADD CONSTRAINT "CustomerPortalInvitation_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPortalInvitation" ADD CONSTRAINT "CustomerPortalInvitation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CrmAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPortalInvitation" ADD CONSTRAINT "CustomerPortalInvitation_portalUserId_fkey" FOREIGN KEY ("portalUserId") REFERENCES "CustomerPortalUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPortalInvitation" ADD CONSTRAINT "CustomerPortalInvitation_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPortalSession" ADD CONSTRAINT "CustomerPortalSession_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPortalSession" ADD CONSTRAINT "CustomerPortalSession_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CrmAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPortalSession" ADD CONSTRAINT "CustomerPortalSession_portalUserId_fkey" FOREIGN KEY ("portalUserId") REFERENCES "CustomerPortalUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPortalAuditLog" ADD CONSTRAINT "CustomerPortalAuditLog_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPortalAuditLog" ADD CONSTRAINT "CustomerPortalAuditLog_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CrmAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPortalAuditLog" ADD CONSTRAINT "CustomerPortalAuditLog_portalUserId_fkey" FOREIGN KEY ("portalUserId") REFERENCES "CustomerPortalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPortalAuditLog" ADD CONSTRAINT "CustomerPortalAuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPortalAuditLog" ADD CONSTRAINT "CustomerPortalAuditLog_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ChaJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPortalNotification" ADD CONSTRAINT "CustomerPortalNotification_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPortalNotification" ADD CONSTRAINT "CustomerPortalNotification_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CrmAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPortalNotification" ADD CONSTRAINT "CustomerPortalNotification_portalUserId_fkey" FOREIGN KEY ("portalUserId") REFERENCES "CustomerPortalUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPortalNotification" ADD CONSTRAINT "CustomerPortalNotification_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ChaJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPortalNotificationPreference" ADD CONSTRAINT "CustomerPortalNotificationPreference_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPortalNotificationPreference" ADD CONSTRAINT "CustomerPortalNotificationPreference_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CrmAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPortalNotificationPreference" ADD CONSTRAINT "CustomerPortalNotificationPreference_portalUserId_fkey" FOREIGN KEY ("portalUserId") REFERENCES "CustomerPortalUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerVisibleStageMapping" ADD CONSTRAINT "CustomerVisibleStageMapping_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerDocumentSubmission" ADD CONSTRAINT "CustomerDocumentSubmission_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerDocumentSubmission" ADD CONSTRAINT "CustomerDocumentSubmission_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CrmAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerDocumentSubmission" ADD CONSTRAINT "CustomerDocumentSubmission_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ChaJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerDocumentSubmission" ADD CONSTRAINT "CustomerDocumentSubmission_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "ChaJobDocumentRequirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerDocumentSubmission" ADD CONSTRAINT "CustomerDocumentSubmission_portalUserId_fkey" FOREIGN KEY ("portalUserId") REFERENCES "CustomerPortalUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerDocumentSubmission" ADD CONSTRAINT "CustomerDocumentSubmission_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerDocumentVersion" ADD CONSTRAINT "CustomerDocumentVersion_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "CustomerDocumentSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerChecklistResponse" ADD CONSTRAINT "CustomerChecklistResponse_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerChecklistResponse" ADD CONSTRAINT "CustomerChecklistResponse_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CrmAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerChecklistResponse" ADD CONSTRAINT "CustomerChecklistResponse_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ChaJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerChecklistResponse" ADD CONSTRAINT "CustomerChecklistResponse_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "ChaChecklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerChecklistResponse" ADD CONSTRAINT "CustomerChecklistResponse_portalUserId_fkey" FOREIGN KEY ("portalUserId") REFERENCES "CustomerPortalUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerQueryThread" ADD CONSTRAINT "CustomerQueryThread_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerQueryThread" ADD CONSTRAINT "CustomerQueryThread_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CrmAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerQueryThread" ADD CONSTRAINT "CustomerQueryThread_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ChaJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerQueryThread" ADD CONSTRAINT "CustomerQueryThread_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerQueryMessage" ADD CONSTRAINT "CustomerQueryMessage_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerQueryMessage" ADD CONSTRAINT "CustomerQueryMessage_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CrmAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerQueryMessage" ADD CONSTRAINT "CustomerQueryMessage_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ChaJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerQueryMessage" ADD CONSTRAINT "CustomerQueryMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "CustomerQueryThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerQueryMessage" ADD CONSTRAINT "CustomerQueryMessage_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerQueryMessage" ADD CONSTRAINT "CustomerQueryMessage_authorPortalUserId_fkey" FOREIGN KEY ("authorPortalUserId") REFERENCES "CustomerPortalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentRatingCategory" ADD CONSTRAINT "ShipmentRatingCategory_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentRatingCategory" ADD CONSTRAINT "ShipmentRatingCategory_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CrmAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentServiceRating" ADD CONSTRAINT "ShipmentServiceRating_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentServiceRating" ADD CONSTRAINT "ShipmentServiceRating_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CrmAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentServiceRating" ADD CONSTRAINT "ShipmentServiceRating_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ChaJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentServiceRating" ADD CONSTRAINT "ShipmentServiceRating_portalUserId_fkey" FOREIGN KEY ("portalUserId") REFERENCES "CustomerPortalUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentServiceRating" ADD CONSTRAINT "ShipmentServiceRating_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ShipmentRatingCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentServiceRating" ADD CONSTRAINT "ShipmentServiceRating_followUpOwnerId_fkey" FOREIGN KEY ("followUpOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

