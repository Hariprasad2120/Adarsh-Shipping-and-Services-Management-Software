CREATE TABLE "AppraisalSchedule" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "dueDate" DATE NOT NULL,
    "kind" TEXT NOT NULL,
    "cycleIndex" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "appraisalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppraisalSchedule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AppraisalSchedule_appraisalId_key" ON "AppraisalSchedule"("appraisalId");
CREATE UNIQUE INDEX "AppraisalSchedule_employeeId_dueDate_kind_key" ON "AppraisalSchedule"("employeeId", "dueDate", "kind");
CREATE INDEX "AppraisalSchedule_orgId_dueDate_status_idx" ON "AppraisalSchedule"("orgId", "dueDate", "status");
CREATE INDEX "AppraisalSchedule_employeeId_status_idx" ON "AppraisalSchedule"("employeeId", "status");

ALTER TABLE "AppraisalSchedule"
ADD CONSTRAINT "AppraisalSchedule_orgId_fkey"
FOREIGN KEY ("orgId") REFERENCES "Organisation"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AppraisalSchedule"
ADD CONSTRAINT "AppraisalSchedule_employeeId_fkey"
FOREIGN KEY ("employeeId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AppraisalSchedule"
ADD CONSTRAINT "AppraisalSchedule_appraisalId_fkey"
FOREIGN KEY ("appraisalId") REFERENCES "Appraisal"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
