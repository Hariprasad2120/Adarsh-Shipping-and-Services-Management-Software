-- CreateTable
CREATE TABLE "MonaConversation" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "userId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "sessionKey" TEXT NOT NULL,
    "title" TEXT,
    "lastPath" TEXT,
    "lastPageLabel" TEXT,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonaConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonaConversationMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "toolNames" JSONB,
    "contextSnapshot" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonaConversationMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonaAuditEvent" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "userId" TEXT NOT NULL,
    "conversationId" TEXT,
    "channel" TEXT NOT NULL,
    "sessionKey" TEXT,
    "eventType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "requestMessage" TEXT,
    "responseMessage" TEXT,
    "toolNames" JSONB,
    "routePath" TEXT,
    "details" JSONB,
    "latencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonaAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MonaConversation_userId_channel_sessionKey_key" ON "MonaConversation"("userId", "channel", "sessionKey");

-- CreateIndex
CREATE INDEX "MonaConversation_orgId_updatedAt_idx" ON "MonaConversation"("orgId", "updatedAt");

-- CreateIndex
CREATE INDEX "MonaConversation_userId_updatedAt_idx" ON "MonaConversation"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "MonaConversation_channel_updatedAt_idx" ON "MonaConversation"("channel", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MonaConversationMessage_conversationId_ordinal_key" ON "MonaConversationMessage"("conversationId", "ordinal");

-- CreateIndex
CREATE INDEX "MonaConversationMessage_conversationId_createdAt_idx" ON "MonaConversationMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "MonaAuditEvent_orgId_createdAt_idx" ON "MonaAuditEvent"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "MonaAuditEvent_userId_createdAt_idx" ON "MonaAuditEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "MonaAuditEvent_conversationId_createdAt_idx" ON "MonaAuditEvent"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "MonaAuditEvent_channel_createdAt_idx" ON "MonaAuditEvent"("channel", "createdAt");

-- AddForeignKey
ALTER TABLE "MonaConversation" ADD CONSTRAINT "MonaConversation_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonaConversation" ADD CONSTRAINT "MonaConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonaConversationMessage" ADD CONSTRAINT "MonaConversationMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "MonaConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonaAuditEvent" ADD CONSTRAINT "MonaAuditEvent_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonaAuditEvent" ADD CONSTRAINT "MonaAuditEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonaAuditEvent" ADD CONSTRAINT "MonaAuditEvent_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "MonaConversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
