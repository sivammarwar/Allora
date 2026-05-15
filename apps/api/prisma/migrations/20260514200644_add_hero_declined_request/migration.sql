-- CreateTable
CREATE TABLE "HeroDeclinedRequest" (
    "id" TEXT NOT NULL,
    "heroId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HeroDeclinedRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HeroDeclinedRequest_heroId_idx" ON "HeroDeclinedRequest"("heroId");

-- CreateIndex
CREATE INDEX "HeroDeclinedRequest_requestId_idx" ON "HeroDeclinedRequest"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "HeroDeclinedRequest_heroId_requestId_key" ON "HeroDeclinedRequest"("heroId", "requestId");
