-- CreateTable
CREATE TABLE "HrDocumentDriveConfig" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "sharedDriveId" TEXT NOT NULL,
    "rootFolderId" TEXT NOT NULL,
    "mySpaceFolderId" TEXT NOT NULL,
    "companyFilesFolderId" TEXT NOT NULL,
    "employeeSharedFolderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrDocumentDriveConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrDocumentFolder" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "driveFolderId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrDocumentFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrDocumentFile" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "ownerId" TEXT,
    "driveFileId" TEXT NOT NULL,
    "driveFolderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HrDocumentFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HrDocumentDriveConfig_orgId_key" ON "HrDocumentDriveConfig"("orgId");

-- CreateIndex
CREATE INDEX "HrDocumentDriveConfig_orgId_idx" ON "HrDocumentDriveConfig"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "HrDocumentFolder_driveFolderId_key" ON "HrDocumentFolder"("driveFolderId");

-- CreateIndex
CREATE UNIQUE INDEX "HrDocumentFolder_orgId_ownerId_category_key" ON "HrDocumentFolder"("orgId", "ownerId", "category");

-- CreateIndex
CREATE INDEX "HrDocumentFolder_orgId_category_idx" ON "HrDocumentFolder"("orgId", "category");

-- CreateIndex
CREATE INDEX "HrDocumentFolder_ownerId_idx" ON "HrDocumentFolder"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "HrDocumentFile_driveFileId_key" ON "HrDocumentFile"("driveFileId");

-- CreateIndex
CREATE INDEX "HrDocumentFile_orgId_category_createdAt_idx" ON "HrDocumentFile"("orgId", "category", "createdAt");

-- CreateIndex
CREATE INDEX "HrDocumentFile_orgId_ownerId_category_idx" ON "HrDocumentFile"("orgId", "ownerId", "category");

-- CreateIndex
CREATE INDEX "HrDocumentFile_uploadedById_idx" ON "HrDocumentFile"("uploadedById");
