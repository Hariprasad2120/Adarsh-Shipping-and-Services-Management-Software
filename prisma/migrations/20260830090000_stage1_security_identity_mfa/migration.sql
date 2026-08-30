-- Stage 1 security: identity, MFA, recovery codes, password reset, shared rate limiting.
-- Additive only. No existing column is altered or dropped; no data is modified.
--
-- ROLLBACK (safe — these objects hold only Stage-1 security state):
--   DROP TABLE IF EXISTS "MfaRecoveryCode";
--   DROP TABLE IF EXISTS "AuthenticationFactor";
--   DROP TABLE IF EXISTS "IdentityLink";
--   DROP TABLE IF EXISTS "PasswordResetToken";
--   DROP TABLE IF EXISTS "RateLimitCounter";
--   ALTER TABLE "UserSession" DROP COLUMN IF EXISTS "strongAuthAt";
--   ALTER TABLE "UserSession" DROP COLUMN IF EXISTS "mfaVerified";
--   ALTER TABLE "Organisation" DROP COLUMN IF EXISTS "requireMfa";

-- AlterTable
ALTER TABLE "Organisation" ADD COLUMN "requireMfa" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "UserSession" ADD COLUMN "strongAuthAt" TIMESTAMP(3);
ALTER TABLE "UserSession" ADD COLUMN "mfaVerified" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "AuthenticationFactor" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT,
    "secretEnc" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "confirmedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "disabledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthenticationFactor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MfaRecoveryCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "factorId" TEXT,
    "codeHash" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MfaRecoveryCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdentityLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "IdentityLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "requestedIp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitCounter" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "windowEndsAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitCounter_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "AuthenticationFactor_userId_status_idx" ON "AuthenticationFactor"("userId", "status");
CREATE UNIQUE INDEX "AuthenticationFactor_userId_type_key" ON "AuthenticationFactor"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "MfaRecoveryCode_codeHash_key" ON "MfaRecoveryCode"("codeHash");
CREATE INDEX "MfaRecoveryCode_userId_usedAt_idx" ON "MfaRecoveryCode"("userId", "usedAt");

-- CreateIndex
CREATE UNIQUE INDEX "IdentityLink_provider_providerAccountId_key" ON "IdentityLink"("provider", "providerAccountId");
CREATE UNIQUE INDEX "IdentityLink_userId_provider_key" ON "IdentityLink"("userId", "provider");
CREATE INDEX "IdentityLink_userId_idx" ON "IdentityLink"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX "PasswordResetToken_userId_consumedAt_idx" ON "PasswordResetToken"("userId", "consumedAt");
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- CreateIndex
CREATE INDEX "RateLimitCounter_windowEndsAt_idx" ON "RateLimitCounter"("windowEndsAt");

-- AddForeignKey
ALTER TABLE "AuthenticationFactor" ADD CONSTRAINT "AuthenticationFactor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MfaRecoveryCode" ADD CONSTRAINT "MfaRecoveryCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MfaRecoveryCode" ADD CONSTRAINT "MfaRecoveryCode_factorId_fkey" FOREIGN KEY ("factorId") REFERENCES "AuthenticationFactor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentityLink" ADD CONSTRAINT "IdentityLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
