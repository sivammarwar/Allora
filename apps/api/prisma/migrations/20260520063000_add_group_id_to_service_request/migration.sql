-- AlterTable
ALTER TABLE "ServiceRequest" ADD COLUMN "groupId" TEXT;

-- CreateIndex
CREATE INDEX "ServiceRequest_groupId_idx" ON "ServiceRequest"("groupId");
