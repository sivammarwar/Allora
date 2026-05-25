-- AlterTable: add googleId column to User
ALTER TABLE "User" ADD COLUMN "googleId" TEXT;

-- CreateIndex: unique constraint on googleId (nullable unique)
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
