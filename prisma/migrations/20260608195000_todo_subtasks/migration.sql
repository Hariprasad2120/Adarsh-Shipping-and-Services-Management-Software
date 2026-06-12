-- CreateTable
CREATE TABLE "TodoSubtask" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TodoSubtask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TodoSubtask_taskId_order_idx" ON "TodoSubtask"("taskId", "order");

-- CreateIndex
CREATE INDEX "TodoSubtask_taskId_completed_idx" ON "TodoSubtask"("taskId", "completed");

-- AddForeignKey
ALTER TABLE "TodoSubtask" ADD CONSTRAINT "TodoSubtask_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "TodoTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
