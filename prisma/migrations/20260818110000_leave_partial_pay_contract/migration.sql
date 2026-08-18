-- AlterTable
ALTER TABLE "LeaveRequest" ADD COLUMN     "partialPaidUnits" DECIMAL(10,4),
ADD COLUMN     "partialPaySlabBreakdown" JSONB;

-- CreateTable
CREATE TABLE "LeavePartialPayRecord" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leaveTypeId" TEXT NOT NULL,
    "payrollMonth" DATE NOT NULL,
    "requestId" TEXT NOT NULL,
    "slabBreakdown" JSONB NOT NULL,
    "totalUnits" DECIMAL(10,4) NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeavePartialPayRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeavePartialPayRecord_requestId_key" ON "LeavePartialPayRecord"("requestId");

-- CreateIndex
CREATE INDEX "LeavePartialPayRecord_orgId_payrollMonth_idx" ON "LeavePartialPayRecord"("orgId", "payrollMonth");

-- CreateIndex
CREATE INDEX "LeavePartialPayRecord_userId_payrollMonth_idx" ON "LeavePartialPayRecord"("userId", "payrollMonth");

-- AddForeignKey
ALTER TABLE "LeavePartialPayRecord" ADD CONSTRAINT "LeavePartialPayRecord_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeavePartialPayRecord" ADD CONSTRAINT "LeavePartialPayRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeavePartialPayRecord" ADD CONSTRAINT "LeavePartialPayRecord_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "LeaveType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeavePartialPayRecord" ADD CONSTRAINT "LeavePartialPayRecord_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "LeaveRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

