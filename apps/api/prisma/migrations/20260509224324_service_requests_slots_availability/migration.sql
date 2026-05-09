-- CreateEnum
CREATE TYPE "ServiceRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "HeroProfile" ADD COLUMN     "gender" TEXT,
ADD COLUMN     "isAvailable" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "gender" TEXT;

-- CreateTable
CREATE TABLE "AgentSlotConfig" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "slotStartHour" INTEGER NOT NULL DEFAULT 6,
    "slotEndHour" INTEGER NOT NULL DEFAULT 20,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentSlotConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HeroSlot" (
    "id" TEXT NOT NULL,
    "heroId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "hour" INTEGER NOT NULL,
    "isBooked" BOOLEAN NOT NULL DEFAULT false,
    "isBusyByHero" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HeroSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subcategoryId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "heroId" TEXT,
    "slotId" TEXT,
    "status" "ServiceRequestStatus" NOT NULL DEFAULT 'PENDING',
    "charge" DECIMAL(10,2) NOT NULL,
    "discountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "transportCharge" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "userName" TEXT NOT NULL,
    "userPhone" TEXT NOT NULL,
    "userGender" TEXT,
    "userAddress" TEXT NOT NULL,
    "userLat" DOUBLE PRECISION,
    "userLng" DOUBLE PRECISION,
    "scheduledDate" DATE NOT NULL,
    "scheduledHour" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgentSlotConfig_agentId_key" ON "AgentSlotConfig"("agentId");

-- CreateIndex
CREATE INDEX "HeroSlot_heroId_date_idx" ON "HeroSlot"("heroId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "HeroSlot_heroId_date_hour_key" ON "HeroSlot"("heroId", "date", "hour");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceRequest_slotId_key" ON "ServiceRequest"("slotId");

-- CreateIndex
CREATE INDEX "ServiceRequest_userId_createdAt_idx" ON "ServiceRequest"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceRequest_heroId_status_idx" ON "ServiceRequest"("heroId", "status");

-- CreateIndex
CREATE INDEX "ServiceRequest_agentId_scheduledDate_idx" ON "ServiceRequest"("agentId", "scheduledDate");

-- CreateIndex
CREATE INDEX "ServiceRequest_subcategoryId_scheduledDate_scheduledHour_idx" ON "ServiceRequest"("subcategoryId", "scheduledDate", "scheduledHour");

-- AddForeignKey
ALTER TABLE "AgentSlotConfig" ADD CONSTRAINT "AgentSlotConfig_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AgentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HeroSlot" ADD CONSTRAINT "HeroSlot_heroId_fkey" FOREIGN KEY ("heroId") REFERENCES "HeroProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "Subcategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AgentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_heroId_fkey" FOREIGN KEY ("heroId") REFERENCES "HeroProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "HeroSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
