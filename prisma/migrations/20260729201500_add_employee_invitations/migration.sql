-- AlterTable
ALTER TABLE "User"
ADD COLUMN "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN "activatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "EmployeeInvitation" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "sentById" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveryStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "deliveryError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeInvitation_tokenHash_key"
ON "EmployeeInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "EmployeeInvitation_userId_consumedAt_revokedAt_expiresAt_idx"
ON "EmployeeInvitation"("userId", "consumedAt", "revokedAt", "expiresAt");

-- CreateIndex
CREATE INDEX "EmployeeInvitation_orgId_deliveryStatus_createdAt_idx"
ON "EmployeeInvitation"("orgId", "deliveryStatus", "createdAt");

-- CreateIndex
CREATE INDEX "EmployeeInvitation_sentById_idx"
ON "EmployeeInvitation"("sentById");

-- AddForeignKey
ALTER TABLE "EmployeeInvitation"
ADD CONSTRAINT "EmployeeInvitation_orgId_fkey"
FOREIGN KEY ("orgId") REFERENCES "Organisation"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeInvitation"
ADD CONSTRAINT "EmployeeInvitation_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeInvitation"
ADD CONSTRAINT "EmployeeInvitation_sentById_fkey"
FOREIGN KEY ("sentById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
