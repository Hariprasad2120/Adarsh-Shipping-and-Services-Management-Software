CREATE TABLE "AppraisalSelfTemplate" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppraisalSelfTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AppraisalSelfTemplate_orgId_key" ON "AppraisalSelfTemplate"("orgId");
CREATE INDEX "AppraisalSelfTemplate_orgId_idx" ON "AppraisalSelfTemplate"("orgId");

ALTER TABLE "AppraisalSelfTemplate" ADD CONSTRAINT "AppraisalSelfTemplate_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
