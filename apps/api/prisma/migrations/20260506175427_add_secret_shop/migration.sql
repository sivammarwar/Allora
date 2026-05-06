-- CreateEnum
CREATE TYPE "SecretOrderStatus" AS ENUM ('PLACED', 'RECEIVED', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'SECRET_SHOP';

-- CreateTable
CREATE TABLE "SecretShopProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shopName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "locationLat" DOUBLE PRECISION NOT NULL,
    "locationLng" DOUBLE PRECISION NOT NULL,
    "isVerifiedByAgent" BOOLEAN NOT NULL DEFAULT false,
    "verifiedByAgentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecretShopProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecretShopRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agentId" TEXT,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "shopName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "locationLat" DOUBLE PRECISION NOT NULL,
    "locationLng" DOUBLE PRECISION NOT NULL,
    "purpose" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecretShopRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentItem" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brandName" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "imageUrl" TEXT,
    "specification" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecretOrder" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "status" "SecretOrderStatus" NOT NULL DEFAULT 'PLACED',
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecretOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecretOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecretOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SecretShopProfile_userId_key" ON "SecretShopProfile"("userId");

-- CreateIndex
CREATE INDEX "SecretShopProfile_isVerifiedByAgent_isActive_idx" ON "SecretShopProfile"("isVerifiedByAgent", "isActive");

-- CreateIndex
CREATE INDEX "SecretShopRequest_status_agentId_idx" ON "SecretShopRequest"("status", "agentId");

-- CreateIndex
CREATE INDEX "SecretShopRequest_userId_idx" ON "SecretShopRequest"("userId");

-- CreateIndex
CREATE INDEX "AgentItem_agentId_isActive_idx" ON "AgentItem"("agentId", "isActive");

-- CreateIndex
CREATE INDEX "SecretOrder_shopId_status_idx" ON "SecretOrder"("shopId", "status");

-- CreateIndex
CREATE INDEX "SecretOrder_agentId_status_idx" ON "SecretOrder"("agentId", "status");

-- CreateIndex
CREATE INDEX "SecretOrderItem_orderId_idx" ON "SecretOrderItem"("orderId");

-- AddForeignKey
ALTER TABLE "SecretShopProfile" ADD CONSTRAINT "SecretShopProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecretShopProfile" ADD CONSTRAINT "SecretShopProfile_verifiedByAgentId_fkey" FOREIGN KEY ("verifiedByAgentId") REFERENCES "AgentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecretShopRequest" ADD CONSTRAINT "SecretShopRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecretShopRequest" ADD CONSTRAINT "SecretShopRequest_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AgentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentItem" ADD CONSTRAINT "AgentItem_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AgentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecretOrder" ADD CONSTRAINT "SecretOrder_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "SecretShopProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecretOrder" ADD CONSTRAINT "SecretOrder_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AgentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecretOrderItem" ADD CONSTRAINT "SecretOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "SecretOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecretOrderItem" ADD CONSTRAINT "SecretOrderItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "AgentItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
