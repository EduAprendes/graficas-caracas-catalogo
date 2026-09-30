-- CreateTable
CREATE TABLE `sellers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `commissionPercent` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `cancelledAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `sales_orders` ADD COLUMN `sellerId` INTEGER NULL,
    ADD COLUMN `commissionPercent` DECIMAL(5, 2) NULL;

-- CreateIndex
CREATE INDEX `sales_orders_sellerId_idx` ON `sales_orders`(`sellerId`);

-- AddForeignKey
ALTER TABLE `sales_orders` ADD CONSTRAINT `sales_orders_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `sellers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
