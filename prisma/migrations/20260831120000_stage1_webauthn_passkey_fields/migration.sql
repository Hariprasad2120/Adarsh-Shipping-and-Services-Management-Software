-- Stage 1 §6 — WebAuthn / passkey columns on AuthenticationFactor.
-- Additive only. Null for existing (TOTP) rows.
--
-- ROLLBACK:
--   DROP INDEX IF EXISTS "AuthenticationFactor_credentialId_key";
--   ALTER TABLE "AuthenticationFactor"
--     DROP COLUMN IF EXISTS "credentialId",
--     DROP COLUMN IF EXISTS "credentialPublic",
--     DROP COLUMN IF EXISTS "counter",
--     DROP COLUMN IF EXISTS "transports",
--     DROP COLUMN IF EXISTS "deviceType",
--     DROP COLUMN IF EXISTS "backedUp";

ALTER TABLE "AuthenticationFactor" ADD COLUMN "credentialId" TEXT;
ALTER TABLE "AuthenticationFactor" ADD COLUMN "credentialPublic" TEXT;
ALTER TABLE "AuthenticationFactor" ADD COLUMN "counter" INTEGER DEFAULT 0;
ALTER TABLE "AuthenticationFactor" ADD COLUMN "transports" TEXT;
ALTER TABLE "AuthenticationFactor" ADD COLUMN "deviceType" TEXT;
ALTER TABLE "AuthenticationFactor" ADD COLUMN "backedUp" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "AuthenticationFactor_credentialId_key" ON "AuthenticationFactor"("credentialId");
