CREATE TABLE "EmployeeHrmsProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "customValues" JSONB,
    "createdById" TEXT,
    "modifiedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeHrmsProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmployeeProfileField" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'TEXT',
    "section" TEXT NOT NULL DEFAULT 'Custom Details',
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB,
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeProfileField_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmployeeHrmsProfile_userId_key" ON "EmployeeHrmsProfile"("userId");
CREATE INDEX "EmployeeHrmsProfile_updatedAt_idx" ON "EmployeeHrmsProfile"("updatedAt");
CREATE UNIQUE INDEX "EmployeeProfileField_orgId_key_key" ON "EmployeeProfileField"("orgId", "key");
CREATE INDEX "EmployeeProfileField_orgId_active_position_idx" ON "EmployeeProfileField"("orgId", "active", "position");

ALTER TABLE "EmployeeHrmsProfile"
ADD CONSTRAINT "EmployeeHrmsProfile_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmployeeProfileField"
ADD CONSTRAINT "EmployeeProfileField_orgId_fkey"
FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
