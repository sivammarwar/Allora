-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_userId_fkey";

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_heroId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentRecord" DROP CONSTRAINT "PaymentRecord_heroId_fkey";

-- DropForeignKey
ALTER TABLE "SecretOrderItem" DROP CONSTRAINT "SecretOrderItem_inventoryItemId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceBooking" DROP CONSTRAINT "ServiceBooking_heroId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceBooking" DROP CONSTRAINT "ServiceBooking_subcategoryId_fkey";

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_heroId_fkey" FOREIGN KEY ("heroId") REFERENCES "HeroProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceBooking" ADD CONSTRAINT "ServiceBooking_heroId_fkey" FOREIGN KEY ("heroId") REFERENCES "HeroProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceBooking" ADD CONSTRAINT "ServiceBooking_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "Subcategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_heroId_fkey" FOREIGN KEY ("heroId") REFERENCES "HeroProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecretOrderItem" ADD CONSTRAINT "SecretOrderItem_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "AgentInventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
