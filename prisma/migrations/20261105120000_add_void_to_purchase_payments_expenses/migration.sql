-- AlterTable
ALTER TABLE `purchase_order_payments` ADD COLUMN `voidReason` VARCHAR(191) NULL,
    ADD COLUMN `voidedAt` DATETIME(3) NULL,
    ADD COLUMN `voidedById` INTEGER NULL,
    ADD COLUMN `voidedByName` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `purchase_order_expenses` ADD COLUMN `voidReason` VARCHAR(191) NULL,
    ADD COLUMN `voidedAt` DATETIME(3) NULL,
    ADD COLUMN `voidedById` INTEGER NULL,
    ADD COLUMN `voidedByName` VARCHAR(191) NULL;
