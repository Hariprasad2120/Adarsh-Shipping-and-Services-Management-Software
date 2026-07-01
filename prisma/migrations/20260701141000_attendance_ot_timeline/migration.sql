-- AlterTable
ALTER TABLE "OtRecord" ADD COLUMN     "calculationDetails" JSONB,
ADD COLUMN     "calculationRemarks" TEXT,
ADD COLUMN     "calculationStatus" TEXT NOT NULL DEFAULT 'VALID',
ADD COLUMN     "differenceMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "expectedMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "firstPunchAt" TIMESTAMP(3),
ADD COLUMN     "lastPunchAt" TIMESTAMP(3),
ADD COLUMN     "shiftId" TEXT,
ADD COLUMN     "totalPunchCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "usedOrgFallback" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "workedMinutes" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Shift" ADD COLUMN     "breakRules" JSONB,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "expectedWorkingMinutes" INTEGER NOT NULL DEFAULT 480,
ADD COLUMN     "graceAfterEndMins" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN     "graceBeforeStartMins" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "minOvertimeMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "workingDays" SET DEFAULT '1,2,3,4,5';

-- AlterTable
ALTER TABLE "WorkingCalendar" ADD COLUMN     "defaultWorkingMinutes" INTEGER NOT NULL DEFAULT 480,
ADD COLUMN     "graceAfterEndMins" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN     "graceBeforeStartMins" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "minOvertimeMinutes" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "AttendancePunchEvent" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "attendanceDate" DATE NOT NULL,
    "punchedAt" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'web',
    "eventType" TEXT NOT NULL DEFAULT 'PUNCH',
    "status" TEXT,
    "deviceId" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendancePunchEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttendancePunchEvent_orgId_attendanceDate_idx" ON "AttendancePunchEvent"("orgId", "attendanceDate");

-- CreateIndex
CREATE INDEX "AttendancePunchEvent_userId_attendanceDate_punchedAt_idx" ON "AttendancePunchEvent"("userId", "attendanceDate", "punchedAt");

-- CreateIndex
CREATE INDEX "AttendancePunchEvent_userId_punchedAt_idx" ON "AttendancePunchEvent"("userId", "punchedAt");

-- CreateIndex
CREATE INDEX "OtRecord_shiftId_idx" ON "OtRecord"("shiftId");

-- CreateIndex
CREATE INDEX "Shift_orgId_isActive_idx" ON "Shift"("orgId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Shift_orgId_name_key" ON "Shift"("orgId", "name");

-- CreateIndex
CREATE INDEX "ShiftAssignment_userId_startDate_endDate_idx" ON "ShiftAssignment"("userId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "ShiftAssignment_shiftId_startDate_idx" ON "ShiftAssignment"("shiftId", "startDate");

-- AddForeignKey
ALTER TABLE "AttendancePunchEvent" ADD CONSTRAINT "AttendancePunchEvent_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendancePunchEvent" ADD CONSTRAINT "AttendancePunchEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OtRecord" ADD CONSTRAINT "OtRecord_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
