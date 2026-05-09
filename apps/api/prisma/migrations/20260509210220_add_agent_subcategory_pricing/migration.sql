-- CreateTable
CREATE TABLE "AgentSubcategoryPricing" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "subcategoryId" TEXT NOT NULL,
    "baseServiceCharge" DECIMAL(10,2) NOT NULL,
    "transportChargePerKm" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentSubcategoryPricing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentSubcategoryPricing_agentId_idx" ON "AgentSubcategoryPricing"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentSubcategoryPricing_agentId_subcategoryId_key" ON "AgentSubcategoryPricing"("agentId", "subcategoryId");

-- AddForeignKey
ALTER TABLE "AgentSubcategoryPricing" ADD CONSTRAINT "AgentSubcategoryPricing_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AgentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentSubcategoryPricing" ADD CONSTRAINT "AgentSubcategoryPricing_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "Subcategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
