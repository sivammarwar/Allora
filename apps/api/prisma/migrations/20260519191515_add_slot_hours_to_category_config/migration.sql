-- AlterTable
ALTER TABLE "AgentCategoryConfig" ADD COLUMN     "slotEndHour" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "slotStartHour" INTEGER NOT NULL DEFAULT 6;
