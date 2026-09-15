-- DropForeignKey
ALTER TABLE `sales_order_items` DROP FOREIGN KEY `sales_order_items_productId_fkey`;

-- AlterTable
ALTER TABLE `sales_order_items` MODIFY `productId` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `sales_order_items` ADD CONSTRAINT `sales_order_items_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
