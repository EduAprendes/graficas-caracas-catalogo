-- AlterTable
ALTER TABLE `customers` ADD COLUMN `company` VARCHAR(191) NULL,
    ADD COLUMN `email` VARCHAR(191) NULL,
    ADD COLUMN `address` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `sales_orders` DROP COLUMN `plotter`,
    ADD COLUMN `deliveryAddress` VARCHAR(191) NULL;
